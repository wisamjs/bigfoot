"""A Viewer's side of a Share link (GLOSSARY.md, Journey; docs/adr/0008): the Passcode check and its
lockout, the Journey and what it leaves out, and how stopping, expiry and a new Passcode cut a Viewer
off. test_auth.py checks the Viewer token itself."""

from datetime import UTC, datetime, timedelta

from tests.test_share_links import PASSCODE, SHARED_BY, create, query

PAST = (datetime.now(UTC) - timedelta(days=3)).isoformat()
SOON = (datetime.now(UTC) + timedelta(days=1)).isoformat()
LATER = (datetime.now(UTC) + timedelta(days=9)).isoformat()

JOURNEY_KEYS = {"shared_by", "applications", "other_completed_interviews"}
APPLICATION_KEYS = {"company", "title", "applied_on", "offer", "is_waiting", "waiting_since", "interviews"}
INTERVIEW_KEYS = {"category", "title", "at", "completed"}


def open_link(client, link_id, passcode=PASSCODE):
    return client.post(f"/share-links/{link_id}/viewer-token", json={"passcode": passcode})


def viewer_headers(client, link_id, passcode=PASSCODE):
    res = open_link(client, link_id, passcode)
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['token']}"}


def journey(client, link_id, headers):
    return client.get(f"/share-links/{link_id}/journey", headers=headers)


def application(client, headers, company, **fields):
    body = {
        "company": company,
        "title": "Engineering Manager",
        "applied_on": "2026-11-02",
        "salary": "$180k",
        "posting_url": "https://jobs.example.com/secret",
        "location": "hybrid",
        **fields,
    }
    res = client.post("/applications", json=body, headers=headers)
    assert res.status_code == 201, res.text
    return res.json()


def interview(client, headers, app, at, title="Hiring Manager", category="hiring_manager"):
    body = {
        "category": category,
        "title": title,
        "at": at,
        "prep_notes": "Private prep",
        "what_they_asked": "Private questions",
        "how_it_went": "Private reflection",
        "takeaway": "Private takeaway",
    }
    res = client.post(f"/applications/{app['id']}/interviews", json=body, headers=headers)
    assert res.status_code == 201, res.text


# The Passcode page's status


def test_the_status_names_the_job_seeker_and_says_nothing_else(client, token):
    link = create(client, token())
    res = client.get(f"/share-links/{link['id']}")
    assert res.status_code == 200
    assert res.json() == {"shared_by": SHARED_BY, "expired": False, "locked": False}


def test_a_link_made_before_names_were_stored_has_no_name(settings, client, token):
    link = create(client, token())
    query(settings, "update share_links set shared_by = ''")
    assert client.get(f"/share-links/{link['id']}").json()["shared_by"] is None


def test_an_unknown_or_stopped_link_is_not_found(client, token):
    link = create(client, token())
    assert client.delete(f"/me/share-links/{link['id']}", headers=token()).status_code == 204
    for link_id in (link["id"], "abcdefghij"):
        assert client.get(f"/share-links/{link_id}").status_code == 404
        assert open_link(client, link_id).status_code == 404


def test_a_malformed_link_id_is_refused(client):
    assert client.get("/share-links/short").status_code == 422
    assert client.post("/share-links/short/viewer-token", json={"passcode": PASSCODE}).status_code == 422


# The Passcode check and its lockout


def test_the_right_passcode_returns_a_viewer_token_until_the_link_expires(client, token):
    link = create(client, token())
    res = open_link(client, link["id"])
    assert res.status_code == 200
    assert set(res.json()) == {"token", "expires_at"}
    assert res.json()["expires_at"] == link["expires_at"]


def test_a_wrong_passcode_is_refused_and_counted(settings, client, token):
    link = create(client, token())
    res = open_link(client, link["id"], "otter-lake-7")
    assert res.status_code == 401
    assert res.json()["detail"] == "That Passcode didn't match"
    assert query(settings, "select count(*) from share_link_wrong_tries") == [(1,)]


