"""Writes the API's OpenAPI schema to api/openapi.json, or with --check fails when the staged copy
of that file is out of date with the code. `npm run openapi` writes it; `npm run check` (so the
pre-commit hook and CI) runs the check, so every API change shows up in the PR diff as a schema
change.

--check compares the staged copy (the one a commit would contain), not the copy on disk, so a
regenerated but unstaged schema still fails. When the copy on disk is stale too, --check
rewrites it, so the fix is to review it, `git add` it and commit again. It never stages the file.

Runs on every commit, not only API ones: a FastAPI or Pydantic upgrade can change the schema.
Needs no database or secrets: the schema is built from the code alone.
"""

import difflib
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "api"))

from app.main import create_app  # noqa: E402
from app.settings import Settings  # noqa: E402

SCHEMA = ROOT / "api" / "openapi.json"
SCHEMA_PATH = SCHEMA.relative_to(ROOT).as_posix()


def current() -> str:
    app = create_app(Settings(database_url="", api_secret="", db_schema="public"))
    return json.dumps(app.openapi(), indent=2, ensure_ascii=False) + "\n"


def on_disk() -> str:
    return SCHEMA.read_text() if SCHEMA.exists() else ""


def staged() -> str:
    """The copy in git's index (inside a hook, the one being committed), or "" if not staged."""
    result = subprocess.run(["git", "show", f":{SCHEMA_PATH}"], cwd=ROOT, capture_output=True, text=True, check=False)
    return result.stdout if result.returncode == 0 else ""


def main() -> int:
    schema = current()
    if "--check" not in sys.argv:
        SCHEMA.write_text(schema)
        print(f"Wrote {SCHEMA_PATH}")
        return 0
    committed = staged()
    if committed == schema:
        return 0
    diff = difflib.unified_diff(committed.splitlines(), schema.splitlines(), SCHEMA_PATH, "code", lineterm="", n=1)
    print("\n".join(list(diff)[:60]), file=sys.stderr)
    if on_disk() == schema:
        print(f"\n{SCHEMA_PATH} is up to date on disk but not staged. Run `git add {SCHEMA_PATH}`.", file=sys.stderr)
    else:
        SCHEMA.write_text(schema)
        print(
            f"\n{SCHEMA_PATH} was out of date with the API, so it has been rewritten. "
            f"Review it, run `git add {SCHEMA_PATH}` and commit again.",
            file=sys.stderr,
        )
    return 1


if __name__ == "__main__":
    sys.exit(main())
