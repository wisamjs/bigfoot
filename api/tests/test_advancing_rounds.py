"""Advancing a round (GLOSSARY.md): reading Applications moves past Next rounds on."""

from datetime import UTC, datetime, timedelta

import pytest

PAST = (datetime.now(UTC) - timedelta(minutes=5)).isoformat()
FUTURE = (datetime.now(UTC) + timedelta(days=2)).isoformat()


def create(client, headers, **fields):
    res = client.post("/applications", json={"company": "Ramp", "title": "Staff Engineer", **fields}, headers=headers)
    assert res.status_code == 201, res.text
    return res.json()


def listed(client, headers, app):
    res = client.get("/applications", headers=headers)
    assert res.status_code == 200, res.text
    return next(a for a in res.json() if a["id"] == app["id"])


def rounds(app):
    return app["previous_round"], app["next_round"], app["next_round_at"]


def test_a_past_round_becomes_the_previous_round(client, token):
    app = create(client, token(), previous_round="recruiter_screen", next_round="technical", next_round_at=PAST)
    after = listed(client, token(), app)
    assert rounds(after) == ("technical", "waiting", None)
    assert after["updated_at"] > app["updated_at"]


def test_a_future_round_stays(client, token):
    app = create(client, token(), previous_round="recruiter_screen", next_round="technical", next_round_at=FUTURE)
    assert rounds(listed(client, token(), app)) == rounds(app)


@pytest.mark.parametrize("next_round", ["scheduled", None])
def test_a_past_round_of_unknown_kind_keeps_the_previous_round(client, token, next_round):
    app = create(client, token(), previous_round="recruiter_screen", next_round=next_round, next_round_at=PAST)
    assert rounds(listed(client, token(), app)) == ("recruiter_screen", "waiting", None)


def test_waiting_keeps_its_date(client, token):
    app = create(client, token(), next_round="waiting", next_round_at=PAST)
    assert rounds(listed(client, token(), app)) == rounds(app)


@pytest.mark.parametrize("stage", ["offer", "rejected", "withdrawn"])
def test_only_in_progress_applications_advance(client, token, stage):
    app = create(client, token(), stage=stage, next_round="technical", next_round_at=PAST)
    assert rounds(listed(client, token(), app)) == rounds(app)


def test_only_the_callers_applications_advance(client, token):
    bobs = create(client, token("bob"), next_round="technical", next_round_at=PAST)
    assert client.get("/applications", headers=token("alice")).status_code == 200
    # An empty patch returns the row as stored, without advancing it.
    stored = client.patch(f"/applications/{bobs['id']}", json={}, headers=token("bob")).json()
    assert rounds(stored) == rounds(bobs)
