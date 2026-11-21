"""Bigfoot API: create, read, update and delete a job seeker's Applications and their Interviews."""

import hashlib
import re
from contextlib import asynccontextmanager
from datetime import UTC, date, datetime
from typing import Annotated, Any, Literal
from uuid import UUID

from fastapi import APIRouter, FastAPI, HTTPException, Path, Request, status
from psycopg import sql
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool
from pydantic import AfterValidator, BaseModel, ConfigDict, Field, model_validator

from app.auth import JobSeekerId
from app.domain import (
    APPLICATIONS_MAX,
    COMPANY_MAX_LENGTH,
    INTERVIEW_NOTES_MAX_LENGTH,
    INTERVIEWS_PER_APPLICATION_MAX,
    LOCATION_MAX_LENGTH,
    POSTING_URL_MAX_LENGTH,
    SALARY_MAX_LENGTH,
    TITLE_MAX_LENGTH,
    InterviewKind,
    Outcome,
    Status,
)
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


# Lengths are checked as sent, before the ends are trimmed. The database checks them too.
Company = Annotated[str, Field(max_length=COMPANY_MAX_LENGTH), AfterValidator(_required_text)]
Title = Annotated[str, Field(max_length=TITLE_MAX_LENGTH), AfterValidator(_required_text)]
Location = Annotated[str | None, Field(max_length=LOCATION_MAX_LENGTH), AfterValidator(_optional_text)]
Salary = Annotated[str | None, Field(max_length=SALARY_MAX_LENGTH), AfterValidator(_optional_text)]
PostingUrl = Annotated[str | None, Field(max_length=POSTING_URL_MAX_LENGTH), AfterValidator(_posting_url)]
InterviewNotes = Annotated[str | None, Field(max_length=INTERVIEW_NOTES_MAX_LENGTH), AfterValidator(_optional_text)]


# Example values shared by the request and response schemas.
EXAMPLE_COMPANY = "Northwind Robotics"
EXAMPLE_TITLE = "Frontend Engineer"
EXAMPLE_URL = "https://jobs.example.com/northwind/frontend-engineer"

COMPANY = Field(description="The company the job seeker applied to.", examples=[EXAMPLE_COMPANY])
TITLE = Field(description="The role's job title.", examples=[EXAMPLE_TITLE])
POSTING_URL = Field(default=None, description="The job posting, as an http(s) URL.", examples=[EXAMPLE_URL])
LOCATION = Field(default=None, description="Where the role is, as the job seeker writes it.", examples=["Remote"])
SALARY = Field(default=None, description="The pay range, as the job seeker writes it.", examples=["$120k–$140k"])
STATUS = "Whether the Application is still going (GLOSSARY.md, Status)."
OUTCOME = "How a Done Application ended. Required when the status is `done`, and only then."
KIND = "What sort of conversation the Interview is (GLOSSARY.md, Interview kind)."
AT = "When the Interview happens, with a time zone. Null when it has no date yet."
NOTES = (
    "Interview notes (GLOSSARY.md): what the job seeker wrote about this Interview, as plain text of at most "
    f"{INTERVIEW_NOTES_MAX_LENGTH:,} characters. Null when there are none."
)
EXAMPLE_NOTES = "Asked about caching trade-offs. Next time, draw the diagram first."


ApplicationId = Annotated[UUID, Path(description="The Application's id.")]
InterviewId = Annotated[UUID, Path(description="The Interview's id.")]


class ErrorMessage(BaseModel):
    detail: str = Field(description="What went wrong.", examples=["Application not found"])


class ApplicationCreate(BaseModel):
    """A new Application. Blank optional text is stored as null."""

    model_config = ConfigDict(extra="forbid")

    company: Company = COMPANY
    title: Title = TITLE
    posting_url: PostingUrl = POSTING_URL
    location: Location = LOCATION
    salary: Salary = SALARY
    applied_on: date | None = Field(
        default=None, description="When the job seeker applied. Defaults to today.", examples=["2026-11-02"]
    )
    status: Status = Field(default="in_progress", description=STATUS)
    outcome: Outcome | None = Field(default=None, description=OUTCOME)

    @model_validator(mode="after")
    def _outcome_matches_status(self) -> "ApplicationCreate":
        _check_outcome(self.status, self.outcome)
        return self


