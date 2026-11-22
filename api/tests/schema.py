"""Rebuilds a test schema from supabase/migrations: once per test session (conftest.py), and before
smoke, a11y, capture or screenshots start an API (`node scripts/test-schema.mjs rebuild`, which
runs this from api/ as `uv run python -m tests.schema` with TEST_SCHEMA set)."""

import os
import re
from collections.abc import Mapping
from pathlib import Path

import psycopg
from psycopg import sql

MIGRATIONS = Path(__file__).resolve().parents[2] / "supabase" / "migrations"


def schema_name(env: Mapping[str, str] = os.environ) -> str:
    """TEST_SCHEMA, or bigfoot_test; only ever a test schema, never public or anything else."""
    schema = env.get("TEST_SCHEMA", "bigfoot_test")
    if not re.fullmatch(r"bigfoot_test[a-z0-9_]*", schema):
        raise RuntimeError(f"TEST_SCHEMA must start with bigfoot_test, got {schema!r}")
    return schema


def rebuild(database_url: str, schema: str) -> None:
    """Drops `schema` and creates it again with every migration applied."""
    name = sql.Identifier(schema)
    with psycopg.connect(database_url, prepare_threshold=None, autocommit=True) as conn:
        conn.execute(sql.SQL("drop schema if exists {} cascade").format(name))
        conn.execute(sql.SQL("create schema {}").format(name))
        conn.execute(sql.SQL("set search_path to {}").format(name))
        for migration in sorted(MIGRATIONS.glob("*.sql")):
            conn.execute(migration.read_text())


if __name__ == "__main__":
    from app.settings import get_settings

    schema = schema_name()
    rebuild(get_settings().database_url, schema)
    print(f"Rebuilt {schema}")
