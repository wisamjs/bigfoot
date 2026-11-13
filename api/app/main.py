"""Bigfoot API: create, read, update and delete a job seeker's Applications."""

import hashlib
import re
from contextlib import asynccontextmanager
from datetime import UTC, date, datetime
from typing import Annotated, Any
from uuid import UUID

from fastapi import FastAPI, HTTPException, Request, status
from psycopg import sql
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool
from pydantic import AfterValidator, BaseModel, ConfigDict, model_validator

from app.auth import JobSeekerId
from app.domain import NextRound, Round, Stage
from app.samples import sample_applications
from app.settings import Settings, get_settings

URL_PATTERN = re.compile(r"^https?://\S+$", re.IGNORECASE)


def _required_text(value: str) -> str:
    value = value.strip()
    if not value:
        raise ValueError("must not be blank")
    return value


def _optional_text(value: str | None) -> str | None:
    value = value.strip() if value is not None else None
    return value or None


def _posting_url(value: str | None) -> str | None:
    value = _optional_text(value)
    if value is not None and not URL_PATTERN.match(value):
        raise ValueError("must be an http(s) URL")
    return value


RequiredText = Annotated[str, AfterValidator(_required_text)]
OptionalText = Annotated[str | None, AfterValidator(_optional_text)]
PostingUrl = Annotated[str | None, AfterValidator(_posting_url)]


class ApplicationCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    company: RequiredText
    title: RequiredText
    posting_url: PostingUrl = None
    location: OptionalText = None
    salary: OptionalText = None
    applied_on: date | None = None  # database default: today
    stage: Stage = "in_progress"
    previous_round: Round | None = None
    next_round: NextRound | None = None
    next_round_at: datetime | None = None


class ApplicationPatch(BaseModel):
    """Only the fields sent are changed; send null to clear an optional field."""

    model_config = ConfigDict(extra="forbid")

    company: RequiredText | None = None
    title: RequiredText | None = None
    posting_url: PostingUrl = None
    location: OptionalText = None
    salary: OptionalText = None
    applied_on: date | None = None
    stage: Stage | None = None
    previous_round: Round | None = None
    next_round: NextRound | None = None
    next_round_at: datetime | None = None

    @model_validator(mode="after")
    def _required_fields_not_cleared(self) -> "ApplicationPatch":
        for name in ("company", "title", "applied_on", "stage"):
            if name in self.model_fields_set and getattr(self, name) is None:
                raise ValueError(f"{name} cannot be cleared")
        return self


class Application(BaseModel):
    id: UUID
    company: str
    title: str
    posting_url: str | None
    location: str | None
    salary: str | None
    applied_on: date
    stage: Stage
    previous_round: Round | None
    next_round: NextRound | None
    next_round_at: datetime | None
    is_sample: bool
    created_at: datetime
    updated_at: datetime


class Onboarding(BaseModel):
    samples_seeded: bool


COLUMNS = sql.SQL(", ").join(sql.Identifier(name) for name in Application.model_fields)


