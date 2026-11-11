"""Fails when a migration in supabase/migrations/ hasn't been applied to the database at
DATABASE_URL (the dev Supabase project). Run with `npm run db:status`.

Migrations are compared by name, not version: Supabase records the time a migration was
applied (e.g. 20261111192423_rename_owner_id_to_job_seeker_id), not the timestamp in the
repo's filename (20261111180000_rename_owner_id_to_job_seeker_id.sql).

To apply a missing migration, run its SQL against the `public` schema through the Supabase
MCP's apply_migration with the same name, so it is recorded in
supabase_migrations.schema_migrations.
"""

import os
import sys
from pathlib import Path

import psycopg
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env.local", override=False)


def name(stem: str) -> str:
    """`20261111180000_rename_owner_id` -> `rename_owner_id`."""
    return stem.split("_", 1)[1]


in_repo = {name(path.stem) for path in (ROOT / "supabase" / "migrations").glob("*.sql")}

url = os.environ.get("DATABASE_URL")
if not url:
    sys.exit("DATABASE_URL is not set (see .env.example)")
with psycopg.connect(url, prepare_threshold=None) as conn:
    applied = {row[0] for row in conn.execute("select name from supabase_migrations.schema_migrations")}

missing = sorted(in_repo - applied)
unknown = sorted(applied - in_repo)
for migration in unknown:
    print(f"! applied to the database but not in supabase/migrations/: {migration}")
if missing:
    for migration in missing:
        print(f"✗ not applied to the database: {migration}")
    sys.exit(f"\n{len(missing)} migration(s) missing. See scripts/db-status.py for how to apply them.")
print(f"✓ all {len(in_repo)} migrations applied")
