"""Access tokens: a job seeker's scripts use the API as them, without a browser (GLOSSARY.md, docs/adr/0003)."""

import hashlib

import psycopg
import pytest
from psycopg import sql

from app.auth import ACCESS_TOKEN_PATTERN, ACCESS_TOKEN_PREFIX, new_access_token
from tests.conftest import TEST_SCHEMA


def query(settings, statement, params=()):
    with psycopg.connect(settings.database_url, prepare_threshold=None, autocommit=True) as conn:
        conn.execute(sql.SQL("set search_path to {}").format(sql.Identifier(TEST_SCHEMA)))
        cursor = conn.execute(statement, params)
        return cursor.fetchall() if cursor.description else []


def create(client, headers, name="Calendar cron job"):
    res = client.post("/me/access-tokens", json={"name": name}, headers=headers)
    assert res.status_code == 201, res.text
    return res.json()


def listed(client, headers):
    res = client.get("/me/access-tokens", headers=headers)
    assert res.status_code == 200, res.text
    return res.json()


def bearer(secret):
    return {"Authorization": f"Bearer {secret}"}


def test_managing_tokens_requires_a_token(client):
    assert client.get("/me/access-tokens").status_code == 401
    assert client.post("/me/access-tokens", json={"name": "x"}).status_code == 401
    assert client.delete("/me/access-tokens/00000000-0000-0000-0000-000000000000").status_code == 401


def test_creating_returns_the_secret_once_and_stores_only_its_hash(settings, client, token):
    created = create(client, token())

    secret = created["token"]
    assert secret.startswith(ACCESS_TOKEN_PREFIX)
    assert len(secret) >= len(ACCESS_TOKEN_PREFIX) + 43  # 32 random bytes, base64url
    assert set(created) == {"id", "name", "created_at", "last_used_at", "expires_at", "expired", "token"}
    assert created["expired"] is False
    assert created["name"] == "Calendar cron job"
    assert created["last_used_at"] is None

    [token_listed] = listed(client, token())
    assert set(token_listed) == {"id", "name", "created_at", "last_used_at", "expires_at", "expired"}
    assert token_listed["id"] == created["id"]

    rows = query(settings, "select * from access_tokens")
    assert secret not in repr(rows)
    assert hashlib.sha256(secret.encode()).hexdigest() in repr(rows)


def test_each_secret_is_different(client, token):
    assert create(client, token())["token"] != create(client, token())["token"]


def test_expires_a_year_after_it_is_created(settings, client, token):
    create(client, token())
    assert query(settings, "select expires_at = created_at + interval '1 year' from access_tokens") == [(True,)]


@pytest.mark.parametrize(
    "body",
    [
        {},
        {"name": ""},
        {"name": "   "},
        {"name": "x" * 101},
        {"name": "x", "scope": "read"},
        {"name": "Laptop \u202e cron job"},  # a right-to-left override shows the name reversed
        {"name": "Lap\u2066top"},
        {"name": "Lap\x00top"},
        {"name": "Lap\ntop"},
    ],
)
def test_rejects_an_invalid_name_or_extra_fields(client, token, body):
    assert client.post("/me/access-tokens", json=body, headers=token()).status_code == 422


def test_accepts_emoji_with_joiners_in_the_name(client, token):
    assert create(client, token(), "Laptop \U0001f468\u200d\U0001f4bb")["name"] == "Laptop \U0001f468\u200d\U0001f4bb"


def test_trims_the_name(client, token):
    assert create(client, token(), "  Laptop  ")["name"] == "Laptop"


def test_lists_only_my_tokens_oldest_first(client, token):
    create(client, token("alice"), "First")
    create(client, token("bob"), "Bob's")
    create(client, token("alice"), "Second")

    assert [t["name"] for t in listed(client, token("alice"))] == ["First", "Second"]
    assert [t["name"] for t in listed(client, token("bob"))] == ["Bob's"]


