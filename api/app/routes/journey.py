"""A Viewer's side of a Share link (GLOSSARY.md, docs/adr/0008): the Passcode page's status, the
Passcode check that issues a Viewer token, and the Journey that token reads. No job seeker signs
these requests; the link id and the Passcode are the only way in. Also the job seeker's own preview
of the same Journey (BIG-198), which they sign."""

from datetime import UTC, date, datetime
from typing import Any

from fastapi import APIRouter, HTTPException, Request, status
from psycopg import Connection

from app.auth import SignedInJobSeekerId, ViewerOf, new_viewer_token, passcode_matches
from app.domain import is_completed, waiting_since
from app.models import (
    ErrorMessage,
    Journey,
    JourneyApplication,
    JourneyInterview,
    PasscodeAttempt,
    ShareLinkId,
    ShareLinkStatus,
    ViewerToken,
)
from app.queries import pool
from app.responses import ACCOUNT_ONLY, UNAUTHORIZED

router = APIRouter(prefix="/share-links/{share_link_id}", tags=["Journey"])
# The job seeker's own preview: an Account route like their Share links, so web tokens only.
preview_router = APIRouter(prefix="/me", tags=["Share links"], responses={**UNAUTHORIZED, **ACCOUNT_ONLY})

# 5 wrong Passcodes within 15 minutes lock the link until the oldest of them is 15 minutes old.
WRONG_TRIES_MAX = 5
WRONG_TRIES_WINDOW = "15 minutes"
# How stale last_opened_at may get, as for an Access token's last_used_at.
LAST_OPENED_RESOLUTION = "1 minute"

NOT_ACTIVE = "This link isn't active"
EXPIRED = "This link has expired"
LOCKED = "Too many tries. Try again in 15 minutes."
WRONG = "That Passcode didn't match"

NOT_FOUND: dict[int | str, dict[str, Any]] = {
    404: {"model": ErrorMessage, "description": "No Share link has this id: it was stopped, or never made."}
}
GONE: dict[int | str, dict[str, Any]] = {
    410: {"model": ErrorMessage, "description": "The Share link has expired. Renewing it opens it again."}
}


def _shared_by(name: str) -> str | None:
    return name or None


@router.get("", summary="Get a Share link's status", responses=NOT_FOUND)
def get_status(request: Request, share_link_id: ShareLinkId) -> ShareLinkStatus:
    """What the Passcode page shows: the job seeker's name, and whether the link has expired or is
    locked by wrong Passcodes. Needs no token."""
    with pool(request).connection() as conn:
        row = conn.execute(
            f"""
            select shared_by, expires_at <= now() as expired,
                (select count(*) from share_link_wrong_tries t where t.share_link_id = s.id
                    and t.tried_at > now() - interval '{WRONG_TRIES_WINDOW}') >= %s as locked
            from share_links s where id = %s
            """,
            (WRONG_TRIES_MAX, share_link_id),
        ).fetchone()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, NOT_ACTIVE)
    return ShareLinkStatus(shared_by=_shared_by(row["shared_by"]), expired=row["expired"], locked=row["locked"])


@router.post(
    "/viewer-token",
    summary="Open a Share link with its Passcode",
    responses={
        **NOT_FOUND,
        **GONE,
        401: {"model": ErrorMessage, "description": "The Passcode is wrong. The try is counted."},
        423: {"model": ErrorMessage, "description": f"{WRONG_TRIES_MAX} wrong Passcodes in {WRONG_TRIES_WINDOW}."},
    },
)
def open_share_link(request: Request, share_link_id: ShareLinkId, body: PasscodeAttempt) -> ViewerToken:
    """Check the Passcode and return a Viewer token for this Share link, valid until it expires.

    A wrong Passcode is counted; the 5th within 15 minutes locks the link, and while it is locked
    even the right Passcode is refused. Tries on one link take turns, so the count is exact."""
    with pool(request).connection() as conn, conn.transaction():
        link = conn.execute(
            "select passcode_hash, passcode_version, expires_at, expires_at <= now() as expired"
            " from share_links where id = %s for update",
            (share_link_id,),
        ).fetchone()
        if link is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, NOT_ACTIVE)
        if link["expired"]:
            raise HTTPException(status.HTTP_410_GONE, EXPIRED)
        conn.execute(
            f"delete from share_link_wrong_tries where share_link_id = %s"
            f" and tried_at <= now() - interval '{WRONG_TRIES_WINDOW}'",
            (share_link_id,),
        )
        wrong = conn.execute(
            "select count(*) from share_link_wrong_tries where share_link_id = %s", (share_link_id,)
        ).fetchone()["count"]
        if wrong >= WRONG_TRIES_MAX:
            raise HTTPException(status.HTTP_423_LOCKED, LOCKED)
        matches = passcode_matches(link["passcode_hash"], body.passcode)
        if not matches:
            conn.execute("insert into share_link_wrong_tries (share_link_id) values (%s)", (share_link_id,))
    # Outside the transaction, so the wrong try is committed before the error goes back.
    if not matches:
        locked = wrong + 1 >= WRONG_TRIES_MAX
        raise HTTPException(
            status.HTTP_423_LOCKED if locked else status.HTTP_401_UNAUTHORIZED, LOCKED if locked else WRONG
        )
    token = new_viewer_token(
        request.app.state.settings.api_secret, share_link_id, link["passcode_version"], link["expires_at"]
    )
    return ViewerToken(token=token, expires_at=link["expires_at"])


