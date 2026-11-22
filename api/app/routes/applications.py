"""A job seeker's Applications."""

from fastapi import APIRouter, HTTPException, Request, status
from psycopg import sql

from app.auth import JobSeekerId
from app.domain import APPLICATIONS_MAX
from app.models import Application, ApplicationCreate, ApplicationId, ApplicationPatch, ErrorMessage, check_outcome
from app.queries import COLUMNS, application_views, pool
from app.responses import APPLICATION_NOT_FOUND, UNAUTHORIZED

router = APIRouter(prefix="/applications", tags=["Applications"], responses=UNAUTHORIZED)


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
            check_outcome(changes.get("status", current["status"]), changes.get("outcome", current["outcome"]))
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
