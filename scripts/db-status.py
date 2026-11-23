"""Fails when a migration in supabase/migrations/ hasn't been applied to a database.

- `npm run db:status` checks the database at DATABASE_URL (the dev Supabase project locally);
  add `-- --apply` to apply the missing ones first. CI on main runs it with --apply, so a merged
  migration reaches the dev database on its own (applying before merge would break main).
- `--deploy` is the build step of the `bigfoot-api` Vercel project (api/pyproject.toml). It applies
  the missing migrations to the database at MIGRATIONS_DATABASE_URL, which only Vercel holds, so a
  merged migration reaches prod before the API deployment that needs it goes live. A failure fails
  the build, and the previous deployment keeps serving. See docs/runbooks/database.md.

Migrations are compared by name, not version: Supabase records the time a migration was
applied (e.g. 20261111192423_rename_owner_id_to_job_seeker_id), not the timestamp in the
repo's filename (20261111180000_rename_owner_id_to_job_seeker_id.sql). --apply records them
the same way, so history matches what the Supabase connector's apply_migration writes.
"""

import os
import sys
from collections.abc import Mapping
from datetime import UTC, datetime, timedelta
from pathlib import Path

import psycopg
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS = ROOT / "supabase" / "migrations"

# Any constant works; it only has to be the same for every run. Held while applying, so two
# deployments (or CI runs) building at once never apply the same migration twice.
APPLY_LOCK = 7_101_971


def name(stem: str) -> str:
    """`20261111180000_rename_owner_id` -> `rename_owner_id`."""
    return stem.split("_", 1)[1]


def deploy_target(env: Mapping[str, str]) -> str | None:
    """The database a Vercel build applies migrations to, or None to apply nothing.

    Production must have MIGRATIONS_DATABASE_URL: a build without it fails rather than deploy an
    API that may need a migration prod lacks. A Preview build applies only when its environment
    sets one (to test this step against dev). Builds off Vercel apply nothing.
    """
    url = env.get("MIGRATIONS_DATABASE_URL", "").strip()
    match env.get("VERCEL_ENV"):
        case "production":
            if not url:
                raise SystemExit(
                    "MIGRATIONS_DATABASE_URL is not set in this Vercel project's Production environment, "
                    "so migrations can't be applied before deploying (see docs/runbooks/database.md)"
                )
            return url
        case "preview":
            return url or None
        case _:
            return None


def apply(conn: psycopg.Connection, migrations: dict[str, Path], missing: list[str]) -> None:
    now = datetime.now(UTC)
    for i, migration in enumerate(missing):
        # Versions are unique: one second apart when several apply in the same run.
        version = (now + timedelta(seconds=i)).strftime("%Y%m%d%H%M%S")
        statements = migrations[migration].read_text()
        # Each in its own transaction: a failure leaves earlier migrations applied and recorded.
        with conn.transaction():
            conn.execute("set local search_path to public")
            conn.execute(statements)
            conn.execute(
                "insert into supabase_migrations.schema_migrations (version, name, statements) values (%s, %s, %s)",
                (version, migration, [statements]),
            )
        print(f"→ applied {migration}")


def applied_names(conn: psycopg.Connection) -> set[str]:
    return {row[0] for row in conn.execute("select name from supabase_migrations.schema_migrations")}


def run(url: str, apply_missing: bool) -> list[str]:
    """Applies the missing migrations when asked; returns the ones still missing."""
    in_repo = {name(path.stem): path for path in sorted(MIGRATIONS.glob("*.sql"))}
    # autocommit, so each conn.transaction() is a real transaction rather than a savepoint.
    with psycopg.connect(url, prepare_threshold=None, autocommit=True) as conn:
        if apply_missing:
            conn.execute("select pg_advisory_lock(%s)", (APPLY_LOCK,))
        applied = applied_names(conn)
        # In filename order, so a migration never runs before one it builds on.
        missing = [migration for migration in in_repo if migration not in applied]
        if apply_missing:
            apply(conn, in_repo, missing)
            missing = []
    for migration in sorted(applied - in_repo.keys()):
        print(f"! applied to the database but not in supabase/migrations/: {migration}")
    if not missing:
        print(f"✓ all {len(in_repo)} migrations applied")
    return missing


def main(argv: list[str]) -> None:
    if "--deploy" in argv:
        url = deploy_target(os.environ)
        if url is None:
            env = os.environ.get("VERCEL_ENV", "not on Vercel")
            print(f"No migrations applied: this build has no MIGRATIONS_DATABASE_URL (VERCEL_ENV: {env})")
            return
        run(url, apply_missing=True)
        return

    load_dotenv(ROOT / ".env.local", override=False)
    url = os.environ.get("DATABASE_URL")
    if not url:
        sys.exit("DATABASE_URL is not set (see .env.example)")
    missing = run(url, apply_missing="--apply" in argv)
    if missing:
        for migration in missing:
            print(f"✗ not applied to the database: {migration}")
        sys.exit(f"\n{len(missing)} migration(s) missing. Apply them with `npm run db:status -- --apply`.")


if __name__ == "__main__":
    main(sys.argv[1:])
