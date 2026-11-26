"""Bigfoot API: create, read, update and delete a job seeker's Applications and their Interviews,
and the Access tokens that let their scripts do the same."""

import os
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from psycopg import sql
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from app import monitoring
from app.routes import access_tokens, account, applications, health, interviews, journey, share_links
from app.settings import Settings, get_settings

DESCRIPTION = """\
Bigfoot's data API: a job seeker's Applications and their Interviews, in Supabase Postgres.

Every route but `/health` and a Share link's status and Passcode check needs
`Authorization: Bearer <token>`, and reads and writes only the data of the job seeker the token
names. There are two kinds of token that name a job seeker:

- **Access token** (`AccessToken`): a secret starting with `bigfoot_` that a job seeker creates on
  their Account page and gives a script, such as a cron job. It works on the Applications and
  Interviews routes, expires after a year, and can be revoked
  ([ADR 0003](https://github.com/wisamjs/bigfoot/blob/main/docs/adr/0003-access-tokens-open-fastapi-to-scripts.md)).
- **Web token** (`WebToken`): a short-lived JWT the Next.js server signs for the signed-in job
  seeker. The browser itself never calls this API. Web tokens work on every route, and are the only
  way to use the Account, Access tokens and Share links routes
  ([ADR 0001](https://github.com/wisamjs/bigfoot/blob/main/docs/adr/0001-fastapi-behind-nextjs-with-authjs.md)).

A third kind, the **Viewer token** (`ViewerToken`), names a Share link instead: a Viewer gets one by
typing the link's Passcode, and it reads only that link's Journey
([ADR 0008](https://github.com/wisamjs/bigfoot/blob/main/docs/adr/0008-a-share-link-lets-a-viewer-read-a-journey.md)).

Terms such as Application, Interview, Waiting, Sample Application and Access token are defined in
[GLOSSARY.md](https://github.com/wisamjs/bigfoot/blob/main/GLOSSARY.md).

To try a request, click **Authorize** and paste an Access token from the Account page, or a web
token from `node scripts/dev-api-token.mjs`.
"""

TAGS = [
    {
        "name": "Account",
        "description": "The signed-in job seeker: onboarding, exporting and deleting the account. Web tokens only.",
    },
    {
        "name": "Access tokens",
        "description": "Secrets that let a job seeker's scripts use the API as them. Web tokens only.",
    },
    {
        "name": "Share links",
        "description": "Private links that let a Viewer follow the job seeker's search, each with its own Passcode."
        " Web tokens only.",
    },
    {
        "name": "Journey",
        "description": "A Viewer's side of a Share link: its status and Passcode check need no token; the Journey"
        " needs the Viewer token the Passcode check returns.",
    },
    {"name": "Applications", "description": "Roles the job seeker has applied to, each with its Interviews."},
    {"name": "Interviews", "description": "Conversations in a company's hiring process, one Application each."},
    {"name": "Health", "description": "Whether the API is up. Needs no token."},
]


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    # Before the app exists, so Sentry's FastAPI integration instruments it.
    monitoring.init(settings.sentry_dsn, os.environ)

    def configure(conn: Any) -> None:
        # Supabase's session pooler rejects server-side prepared statements across clients.
        conn.prepare_threshold = None
        conn.execute(sql.SQL("set search_path to {}").format(sql.Identifier(settings.db_schema)))
        # Timestamps go out in UTC whatever the server's default zone; browsers localize them.
        conn.execute("set timezone to 'UTC'")
        conn.commit()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        pool = ConnectionPool(
            settings.database_url,
            min_size=1,
            max_size=5,
            kwargs={"row_factory": dict_row},
            configure=configure,
            open=True,
        )
        app.state.pool = pool
        try:
            yield
        finally:
            pool.close()

    docs = settings.api_docs
    app = FastAPI(
        title="Bigfoot API",
        description=DESCRIPTION,
        version="0.1.0",
        openapi_tags=TAGS,
        lifespan=lifespan,
        # Developers only (Settings.api_docs); app.openapi() still builds the schema when off.
        docs_url="/docs" if docs else None,
        redoc_url="/redoc" if docs else None,
        openapi_url="/openapi.json" if docs else None,
    )
    app.state.settings = settings
    for module in (health, account, access_tokens, share_links, journey, applications, interviews):
        app.include_router(module.router)
    return app
