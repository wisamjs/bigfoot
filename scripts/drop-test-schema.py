"""Drops the test schema named by TEST_SCHEMA. CI runs it after every run, pass or fail, so
each run's bigfoot_test_<run id> schema doesn't outlive it. Run from api/:
`uv run python ../scripts/drop-test-schema.py`."""

import os
import re
import sys
from pathlib import Path

import psycopg
from dotenv import load_dotenv
from psycopg import sql

load_dotenv(Path(__file__).resolve().parents[1] / ".env.local", override=False)

schema = os.environ.get("TEST_SCHEMA", "")
# Only ever a test schema: never public or anything else.
if not re.fullmatch(r"bigfoot_test[a-z0-9_]*", schema):
    sys.exit(f"TEST_SCHEMA must start with bigfoot_test, got {schema!r}")
with psycopg.connect(os.environ["DATABASE_URL"], prepare_threshold=None, autocommit=True) as conn:
    conn.execute(sql.SQL("drop schema if exists {} cascade").format(sql.Identifier(schema)))
print(f"Dropped {schema}")