class ApplicationPatch(BaseModel):
    """Only the fields sent are changed; send null to clear an optional field.

    Setting the status to in_progress without an outcome clears the outcome (reopening).
    """

    model_config = ConfigDict(extra="forbid")

    company: Company | None = Field(default=None, description=COMPANY.description, examples=COMPANY.examples)
    title: Title | None = Field(default=None, description=TITLE.description, examples=TITLE.examples)
    posting_url: PostingUrl = POSTING_URL
    location: Location = LOCATION
    salary: Salary = SALARY
    applied_on: date | None = Field(
        default=None, description="When the job seeker applied. Cannot be cleared.", examples=["2026-11-02"]
    )
    status: Status | None = Field(default=None, description=f"{STATUS} Cannot be cleared.", examples=["done"])
    outcome: Outcome | None = Field(default=None, description=OUTCOME, examples=["offer"])

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
    """A new Interview for an Application."""

    model_config = ConfigDict(extra="forbid")

    kind: InterviewKind = Field(description=KIND, examples=["technical"])
    at: datetime | None = Field(default=None, description=AT, examples=["2026-11-20T17:00:00Z"])
    notes: InterviewNotes = Field(default=None, description=f"{NOTES} Blank is stored as null.", examples=[None])


class InterviewPatch(BaseModel):
    """Only the fields sent are changed; send null for `at` to clear the date, or for `notes` to clear them."""

    model_config = ConfigDict(extra="forbid")

    kind: InterviewKind | None = Field(default=None, description=f"{KIND} Cannot be cleared.", examples=["onsite_loop"])
    at: datetime | None = Field(default=None, description=AT, examples=["2026-11-27T15:30:00Z"])
    notes: InterviewNotes = Field(
        default=None, description=f"{NOTES} Blank is stored as null.", examples=[EXAMPLE_NOTES]
    )

    @model_validator(mode="after")
    def _kind_not_cleared(self) -> "InterviewPatch":
        if "kind" in self.model_fields_set and self.kind is None:
            raise ValueError("kind cannot be cleared")
        return self


class Interview(BaseModel):
    """One conversation in a company's hiring process, belonging to one Application."""

    id: UUID
    application_id: UUID = Field(description="The Application this Interview belongs to.")
    kind: InterviewKind = Field(description=KIND, examples=["technical"])
    at: datetime | None = Field(description=AT, examples=["2026-11-20T17:00:00Z"])
    notes: str | None = Field(description=NOTES, examples=[EXAMPLE_NOTES])
    completed: bool = Field(
        description="Derived, never stored: the date is in the past, or there is no date.", examples=[False]
    )
    created_at: datetime
    updated_at: datetime


class Application(BaseModel):
    """One role at one company that the job seeker has applied to, with its Interviews."""

    id: UUID
    company: str = COMPANY
    title: str = TITLE
    posting_url: str | None = Field(description=POSTING_URL.description, examples=POSTING_URL.examples)
    location: str | None = Field(description=LOCATION.description, examples=LOCATION.examples)
    salary: str | None = Field(description=SALARY.description, examples=SALARY.examples)
    applied_on: date = Field(description="When the job seeker applied.", examples=["2026-11-02"])
    status: Status = Field(description=STATUS)
    outcome: Outcome | None = Field(description=OUTCOME)
    interviews: list[Interview] = Field(description="Ordered by date, undated first.")
    is_waiting: bool = Field(
        description="Derived (GLOSSARY.md, Waiting): In Progress with no upcoming Interview, including a new one."
    )
    waiting_since: datetime | date | None = Field(
        description=(
            "While waiting: when the last dated, completed Interview happened (a timestamp), or else the "
            "applied date. Null when not waiting."
        ),
        examples=["2026-11-08T17:00:00Z"],
    )
    is_sample: bool = Field(description="A Sample Application that Bigfoot created for a new job seeker.")
    created_at: datetime
    updated_at: datetime


