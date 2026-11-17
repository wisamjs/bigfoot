import os
import re
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

# Share the Next.js app's .env.local (repo root); real environment variables win.
load_dotenv(Path(__file__).resolve().parents[2] / ".env.local", override=False)


@dataclass(frozen=True)
class Settings:
    database_url: str
    api_secret: str
    db_schema: str
    # Serve /docs, /redoc and /openapi.json. Off unless API_DOCS=true: they are for developers.
    api_docs: bool = False


def get_settings() -> Settings:
    missing = [name for name in ("DATABASE_URL", "API_SECRET") if not os.environ.get(name)]
    if missing:
        raise RuntimeError(f"Missing environment variables: {', '.join(missing)} (see .env.example)")
    schema = os.environ.get("DB_SCHEMA", "public")
    if not re.fullmatch(r"[a-z_][a-z0-9_]*", schema):
        raise RuntimeError(f"Invalid DB_SCHEMA: {schema!r}")
    return Settings(
        database_url=os.environ["DATABASE_URL"],
        api_secret=os.environ["API_SECRET"],
        db_schema=schema,
        api_docs=os.environ.get("API_DOCS", "").lower() == "true",
    )
