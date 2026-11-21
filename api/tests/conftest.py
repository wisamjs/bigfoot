"""Tests run against the real Supabase Postgres, in a throwaway schema (`bigfoot_test`, or
TEST_SCHEMA) rebuilt from supabase/migrations before each test."""

import time
from collections.abc import Iterator
from dataclasses import replace

import jwt
import pytest
from fastapi.testclient import TestClient

from app.auth import AUDIENCE, ISSUER
from app.main import create_app
from app.settings import Settings, get_settings
from tests.schema import MIGRATIONS, rebuild, schema_name

# `npm run test:api` (scripts/test-schema.mjs) sets one per BIG ticket branch, and CI one per
# run, so runs side by side never share one.
TEST_SCHEMA = schema_name()
__all__ = ["MIGRATIONS", "TEST_SCHEMA"]


@pytest.fixture(scope="session")
def settings() -> Settings:
    return replace(get_settings(), db_schema=TEST_SCHEMA)


@pytest.fixture(autouse=True)
def fresh_schema(settings: Settings) -> None:
    rebuild(settings.database_url, TEST_SCHEMA)


@pytest.fixture
def client(settings: Settings) -> Iterator[TestClient]:
    with TestClient(create_app(settings)) as client:
        yield client


@pytest.fixture
def token(settings: Settings):
    def make(job_seeker: str = "alice", **overrides) -> dict[str, str]:
        claims = {"sub": job_seeker, "aud": AUDIENCE, "iss": ISSUER, "exp": int(time.time()) + 60, **overrides}
        return {"Authorization": f"Bearer {jwt.encode(claims, settings.api_secret, algorithm='HS256')}"}

    return make