@router.get(
    "/journey",
    summary="Read a Share link's Journey",
    responses={
        **NOT_FOUND,
        **GONE,
        401: {
            "model": ErrorMessage,
            "description": "No Viewer token for this Share link, or one issued before its Passcode changed.",
        },
    },
)
def get_journey(request: Request, share_link_id: ShareLinkId, viewer: ViewerOf) -> Journey:
    """The job seeker's Journey: their In Progress Applications and Offers, with each one's company,
    role, applied date, and Interviews (category, title, and time). Of the other Done Applications,
    only when their completed Interviews happened, for the count of Interviews completed this month.
    Salary, job postings, Location, Prep notes, Interview notes, and Outcome notes are never read.

    Every request checks the link again, so stopping it, letting it expire, or changing its Passcode
    cuts the Viewer off at once. Records when the link was last opened, to within a minute."""
    if viewer.share_link_id != share_link_id:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "This token is for another Share link")
    with pool(request).connection() as conn:
        link = conn.execute(
            f"""
            with found as (
                select id, job_seeker_id, shared_by, passcode_version, last_opened_at,
                    expires_at <= now() as expired
                from share_links where id = %s
            ), touched as (
                update share_links set last_opened_at = now() from found
                where share_links.id = found.id and not found.expired and found.passcode_version = %s
                    and (found.last_opened_at is null
                         or found.last_opened_at < now() - interval '{LAST_OPENED_RESOLUTION}')
            )
            select job_seeker_id, shared_by, passcode_version, expired from found
            """,
            (share_link_id, viewer.passcode_version),
        ).fetchone()
        if link is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, NOT_ACTIVE)
        if link["expired"]:
            raise HTTPException(status.HTTP_410_GONE, EXPIRED)
        if link["passcode_version"] != viewer.passcode_version:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "The Passcode has changed")
        return journey_of(conn, link["job_seeker_id"], _shared_by(link["shared_by"]))


@preview_router.get("/journey", summary="Preview the job seeker's Journey")
def preview_journey(request: Request, job_seeker: SignedInJobSeekerId) -> Journey:
    """The Journey every one of the job seeker's Share links shows, read as the signed-in job seeker,
    so they can check what a Viewer sees without a Passcode, before making a link or after. It
    records no Share link as opened. `shared_by` is null: Bigfoot stores the name only on a link."""
    with pool(request).connection() as conn:
        return journey_of(conn, job_seeker, None)


def journey_of(conn: Connection[dict[str, Any]], job_seeker_id: str, shared_by: str | None) -> Journey:
    """The one projection of a job seeker's Applications into a Journey, for a Viewer and for the
    job seeker's own preview alike."""
    applications = conn.execute(
        "select id, company, title, applied_on, outcome is not distinct from 'offer' as offer from applications"
        " where job_seeker_id = %s and (status = 'in_progress' or outcome = 'offer')"
        " order by applied_on, created_at, id",
        (job_seeker_id,),
    ).fetchall()
    # An Offer's Interviews with no date are Abandoned (GLOSSARY.md): they never took place, so a Viewer
    # doesn't see them.
    interviews = conn.execute(
        "select application_id, category, title, at from interviews where application_id = any(%s)"
        " and (at is not null or application_id <> all(%s))"
        " order by at nulls last, created_at, id",
        ([a["id"] for a in applications], [a["id"] for a in applications if a["offer"]]),
    ).fetchall()
    other_completed = conn.execute(
        "select i.at from interviews i join applications a on a.id = i.application_id"
        " where a.job_seeker_id = %s and a.status <> 'in_progress' and a.outcome is distinct from 'offer'"
        " and i.at <= now() order by i.at",
        (job_seeker_id,),
    ).fetchall()
    return Journey(
        shared_by=shared_by,
        applications=_project(applications, interviews),
        other_completed_interviews=[row["at"] for row in other_completed],
    )


def _project(applications: list[dict[str, Any]], interviews: list[dict[str, Any]]) -> list[JourneyApplication]:
    now = datetime.now(UTC)
    by_application: dict[Any, list[JourneyInterview]] = {a["id"]: [] for a in applications}
    for i in interviews:
        by_application[i["application_id"]].append(
            JourneyInterview(category=i["category"], title=i["title"], at=i["at"], completed=is_completed(i["at"], now))
        )
    return [_application(a, by_application[a["id"]]) for a in applications]


def _application(row: dict[str, Any], interviews: list[JourneyInterview]) -> JourneyApplication:
    waiting = not row["offer"] and all(i.completed for i in interviews)
    since: datetime | date | None = waiting_since([i.at for i in interviews], row["applied_on"]) if waiting else None
    return JourneyApplication(
        company=row["company"],
        title=row["title"],
        applied_on=row["applied_on"],
        offer=row["offer"],
        is_waiting=waiting,
        waiting_since=since,
        interviews=interviews,
    )
