import pytest

from app.monitoring import environment, job_seeker_tag, scrub, scrub_text, traces_sample_rate

JWT = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.c2lnbmF0dXJl"


@pytest.fixture(autouse=True)
def fresh_schema() -> None:
    """These tests never touch the database, so skip conftest's schema rebuild."""


def test_scrub_text_replaces_emails_and_tokens():
    assert scrub_text(f"Failed for jane.doe+jobs@example.co.uk with Bearer {JWT}") == (
        "Failed for [email] with Bearer [token]"
    )
    assert scrub_text("Application not found") == "Application not found"


def test_scrub_drops_request_details_and_keeps_only_the_hashed_user_id():
    event = {
        "message": "Error for jane@example.com",
        "request": {
            "url": "https://api.example/applications",
            "cookies": {"session": JWT},
            "headers": {"authorization": f"Bearer {JWT}"},
            "data": {"company": "Northwind"},
            "query_string": "email=jane@example.com",
            "env": {"REMOTE_ADDR": "203.0.113.7"},
        },
        "user": {"id": "abc123", "ip_address": "203.0.113.7"},
        "exception": {"values": [{"type": "ValueError", "value": f"token {JWT}"}]},
    }
    assert scrub(event) == {
        "message": "Error for [email]",
        "request": {"url": "https://api.example/applications"},
        "user": {"id": "abc123"},
        "exception": {"values": [{"type": "ValueError", "value": "token [token]"}]},
    }


def test_environment_and_sample_rate():
    assert environment({"VERCEL_ENV": "preview"}) == "preview"
    assert environment({}) == "development"
    assert traces_sample_rate("development") == 1.0
    assert traces_sample_rate("production") == 0.1


def test_job_seeker_tag_matches_the_web_app():
    # src/lib/sentry.test.ts checks the same value.
    assert job_seeker_tag("123") == "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3"
