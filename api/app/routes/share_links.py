"""Share links: private links a job seeker makes so a Viewer can follow their search (docs/adr/0008)."""

from fastapi import APIRouter, HTTPException, Request, status
from psycopg import sql

from app import auth
from app.auth import SignedInJobSeekerId, passcode_hash
from app.models import (
    SHARE_LINKS_MAX,
    ErrorMessage,
    NewShareLink,
    PasscodeChange,
    ShareLink,
    ShareLinkCreate,
    ShareLinkId,
)
from app.queries import SHARE_LINK_COLUMNS, pool
from app.responses import ACCOUNT_ONLY, UNAUTHORIZED

router = APIRouter(prefix="/me/share-links", tags=["Share links"], responses={**UNAUTHORIZED, **ACCOUNT_ONLY})

NOT_FOUND = {404: {"model": ErrorMessage, "description": "No Share link with this id belongs to the job seeker."}}
LIMIT_REACHED = f"You can share with up to {SHARE_LINKS_MAX} people. Stop sharing one to add another."
# A new id that is already taken is drawn again; with 60 random bits, more than once is a broken generator.
ID_ATTEMPTS = 3


@router.get("", summary="List the job seeker's Share links")
def list_share_links(request: Request, job_seeker: SignedInJobSeekerId) -> list[ShareLink]:
    """Every Share link of the job seeker, oldest first, expired ones included. Never the Passcodes."""
    with pool(request).connection() as conn:
        rows = conn.execute(
            sql.SQL("select {} from share_links where job_seeker_id = %s order by created_at, id").format(
                SHARE_LINK_COLUMNS
            ),
            (job_seeker,),
        ).fetchall()
    return [ShareLink(**row) for row in rows]


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Create a Share link",
    responses={409: {"model": ErrorMessage, "description": f"The job seeker already has {SHARE_LINKS_MAX}."}},
)
def create_share_link(request: Request, job_seeker: SignedInJobSeekerId, body: ShareLinkCreate) -> NewShareLink:
    """Create a Share link that expires in 7 days, and return its Passcode, this once. Bigfoot stores
    only a hash of the Passcode, so a forgotten one can't be shown again: change it instead."""
    hashed = passcode_hash(body.passcode)
    with pool(request).connection() as conn, conn.transaction():
        # Concurrent creates for one job seeker take turns, so they can't both see 9 and make 11.
        conn.execute("select pg_advisory_xact_lock(hashtextextended('share_links:' || %s, 0))", (job_seeker,))
        count = conn.execute("select count(*) from share_links where job_seeker_id = %s", (job_seeker,)).fetchone()
        if count["count"] >= SHARE_LINKS_MAX:
            raise HTTPException(status.HTTP_409_CONFLICT, LIMIT_REACHED)
        for _ in range(ID_ATTEMPTS):
            row = conn.execute(
                sql.SQL(
                    "insert into share_links (id, job_seeker_id, label, passcode_hash) values (%s, %s, %s, %s)"
                    " on conflict (id) do nothing returning {}"
                ).format(SHARE_LINK_COLUMNS),
                (auth.new_share_link_id(), job_seeker, body.label, hashed),
            ).fetchone()
            if row is not None:
                return NewShareLink(**row, passcode=body.passcode)
    raise RuntimeError(f"No free Share link id after {ID_ATTEMPTS} tries")


@router.post("/{share_link_id}/renew", summary="Renew a Share link", responses=NOT_FOUND)
def renew_share_link(request: Request, job_seeker: SignedInJobSeekerId, share_link_id: ShareLinkId) -> ShareLink:
    """Make the Share link work for 7 days from now (not 7 more days), expired or not. Its link and
    Passcode stay the same."""
    with pool(request).connection() as conn:
        row = conn.execute(
            sql.SQL(
                "update share_links set expires_at = now() + interval '7 days'"
                " where id = %s and job_seeker_id = %s returning {}"
            ).format(SHARE_LINK_COLUMNS),
            (share_link_id, job_seeker),
        ).fetchone()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Share link not found")
    return ShareLink(**row)


@router.put("/{share_link_id}/passcode", summary="Change a Share link's Passcode", responses=NOT_FOUND)
def change_passcode(
    request: Request, job_seeker: SignedInJobSeekerId, share_link_id: ShareLinkId, body: PasscodeChange
) -> NewShareLink:
    """Set a new Passcode and return it, this once. Every Viewer of the link is signed out: their
    cookies name the old passcode version. The link and its expiry stay the same."""
    with pool(request).connection() as conn:
        row = conn.execute(
            sql.SQL(
                "update share_links set passcode_hash = %s, passcode_version = passcode_version + 1,"
                " passcode_set_at = now() where id = %s and job_seeker_id = %s returning {}"
            ).format(SHARE_LINK_COLUMNS),
            (passcode_hash(body.passcode), share_link_id, job_seeker),
        ).fetchone()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Share link not found")
    return NewShareLink(**row, passcode=body.passcode)


@router.delete(
    "/{share_link_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Stop sharing a Share link", responses=NOT_FOUND
)
def stop_sharing(request: Request, job_seeker: SignedInJobSeekerId, share_link_id: ShareLinkId) -> None:
    """Delete the Share link: it stops working straight away and leaves the list. This can't be undone."""
    with pool(request).connection() as conn:
        deleted = conn.execute(
            "delete from share_links where id = %s and job_seeker_id = %s", (share_link_id, job_seeker)
        ).rowcount
    if not deleted:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Share link not found")
