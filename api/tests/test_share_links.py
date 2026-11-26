"""Share links: what only Postgres and the routes together decide (GLOSSARY.md, docs/adr/0008).
test_models.py checks the label and Passcode rules; test_auth.py the id and the hash."""

import psycopg
import pytest
from argon2 import PasswordHasher
from psycopg import sql

from app import auth
from app.models import SHARE_LINKS_MAX
from tests.conftest import TEST_SCHEMA

PASSCODE = "maple-river-42"
SHARED_BY = "Wisam Zaghal"
LISTED = {"id", "label", "created_at", "passcode_set_at", "expires_at", "last_opened_at", "expired"}


def query(settings, statement, params=()):
    with psycopg.connect(settings.database_url, prepare_threshold=None, autocommit=True) as conn:
        conn.execute(sql.SQL("set search_path to {}").format(sql.Identifier(TEST_SCHEMA)))
        cursor = conn.execute(statement, params)
        return cursor.fetchall() if cursor.description else []


def create(client, headers, label="Mom & Dad", passcode=PASSCODE):
    res = client.post(
        "/me/share-links", json={"label": label, "passcode": passcode, "shared_by": SHARED_BY}, headers=headers
    )
    assert res.status_code == 201, res.text
    return res.json()


def listed(client, headers):
    res = client.get("/me/share-links", headers=headers)
    assert res.status_code == 200, res.text
    return res.json()


def test_managing_share_links_requires_a_token(client):
    assert client.get("/me/share-links").status_code == 401
    assert client.post("/me/share-links", json={"label": "x", "passcode": PASSCODE}).status_code == 401
    assert client.post("/me/share-links/abcdefghij/renew").status_code == 401
    assert client.put("/me/share-links/abcdefghij/passcode", json={"passcode": PASSCODE}).status_code == 401
    assert client.delete("/me/share-links/abcdefghij").status_code == 401


def test_creating_returns_the_passcode_once_and_stores_only_its_argon2id_hash(settings, client, token):
    created = create(client, token())

    assert set(created) == LISTED | {"passcode"}
    assert created["passcode"] == PASSCODE
    assert created["label"] == "Mom & Dad"
    assert created["last_opened_at"] is None
    assert created["expired"] is False
    assert auth.SHARE_LINK_ID_PATTERN.fullmatch(created["id"])

    [link] = listed(client, token())
    assert set(link) == LISTED
    assert link["id"] == created["id"]

    [row] = query(settings, "select * from share_links")
    assert PASSCODE not in repr(row)
    assert PasswordHasher().verify(row[3], PASSCODE)  # passcode_hash
    assert query(settings, "select passcode_version from share_links") == [(1,)]


def test_expires_7_days_after_it_is_created_with_the_passcode_set_then(settings, client, token):
    create(client, token())
    assert query(
        settings,
        "select expires_at = created_at + interval '7 days', passcode_set_at = created_at from share_links",
    ) == [(True, True)]


@pytest.mark.parametrize(
    "body",
    [{}, {"label": "", "passcode": PASSCODE}, {"label": "Mom", "passcode": "short"}, {"label": "Mom"}],
)
def test_rejects_a_missing_label_or_a_short_passcode(client, token, body):
    assert client.post("/me/share-links", json=body, headers=token()).status_code == 422


def test_lists_only_my_links_oldest_first(client, token):
    create(client, token("alice"), "First")
    create(client, token("bob"), "Bob's")
    create(client, token("alice"), "Second")

    assert [link["label"] for link in listed(client, token("alice"))] == ["First", "Second"]
    assert [link["label"] for link in listed(client, token("bob"))] == ["Bob's"]


def test_a_job_seeker_can_have_at_most_10(settings, client, token):
    for n in range(SHARE_LINKS_MAX):
        create(client, token(), f"Link {n}")

    res = client.post(
        "/me/share-links", json={"label": "One more", "passcode": PASSCODE, "shared_by": SHARED_BY}, headers=token()
    )

    assert res.status_code == 409
    assert res.json() == {"detail": "You can share with up to 10 people. Stop sharing one to add another."}
    assert len(listed(client, token())) == SHARE_LINKS_MAX
    # Another job seeker's count is their own.
    create(client, token("bob"))
    # Stopping one makes room again.
    first = listed(client, token())[0]
    assert client.delete(f"/me/share-links/{first['id']}", headers=token()).status_code == 204
    create(client, token(), "One more")


def test_a_taken_id_is_drawn_again(monkeypatch, client, token):
    taken = create(client, token())["id"]
    ids = iter([taken, "fresh-id-1"])
    monkeypatch.setattr(auth, "new_share_link_id", lambda: next(ids))

    assert create(client, token(), "Uncle Sami")["id"] == "fresh-id-1"


def test_gives_up_when_every_id_drawn_is_taken(monkeypatch, client, token):
    taken = create(client, token())["id"]
    monkeypatch.setattr(auth, "new_share_link_id", lambda: taken)

    with pytest.raises(RuntimeError, match="No free Share link id"):
        client.post(
            "/me/share-links",
            json={"label": "Uncle Sami", "passcode": PASSCODE, "shared_by": SHARED_BY},
            headers=token(),
        )