def test_the_6th_try_within_15_minutes_is_refused_even_with_the_right_passcode(client, token):
    link = create(client, token())
    statuses = [open_link(client, link["id"], f"wrong-passcode-{n}").status_code for n in range(5)]
    assert statuses == [401, 401, 401, 401, 423]

    res = open_link(client, link["id"])
    assert res.status_code == 423
    assert res.json()["detail"] == "Too many tries. Try again in 15 minutes."
    assert client.get(f"/share-links/{link['id']}").json()["locked"] is True


def test_the_lock_lifts_once_the_wrong_tries_are_15_minutes_old(settings, client, token):
    link = create(client, token())
    for n in range(5):
        open_link(client, link["id"], f"wrong-passcode-{n}")
    query(settings, "update share_link_wrong_tries set tried_at = now() - interval '15 minutes'")

    assert client.get(f"/share-links/{link['id']}").json()["locked"] is False
    assert open_link(client, link["id"]).status_code == 200
    assert query(settings, "select count(*) from share_link_wrong_tries") == [(0,)]


def test_wrong_tries_are_counted_per_link(client, token):
    first, second = create(client, token()), create(client, token(), label="Sam")
    for n in range(5):
        open_link(client, first["id"], f"wrong-passcode-{n}")
    assert open_link(client, second["id"]).status_code == 200


def test_an_expired_link_says_so_and_takes_no_passcode(settings, client, token):
    link = create(client, token())
    query(settings, "update share_links set expires_at = now() - interval '1 second'")
    assert client.get(f"/share-links/{link['id']}").json()["expired"] is True
    res = open_link(client, link["id"])
    assert res.status_code == 410
    assert query(settings, "select count(*) from share_link_wrong_tries") == [(0,)]


# The Journey


def test_the_journey_has_only_in_progress_applications_and_offers_with_exactly_these_keys(client, token):
    me = token()
    interviewing = application(client, me, "Tilth Agritech", applied_on="2026-11-01")
    interview(client, me, interviewing, PAST, title="Recruiter", category="recruiter")
    interview(client, me, interviewing, SOON)
    application(client, me, "Cobalt Genomics", status="done", outcome="offer", outcome_note="Private note")
    application(client, me, "Fernway Health", applied_on="2026-11-18")
    application(client, me, "Rejected Co", status="done", outcome="rejected", outcome_note="Private note")
    application(client, me, "Withdrawn Co", status="done", outcome="withdrawn")
    link = create(client, me)

    res = journey(client, link["id"], viewer_headers(client, link["id"]))

    assert res.status_code == 200
    body = res.json()
    assert set(body) == JOURNEY_KEYS
    assert body["shared_by"] == SHARED_BY
    companies = [a["company"] for a in body["applications"]]
    assert companies == ["Tilth Agritech", "Cobalt Genomics", "Fernway Health"]
    for app in body["applications"]:
        assert set(app) == APPLICATION_KEYS
        for i in app["interviews"]:
            assert set(i) == INTERVIEW_KEYS
    for private in ("$180k", "jobs.example.com", "hybrid", "Private", "Rejected Co", "Withdrawn Co"):
        assert private not in res.text

    tilth, cobalt, fernway = body["applications"]
    assert [i["title"] for i in tilth["interviews"]] == ["Recruiter", "Hiring Manager"]
    assert [i["completed"] for i in tilth["interviews"]] == [True, False]
    assert (tilth["offer"], tilth["is_waiting"], tilth["waiting_since"]) == (False, False, None)
    assert (cobalt["offer"], cobalt["is_waiting"]) == (True, False)
    assert (fernway["offer"], fernway["is_waiting"], fernway["waiting_since"]) == (False, True, "2026-11-18")


def test_other_done_applications_give_only_when_their_completed_interviews_happened(client, token):
    me = token()
    rejected = application(client, me, "Rejected Co", status="done", outcome="rejected")
    interview(client, me, rejected, PAST, title="Secret Loop")
    interview(client, me, rejected, SOON, title="Cancelled Loop")
    offer = application(client, me, "Cobalt Genomics", status="done", outcome="offer")
    interview(client, me, offer, PAST)
    open_app = application(client, me, "Tilth Agritech")
    interview(client, me, open_app, PAST)
    link = create(client, me)

    res = journey(client, link["id"], viewer_headers(client, link["id"]))

    other = res.json()["other_completed_interviews"]
    assert [datetime.fromisoformat(at) for at in other] == [datetime.fromisoformat(PAST)]
    for private in ("Rejected Co", "Secret Loop", "Cancelled Loop"):
        assert private not in res.text


