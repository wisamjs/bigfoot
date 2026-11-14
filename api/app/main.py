"""Bigfoot API: create, read, update and delete a job seeker's Applications and their Interviews."""

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
from app.domain import InterviewKind, Outcome, Status
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
    status: Status = "in_progress"
    outcome: Outcome | None = None

    @model_validator(mode="after")
    def _outcome_matches_status(self) -> "ApplicationCreate":
        _check_outcome(self.status, self.outcome)
        return self


class ApplicationPatch(BaseModel):
    """Only the fields sent are changed; send null to clear an optional field.

    Setting the status to in_progress without an outcome clears the outcome (reopening).
    """

    model_config = ConfigDict(extra="forbid")

    company: RequiredText | None = None
    title: RequiredText | None = None
    posting_url: PostingUrl = None
    location: OptionalText = None
    salary: OptionalText = None
    applied_on: date | None = None
    status: Status | None = None
    outcome: Outcome | None = None

    @model_validator(mode="after")
    def _required_fields_not_cleared(self) -> "ApplicationPatch":
        for name in ("company", "title", "applied_on", "status"):
            if name in self.model_fields_set and getattr(self, name) is None:
                raise ValueError(f"{name} cannot be cleared")
        return self


def _check_outcome(status: str, outcome: str | None) -> None:
    if status == "done" and outcome is None:
        raise ValueError("outcome is required when the status is done")
    if status == "in_progress" and outcome is not None:
        raise ValueError("outcome is only for a done application")


class InterviewCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: InterviewKind
    at: datetime | None = None


class InterviewPatch(BaseModel):
    """Only the fields sent are changed; send null for `at` to clear the date."""

    model_config = ConfigDict(extra="forbid")

    kind: InterviewKind | None = None
    at: datetime | None = None

    @model_validator(mode="after")
    def _kind_not_cleared(self) -> "InterviewPatch":
        if "kind" in self.model_fields_set and self.kind is None:
            raise ValueError("kind cannot be cleared")
        return self


class Interview(BaseModel):
    id: UUID
    application_id: UUID
    kind: InterviewKind
    at: datetime | None
    # Derived, never stored: the date is in the past, or there is no date.
    completed: bool
    created_at: datetime
    updated_at: datetime


class Application(BaseModel):
    id: UUID
    company: str
    title: str
    posting_url: str | None
    location: str | None
    salary: str | None
    applied_on: date
    status: Status
    outcome: Outcome | None
    # Ordered by date, undated first.
    interviews: list[Interview]
    # Derived (GLOSSARY.md, Waiting): In Progress with no upcoming Interview, including a new one.
    is_waiting: bool
    # While waiting: when the last dated, completed Interview happened (a timestamp), or else the
    # applied date. Null when not waiting.
    waiting_since: datetime | date | None
    is_sample: bool
    created_at: datetime
    updated_at: datetime


class Onboarding(BaseModel):
    samples_seeded: bool


APPLICATION_COLUMNS = (
    "id, company, title, posting_url, location, salary, applied_on, status, outcome, is_sample, created_at, updated_at"
)
COLUMNS = sql.SQL(APPLICATION_COLUMNS)
INTERVIEW_COLUMNS = sql.SQL("id, application_id, kind, at, created_at, updated_at")
# Undated Interviews sort first (GLOSSARY.md, Interview).
INTERVIEW_ORDER = sql.SQL("order by at nulls first, created_at, id")


def _interview(row: dict[str, Any], now: datetime) -> Interview:
    return Interview(**row, completed=row["at"] is None or row["at"] <= now)


def _application(row: dict[str, Any], interviews: list[dict[str, Any]], now: datetime) -> Application:
    views = [_interview(i, now) for i in interviews]
    waiting = row["status"] == "in_progress" and not any(not i.completed for i in views)
    since: datetime | date | None = None
    if waiting:
        dated = [i.at for i in views if i.at is not None]
        since = max(dated) if dated else row["applied_on"]
    return Application(**row, interviews=views, is_waiting=waiting, waiting_since=since)


