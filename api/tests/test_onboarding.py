"""POST /me/onboard: a new job seeker receives Sample Applications once (GLOSSARY.md)."""

from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, date, datetime

import psycopg
from psycopg import sql

from tests.conftest import MIGRATIONS, TEST_SCHEMA


def onboard(client, headers):
    res = client.post("/me/onboard", headers=headers)
    assert res.status_code == 200, res.text
    return res.json()


def applications(client, headers):
    res = client.get("/applications", headers=headers)
    assert res.status_code == 200, res.text
    return res.json()


def test_requires_a_token(client):
    assert client.post("/me/onboard").status_code == 401


def test_first_time_seeds_sample_applications(client, token):
    assert onboard(client, token()) == {"samples_seeded": True}

    apps = applications(client, token())
    assert 3 <= len(apps) <= 4
    assert all(a["is_sample"] for a in apps)
    assert {(a["status"], a["outcome"]) for a in apps} >= {
        ("in_progress", None),
        ("done", "offer"),
        ("done", "rejected"),
    }
    # One with a completed and an upcoming Interview, one new and Waiting.
    assert any([i["completed"] for i in a["interviews"]] == [True, False] for a in apps)
    assert any(a["is_waiting"] and not a["interviews"] for a in apps)
    # Nothing that looks personal or real.
    assert all(a["posting_url"] is None and a["salary"] is None and a["location"] is None for a in apps)

    today = datetime.now(UTC).date()
    assert all(date.fromisoformat(a["applied_on"]) < today for a in apps)
    # Every Interview has a date and time (docs/adr/0005).
    assert all(i["at"] is not None for a in apps for i in a["interviews"])
    upcoming = [i for a in apps for i in a["interviews"] if not i["completed"]]
    assert upcoming and all(datetime.fromisoformat(i["at"]) > datetime.now(UTC) for i in upcoming)


def test_samples_are_only_for_that_job_seeker(client, token):
    onboard(client, token("alice"))
    assert applications(client, token("bob")) == []


def test_no_reseed_after_deleting_every_application(client, token):
    onboard(client, token())
    for app in applications(client, token()):
        assert client.delete(f"/applications/{app['id']}", headers=token()).status_code == 204

    assert onboard(client, token()) == {"samples_seeded": False}
    assert applications(client, token()) == []


def test_samples_can_be_edited_and_stay_marked(client, token):
    onboard(client, token())
    sample = applications(client, token())[0]
    res = client.patch(f"/applications/{sample['id']}", json={"company": "Mine now"}, headers=token())
    assert res.status_code == 200
    assert res.json()["company"] == "Mine now" and res.json()["is_sample"] is True


def test_is_sample_cannot_be_set_by_the_client(client, token):
    res = client.post(
        "/applications", json={"company": "Ramp", "title": "Engineer", "is_sample": True}, headers=token()
    )
    assert res.status_code == 422


def test_job_seekers_with_applications_are_never_seeded(client, token):
    res = client.post("/applications", json={"company": "Ramp", "title": "Engineer"}, headers=token())
    assert res.status_code == 201

    assert onboard(client, token()) == {"samples_seeded": False}
    apps = applications(client, token())
    assert [a["company"] for a in apps] == ["Ramp"] and apps[0]["is_sample"] is False


def test_job_seekers_from_before_the_migration_are_never_seeded(settings, client, token):
    """The migration records everyone who already has Applications as seeded, so deleting
    them all afterwards doesn't bring samples."""
    migrations = sorted(MIGRATIONS.glob("*.sql"))
    at = next(i for i, m in enumerate(migrations) if m.stem.endswith("create_job_seekers"))
    earlier, job_seekers_migration, later = migrations[:at], migrations[at], migrations[at + 1 :]
    schema = sql.Identifier(TEST_SCHEMA)
    with psycopg.connect(settings.database_url, prepare_threshold=None, autocommit=True) as conn:
        conn.execute(sql.SQL("drop schema {} cascade").format(schema))
        conn.execute(sql.SQL("create schema {}").format(schema))
        conn.execute(sql.SQL("set search_path to {}").format(schema))
        for migration in earlier:
            conn.execute(migration.read_text())
        conn.execute("insert into applications (job_seeker_id, company, title) values ('carol', 'Ramp', 'Engineer')")
        conn.execute(job_seekers_migration.read_text())
        for migration in later:
            conn.execute(migration.read_text())
        conn.execute("delete from applications")

    assert onboard(client, token("carol")) == {"samples_seeded": False}
    assert applications(client, token("carol")) == []


def test_concurrent_calls_seed_once(client, token):
    headers = token()
    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(lambda _: onboard(client, headers), range(8)))

    assert sum(r["samples_seeded"] for r in results) == 1
    apps = applications(client, headers)
    assert 3 <= len(apps) <= 4 and len({a["company"] for a in apps}) == len(apps)
