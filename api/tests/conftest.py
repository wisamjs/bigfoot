"""Tests run against the real Supabase Postgres, in a throwaway `bigfoot_test` schema
rebuilt from supabase/migrations before each test."""

import time
from collections.abc import Iterator
from dataclasses import replace
from pathlib import Path

import jwt
import psycopg
import pytest
from fastapi.testclient import TestClient
from psycopg import sql

from app.auth import AUDIENCE, ISSUER
from app.main import create_app
from app.settings import Settings, get_settings

TEST_SCHEMA = "bigfoot_test"
MIGRATIONS = Path(__file__).resolve().parents[2] / "supabase" / "migrations"


@pytest.fixture(scope="session")
def settings() -> Settings:
    return replace(get_settings(), db_schema=TEST_SCHEMA)


@pytest.fixture(autouse=True)
def fresh_schema(settings: Settings) -> None:
    schema = sql.Identifier(TEST_SCHEMA)
    with psycopg.connect(settings.database_url, prepare_threshold=None, autocommit=True) as conn:
        conn.execute(sql.SQL("drop schema if exists {} cascade").format(schema))
        conn.execute(sql.SQL("create schema {}").format(schema))
        conn.execute(sql.SQL("set search_path to {}").format(schema))
        for migration in sorted(MIGRATIONS.glob("*.sql")):
            conn.execute(migration.read_text())


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