def test_renewing_makes_it_last_7_days_from_now_even_once_expired(settings, client, token):
    created = create(client, token())
    query(settings, "update share_links set expires_at = now() - interval '2 days'")
    assert listed(client, token())[0]["expired"] is True
    [(hash_before,)] = query(settings, "select passcode_hash from share_links")

    res = client.post(f"/me/share-links/{created['id']}/renew", headers=token())

    assert res.status_code == 200, res.text
    renewed = res.json()
    assert set(renewed) == LISTED
    assert renewed["id"] == created["id"]
    assert renewed["expired"] is False
    assert query(
        settings,
        "select expires_at between now() + interval '6 days 23 hours 59 minutes'"
        " and now() + interval '7 days', passcode_hash, passcode_version from share_links",
    ) == [(True, hash_before, 1)]


def test_renewing_sets_7_days_from_now_not_7_more(settings, client, token):
    created = create(client, token())
    query(settings, "update share_links set expires_at = now() + interval '5 days'")

    client.post(f"/me/share-links/{created['id']}/renew", headers=token())

    assert query(settings, "select expires_at < now() + interval '8 days' from share_links") == [(True,)]


def test_changing_the_passcode_returns_it_once_and_bumps_the_version(settings, client, token):
    created = create(client, token())
    query(settings, "update share_links set passcode_set_at = now() - interval '1 day'")
    [(expires_before,)] = query(settings, "select expires_at from share_links")

    res = client.put(f"/me/share-links/{created['id']}/passcode", json={"passcode": "otter-lake-7"}, headers=token())

    assert res.status_code == 200, res.text
    changed = res.json()
    assert changed["passcode"] == "otter-lake-7"
    assert changed["id"] == created["id"]
    [(hashed, version, fresh, expires_after)] = query(
        settings,
        "select passcode_hash, passcode_version, passcode_set_at > now() - interval '1 minute', expires_at"
        " from share_links",
    )
    assert PasswordHasher().verify(hashed, "otter-lake-7")
    assert version == 2
    assert fresh is True
    assert expires_after == expires_before
    assert "passcode" not in listed(client, token())[0]


def test_a_new_passcode_is_checked_like_the_first(client, token):
    created = create(client, token())
    res = client.put(f"/me/share-links/{created['id']}/passcode", json={"passcode": "short"}, headers=token())
    assert res.status_code == 422


def test_stopping_sharing_deletes_the_link(settings, client, token):
    created = create(client, token())

    assert client.delete(f"/me/share-links/{created['id']}", headers=token()).status_code == 204

    assert listed(client, token()) == []
    assert query(settings, "select count(*) from share_links") == [(0,)]
    assert client.delete(f"/me/share-links/{created['id']}", headers=token()).status_code == 404


@pytest.mark.parametrize(
    ("method", "suffix", "body"),
    [("POST", "/renew", None), ("PUT", "/passcode", {"passcode": "otter-lake-7"}), ("DELETE", "", None)],
)
def test_another_job_seekers_link_is_not_found(settings, client, token, method, suffix, body):
    bobs = create(client, token("bob"))
    [before] = query(settings, "select * from share_links")

    res = client.request(method, f"/me/share-links/{bobs['id']}{suffix}", json=body, headers=token("alice"))

    assert res.status_code == 404
    assert res.json() == {"detail": "Share link not found"}
    assert query(settings, "select * from share_links") == [before]


@pytest.mark.parametrize("suffix", ["/renew", "/passcode"])
def test_an_unknown_link_is_not_found(client, token, suffix):
    method = "POST" if suffix == "/renew" else "PUT"
    res = client.request(method, f"/me/share-links/abcdefghij{suffix}", json={"passcode": PASSCODE}, headers=token())
    assert res.status_code == 404


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("GET", "/me/share-links"),
        ("POST", "/me/share-links"),
        ("POST", "/me/share-links/abcdefghij/renew"),
        ("PUT", "/me/share-links/abcdefghij/passcode"),
        ("DELETE", "/me/share-links/abcdefghij"),
    ],
)
def test_an_access_token_cannot_manage_share_links(settings, client, token, method, path):
    secret = client.post("/me/access-tokens", json={"name": "Cron"}, headers=token()).json()["token"]
    body = {"label": "Mom", "passcode": PASSCODE, "shared_by": SHARED_BY} if method in ("POST", "PUT") else None

    res = client.request(method, path, json=body, headers={"Authorization": f"Bearer {secret}"})

    assert res.status_code == 403, res.text
    assert query(settings, "select count(*) from share_links") == [(0,)]


def test_deleting_the_account_deletes_its_share_links_and_no_one_elses(settings, client, token):
    client.post("/me/onboard", headers=token("alice"))
    create(client, token("alice"))
    create(client, token("bob"))

    assert client.delete("/me", headers=token("alice")).status_code == 204

    assert query(settings, "select job_seeker_id from share_links") == [("bob",)]


def test_deleting_an_account_that_holds_only_share_links_is_logged(settings, client, token):
    create(client, token("alice"))
    client.delete("/me", headers=token("alice"))
    assert query(settings, "select count(*) from account_deletions") == [(1,)]
