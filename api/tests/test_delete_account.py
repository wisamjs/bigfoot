"""DELETE /me: a job seeker deletes their account and every Application in it (GLOSSARY.md)."""

import hashlib

import psycopg
from psycopg import sql

from tests.conftest import TEST_SCHEMA


def onboard(client, headers):
    assert client.post("/me/onboard", headers=headers).status_code == 200


def applications(client, headers):
    res = client.get("/applications", headers=headers)
    assert res.status_code == 200, res.text
    return res.json()


def add(client, headers, company="Ramp"):
    res = client.post("/applications", json={"company": company, "title": "Engineer"}, headers=headers)
    assert res.status_code == 201, res.text


def query(settings, statement, params=()):
    with psycopg.connect(settings.database_url, prepare_threshold=None, autocommit=True) as conn:
        conn.execute(sql.SQL("set search_path to {}").format(sql.Identifier(TEST_SCHEMA)))
        return conn.execute(statement, params).fetchall()


def test_requires_a_token(client):
    assert client.delete("/me").status_code == 401


def test_deletes_the_job_seeker_and_all_their_applications(settings, client, token):
    onboard(client, token())
    add(client, token())
    for app in applications(client, token()):
        body = {"category": "technical", "title": "Technical", "at": "2026-11-20T17:00:00Z", "how_it_went": "Mine"}
        assert client.post(f"/applications/{app['id']}/interviews", json=body, headers=token()).status_code == 201

    assert client.delete("/me", headers=token()).status_code == 204

    assert applications(client, token()) == []
    assert query(settings, "select 1 from interviews") == []
    assert query(settings, "select 1 from job_seekers where job_seeker_id = 'alice'") == []
    assert query(settings, "select 1 from applications where job_seeker_id = 'alice'") == []


def test_deletes_only_my_data(settings, client, token):
    onboard(client, token("alice"))
    onboard(client, token("bob"))
    add(client, token("bob"), "Bob's own")
    bobs = applications(client, token("bob"))

    assert client.delete("/me", headers=token("alice")).status_code == 204

    assert applications(client, token("bob")) == bobs
    assert query(settings, "select job_seeker_id from job_seekers") == [("bob",)]


def test_is_idempotent(client, token):
    onboard(client, token())
    assert client.delete("/me", headers=token()).status_code == 204
    assert client.delete("/me", headers=token()).status_code == 204


def test_signing_in_again_starts_fresh_with_sample_applications(client, token):
    """Decided 2026-11-11 (BIG-11): a deleted job seeker who signs in again is a new one."""
    onboard(client, token())
    for app in applications(client, token()):
        client.delete(f"/applications/{app['id']}", headers=token())
    add(client, token(), "Kept")

    client.delete("/me", headers=token())
    res = client.post("/me/onboard", headers=token())

    assert res.json() == {"samples_seeded": True}
    apps = applications(client, token())
    assert apps and all(a["is_sample"] for a in apps)


def test_logs_each_deletion_without_personal_information(settings, client, token):
    onboard(client, token("alice"))
    client.delete("/me", headers=token("alice"))
    client.delete("/me", headers=token("alice"))  # nothing left to delete, so nothing logged
    client.delete("/me", headers=token("never-signed-in"))

    rows = query(settings, "select * from account_deletions")
    assert len(rows) == 1
    assert rows[0][1] == hashlib.sha256(b"alice").hexdigest()
    assert "alice" not in repr(rows)
