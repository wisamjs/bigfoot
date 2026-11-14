"""GET /me: the job seeker's own record, which their data export includes (BIG-12)."""


def test_requires_a_token(client):
    assert client.get("/me").status_code == 401


def test_is_not_found_before_onboarding(client, token):
    assert client.get("/me", headers=token()).status_code == 404


def test_returns_only_the_callers_record(client, token):
    client.post("/me/onboard", headers=token("alice"))
    client.post("/me/onboard", headers=token("bob"))

    res = client.get("/me", headers=token("alice"))

    assert res.status_code == 200, res.text
    me = res.json()
    assert set(me) == {"job_seeker_id", "created_at", "samples_seeded_at", "last_seen_at"}
    assert me["job_seeker_id"] == "alice"
    assert me["samples_seeded_at"] is not None


def test_is_gone_after_deleting_the_account(client, token):
    client.post("/me/onboard", headers=token())
    client.delete("/me", headers=token())
    assert client.get("/me", headers=token()).status_code == 404
