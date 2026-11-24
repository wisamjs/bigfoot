"""Two layers of API tests (CODING_STANDARDS.md, "Which layer an API test goes in"):

- Unit tests: no database. Most tests are these, and `npm run test:api:unit` runs only them.
- Database tests: a test that asks for `client` or `fresh_schema` gets the database, and is marked
  `db` for it. They run against a real Postgres, in a throwaway schema (`bigfoot_test`, or
  TEST_SCHEMA) built from supabase/migrations once per session, and each starts from empty tables.

A test not marked `db` that tries to connect fails, even where .env.local names a database.
"""

import time
from collections.abc import Iterator
from dataclasses import replace

import jwt
import psycopg
import pytest
from fastapi.testclient import TestClient
from psycopg import sql

import app.main
from app.auth import AUDIENCE, ISSUER
from app.main import create_app
from app.settings import Settings, get_settings
from tests.schema import MIGRATIONS, rebuild, schema_name

# `npm run test:api` (scripts/test-schema.mjs) sets one per BIG ticket branch, and CI one per
# run, so runs side by side never share one.
TEST_SCHEMA = schema_name()
__all__ = ["MIGRATIONS", "TEST_SCHEMA"]


@pytest.hookimpl(tryfirst=True)
def pytest_collection_modifyitems(items: list[pytest.Item]) -> None:
    """Marks every test that asks for the database `db`, before `-m "not db"` deselects them."""
    for item in items:
        if "fresh_schema" in getattr(item, "fixturenames", ()):
            item.add_marker(pytest.mark.db)


@pytest.fixture(autouse=True)
def _no_database_unless_asked(request: pytest.FixtureRequest, monkeypatch: pytest.MonkeyPatch) -> None:
    """A unit test that opens a connection or starts the app's pool fails at once, so one that needs
    the database can't pass locally (where .env.local names one) and fail in CI's fast-checks."""
    if request.node.get_closest_marker("db"):
        return

    def refuse(*_args, **_kwargs):
        raise AssertionError("This test isn't marked db: ask for `client` or `fresh_schema` to use the database")

    monkeypatch.setattr(psycopg, "connect", refuse)
    monkeypatch.setattr(app.main, "ConnectionPool", refuse)


@pytest.fixture(scope="session")
def settings() -> Settings:
    return replace(get_settings(), db_schema=TEST_SCHEMA)


@pytest.fixture(scope="session")
def schema_connection(settings: Settings) -> Iterator[tuple[psycopg.Connection, sql.Composed]]:
    """Builds the schema once, and keeps one connection for emptying it before each test."""
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


@pytest.fixture
def fresh_schema(request: pytest.FixtureRequest, settings: Settings, schema_connection) -> Iterator[None]:
    """The database, for a test that asks for it. It starts from empty tables, in one TRUNCATE round
    trip. A rollback per test would be as cheap, but the API commits on its own connections, which
    a rollback can't undo. Truncate also restarts identities, so ids are the same on every run and
    in any order.

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