def test_waiting_since_is_the_last_completed_interview(client, token):
    me = token()
    app = application(client, me, "Lumen Bio")
    interview(client, me, app, PAST)
    link = create(client, me)
    [lumen] = journey(client, link["id"], viewer_headers(client, link["id"])).json()["applications"]
    assert lumen["is_waiting"] is True
    assert datetime.fromisoformat(lumen["waiting_since"]) == datetime.fromisoformat(PAST)


def test_a_viewer_sees_only_the_job_seeker_who_made_the_link(client, token):
    application(client, token("bob"), "Bob's Application")
    application(client, token(), "Alice's Application")
    link = create(client, token())
    body = journey(client, link["id"], viewer_headers(client, link["id"])).json()
    assert [a["company"] for a in body["applications"]] == ["Alice's Application"]


def test_the_journey_with_no_applications_is_empty(client, token):
    link = create(client, token())
    assert journey(client, link["id"], viewer_headers(client, link["id"])).json()["applications"] == []


def test_a_web_token_or_access_token_cannot_read_a_journey(client, token):
    link = create(client, token())
    secret = client.post("/me/access-tokens", json={"name": "Cron"}, headers=token()).json()["token"]
    for headers in ({}, token(), {"Authorization": f"Bearer {secret}"}):
        assert journey(client, link["id"], headers).status_code == 401


def test_a_viewer_token_for_one_link_cannot_read_another(client, token):
    mine, theirs = create(client, token()), create(client, token("bob"))
    res = journey(client, theirs["id"], viewer_headers(client, mine["id"]))
    assert res.status_code == 401


def test_opening_the_journey_records_when_at_most_once_a_minute(settings, client, token):
    link = create(client, token())
    headers = viewer_headers(client, link["id"])
    journey(client, link["id"], headers)
    [(first,)] = query(settings, "select last_opened_at from share_links")
    assert first is not None

    journey(client, link["id"], headers)
    assert query(settings, "select last_opened_at from share_links") == [(first,)]

    query(settings, "update share_links set last_opened_at = now() - interval '2 minutes'")
    journey(client, link["id"], headers)
    [(later,)] = query(settings, "select last_opened_at from share_links")
    assert later > first - timedelta(minutes=2)


# Cut off on the next load


def test_stopping_a_link_cuts_its_viewers_off(client, token):
    link = create(client, token())
    headers = viewer_headers(client, link["id"])
    client.delete(f"/me/share-links/{link['id']}", headers=token())
    assert journey(client, link["id"], headers).status_code == 404


def test_an_expired_link_cuts_its_viewers_off(settings, client, token):
    link = create(client, token())
    headers = viewer_headers(client, link["id"])
    query(settings, "update share_links set expires_at = now() - interval '1 second'")
    assert journey(client, link["id"], headers).status_code in (401, 410)
    assert client.get(f"/share-links/{link['id']}").json()["expired"] is True


def test_an_expired_link_is_gone_even_for_a_token_that_outlived_it(settings, client, token):
    link = create(client, token())
    query(settings, "update share_links set expires_at = now() + interval '1 hour'")
    headers = viewer_headers(client, link["id"])
    query(settings, "update share_links set expires_at = now() - interval '1 second'")
    assert journey(client, link["id"], headers).status_code == 410


def test_a_new_passcode_cuts_its_viewers_off(client, token):
    link = create(client, token())
    headers = viewer_headers(client, link["id"])
    client.put(f"/me/share-links/{link['id']}/passcode", json={"passcode": "otter-lake-7"}, headers=token())

    res = journey(client, link["id"], headers)
    assert res.status_code == 401
    assert journey(client, link["id"], viewer_headers(client, link["id"], "otter-lake-7")).status_code == 200


def test_stopping_a_link_deletes_its_wrong_tries(settings, client, token):
    link = create(client, token())
    open_link(client, link["id"], "wrong-passcode")
    client.delete(f"/me/share-links/{link['id']}", headers=token())
    assert query(settings, "select count(*) from share_link_wrong_tries") == [(0,)]
