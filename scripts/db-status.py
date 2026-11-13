"""Fails when a migration in supabase/migrations/ hasn't been applied to the database at
DATABASE_URL (the dev Supabase project). Run with `npm run db:status`; add `-- --apply` to apply
the missing ones first. CI on main runs it with --apply, so a merged migration reaches the dev
database on its own (applying before merge would break the main deployment).

Migrations are compared by name, not version: Supabase records the time a migration was
applied (e.g. 20261111192423_rename_owner_id_to_job_seeker_id), not the timestamp in the
repo's filename (20261111180000_rename_owner_id_to_job_seeker_id.sql). --apply records them
the same way, so history matches what the Supabase connector's apply_migration writes.
"""

import os
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path

import psycopg
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env.local", override=False)


def name(stem: str) -> str:
    """`20261111180000_rename_owner_id` -> `rename_owner_id`."""
    return stem.split("_", 1)[1]


in_repo = {name(path.stem): path for path in sorted((ROOT / "supabase" / "migrations").glob("*.sql"))}

url = os.environ.get("DATABASE_URL")
if not url:
    sys.exit("DATABASE_URL is not set (see .env.example)")
# autocommit, so each conn.transaction() below is a real transaction rather than a savepoint.
with psycopg.connect(url, prepare_threshold=None, autocommit=True) as conn:
    applied = {row[0] for row in conn.execute("select name from supabase_migrations.schema_migrations")}
    # In filename order, so a migration never runs before one it builds on.
    missing = [migration for migration in in_repo if migration not in applied]

    if "--apply" in sys.argv[1:]:
        now = datetime.now(UTC)
        for i, migration in enumerate(missing):
            # Versions are unique: one second apart when several apply in the same run.
            version = (now + timedelta(seconds=i)).strftime("%Y%m%d%H%M%S")
            statements = in_repo[migration].read_text()
            # Each in its own transaction: a failure leaves earlier migrations applied and recorded.
            with conn.transaction():
                conn.execute("set local search_path to public")
                conn.execute(statements)
                conn.execute(
                    "insert into supabase_migrations.schema_migrations (version, name, statements) values (%s, %s, %s)",
                    (version, migration, [statements]),
                )
            print(f"→ applied {migration}")
        missing = []

for migration in sorted(applied - in_repo.keys()):
    print(f"! applied to the database but not in supabase/migrations/: {migration}")
if missing:
    for migration in missing:
        print(f"✗ not applied to the database: {migration}")
    sys.exit(f"\n{len(missing)} migration(s) missing. Apply them with `npm run db:status -- --apply`.")
print(f"✓ all {len(in_repo)} migrations applied")