class Onboarding(BaseModel):
    samples_seeded: bool = Field(
        description="Whether this call gave the job seeker Sample Applications. True the first time only."
    )


class Health(BaseModel):
    status: Literal["ok"]


class JobSeeker(BaseModel):
    """Everything Bigfoot's database holds about the job seeker besides their Applications."""

    job_seeker_id: str = Field(description="The Google account id.")
    created_at: datetime = Field(description="When they first signed in: their account's created date.")
    samples_seeded_at: datetime | None = Field(
        description="When they received their Sample Applications; null until then."
    )
    last_seen_at: datetime = Field(description="When they last signed in.")


APPLICATION_COLUMNS = (
    "id, company, title, posting_url, location, salary, applied_on, status, outcome, is_sample, created_at, updated_at"
)
COLUMNS = sql.SQL(APPLICATION_COLUMNS)
INTERVIEW_COLUMNS = sql.SQL("id, application_id, kind, at, notes, created_at, updated_at")
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


UNAUTHORIZED: dict[int | str, dict[str, Any]] = {
    401: {"model": ErrorMessage, "description": "The bearer token is missing, expired or invalid."}
}
APPLICATION_NOT_FOUND: dict[int | str, dict[str, Any]] = {
    404: {"model": ErrorMessage, "description": "No Application with this id belongs to the job seeker."}
}
INTERVIEW_NOT_FOUND: dict[int | str, dict[str, Any]] = {
    404: {
        "model": ErrorMessage,
        "description": "The Application isn't the job seeker's, or has no Interview with this id.",
    }
}

DESCRIPTION = """\
Bigfoot's data API: a job seeker's Applications and their Interviews, in Supabase Postgres.

The browser never calls it. The Next.js server does, with a short-lived token naming the
signed-in job seeker, and every route reads and writes only that job seeker's data
([ADR 0001](https://github.com/wisamjs/bigfoot/blob/main/docs/adr/0001-fastapi-behind-nextjs-with-authjs.md)).
Terms such as Application, Interview, Waiting and Sample Application are defined in
[GLOSSARY.md](https://github.com/wisamjs/bigfoot/blob/main/GLOSSARY.md).

To try a request, run `node scripts/dev-api-token.mjs`, click **Authorize** and paste the token.
"""

