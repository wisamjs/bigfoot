import time
from datetime import UTC, datetime

import pytest

NEW = {"company": "Ramp", "title": "Staff Engineer"}


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
    app = create(client, token(), company="  Ramp  ", location="   ", salary=" $240k + equity ")
    assert app["company"] == "Ramp"
    assert app["location"] is None
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
        {"stage": "offer"},  # replaced by status and outcome
        {"next_round": "technical"},  # replaced by Interviews
        {"job_seeker_id": "mallory"},
    ],
)
def test_create_rejects_invalid_fields(client, token, fields):
    res = client.post("/applications", json={**NEW, **fields}, headers=token())
    assert res.status_code == 422


def test_create_accepts_every_field(client, token):
    app = create(
        client,
        token(),
        posting_url="https://ramp.com/careers/123",
        location="New York",
        applied_on="2026-10-02",
        status="done",
        outcome="position_filled",
    )
    assert (app["status"], app["outcome"]) == ("done", "position_filled")
    assert app["is_waiting"] is False and app["waiting_since"] is None


# Read


def test_list_returns_only_the_callers_applications(client, token):
    create(client, token("alice"), company="Alice Co")
    create(client, token("bob"), company="Bob Co")
    companies = [a["company"] for a in client.get("/applications", headers=token("alice")).json()]
    assert companies == ["Alice Co"]


# Update


def test_patch_changes_only_the_fields_sent(client, token):
    app = create(client, token(), location="Remote")
    res = client.patch(f"/applications/{app['id']}", json={"salary": "$200k"}, headers=token())
    assert res.status_code == 200
    updated = res.json()
    assert updated["salary"] == "$200k"
    assert updated["location"] == "Remote"
    assert updated["updated_at"] > app["updated_at"]


def test_patch_null_clears_an_optional_field(client, token):
    app = create(client, token(), location="Remote")
    res = client.patch(f"/applications/{app['id']}", json={"location": None}, headers=token())
    assert res.json()["location"] is None


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
