"""Secrets that let a job seeker's scripts use the API as them."""

from fastapi import APIRouter, HTTPException, Request, status
from psycopg import sql

from app.auth import SignedInJobSeekerId, access_token_hash, new_access_token
from app.models import AccessToken, AccessTokenCreate, AccessTokenId, ErrorMessage, NewAccessToken
from app.queries import ACCESS_TOKEN_COLUMNS, pool
from app.responses import ACCOUNT_ONLY, UNAUTHORIZED

router = APIRouter(prefix="/me/access-tokens", tags=["Access tokens"], responses={**UNAUTHORIZED, **ACCOUNT_ONLY})


@router.get("", summary="List the job seeker's Access tokens")
def list_access_tokens(request: Request, job_seeker: SignedInJobSeekerId) -> list[AccessToken]:
    """Every Access token of the job seeker that hasn't been revoked, oldest first, expired ones
    included. Never the secrets."""
    with pool(request).connection() as conn:
        rows = conn.execute(
            sql.SQL("select {} from access_tokens where job_seeker_id = %s order by created_at, id").format(
                ACCESS_TOKEN_COLUMNS
            ),
            (job_seeker,),
        ).fetchall()
    return [AccessToken(**row) for row in rows]


@router.post("", status_code=status.HTTP_201_CREATED, summary="Create an Access token")
def create_access_token(request: Request, job_seeker: SignedInJobSeekerId, body: AccessTokenCreate) -> NewAccessToken:
    """Create an Access token and return its secret, this once. Bigfoot stores only a hash of
    the secret, so a lost one can't be shown again: revoke the token and create another."""
    token = new_access_token()
    with pool(request).connection() as conn:
        row = conn.execute(
            sql.SQL(
                "insert into access_tokens (job_seeker_id, name, token_hash) values (%s, %s, %s) returning {}"
            ).format(ACCESS_TOKEN_COLUMNS),
            (job_seeker, body.name, access_token_hash(token)),
        ).fetchone()
    return NewAccessToken(**row, token=token)


@router.delete(
    "/{access_token_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Revoke an Access token",
    responses={404: {"model": ErrorMessage, "description": "No Access token with this id belongs to the job seeker."}},
)
def revoke_access_token(request: Request, job_seeker: SignedInJobSeekerId, access_token_id: AccessTokenId) -> None:
    """Revoke an Access token: it stops working straight away and leaves the list. This can't be undone."""
    with pool(request).connection() as conn:
        deleted = conn.execute(
            "delete from access_tokens where id = %s and job_seeker_id = %s", (access_token_id, job_seeker)
        ).rowcount
    if not deleted:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Access token not found")
