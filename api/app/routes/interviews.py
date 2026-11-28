"""The Interviews of an Application."""

from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, Request, status
from psycopg import sql

from app.auth import JobSeekerId
from app.domain import INTERVIEWS_PER_APPLICATION_MAX
from app.models import (
    ApplicationId,
    ErrorMessage,
    Interview,
    InterviewCreate,
    InterviewId,
    InterviewPatch,
    check_done_interview_at,
    check_unscheduled,
)
from app.participants import prune_participants, set_participants
from app.queries import INTERVIEW_COLUMNS, INTERVIEW_ORDER, interview_views, owned, pool
from app.responses import APPLICATION_NOT_FOUND, INTERVIEW_NOT_FOUND, UNAUTHORIZED

router = APIRouter(
    prefix="/applications/{application_id}/interviews",
    tags=["Interviews"],
    responses={**UNAUTHORIZED, **INTERVIEW_NOT_FOUND},
)


@router.get(
    "",
    summary="List an Application's Interviews",
    responses={404: {"model": ErrorMessage, "description": APPLICATION_NOT_FOUND[404]["description"]}},
)
def list_interviews(request: Request, job_seeker: JobSeekerId, application_id: ApplicationId) -> list[Interview]:
    """The Application's Interviews, ordered by date."""
    with pool(request).connection() as conn, conn.transaction():
        owned(conn, job_seeker, application_id)
        rows = conn.execute(
            sql.SQL("select {} from interviews where application_id = %s {}").format(
                INTERVIEW_COLUMNS, INTERVIEW_ORDER
            ),
            (application_id,),
        ).fetchall()
        return interview_views(conn, rows, datetime.now(UTC))


@router.post(
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
    """Add an Interview to an Application. The category, title, `at`, and at least one Participant are
    required; `at: null` adds an Unscheduled Interview (docs/adr/0009). A Done Application's new Interview needs a
    date in the past (422).
    Categories and titles can repeat, and Interview notes and Prep notes are optional. A Participant sent by
    `id` must be one of the Application's (422). The number of Interviews per Application is capped (409)."""
    with pool(request).connection() as conn, conn.transaction():
        application_status = owned(conn, job_seeker, application_id, lock=True)
        _check_at(application_status, body.at, creating=True)
        count = conn.execute("select count(*) from interviews where application_id = %s", (application_id,)).fetchone()[
            "count"
        ]
        if count >= INTERVIEWS_PER_APPLICATION_MAX:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                f"This Application has {INTERVIEWS_PER_APPLICATION_MAX} Interviews, the most it can have. "
                "Delete one to add another.",
            )
        row = conn.execute(
            sql.SQL(
                "insert into interviews (application_id, category, title, at, what_they_asked, how_it_went, takeaway,"
                " prep_notes) values (%s, %s, %s, %s, %s, %s, %s, %s) returning {}"
            ).format(INTERVIEW_COLUMNS),
            (
                application_id,
                body.category,
                body.title,
                body.at,
                body.what_they_asked,
                body.how_it_went,
                body.takeaway,
                body.prep_notes,
            ),
        ).fetchone()
        set_participants(conn, application_id, row["id"], body.participants)
        return interview_views(conn, [row], datetime.now(UTC))[0]


@router.patch("/{interview_id}", summary="Edit an Interview")
def update_interview(
    request: Request,
    job_seeker: JobSeekerId,
    application_id: ApplicationId,
    interview_id: InterviewId,
    body: InterviewPatch,
) -> Interview:
    """Change an Interview's category, title, date, Interview notes, Prep notes, or Participants.

    Only the fields sent change; send null for `what_they_asked`, `how_it_went`, `takeaway` or `prep_notes` to
    clear it. The category and title can't be cleared. `at: null` makes the Interview Unscheduled, or, on a Done
    Application, Abandoned (GLOSSARY.md), where a date in the future is refused (422). `participants` replaces
    the Interview's Participants: at least one, and a Participant left in no Interview is deleted. An `id` that
    isn't one of the Application's Participants is refused (422).
    """
    changes = body.model_dump(exclude_unset=True, exclude={"participants"})
    assignments = [sql.SQL("{} = %s").format(sql.Identifier(name)) for name in changes]
    assignments.append(sql.SQL("updated_at = now()"))
    with pool(request).connection() as conn, conn.transaction():
        application_status = owned(conn, job_seeker, application_id)
        if "at" in changes:
            _check_at(application_status, changes["at"])
        row = conn.execute(
            sql.SQL("update interviews set {} where id = %s and application_id = %s returning {}").format(
                sql.SQL(", ").join(assignments), INTERVIEW_COLUMNS
            ),
            [*changes.values(), interview_id, application_id],
        ).fetchone()
        if row is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Interview not found")
        if body.participants is not None:
            set_participants(conn, application_id, interview_id, body.participants)
        return interview_views(conn, [row], datetime.now(UTC))[0]


@router.delete("/{interview_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete an Interview")
def delete_interview(
    request: Request, job_seeker: JobSeekerId, application_id: ApplicationId, interview_id: InterviewId
) -> None:
    """Delete an Interview, for example a cancelled one, and its Interview notes and Prep notes with it, and
    its Participants who are in no other Interview."""
    with pool(request).connection() as conn, conn.transaction():
        owned(conn, job_seeker, application_id)
        deleted = conn.execute(
            "delete from interviews where id = %s and application_id = %s", (interview_id, application_id)
        ).rowcount
        prune_participants(conn, application_id)
    if not deleted:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Interview not found")


def _check_at(application_status: str, at: datetime | None, *, creating: bool = False) -> None:
    """A new Interview is Unscheduled only on an In Progress Application; a Done one's dates are in the past."""
    try:
        if creating:
            check_unscheduled(application_status, at)
        check_done_interview_at(application_status, at, datetime.now(UTC))
    except ValueError as error:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, str(error)) from error
