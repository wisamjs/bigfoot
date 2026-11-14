"""Writes the API's OpenAPI schema to api/openapi.json, or with --check fails when that file is
out of date with the code. `npm run openapi` writes it; `npm run check` runs the check, so every
API change shows up in the PR diff as a schema change.

Needs no database or secrets: the schema is built from the code alone.
"""

import difflib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "api"))

from app.main import create_app  # noqa: E402
from app.settings import Settings  # noqa: E402

SCHEMA = ROOT / "api" / "openapi.json"


def current() -> str:
    app = create_app(Settings(database_url="", api_secret="", db_schema="public"))
    return json.dumps(app.openapi(), indent=2, ensure_ascii=False) + "\n"


def main() -> int:
    schema = current()
    if "--check" not in sys.argv:
        SCHEMA.write_text(schema)
        print(f"Wrote {SCHEMA.relative_to(ROOT)}")
        return 0
    committed = SCHEMA.read_text() if SCHEMA.exists() else ""
    if committed == schema:
        return 0
    diff = difflib.unified_diff(
        committed.splitlines(), schema.splitlines(), "api/openapi.json", "code", lineterm="", n=1
    )
    print("\n".join(list(diff)[:60]), file=sys.stderr)
    print("\napi/openapi.json is out of date with the API. Run `npm run openapi` and commit it.", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
