"""The signed-in job seeker: onboarding, exporting and deleting the account."""

import hashlib
from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException, Request, status
from psycopg import sql

from app.auth import SignedInJobSeekerId
from app.models import ErrorMessage, JobSeeker, Onboarding
from app.queries import pool
from app.responses import ACCOUNT_ONLY, UNAUTHORIZED
from app.samples import sample_applications

router = APIRouter(prefix="/me", tags=["Account"], responses={**UNAUTHORIZED, **ACCOUNT_ONLY})


def job_seeker_hash(job_seeker: str) -> str:
    """How account_deletions records a job seeker: a SHA-256 hex digest, never the id itself."""
    return hashlib.sha256(job_seeker.encode()).hexdigest()


@router.post("/onboard", summary="Onboard the job seeker")
def onboard(request: Request, job_seeker: SignedInJobSeekerId) -> Onboarding:
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
                for category, title, at in interviews:
                    conn.execute(
                        "insert into interviews (application_id, category, title, at) values (%s, %s, %s, %s)",
                        (application_id, category, title, at),
                    )
        conn.execute("update job_seekers set samples_seeded_at = now() where job_seeker_id = %s", (job_seeker,))
    return Onboarding(samples_seeded=not has_applications)


@router.get(
    "",
    summary="Get the job seeker's record",
    responses={404: {"model": ErrorMessage, "description": "The job seeker hasn't been onboarded yet."}},
)
def get_job_seeker(request: Request, job_seeker: SignedInJobSeekerId) -> JobSeeker:
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


@router.delete("", status_code=status.HTTP_204_NO_CONTENT, summary="Delete the job seeker's account")
def delete_account(request: Request, job_seeker: SignedInJobSeekerId) -> None:
    """Delete the job seeker, all of their Applications and all of their Access tokens, in one transaction.

    Idempotent: deleting an account that is already gone succeeds and logs nothing. Signing
    in again afterwards makes a new job seeker, who receives Sample Applications again.
    """
    with pool(request).connection() as conn, conn.transaction():
        applications = conn.execute("delete from applications where job_seeker_id = %s", (job_seeker,)).rowcount
        job_seekers = conn.execute("delete from job_seekers where job_seeker_id = %s", (job_seeker,)).rowcount
        tokens = conn.execute("delete from access_tokens where job_seeker_id = %s", (job_seeker,)).rowcount
        if applications or job_seekers or tokens:
            conn.execute("insert into account_deletions (job_seeker_hash) values (%s)", (job_seeker_hash(job_seeker),))