def job_seeker_hash(job_seeker: str) -> str:
    """How account_deletions records a job seeker: a SHA-256 hex digest, never the id itself."""
    return hashlib.sha256(job_seeker.encode()).hexdigest()


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()

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

    app = FastAPI(title="Bigfoot API", lifespan=lifespan)
    app.state.settings = settings

    def pool(request: Request) -> ConnectionPool:
        return request.app.state.pool

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.post("/me/onboard")
    def onboard(request: Request, job_seeker: JobSeekerId) -> Onboarding:
        """Record the job seeker, and give them Sample Applications the first time only.

        Idempotent, and safe to call concurrently: the insert waits on any other transaction
        inserting the same job seeker, and `for update` serializes the seeding check.
        """
        with pool(request).connection() as conn, conn.transaction():
            conn.execute(
                "insert into job_seekers (job_seeker_id) values (%s) on conflict (job_seeker_id) do nothing",
                (job_seeker,),
            )
            row = conn.execute(
                "select samples_seeded_at from job_seekers where job_seeker_id = %s for update", (job_seeker,)
            ).fetchone()
            conn.execute("update job_seekers set last_seen_at = now() where job_seeker_id = %s", (job_seeker,))
            if row["samples_seeded_at"] is not None:
                return Onboarding(samples_seeded=False)
            # A job seeker who already has Applications never needs samples.
            has_applications = conn.execute(
                "select exists (select 1 from applications where job_seeker_id = %s)", (job_seeker,)
            ).fetchone()["exists"]
            if not has_applications:
                for sample in sample_applications(datetime.now(UTC)):
                    values = {**sample, "job_seeker_id": job_seeker, "is_sample": True}
                    conn.execute(
                        sql.SQL("insert into applications ({}) values ({})").format(
                            sql.SQL(", ").join(map(sql.Identifier, values)),
                            sql.SQL(", ").join(sql.Placeholder() * len(values)),
                        ),
                        list(values.values()),
                    )
            conn.execute(
                "update job_seekers set samples_seeded_at = now() where job_seeker_id = %s", (job_seeker,)
            )
        return Onboarding(samples_seeded=not has_applications)

    @app.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
    def delete_account(request: Request, job_seeker: JobSeekerId) -> None:
        """Delete the job seeker and all of their Applications, in one transaction.

        Idempotent: deleting an account that is already gone succeeds and logs nothing. Signing
        in again afterwards makes a new job seeker, who receives Sample Applications again.
        """
        with pool(request).connection() as conn, conn.transaction():
            applications = conn.execute(
                "delete from applications where job_seeker_id = %s", (job_seeker,)
            ).rowcount
            job_seekers = conn.execute(
                "delete from job_seekers where job_seeker_id = %s", (job_seeker,)
            ).rowcount
            if applications or job_seekers:
                conn.execute(
                    "insert into account_deletions (job_seeker_hash) values (%s)", (job_seeker_hash(job_seeker),)
                )

    @app.get("/applications")
    def list_applications(request: Request, job_seeker: JobSeekerId) -> list[Application]:
        with pool(request).connection() as conn:
            rows = conn.execute(
                sql.SQL("select {} from applications where job_seeker_id = %s order by created_at, id").format(COLUMNS),
                (job_seeker,),
            ).fetchall()
        return [Application(**row) for row in rows]

    @app.post("/applications", status_code=status.HTTP_201_CREATED)
    def create_application(request: Request, job_seeker: JobSeekerId, body: ApplicationCreate) -> Application:
        values = body.model_dump(exclude_none=True)
        values["job_seeker_id"] = job_seeker
        query = sql.SQL("insert into applications ({}) values ({}) returning {}").format(
            sql.SQL(", ").join(map(sql.Identifier, values)),
            sql.SQL(", ").join(sql.Placeholder() * len(values)),
            COLUMNS,
        )
        with pool(request).connection() as conn:
            row = conn.execute(query, list(values.values())).fetchone()
        return Application(**row)

    @app.patch("/applications/{application_id}")
    def update_application(
        request: Request, job_seeker: JobSeekerId, application_id: UUID, body: ApplicationPatch
    ) -> Application:
        changes = body.model_dump(exclude_unset=True)
        assignments = [sql.SQL("{} = %s").format(sql.Identifier(name)) for name in changes]
        assignments.append(sql.SQL("updated_at = now()"))
        query = sql.SQL("update applications set {} where id = %s and job_seeker_id = %s returning {}").format(
            sql.SQL(", ").join(assignments), COLUMNS
        )
        with pool(request).connection() as conn:
            row = conn.execute(query, [*changes.values(), application_id, job_seeker]).fetchone()
        if row is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Application not found")
        return Application(**row)

    @app.delete("/applications/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
    def delete_application(request: Request, job_seeker: JobSeekerId, application_id: UUID) -> None:
        with pool(request).connection() as conn:
            deleted = conn.execute(
                "delete from applications where id = %s and job_seeker_id = %s", (application_id, job_seeker)
            ).rowcount
        if not deleted:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Application not found")

    return app