def test_an_access_token_reads_and_writes_my_applications_and_interviews(client, token):
    headers = bearer(create(client, token("alice"))["token"])

    added = client.post("/applications", json={"company": "Ramp", "title": "Engineer"}, headers=headers)
    assert added.status_code == 201, added.text
    application_id = added.json()["id"]

    changed = client.patch(f"/applications/{application_id}", json={"location": "Remote"}, headers=headers)
    assert changed.status_code == 200, changed.text

    interviews = f"/applications/{application_id}/interviews"
    interview = client.post(interviews, json={"kind": "technical", "at": "2026-11-20T17:00:00Z"}, headers=headers)
    assert interview.status_code == 201, interview.text
    moved = client.patch(f"{interviews}/{interview.json()['id']}", json={"kind": "onsite_loop"}, headers=headers)
    assert moved.status_code == 200, moved.text

    [application] = client.get("/applications", headers=headers).json()
    assert application["location"] == "Remote"
    assert [i["kind"] for i in application["interviews"]] == ["onsite_loop"]
    # The web token for the same job seeker sees the same data: both name alice.
    assert client.get("/applications", headers=token("alice")).json() == [application]

    assert client.delete(f"{interviews}/{interview.json()['id']}", headers=headers).status_code == 204
    assert client.delete(f"/applications/{application_id}", headers=headers).status_code == 204


def test_an_access_token_reaches_nobody_elses_data(client, token):
    alice = bearer(create(client, token("alice"))["token"])
    bobs = client.post("/applications", json={"company": "Bob's", "title": "Engineer"}, headers=token("bob")).json()
    interviews = f"/applications/{bobs['id']}/interviews"
    interview_id = client.post(interviews, json={"kind": "technical"}, headers=token("bob")).json()["id"]
    bobs_interview = f"{interviews}/{interview_id}"

    assert client.get("/applications", headers=alice).json() == []
    assert client.patch(f"/applications/{bobs['id']}", json={"company": "Mine"}, headers=alice).status_code == 404
    assert client.delete(f"/applications/{bobs['id']}", headers=alice).status_code == 404
    assert client.get(interviews, headers=alice).status_code == 404
    assert client.post(interviews, json={"kind": "technical"}, headers=alice).status_code == 404
    assert client.patch(bobs_interview, json={"kind": "onsite_loop"}, headers=alice).status_code == 404
    assert client.delete(bobs_interview, headers=alice).status_code == 404
    [unchanged] = client.get("/applications", headers=token("bob")).json()
    assert unchanged["company"] == "Bob's"
    assert [i["kind"] for i in unchanged["interviews"]] == ["technical"]


def test_using_a_token_updates_last_used(client, token):
    created = create(client, token())
    assert listed(client, token())[0]["last_used_at"] is None

    assert client.get("/applications", headers=bearer(created["token"])).status_code == 200

    first = listed(client, token())[0]["last_used_at"]
    assert first is not None
    assert first >= created["created_at"]

    # Within a minute, a use isn't written again: parallel requests don't queue on the row.
    client.get("/applications", headers=bearer(created["token"]))
    assert listed(client, token())[0]["last_used_at"] == first


def test_last_used_updates_again_after_a_minute(settings, client, token):
    created = create(client, token())
    client.get("/applications", headers=bearer(created["token"]))
    query(settings, "update access_tokens set last_used_at = now() - interval '61 seconds'")
    [(stale,)] = query(settings, "select last_used_at from access_tokens")

    assert client.get("/applications", headers=bearer(created["token"])).status_code == 200

    [(fresh,)] = query(settings, "select last_used_at from access_tokens")
    assert fresh > stale


def test_a_revoked_token_gets_401(client, token):
    created = create(client, token())
    headers = bearer(created["token"])
    assert client.get("/applications", headers=headers).status_code == 200

    assert client.delete(f"/me/access-tokens/{created['id']}", headers=token()).status_code == 204

    assert client.get("/applications", headers=headers).status_code == 401
    assert listed(client, token()) == []


def test_an_expired_token_gets_401_and_stays_listed_until_revoked(settings, client, token):
    created = create(client, token())
    query(settings, "update access_tokens set expires_at = now() - interval '1 second'")

    res = client.get("/applications", headers=bearer(created["token"]))

    assert res.status_code == 401
    assert res.json() == {"detail": "Invalid token"}
    [expired] = listed(client, token())
    assert expired["expired"] is True
    assert expired["last_used_at"] is None  # a refused request is not a use
    assert client.delete(f"/me/access-tokens/{created['id']}", headers=token()).status_code == 204