def _applications(conn: Any, rows: list[dict[str, Any]]) -> list[Application]:
    """Attach each row's Interviews and derived Waiting data, reading the clock once."""
    now = datetime.now(UTC)
    by_application: dict[UUID, list[dict[str, Any]]] = {row["id"]: [] for row in rows}
    if rows:
        interviews = conn.execute(
            sql.SQL("select {} from interviews where application_id = any(%s) {}").format(
                INTERVIEW_COLUMNS, INTERVIEW_ORDER
            ),
            ([row["id"] for row in rows],),
        ).fetchall()
        for interview in interviews:
            by_application[interview["application_id"]].append(interview)
    return [_application(row, by_application[row["id"]], now) for row in rows]


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
                    interviews = sample.pop("interviews")
                    values = {**sample, "job_seeker_id": job_seeker, "is_sample": True}
                    application_id = conn.execute(
                        sql.SQL("insert into applications ({}) values ({}) returning id").format(
                            sql.SQL(", ").join(map(sql.Identifier, values)),
                            sql.SQL(", ").join(sql.Placeholder() * len(values)),
                        ),
                        list(values.values()),
                    ).fetchone()["id"]
                    for kind, at in interviews:
                        conn.execute(
                            "insert into interviews (application_id, kind, at) values (%s, %s, %s)",
                            (application_id, kind, at),
                        )
            conn.execute("update job_seekers set samples_seeded_at = now() where job_seeker_id = %s", (job_seeker,))
        return Onboarding(samples_seeded=not has_applications)

    @app.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
    def delete_account(request: Request, job_seeker: JobSeekerId) -> None:
        """Delete the job seeker and all of their Applications, in one transaction.

        Idempotent: deleting an account that is already gone succeeds and logs nothing. Signing
        in again afterwards makes a new job seeker, who receives Sample Applications again.
        """
        with pool(request).connection() as conn, conn.transaction():
            applications = conn.execute("delete from applications where job_seeker_id = %s", (job_seeker,)).rowcount
            job_seekers = conn.execute("delete from job_seekers where job_seeker_id = %s", (job_seeker,)).rowcount
            if applications or job_seekers:
                conn.execute(
                    "insert into account_deletions (job_seeker_hash) values (%s)", (job_seeker_hash(job_seeker),)
                )

    def owned(conn: Any, job_seeker: str, application_id: UUID) -> None:
        """404 unless the Application is the job seeker's."""
        found = conn.execute(
            "select 1 from applications where id = %s and job_seeker_id = %s", (application_id, job_seeker)
        ).fetchone()
        if found is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Application not found")

    @app.get("/applications")
    def list_applications(request: Request, job_seeker: JobSeekerId) -> list[Application]:
        with pool(request).connection() as conn, conn.transaction():
            rows = conn.execute(
                sql.SQL("select {} from applications where job_seeker_id = %s order by created_at, id").format(COLUMNS),
                (job_seeker,),
            ).fetchall()
            return _applications(conn, rows)

    @app.post("/applications", status_code=status.HTTP_201_CREATED)
    def create_application(request: Request, job_seeker: JobSeekerId, body: ApplicationCreate) -> Application:
        values = body.model_dump(exclude_none=True)
        values["job_seeker_id"] = job_seeker
        query = sql.SQL("insert into applications ({}) values ({}) returning {}").format(
            sql.SQL(", ").join(map(sql.Identifier, values)),
            sql.SQL(", ").join(sql.Placeholder() * len(values)),
            COLUMNS,
        )
        with pool(request).connection() as conn, conn.transaction():
            row = conn.execute(query, list(values.values())).fetchone()
            return _applications(conn, [row])[0]

    @app.patch("/applications/{application_id}")
    def update_application(
        request: Request, job_seeker: JobSeekerId, application_id: UUID, body: ApplicationPatch
    ) -> Application:
        changes = body.model_dump(exclude_unset=True)
        with pool(request).connection() as conn, conn.transaction():
            current = conn.execute(
                "select status, outcome from applications where id = %s and job_seeker_id = %s for update",
                (application_id, job_seeker),
            ).fetchone()
            if current is None:
                raise HTTPException(status.HTTP_404_NOT_FOUND, "Application not found")
            if changes.get("status") == "in_progress" and "outcome" not in changes:
                changes["outcome"] = None  # reopening
            try:
                _check_outcome(changes.get("status", current["status"]), changes.get("outcome", current["outcome"]))
            except ValueError as error:
                raise HTTPException(422, str(error)) from error
            assignments = [sql.SQL("{} = %s").format(sql.Identifier(name)) for name in changes]
            assignments.append(sql.SQL("updated_at = now()"))
            row = conn.execute(
                sql.SQL("update applications set {} where id = %s returning {}").format(
                    sql.SQL(", ").join(assignments), COLUMNS
                ),
                [*changes.values(), application_id],
            ).fetchone()
            return _applications(conn, [row])[0]

    @app.delete("/applications/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
    def delete_application(request: Request, job_seeker: JobSeekerId, application_id: UUID) -> None:
        with pool(request).connection() as conn:
            deleted = conn.execute(
                "delete from applications where id = %s and job_seeker_id = %s", (application_id, job_seeker)
            ).rowcount
        if not deleted:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Application not found")

    @app.get("/applications/{application_id}/interviews")
    def list_interviews(request: Request, job_seeker: JobSeekerId, application_id: UUID) -> list[Interview]:
        with pool(request).connection() as conn, conn.transaction():
            owned(conn, job_seeker, application_id)
            rows = conn.execute(
                sql.SQL("select {} from interviews where application_id = %s {}").format(
                    INTERVIEW_COLUMNS, INTERVIEW_ORDER
                ),
                (application_id,),
            ).fetchall()
        now = datetime.now(UTC)
        return [_interview(row, now) for row in rows]

    @app.post("/applications/{application_id}/interviews", status_code=status.HTTP_201_CREATED)
    def create_interview(
        request: Request, job_seeker: JobSeekerId, application_id: UUID, body: InterviewCreate
    ) -> Interview:
        with pool(request).connection() as conn, conn.transaction():
            owned(conn, job_seeker, application_id)
            row = conn.execute(
                sql.SQL("insert into interviews (application_id, kind, at) values (%s, %s, %s) returning {}").format(
                    INTERVIEW_COLUMNS
                ),
                (application_id, body.kind, body.at),
            ).fetchone()
        return _interview(row, datetime.now(UTC))

    @app.patch("/applications/{application_id}/interviews/{interview_id}")
    def update_interview(
        request: Request, job_seeker: JobSeekerId, application_id: UUID, interview_id: UUID, body: InterviewPatch
    ) -> Interview:
        changes = body.model_dump(exclude_unset=True)
        assignments = [sql.SQL("{} = %s").format(sql.Identifier(name)) for name in changes]
        assignments.append(sql.SQL("updated_at = now()"))
        with pool(request).connection() as conn, conn.transaction():
            owned(conn, job_seeker, application_id)
            row = conn.execute(
                sql.SQL("update interviews set {} where id = %s and application_id = %s returning {}").format(
                    sql.SQL(", ").join(assignments), INTERVIEW_COLUMNS
                ),
                [*changes.values(), interview_id, application_id],
            ).fetchone()
        if row is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Interview not found")
        return _interview(row, datetime.now(UTC))

    @app.delete("/applications/{application_id}/interviews/{interview_id}", status_code=status.HTTP_204_NO_CONTENT)
    def delete_interview(request: Request, job_seeker: JobSeekerId, application_id: UUID, interview_id: UUID) -> None:
        with pool(request).connection() as conn, conn.transaction():
            owned(conn, job_seeker, application_id)
            deleted = conn.execute(
                "delete from interviews where id = %s and application_id = %s", (interview_id, application_id)
            ).rowcount
        if not deleted:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Interview not found")

    return app
