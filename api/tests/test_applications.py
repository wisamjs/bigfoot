import time
from datetime import UTC, datetime

import psycopg
import pytest
from psycopg import sql

from tests.conftest import TEST_SCHEMA

NEW = {"company": "Ramp", "title": "Staff Engineer"}


def connect(settings):
    conn = psycopg.connect(settings.database_url, prepare_threshold=None, autocommit=True)
    conn.execute(sql.SQL("set search_path to {}").format(sql.Identifier(TEST_SCHEMA)))
    return conn


def create(client, headers, **fields):
    res = client.post("/applications", json={**NEW, **fields}, headers=headers)
    assert res.status_code == 201, res.text
    return res.json()


# Auth


def test_requires_a_token(client):
    assert client.get("/applications").status_code == 401


@pytest.mark.parametrize(
    "overrides",
    [
        {"exp": int(time.time()) - 1},
        {"aud": "someone-else"},
        {"iss": "someone-else"},
    ],
)
def test_rejects_expired_or_foreign_tokens(client, token, overrides):
    assert client.get("/applications", headers=token(**overrides)).status_code == 401


def test_rejects_tokens_signed_with_another_secret(client):
    import jwt

    forged = jwt.encode(
        {"sub": "alice", "aud": "bigfoot-api", "iss": "bigfoot-web", "exp": int(time.time()) + 60},
        "not-the-secret-but-just-as-long-as-one",
        algorithm="HS256",
    )
    assert client.get("/applications", headers={"Authorization": f"Bearer {forged}"}).status_code == 401


# Create


def test_create_applies_defaults(client, token):
    app = create(client, token())
    assert app["status"] == "in_progress" and app["outcome"] is None
    # The UI always sends the job seeker's local date; this server default is the UTC date.
    assert app["applied_on"] == datetime.now(UTC).date().isoformat()
    assert app["interviews"] == []


def test_create_trims_text_and_blanks_become_null(client, token):
    app = create(client, token(), company="  Ramp  ", posting_url="   ", salary=" $240k + equity ")
    assert app["company"] == "Ramp"
    assert app["posting_url"] is None
    assert app["salary"] == "$240k + equity"


@pytest.mark.parametrize(
    "fields",
    [
        {"company": "   "},
        {"title": ""},
        {"posting_url": "ramp.com/jobs"},
        {"posting_url": "javascript:alert(1)"},
        {"status": "saved"},
        {"status": "done"},  # an Outcome is required when Done
        {"status": "done", "outcome": "waiting"},  # Waiting is derived, never an Outcome
        {"outcome": "offer"},  # an Outcome only goes with Done
        {"location": "Toronto"},  # a Location is a choice, not free text
        {"location": "remote", "office_days": 2},  # office days only go with Hybrid
        {"location": "hybrid", "office_days": 5},
        {"location": "hybrid", "office_days": 0},
        {"office_days": 3},
        {"stage": "offer"},  # replaced by status and outcome
        {"next_round": "technical"},  # replaced by Interviews
        {"job_seeker_id": "mallory"},
    ],
)
def test_create_rejects_invalid_fields(client, token, fields):
    res = client.post("/applications", json={**NEW, **fields}, headers=token())
    assert res.status_code == 422


@pytest.mark.parametrize(
    "fields",
    [
        {"company": "x" * 201},
        {"title": "x" * 201},
        {"salary": "x" * 101},
        {"posting_url": "https://example.com/" + "x" * 2029},
    ],
)
def test_create_and_patch_reject_text_that_is_too_long(client, token, fields):
    assert client.post("/applications", json={**NEW, **fields}, headers=token()).status_code == 422
    app = create(client, token())
    assert client.patch(f"/applications/{app['id']}", json=fields, headers=token()).status_code == 422


def test_create_accepts_text_at_the_maximum_length(client, token):
    app = create(
        client,
        token(),
        company="c" * 200,
        title="t" * 200,
        salary="s" * 100,
        posting_url="https://example.com/" + "x" * 2028,
    )
    assert len(app["company"]) == 200 and len(app["posting_url"]) == 2048


def test_the_database_rejects_text_that_is_too_long(settings):
    with connect(settings) as conn, pytest.raises(psycopg.errors.CheckViolation):
        conn.execute("insert into applications (job_seeker_id, company, title) values ('alice', %s, 'x')", ("x" * 201,))


def test_a_job_seeker_can_have_at_most_1000_applications(settings, client, token):
    with connect(settings) as conn:
        conn.execute(
            "insert into applications (job_seeker_id, company, title)"
            " select 'alice', 'c', 't' from generate_series(1, 999)"
        )
    create(client, token())

    res = client.post("/applications", json=NEW, headers=token())

    assert res.status_code == 409
    assert "1,000 Applications" in res.json()["detail"]
    assert client.post("/applications", json=NEW, headers=token("bob")).status_code == 201


