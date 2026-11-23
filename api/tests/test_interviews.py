"""Interviews (GLOSSARY.md): the list on an Application, and the derived Waiting data."""

from datetime import UTC, datetime, timedelta

import psycopg
import pytest
from psycopg import sql

from tests.conftest import TEST_SCHEMA

PAST = (datetime.now(UTC) - timedelta(days=3)).replace(microsecond=0)
LONG_PAST = PAST - timedelta(days=4)
FUTURE = (datetime.now(UTC) + timedelta(days=2)).replace(microsecond=0)


def create_application(client, headers, **fields):
    res = client.post("/applications", json={"company": "Ramp", "title": "Staff Engineer", **fields}, headers=headers)
    assert res.status_code == 201, res.text
    return res.json()


def add(client, headers, application, kind="technical", at=PAST):
    body = {"kind": kind, "at": at.isoformat()}
    res = client.post(f"/applications/{application['id']}/interviews", json=body, headers=headers)
    assert res.status_code == 201, res.text
    return res.json()


def reread(client, headers, application):
    res = client.get("/applications", headers=headers)
    assert res.status_code == 200, res.text
    return next(a for a in res.json() if a["id"] == application["id"])


# Create and read


def test_an_interview_has_a_required_kind_and_date_and_time(client, token):
    app = create_application(client, token())
    dated = add(client, token(), app, "technical", FUTURE)
    assert dated["application_id"] == app["id"] and dated["completed"] is False


@pytest.mark.parametrize("at", [None, "2026-11-20", "", "not a date"])
def test_create_needs_a_date_and_time(client, token, at):
    app = create_application(client, token())
    body = {"kind": "technical", **({} if at is None else {"at": at})}
    res = client.post(f"/applications/{app['id']}/interviews", json=body, headers=token())
    assert res.status_code == 422
    assert [e["loc"] for e in res.json()["detail"]] == [["body", "at"]]


def test_every_kind_is_accepted_and_kinds_can_repeat(client, token):
    app = create_application(client, token())
    for kind in [
        "informal_chat", "recruiter_screen", "hiring_manager", "technical", "behavioural", "leadership",
        "onsite_loop", "ai_assisted_coding_challenge", "coding_challenge", "fe_system_design",
        "be_system_design", "technical_deep_dive", "cross_functional_interview",
        "strategy_and_values_alignment", "people_management", "technical",
    ]:  # fmt: skip
        add(client, token(), app, kind)
    assert len(client.get(f"/applications/{app['id']}/interviews", headers=token()).json()) == 16


@pytest.mark.parametrize(
    "body", [{}, {"kind": "waiting"}, {"kind": "scheduled"}, {"kind": None}, {"kind": "technical", "title": "x"}]
)
def test_create_rejects_invalid_interviews(client, token, body):
    app = create_application(client, token())
    assert client.post(f"/applications/{app['id']}/interviews", json=body, headers=token()).status_code == 422


def test_interviews_are_ordered_by_date_alone(client, token):
    app = create_application(client, token())
    add(client, token(), app, "onsite_loop", FUTURE)
    add(client, token(), app, "technical", PAST)
    kinds = [i["kind"] for i in client.get(f"/applications/{app['id']}/interviews", headers=token()).json()]
    assert kinds == ["technical", "onsite_loop"]
    assert [i["kind"] for i in reread(client, token(), app)["interviews"]] == kinds


def test_completed_is_derived_from_the_date(client, token):
    app = create_application(client, token())
    add(client, token(), app, "recruiter_screen", PAST)
    add(client, token(), app, "technical", FUTURE)
    interviews = reread(client, token(), app)["interviews"]
    assert [i["completed"] for i in interviews] == [True, False]


# Update and delete


def test_patch_changes_the_kind_and_date(client, token):
    app = create_application(client, token())
    interview = add(client, token(), app, "technical", FUTURE)
    url = f"/applications/{app['id']}/interviews/{interview['id']}"
    changed = client.patch(url, json={"kind": "onsite_loop"}, headers=token()).json()
    assert changed["kind"] == "onsite_loop" and changed["at"] == interview["at"]
    moved = client.patch(url, json={"at": PAST.isoformat()}, headers=token()).json()
    assert datetime.fromisoformat(moved["at"]) == PAST and moved["completed"] is True
    assert client.patch(url, json={"kind": None}, headers=token()).status_code == 422


@pytest.mark.parametrize("at", [None, "2026-11-20"])
def test_patch_cannot_clear_the_date_or_drop_its_time(client, token, at):
    app = create_application(client, token())
    interview = add(client, token(), app, "technical", FUTURE)
    url = f"/applications/{app['id']}/interviews/{interview['id']}"
    res = client.patch(url, json={"at": at}, headers=token())
    assert res.status_code == 422
    assert [e["loc"] for e in res.json()["detail"]] == [["body", "at"]]
    assert reread(client, token(), app)["interviews"][0]["at"] == interview["at"]