@pytest.mark.parametrize(
    "secret",
    [
        ACCESS_TOKEN_PREFIX,
        f"{ACCESS_TOKEN_PREFIX}never-issued",
        f"{ACCESS_TOKEN_PREFIX}' or '1'='1",
        f"{ACCESS_TOKEN_PREFIX}{'a' * 43}",
    ],
)
def test_an_unknown_token_gets_401(client, token, secret):
    create(client, token())
    assert client.get("/applications", headers=bearer(secret)).status_code == 401


def test_every_new_token_has_the_accepted_shape():
    assert all(ACCESS_TOKEN_PATTERN.fullmatch(new_access_token()) for _ in range(200))


@pytest.mark.parametrize(
    "secret",
    [
        ACCESS_TOKEN_PREFIX,
        f"{ACCESS_TOKEN_PREFIX}never-issued",
        f"{ACCESS_TOKEN_PREFIX}{'a' * 42}",
        f"{ACCESS_TOKEN_PREFIX}{'a' * 44}",
        f"{ACCESS_TOKEN_PREFIX}{'a' * 42}=",
        f"{ACCESS_TOKEN_PREFIX}{'a' * 10_000}",
    ],
)
def test_a_malformed_token_is_refused_without_a_database_query(client, monkeypatch, secret):
    def no_connection():
        raise AssertionError("a malformed token reached the database")

    monkeypatch.setattr(client.app.state.pool, "connection", no_connection)
    res = client.get("/applications", headers=bearer(secret))
    assert res.status_code == 401
    assert res.json() == {"detail": "Invalid token"}


def test_the_stored_hash_is_not_a_token(settings, client, token):
    create(client, token())
    [(stored,)] = query(settings, "select token_hash from access_tokens")
    assert client.get("/applications", headers=bearer(stored)).status_code == 401
    assert client.get("/applications", headers=bearer(f"{ACCESS_TOKEN_PREFIX}{stored}")).status_code == 401


def test_revoking_someone_elses_token_is_not_found(client, token):
    bobs = create(client, token("bob"))

    assert client.delete(f"/me/access-tokens/{bobs['id']}", headers=token("alice")).status_code == 404

    assert client.get("/applications", headers=bearer(bobs["token"])).status_code == 200


def test_revoking_twice_is_not_found(client, token):
    created = create(client, token())
    assert client.delete(f"/me/access-tokens/{created['id']}", headers=token()).status_code == 204
    assert client.delete(f"/me/access-tokens/{created['id']}", headers=token()).status_code == 404


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("GET", "/me"),
        ("POST", "/me/onboard"),
        ("DELETE", "/me"),
        ("GET", "/me/access-tokens"),
        ("POST", "/me/access-tokens"),
        ("DELETE", "/me/access-tokens/00000000-0000-0000-0000-000000000000"),
    ],
)
def test_an_access_token_cannot_use_account_routes(settings, client, token, method, path):
    """A leaked token can't delete the account or mint tokens that outlive its revocation."""
    client.post("/me/onboard", headers=token())
    secret = create(client, token())["token"]

    res = client.request(method, path, headers=bearer(secret), json={"name": "Another"} if method == "POST" else None)

    assert res.status_code == 403, res.text
    assert query(settings, "select count(*) from access_tokens") == [(1,)]
    assert query(settings, "select count(*) from job_seekers") == [(1,)]


def test_deleting_the_account_deletes_its_tokens_and_no_one_elses(settings, client, token):
    client.post("/me/onboard", headers=token("alice"))
    mine = create(client, token("alice"))
    bobs = create(client, token("bob"))

    assert client.delete("/me", headers=token("alice")).status_code == 204

    assert client.get("/applications", headers=bearer(mine["token"])).status_code == 401
    assert client.get("/applications", headers=bearer(bobs["token"])).status_code == 200
    assert query(settings, "select job_seeker_id from access_tokens") == [("bob",)]


def test_deleting_an_account_that_holds_only_tokens_is_logged(settings, client, token):
    create(client, token("alice"))
    client.delete("/me", headers=token("alice"))
    assert query(settings, "select count(*) from account_deletions") == [(1,)]
