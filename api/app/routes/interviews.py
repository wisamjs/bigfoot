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
)
from app.queries import INTERVIEW_COLUMNS, INTERVIEW_ORDER, interview_view, owned, pool
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
    now = datetime.now(UTC)
    return [interview_view(row, now) for row in rows]


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
    """Add an Interview to an Application. The kind and the date and time are required; kinds can
    repeat, and Interview notes and Prep notes are optional. The number of Interviews per Application is capped
    (409)."""
    with pool(request).connection() as conn, conn.transaction():
        owned(conn, job_seeker, application_id, lock=True)
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
                "insert into interviews (application_id, kind, at, notes, prep_notes)"
                " values (%s, %s, %s, %s, %s) returning {}"
            ).format(INTERVIEW_COLUMNS),
            (application_id, body.kind, body.at, body.notes, body.prep_notes),
        ).fetchone()
    return interview_view(row, datetime.now(UTC))


@router.patch("/{interview_id}", summary="Edit an Interview")
def update_interview(
    request: Request,
    job_seeker: JobSeekerId,
    application_id: ApplicationId,
    interview_id: InterviewId,
    body: InterviewPatch,
) -> Interview:
    """Change an Interview's kind, date, Interview notes or Prep notes.

    Only the fields sent change; send null for `notes` or `prep_notes` to clear them. The date can't be cleared.
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
    return interview_view(row, datetime.now(UTC))


@router.delete("/{interview_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete an Interview")
def delete_interview(
    request: Request, job_seeker: JobSeekerId, application_id: ApplicationId, interview_id: InterviewId
) -> None:
    """Delete an Interview, for example a cancelled one, and its Interview notes and Prep notes with it."""
    with pool(request).connection() as conn, conn.transaction():
        owned(conn, job_seeker, application_id)
        deleted = conn.execute(
            "delete from interviews where id = %s and application_id = %s", (interview_id, application_id)
        ).rowcount
    if not deleted:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Interview not found")