def test_a_missing_interview_is_not_found(client, token):
    app = create_application(client, token())
    url = f"/applications/{app['id']}/interviews/00000000-0000-0000-0000-000000000000"
    assert client.patch(url, json={"kind": "leadership"}, headers=token()).status_code == 404


# Interview notes


def notes_url(app, interview):
    return f"/applications/{app['id']}/interviews/{interview['id']}"


NOTES_FIELDS = ["what_they_asked", "how_it_went", "takeaway"]


@pytest.mark.parametrize("field", NOTES_FIELDS)
def test_each_notes_field_is_optional_and_can_be_added_changed_and_cleared_alone(client, token, field):
    app = create_application(client, token())
    interview = add(client, token(), app, "technical", PAST)
    assert all(interview[f] is None for f in NOTES_FIELDS)
    url = notes_url(app, interview)

    added = client.patch(url, json={field: "Asked about caching.\n\nDraw the diagram first."}, headers=token())
    assert added.json()[field] == "Asked about caching.\n\nDraw the diagram first."
    # Saving one field leaves the other two alone.
    assert all(added.json()[f] is None for f in NOTES_FIELDS if f != field)
    assert reread(client, token(), app)["interviews"][0][field] == added.json()[field]

    assert client.patch(url, json={field: "Went well."}, headers=token()).json()[field] == "Went well."
    # Changing another field leaves the notes alone.
    assert client.patch(url, json={"kind": "leadership"}, headers=token()).json()[field] == "Went well."
    assert client.patch(url, json={field: None}, headers=token()).json()[field] is None


def test_notes_can_be_given_when_adding_an_interview(client, token):
    app = create_application(client, token())
    body = {
        "kind": "technical",
        "at": FUTURE.isoformat(),
        "what_they_asked": "Why us?\nWhy now?",
        "how_it_went": "  Bring ID.\n",
        "takeaway": "Smile",
    }
    res = client.post(f"/applications/{app['id']}/interviews", json=body, headers=token())
    assert res.status_code == 201
    assert [res.json()[f] for f in NOTES_FIELDS] == ["Why us?\nWhy now?", "Bring ID.", "Smile"]


def test_the_old_notes_field_is_refused(client, token):
    app = create_application(client, token())
    url = notes_url(app, add(client, token(), app))
    assert client.patch(url, json={"notes": "Old"}, headers=token()).status_code == 422


@pytest.mark.parametrize("field", NOTES_FIELDS)
def test_blank_notes_are_stored_as_none(client, token, field):
    app = create_application(client, token())
    url = notes_url(app, add(client, token(), app))
    client.patch(url, json={field: "Something"}, headers=token())
    assert client.patch(url, json={field: " \n "}, headers=token()).json()[field] is None


@pytest.mark.parametrize(("field", "limit"), [("what_they_asked", 20_000), ("how_it_went", 20_000), ("takeaway", 500)])
def test_notes_fields_have_limits(client, token, field, limit):
    app = create_application(client, token())
    url = notes_url(app, add(client, token(), app))
    assert client.patch(url, json={field: "é" * limit}, headers=token()).json()[field] == "é" * limit
    assert client.patch(url, json={field: "x" * (limit + 1)}, headers=token()).status_code == 422
    assert reread(client, token(), app)["interviews"][0][field] == "é" * limit


def test_deleting_an_interview_deletes_all_its_notes(client, token, settings):
    app = create_application(client, token())
    kept = add(client, token(), app, "recruiter_screen")
    gone = add(client, token(), app, "technical")
    notes = {"what_they_asked": "Q", "how_it_went": "Kept", "takeaway": "T"}
    client.patch(notes_url(app, kept), json=notes, headers=token())
    client.patch(notes_url(app, gone), json={f: "Gone" for f in NOTES_FIELDS}, headers=token())
    assert client.delete(notes_url(app, gone), headers=token()).status_code == 204
    with psycopg.connect(settings.database_url, prepare_threshold=None) as conn:
        conn.execute(sql.SQL("set search_path to {}").format(sql.Identifier(TEST_SCHEMA)))
        rows = conn.execute("select what_they_asked, how_it_went, takeaway from interviews").fetchall()
    assert rows == [("Q", "Kept", "T")]


def test_delete_cancels_an_interview(client, token):
    app = create_application(client, token())
    interview = add(client, token(), app, "technical", FUTURE)
    assert client.delete(f"/applications/{app['id']}/interviews/{interview['id']}", headers=token()).status_code == 204
    assert reread(client, token(), app)["interviews"] == []
    assert client.delete(f"/applications/{app['id']}/interviews/{interview['id']}", headers=token()).status_code == 404