def test_create_accepts_every_field(client, token):
    app = create(
        client,
        token(),
        posting_url="https://ramp.com/careers/123",
        location="hybrid",
        office_days=3,
        applied_on="2026-10-02",
        status="done",
        outcome="position_filled",
    )
    assert (app["status"], app["outcome"]) == ("done", "position_filled")
    assert (app["location"], app["office_days"]) == ("hybrid", 3)
    assert app["is_waiting"] is False and app["waiting_since"] is None


# Read


def test_list_returns_only_the_callers_applications(client, token):
    create(client, token("alice"), company="Alice Co")
    create(client, token("bob"), company="Bob Co")
    companies = [a["company"] for a in client.get("/applications", headers=token("alice")).json()]
    assert companies == ["Alice Co"]


# Update


def test_patch_changes_only_the_fields_sent(client, token):
    app = create(client, token(), location="remote")
    res = client.patch(f"/applications/{app['id']}", json={"salary": "$200k"}, headers=token())
    assert res.status_code == 200
    updated = res.json()
    assert updated["salary"] == "$200k"
    assert updated["location"] == "remote"
    assert updated["updated_at"] > app["updated_at"]


def test_patch_null_clears_an_optional_field(client, token):
    app = create(client, token(), location="remote")
    res = client.patch(f"/applications/{app['id']}", json={"location": None}, headers=token())
    assert res.json()["location"] is None


def test_patch_sets_office_days_on_a_hybrid_location(client, token):
    app = create(client, token(), location="hybrid")
    url = f"/applications/{app['id']}"
    res = client.patch(url, json={"office_days": 2}, headers=token())
    assert (res.json()["location"], res.json()["office_days"]) == ("hybrid", 2)


def test_patch_leaving_hybrid_clears_the_office_days(client, token):
    app = create(client, token(), location="hybrid", office_days=3)
    res = client.patch(f"/applications/{app['id']}", json={"location": "in_office"}, headers=token())
    assert (res.json()["location"], res.json()["office_days"]) == ("in_office", None)


def test_patch_refuses_office_days_on_a_location_that_is_not_hybrid(client, token):
    app = create(client, token(), location="remote")
    res = client.patch(f"/applications/{app['id']}", json={"office_days": 2}, headers=token())
    assert res.status_code == 422
    assert "hybrid" in res.json()["detail"]


def test_the_database_refuses_office_days_without_hybrid(settings):
    with connect(settings) as conn, pytest.raises(psycopg.errors.CheckViolation):
        conn.execute(
            "insert into applications (job_seeker_id, company, title, location, office_days)"
            " values ('alice', 'c', 't', 'remote', 2)"
        )


def test_patch_finishes_and_reopens_an_application(client, token):
    app = create(client, token())
    url = f"/applications/{app['id']}"
    done = client.patch(url, json={"status": "done", "outcome": "withdrawn"}, headers=token()).json()
    assert (done["status"], done["outcome"]) == ("done", "withdrawn")
    # The Outcome alone can change while Done.
    assert client.patch(url, json={"outcome": "offer"}, headers=token()).json()["outcome"] == "offer"
    # Reopening clears the Outcome.
    reopened = client.patch(url, json={"status": "in_progress"}, headers=token()).json()
    assert (reopened["status"], reopened["outcome"]) == ("in_progress", None)


@pytest.mark.parametrize(
    "changes", [{"status": "done"}, {"outcome": "offer"}, {"status": "in_progress", "outcome": "offer"}]
)
def test_patch_needs_an_outcome_exactly_when_done(client, token, changes):
    app = create(client, token())
    assert client.patch(f"/applications/{app['id']}", json=changes, headers=token()).status_code == 422


@pytest.mark.parametrize("field", ["company", "title", "applied_on", "status"])
def test_patch_cannot_clear_a_required_field(client, token, field):
    app = create(client, token())
    res = client.patch(f"/applications/{app['id']}", json={field: None}, headers=token())
    assert res.status_code == 422


def test_patch_someone_elses_application_is_not_found(client, token):
    app = create(client, token("alice"))
    res = client.patch(f"/applications/{app['id']}", json={"company": "Mine now"}, headers=token("bob"))
    assert res.status_code == 404
    assert client.get("/applications", headers=token("alice")).json()[0]["company"] == "Ramp"


# Delete


def test_delete_removes_the_application(client, token):
    app = create(client, token())
    assert client.delete(f"/applications/{app['id']}", headers=token()).status_code == 204
    assert client.get("/applications", headers=token()).json() == []


def test_delete_someone_elses_application_is_not_found(client, token):
    app = create(client, token("alice"))
    assert client.delete(f"/applications/{app['id']}", headers=token("bob")).status_code == 404
    assert len(client.get("/applications", headers=token("alice")).json()) == 1


def test_the_api_has_no_stage_or_rounds(client, token):
    app = create(client, token())
    assert not {"stage", "previous_round", "next_round", "next_round_at"} & app.keys()
