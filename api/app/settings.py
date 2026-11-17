import os
import re
from collections.abc import Mapping
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
    # Serve /docs, /redoc and /openapi.json. Off unless API_DOCS=true: they are for developers,
    # since the browser never calls the API (docs/adr/0001).
    api_docs: bool = False


# Variables the API can't run without. Must match .env.example (tests/test_settings.py); the
# Next.js app keeps its own list in src/lib/env.ts.
REQUIRED_ENV = ("DATABASE_URL", "API_SECRET")


def env_problems(env: Mapping[str, str]) -> list[str]:
    """Everything wrong with the environment; empty when it is fine."""
    problems = []
    missing = [name for name in REQUIRED_ENV if not env.get(name, "").strip()]
    if missing:
        problems.append(f"Missing: {', '.join(missing)} (see .env.example)")
    # Vercel's Production environment. Previews and local runs may serve the docs.
    if env.get("VERCEL_ENV") == "production" and _api_docs(env):
        problems.append("API_DOCS must not be true in production")
    schema = env.get("DB_SCHEMA", "public")
    if not re.fullmatch(r"[a-z_][a-z0-9_]*", schema):
        problems.append(f"Invalid DB_SCHEMA: {schema!r}")
    return problems


def _api_docs(env: Mapping[str, str]) -> bool:
    return env.get("API_DOCS", "").strip().lower() == "true"


def get_settings(env: Mapping[str, str] | None = None) -> Settings:
    """The API's settings, read at startup. Raises one error naming every problem."""
    env = os.environ if env is None else env
    problems = env_problems(env)
    if problems:
        raise RuntimeError("Invalid environment variables:\n" + "\n".join(f"- {problem}" for problem in problems))
    return Settings(
        database_url=env["DATABASE_URL"],
        api_secret=env["API_SECRET"],
        db_schema=env.get("DB_SCHEMA", "public"),
        api_docs=_api_docs(env),
    )