def test_deleting_an_application_deletes_its_interviews(client, token, settings):
    import psycopg

    from tests.conftest import TEST_SCHEMA

    app = create_application(client, token())
    add(client, token(), app)
    assert client.delete(f"/applications/{app['id']}", headers=token()).status_code == 204
    with psycopg.connect(settings.database_url, prepare_threshold=None) as conn:
        conn.execute(f'set search_path to "{TEST_SCHEMA}"')
        assert conn.execute("select count(*) from interviews").fetchone()[0] == 0


# Ownership


def test_other_job_seekers_cannot_touch_interviews(client, token):
    app = create_application(client, token("alice"))
    interview = add(client, token("alice"), app)
    base = f"/applications/{app['id']}/interviews"
    assert client.get(base, headers=token("bob")).status_code == 404
    body = {"kind": "technical", "at": FUTURE.isoformat()}
    assert client.post(base, json=body, headers=token("bob")).status_code == 404
    assert (
        client.patch(f"{base}/{interview['id']}", json={"kind": "leadership"}, headers=token("bob")).status_code == 404
    )
    assert client.delete(f"{base}/{interview['id']}", headers=token("bob")).status_code == 404
    assert len(reread(client, token("alice"), app)["interviews"]) == 1


def test_an_interview_is_found_only_under_its_own_application(client, token):
    mine = create_application(client, token())
    other = create_application(client, token(), company="Other")
    interview = add(client, token(), mine)
    url = f"/applications/{other['id']}/interviews/{interview['id']}"
    assert client.patch(url, json={"kind": "leadership"}, headers=token()).status_code == 404
    assert client.delete(url, headers=token()).status_code == 404


# Waiting


def test_a_new_application_is_waiting_since_it_was_applied(client, token):
    app = create_application(client, token(), applied_on="2026-10-02")
    assert app["is_waiting"] is True and app["waiting_since"] == "2026-10-02"


def test_waiting_since_the_last_completed_interview(client, token):
    app = create_application(client, token(), applied_on="2026-10-02")
    add(client, token(), app, "recruiter_screen", LONG_PAST)
    add(client, token(), app, "technical", PAST)
    waiting = reread(client, token(), app)
    assert waiting["is_waiting"] is True
    assert datetime.fromisoformat(waiting["waiting_since"]) == PAST


def test_an_upcoming_interview_ends_the_wait(client, token):
    app = create_application(client, token())
    add(client, token(), app, "technical", FUTURE)
    after = reread(client, token(), app)
    assert after["is_waiting"] is False and after["waiting_since"] is None


def test_cancelling_the_upcoming_interview_resumes_the_wait(client, token):
    app = create_application(client, token())
    add(client, token(), app, "recruiter_screen", PAST)
    upcoming = add(client, token(), app, "technical", FUTURE)
    client.delete(f"/applications/{app['id']}/interviews/{upcoming['id']}", headers=token())
    after = reread(client, token(), app)
    assert after["is_waiting"] is True and datetime.fromisoformat(after["waiting_since"]) == PAST


def test_a_done_application_is_not_waiting(client, token):
    app = create_application(client, token(), status="done", outcome="rejected")
    assert app["is_waiting"] is False and app["waiting_since"] is None


def test_nothing_is_written_on_read(client, token, settings):
    import psycopg

    from tests.conftest import TEST_SCHEMA

    app = create_application(client, token())
    add(client, token(), app, "technical", PAST)

    def stored():
        with psycopg.connect(settings.database_url, prepare_threshold=None) as conn:
            conn.execute(f'set search_path to "{TEST_SCHEMA}"')
            return conn.execute("select a.updated_at, i.updated_at from applications a, interviews i").fetchall()

    before = stored()
    client.get("/applications", headers=token())
    assert stored() == before


def test_an_application_can_have_at_most_50_interviews(settings, client, token):
    application = create_application(client, token())
    with psycopg.connect(settings.database_url, prepare_threshold=None, autocommit=True) as conn:
        conn.execute(sql.SQL("set search_path to {}").format(sql.Identifier(TEST_SCHEMA)))
        conn.execute(
            "insert into interviews (application_id, kind, at)"
            " select %s, 'technical', now() from generate_series(1, 49)",
            (application["id"],),
        )
    add(client, token(), application)

    body = {"kind": "technical", "at": FUTURE.isoformat()}
    res = client.post(f"/applications/{application['id']}/interviews", json=body, headers=token())

    assert res.status_code == 409
    assert "50 Interviews" in res.json()["detail"]
    other = create_application(client, token())
    add(client, token(), other)
