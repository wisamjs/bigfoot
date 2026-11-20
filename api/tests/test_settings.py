"""The API refuses to start with a gap in its environment, and names every problem at once."""

import re
from pathlib import Path

import pytest

from app.settings import REQUIRED_ENV, env_problems, get_settings

COMPLETE = {"DATABASE_URL": "postgresql://db.example/postgres", "API_SECRET": "secret"}
ENV_EXAMPLE = Path(__file__).resolve().parents[2] / ".env.example"


@pytest.fixture(autouse=True)
def fresh_schema() -> None:
    """These tests never touch the database, so skip conftest's schema rebuild."""


def without(*names: str) -> dict[str, str]:
    return {name: value for name, value in COMPLETE.items() if name not in names}


def test_a_complete_environment_has_no_problems():
    assert env_problems(COMPLETE) == []
    settings = get_settings(COMPLETE)
    assert (settings.database_url, settings.api_secret) == (COMPLETE["DATABASE_URL"], COMPLETE["API_SECRET"])
    assert (settings.db_schema, settings.api_docs) == ("public", False)


def test_one_missing_variable_is_named():
    assert env_problems(without("API_SECRET")) == ["Missing: API_SECRET (see .env.example)"]


def test_a_blank_variable_counts_as_missing():
    assert env_problems({**COMPLETE, "DATABASE_URL": " "}) == ["Missing: DATABASE_URL (see .env.example)"]


def test_several_missing_variables_are_named_in_one_message():
    with pytest.raises(RuntimeError) as error:
        get_settings({})
    assert "Missing: DATABASE_URL, API_SECRET (see .env.example)" in str(error.value)


def test_api_docs_must_be_off_in_production():
    docs_on = {**COMPLETE, "API_DOCS": "true"}
    assert env_problems({**docs_on, "VERCEL_ENV": "production"}) == ["API_DOCS must not be true in production"]
    assert env_problems({**docs_on, "VERCEL_ENV": "preview"}) == []
    assert env_problems(docs_on) == []
    assert get_settings(docs_on).api_docs is True


def test_every_problem_is_reported_together():
    with pytest.raises(RuntimeError) as error:
        get_settings({"API_DOCS": "TRUE", "VERCEL_ENV": "production", "DB_SCHEMA": "Not Valid"})
    message = str(error.value)
    assert "Missing: DATABASE_URL, API_SECRET" in message
    assert "API_DOCS must not be true in production" in message
    assert "Invalid DB_SCHEMA: 'Not Valid'" in message


def test_every_required_variable_is_in_env_example():
    documented = set(re.findall(r"^([A-Z][A-Z0-9_]*)=", ENV_EXAMPLE.read_text(), re.MULTILINE))
    assert set(REQUIRED_ENV) <= documented
