"""Tests run against the real Supabase Postgres, in a throwaway schema (`bigfoot_test`, or
TEST_SCHEMA). The schema is built from supabase/migrations once per session, and each test starts
from empty tables."""

import time
from collections.abc import Iterator
from dataclasses import replace

import jwt
import psycopg
import pytest
from fastapi.testclient import TestClient
from psycopg import sql

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


@pytest.fixture(scope="session")
def schema_connection(settings: Settings) -> Iterator[tuple[psycopg.Connection, sql.Composed]]:
    """Builds the schema once, and keeps one connection for emptying it before each test. Tests
    that never touch the database (test_monitoring, test_settings) override `fresh_schema`, so
    they never ask for this and never connect."""
    rebuild(settings.database_url, TEST_SCHEMA)
    with psycopg.connect(settings.database_url, prepare_threshold=None, autocommit=True) as conn:
        tables = [
            sql.Identifier(TEST_SCHEMA, row[0])
            for row in conn.execute(
                "select table_name from information_schema.tables"
                " where table_schema = %s and table_type = 'BASE TABLE'",
                (TEST_SCHEMA,),
            )
        ]
        yield conn, sql.SQL("truncate {} restart identity cascade").format(sql.SQL(", ").join(tables))


@pytest.fixture(autouse=True)
def fresh_schema(request: pytest.FixtureRequest, settings: Settings, schema_connection) -> Iterator[None]:
    """Every test starts from empty tables, in one TRUNCATE round trip. A rollback per test would
    be as cheap, but the API commits on its own connections, which a rollback can't undo. Truncate
    also restarts identities, so ids are the same on every run and in any order.

    A test marked `rebuilds_schema` drops and rebuilds the schema itself (it needs a database at
    an earlier migration), so the schema is rebuilt again after it for the tests that follow."""
    conn, truncate = schema_connection
    conn.execute(truncate)
    yield
    if request.node.get_closest_marker("rebuilds_schema"):
        rebuild(settings.database_url, TEST_SCHEMA)


@pytest.fixture(scope="session")
def _app_client(settings: Settings) -> Iterator[TestClient]:
    """One app and one connection pool for the whole session; starting them is a connection
    and a few round trips, which was most of what each test paid once the schema stopped being
    rebuilt. Requests carry no state between tests: a token goes in each request's headers."""
    with TestClient(create_app(settings)) as client:
        yield client


@pytest.fixture
def client(_app_client: TestClient, fresh_schema: None) -> TestClient:
    _app_client.cookies.clear()
    return _app_client


@pytest.fixture
def token(settings: Settings):
    def make(job_seeker: str = "alice", **overrides) -> dict[str, str]:
        claims = {"sub": job_seeker, "aud": AUDIENCE, "iss": ISSUER, "exp": int(time.time()) + 60, **overrides}
        return {"Authorization": f"Bearer {jwt.encode(claims, settings.api_secret, algorithm='HS256')}"}

    return make