TAGS = [
    {"name": "Account", "description": "The signed-in job seeker: onboarding, exporting and deleting the account."},
    {"name": "Applications", "description": "Roles the job seeker has applied to, each with its Interviews."},
    {"name": "Interviews", "description": "Conversations in a company's hiring process, one Application each."},
    {"name": "Health", "description": "Whether the API is up. Needs no token."},
]


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
    account = APIRouter(prefix="/me", tags=["Account"], responses=UNAUTHORIZED)
    applications = APIRouter(prefix="/applications", tags=["Applications"], responses=UNAUTHORIZED)
    interviews = APIRouter(
        prefix="/applications/{application_id}/interviews",
        tags=["Interviews"],
        responses={**UNAUTHORIZED, **INTERVIEW_NOT_FOUND},
    )

    def pool(request: Request) -> ConnectionPool:
        return request.app.state.pool

    @app.get("/health", tags=["Health"], summary="Check the API is up")
    def health() -> Health:
        """Always `ok` while the API is serving. Doesn't touch the database."""
        return Health(status="ok")

    @account.post("/onboard", summary="Onboard the job seeker")
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

    @account.get(
        "",
        summary="Get the job seeker's record",
        responses={404: {"model": ErrorMessage, "description": "The job seeker hasn't been onboarded yet."}},
    )
    def get_job_seeker(request: Request, job_seeker: JobSeekerId) -> JobSeeker:
        """The job seeker's own record, for their data export. 404 until they are onboarded."""
        with pool(request).connection() as conn:
            row = conn.execute(
                "select job_seeker_id, created_at, samples_seeded_at, last_seen_at from job_seekers"
                " where job_seeker_id = %s",
                (job_seeker,),
            ).fetchone()
        if row is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Job seeker not found")
        return JobSeeker(**row)

    @account.delete("", status_code=status.HTTP_204_NO_CONTENT, summary="Delete the job seeker's account")
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

    def owned(conn: Any, job_seeker: str, application_id: UUID, *, lock: bool = False) -> None:
        """404 unless the Application is the job seeker's. `lock` holds its row until the transaction
        ends, so concurrent Interview inserts on it take turns."""
        found = conn.execute(
            sql.SQL("select 1 from applications where id = %s and job_seeker_id = %s {}").format(
                sql.SQL("for update" if lock else "")
            ),
            (application_id, job_seeker),
        ).fetchone()
        if found is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Application not found")

    @applications.get("", summary="List the job seeker's Applications")
    def list_applications(request: Request, job_seeker: JobSeekerId) -> list[Application]:
        """Every Application of the job seeker, oldest first, each with its Interviews and Waiting data."""
        with pool(request).connection() as conn, conn.transaction():
            rows = conn.execute(
                sql.SQL("select {} from applications where job_seeker_id = %s order by created_at, id").format(COLUMNS),
                (job_seeker,),
            ).fetchall()
            return _applications(conn, rows)

    @applications.post(
        "",
        status_code=status.HTTP_201_CREATED,
        summary="Add an Application",
        responses={
            409: {
                "model": ErrorMessage,
                "description": f"The job seeker already has {APPLICATIONS_MAX:,} Applications, the most Bigfoot keeps.",
            }
        },
    )
    def create_application(request: Request, job_seeker: JobSeekerId, body: ApplicationCreate) -> Application:
        """Add an Application for the job seeker. It starts In Progress with no Interviews unless the body
        says otherwise; a Done Application needs an Outcome. The number of Applications is capped (409)."""
        values = body.model_dump(exclude_none=True)
        values["job_seeker_id"] = job_seeker
        query = sql.SQL("insert into applications ({}) values ({}) returning {}").format(
            sql.SQL(", ").join(map(sql.Identifier, values)),
            sql.SQL(", ").join(sql.Placeholder() * len(values)),
            COLUMNS,
        )
        with pool(request).connection() as conn, conn.transaction():
            # Serializes this job seeker's inserts, so concurrent requests can't pass the count together.
            conn.execute("select pg_advisory_xact_lock(hashtext(%s))", (job_seeker,))
            count = conn.execute(
                "select count(*) from applications where job_seeker_id = %s", (job_seeker,)
            ).fetchone()["count"]
            if count >= APPLICATIONS_MAX:
                raise HTTPException(
                    status.HTTP_409_CONFLICT,
                    f"You have {APPLICATIONS_MAX:,} Applications, the most Bigfoot keeps. Delete one to add another.",
                )
            row = conn.execute(query, list(values.values())).fetchone()
            return _applications(conn, [row])[0]

    @applications.patch(
        "/{application_id}",
        summary="Edit an Application",
        responses={
            **APPLICATION_NOT_FOUND,
            422: {
                "description": (
                    "The body is invalid (a list of field errors), or the change would leave a Done "
                    "Application without an Outcome or an In Progress one with an Outcome (a message)."
                ),
                "content": {
                    "application/json": {
                        "schema": {
                            "anyOf": [
                                {"$ref": "#/components/schemas/HTTPValidationError"},
                                {"$ref": "#/components/schemas/ErrorMessage"},
                            ]
                        }
                    }
                },
            },
        },
    )
    def update_application(
        request: Request, job_seeker: JobSeekerId, application_id: ApplicationId, body: ApplicationPatch
    ) -> Application:
        """Change some of an Application's fields and return it with its Interviews.

        Only the fields sent change. Setting the status to `in_progress` without an outcome reopens the
        Application and clears its Outcome; setting it to `done` needs an Outcome, sent now or already set.
        """
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

    @applications.delete(
        "/{application_id}",
        status_code=status.HTTP_204_NO_CONTENT,
        summary="Delete an Application",
        responses=APPLICATION_NOT_FOUND,
    )
    def delete_application(request: Request, job_seeker: JobSeekerId, application_id: ApplicationId) -> None:
        """Delete an Application and all of its Interviews. Sample Applications can be deleted like any other."""
        with pool(request).connection() as conn:
            deleted = conn.execute(
                "delete from applications where id = %s and job_seeker_id = %s", (application_id, job_seeker)
            ).rowcount
        if not deleted:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Application not found")

    @interviews.get(
        "",
        summary="List an Application's Interviews",
        responses={404: {"model": ErrorMessage, "description": APPLICATION_NOT_FOUND[404]["description"]}},
    )
    def list_interviews(request: Request, job_seeker: JobSeekerId, application_id: ApplicationId) -> list[Interview]:
        """The Application's Interviews, ordered by date, undated first."""
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

    @interviews.post(
        "",
        status_code=status.HTTP_201_CREATED,
        summary="Add an Interview",
        responses={
            404: {"model": ErrorMessage, "description": APPLICATION_NOT_FOUND[404]["description"]},
            409: {
                "model": ErrorMessage,
                "description": (
                    f"The Application already has {INTERVIEWS_PER_APPLICATION_MAX} Interviews, the most it can have."
                ),
            },
        },
    )
    def create_interview(
        request: Request, job_seeker: JobSeekerId, application_id: ApplicationId, body: InterviewCreate
    ) -> Interview:
        """Add an Interview to an Application. Kinds can repeat; the date and Interview notes are optional.
        The number of Interviews per Application is capped (409)."""
        with pool(request).connection() as conn, conn.transaction():
            owned(conn, job_seeker, application_id, lock=True)
            count = conn.execute(
                "select count(*) from interviews where application_id = %s", (application_id,)
            ).fetchone()["count"]
            if count >= INTERVIEWS_PER_APPLICATION_MAX:
                raise HTTPException(
                    status.HTTP_409_CONFLICT,
                    f"This Application has {INTERVIEWS_PER_APPLICATION_MAX} Interviews, the most it can have. "
                    "Delete one to add another.",
                )
            row = conn.execute(
                sql.SQL(
                    "insert into interviews (application_id, kind, at, notes) values (%s, %s, %s, %s) returning {}"
                ).format(INTERVIEW_COLUMNS),
                (application_id, body.kind, body.at, body.notes),
            ).fetchone()
        return _interview(row, datetime.now(UTC))

    @interviews.patch("/{interview_id}", summary="Edit an Interview")
    def update_interview(
        request: Request,
        job_seeker: JobSeekerId,
        application_id: ApplicationId,
        interview_id: InterviewId,
        body: InterviewPatch,
    ) -> Interview:
        """Change an Interview's kind, date or Interview notes.

        Only the fields sent change; send null for `at` to clear the date, or for `notes` to clear them.
        """
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

    @interviews.delete("/{interview_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete an Interview")
    def delete_interview(
        request: Request, job_seeker: JobSeekerId, application_id: ApplicationId, interview_id: InterviewId
    ) -> None:
        """Delete an Interview, for example a cancelled one, and its Interview notes with it."""
        with pool(request).connection() as conn, conn.transaction():
            owned(conn, job_seeker, application_id)
            deleted = conn.execute(
                "delete from interviews where id = %s and application_id = %s", (interview_id, application_id)
            ).rowcount
        if not deleted:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Interview not found")

    for router in (account, applications, interviews):
        app.include_router(router)
    return app
