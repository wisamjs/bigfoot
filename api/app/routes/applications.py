"""A job seeker's Applications."""

from datetime import UTC, date, datetime
from typing import Any

from fastapi import APIRouter, HTTPException, Request, status
from psycopg import sql

from app.auth import JobSeekerId
from app.domain import APPLICATIONS_MAX
from app.models import (
    FUTURE_ON_DONE,
    Application,
    ApplicationCreate,
    ApplicationId,
    ApplicationPatch,
    ErrorMessage,
    check_done,
    check_office_days,
    check_outcome,
)
from app.queries import COLUMNS, application_views, pool
from app.responses import APPLICATION_NOT_FOUND, UNAUTHORIZED

router = APIRouter(prefix="/applications", tags=["Applications"], responses=UNAUTHORIZED)


def _done_today(applied_on: date | None) -> date | None:
    """The Done date of an Application marked Done now: today, unless it was applied for after today (then none)."""
    today = datetime.now(UTC).date()
    return today if applied_on is None or applied_on <= today else None


def _settle_status(changes: dict[str, Any], current: dict[str, Any]) -> None:
    """Reopening clears the Outcome, Done date, and Outcome note; marking Done without a Done date dates it today.
    Leaving Hybrid clears the office days. Only what the change doesn't send itself."""
    status = changes.get("status")
    if status == "in_progress":
        for name in ("outcome", "done_on", "outcome_note"):
            changes.setdefault(name, None)
    elif status == "done" and current["status"] != "done" and "done_on" not in changes:
        changes["done_on"] = _done_today(changes.get("applied_on", current["applied_on"]))
    if "location" in changes and changes["location"] != "hybrid":
        changes.setdefault("office_days", None)


def _settle_interviews(conn: Any, application_id: Any, answers: list[dict[str, Any]], now: datetime) -> None:
    """Marking Done (GLOSSARY.md, Abandoned): each answer gives its Interview the date it took place, keeps the
    date it has, or leaves it undated, and so Abandoned. An Interview still dated after now that no answer
    covers loses its date: the job seeker didn't say it happened. 422 for an id that isn't this Application's,
    and for a date in the future that isn't the one the Interview already has."""
    saved = {
        row["id"]: row["at"]
        for row in conn.execute(
            "select id, at from interviews where application_id = %s for update", (application_id,)
        ).fetchall()
    }
    answered: dict[Any, datetime | None] = {}
    for answer in answers:
        if answer["id"] not in saved:
            raise HTTPException(422, "interviews lists an Interview that isn't this Application's.")
        at = answer["at"]
        if at is not None and at > now and at != saved[answer["id"]]:
            raise HTTPException(422, FUTURE_ON_DONE)
        answered[answer["id"]] = at
    for interview_id, at in saved.items():
        if interview_id not in answered and at is not None and at > now:
            answered[interview_id] = None
    for interview_id, at in answered.items():
        if at != saved[interview_id]:
            conn.execute("update interviews set at = %s, updated_at = now() where id = %s", (at, interview_id))


def _check(application: dict[str, Any]) -> None:
    """The rules between fields, on the Application as the change would leave it: 422 when one is broken."""
    try:
        check_outcome(application["status"], application["outcome"])
        check_office_days(application["location"], application["office_days"])
        check_done(
            application["status"], application["done_on"], application["outcome_note"], application["applied_on"]
        )
    except ValueError as error:
        raise HTTPException(422, str(error)) from error


@router.get("", summary="List the job seeker's Applications")
def list_applications(request: Request, job_seeker: JobSeekerId) -> list[Application]:
    """Every Application of the job seeker, oldest first, each with its Interviews and Waiting data."""
    with pool(request).connection() as conn, conn.transaction():
        rows = conn.execute(
            sql.SQL("select {} from applications where job_seeker_id = %s order by created_at, id").format(COLUMNS),
            (job_seeker,),
        ).fetchall()
        return application_views(conn, rows)


@router.post(
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
    says otherwise; a Done Application needs an Outcome, and its Done date is today unless one is sent. The
    number of Applications is capped (409)."""
    values = body.model_dump(exclude_none=True)
    if body.status == "done" and body.done_on is None and (done_on := _done_today(body.applied_on)):
        values["done_on"] = done_on
    values["job_seeker_id"] = job_seeker
    query = sql.SQL("insert into applications ({}) values ({}) returning {}").format(
        sql.SQL(", ").join(map(sql.Identifier, values)),
        sql.SQL(", ").join(sql.Placeholder() * len(values)),
        COLUMNS,
    )
    with pool(request).connection() as conn, conn.transaction():
        # Serializes this job seeker's inserts, so concurrent requests can't pass the count together.
        conn.execute("select pg_advisory_xact_lock(hashtext(%s))", (job_seeker,))
        count = conn.execute("select count(*) from applications where job_seeker_id = %s", (job_seeker,)).fetchone()[
            "count"
        ]
        if count >= APPLICATIONS_MAX:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                f"You have {APPLICATIONS_MAX:,} Applications, the most Bigfoot keeps. Delete one to add another.",
            )
        row = conn.execute(query, list(values.values())).fetchone()
        return application_views(conn, [row])[0]


@router.patch(
    "/{application_id}",
    summary="Edit an Application",
    responses={
        **APPLICATION_NOT_FOUND,
        422: {
            "description": (
                "The body is invalid (a list of field errors), or the change would leave a Done "
                "Application without an Outcome, an In Progress one with an Outcome, a Done date, or an "
                "Outcome note, a Done date before the applied date, or office days on a Location that "
                "isn't Hybrid; or `interviews` is sent without marking an In Progress Application Done, lists "
                "an Interview of another Application, or gives one a date in the future (a message)."
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

    Only the fields sent change. Setting the status to `in_progress` reopens the Application and clears
    its Outcome, Done date, and Outcome note; setting it to `done` needs an Outcome, sent now or already
    set, and from `in_progress` sets the Done date to today unless one is sent. Setting the location to
    anything but `hybrid` clears its office days.

    Marking an In Progress Application Done can send `interviews`: whether each Unscheduled Interview, or each
    one still dated after now, happened (GLOSSARY.md, Abandoned). It is applied in the same transaction. An
    Interview it leaves out stays, or becomes, undated: Abandoned, which reopening makes Unscheduled again.
    """
    changes = body.model_dump(exclude_unset=True)
    answers = changes.pop("interviews", None)
    with pool(request).connection() as conn, conn.transaction():
        current = conn.execute(
            "select status, outcome, done_on, outcome_note, applied_on, location, office_days from applications"
            " where id = %s and job_seeker_id = %s for update",
            (application_id, job_seeker),
        ).fetchone()
        if current is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Application not found")
        marking_done = changes.get("status") == "done" and current["status"] != "done"
        if answers is not None and not marking_done:
            raise HTTPException(422, "interviews is only sent when marking an In Progress Application Done.")
        _settle_status(changes, current)
        _check({**current, **changes})
        assignments = [sql.SQL("{} = %s").format(sql.Identifier(name)) for name in changes]
        assignments.append(sql.SQL("updated_at = now()"))
        row = conn.execute(
            sql.SQL("update applications set {} where id = %s returning {}").format(
                sql.SQL(", ").join(assignments), COLUMNS
            ),
            [*changes.values(), application_id],
        ).fetchone()
        if marking_done:
            _settle_interviews(conn, application_id, answers or [], datetime.now(UTC))
        return application_views(conn, [row])[0]


@router.delete(
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
