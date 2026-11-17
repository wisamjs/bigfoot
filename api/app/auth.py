"""Who is calling. Two kinds of bearer token name a job seeker (docs/adr/0001, docs/adr/0003):

- a web token: the short-lived JWT the Next.js server signs per request, for a signed-in job seeker;
- an Access token (GLOSSARY.md): a long-lived secret the job seeker created for a script.

Both resolve to the same job seeker id, so routes scope their queries the same way for either.
"""

import hashlib
import secrets
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

AUDIENCE = "bigfoot-api"
ISSUER = "bigfoot-web"

# Marks a bearer token as an Access token, for this module and for secret scanners.
ACCESS_TOKEN_PREFIX = "bigfoot_"

# Declared so OpenAPI lists both schemes and Swagger UI shows them in its Authorize dialog.
# auto_error is off so a missing or non-bearer header gets this module's 401, not FastAPI's.
access_token_bearer = HTTPBearer(
    auto_error=False,
    scheme_name="AccessToken",
    description=(
        f"An Access token: a secret starting with `{ACCESS_TOKEN_PREFIX}` that a job seeker creates on their "
        "Account page and gives a script. It reads and writes that job seeker's Applications and Interviews, "
        "expires a year after it is created, and stops working when revoked. It can't reach the Account routes."
    ),
)
web_token_bearer = HTTPBearer(
    auto_error=False,
    scheme_name="WebToken",
    bearerFormat="JWT",
    description=(
        "A short-lived HS256 JWT signed with API_SECRET, with `sub` set to the job seeker's id, "
        f"`aud` {AUDIENCE!r} and `iss` {ISSUER!r}. The Next.js server signs one per request for the signed-in "
        "job seeker; locally, `node scripts/dev-api-token.mjs` prints one for the test job seeker."
    ),
)

Credentials = HTTPAuthorizationCredentials | None


def new_access_token() -> str:
    """A new secret with 256 bits of randomness. Only its hash is ever stored."""
    return ACCESS_TOKEN_PREFIX + secrets.token_urlsafe(32)


def access_token_hash(token: str) -> str:
    """How access_tokens stores a secret: a SHA-256 hex digest. Unsalted and fast is enough because
    the secret is random, not chosen by a person, and the digest is what the lookup matches on."""
    return hashlib.sha256(token.encode()).hexdigest()


def _token(credentials: Credentials) -> str:
    if credentials is None or not credentials.credentials:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")
    return credentials.credentials


def _from_web_token(request: Request, token: str) -> str:
    try:
        claims = jwt.decode(
            token,
            request.app.state.settings.api_secret,
            algorithms=["HS256"],
            audience=AUDIENCE,
            issuer=ISSUER,
            options={"require": ["exp", "sub"]},
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token") from exc
    return claims["sub"]


def _from_access_token(request: Request, token: str) -> str:
    """One statement both checks the token and records its use. A revoked token has no row."""
    with request.app.state.pool.connection() as conn:
        row = conn.execute(
            "update access_tokens set last_used_at = now() where token_hash = %s and expires_at > now()"
            " returning job_seeker_id",
            (access_token_hash(token),),
        ).fetchone()
    if row is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
    return row["job_seeker_id"]


def job_seeker_id(
    request: Request,
    access_token: Annotated[Credentials, Depends(access_token_bearer)],
    web_token: Annotated[Credentials, Depends(web_token_bearer)],
) -> str:
    """The job seeker's id, from a verified Access token or web token."""
    # Both schemes read the same Authorization header; they are separate so OpenAPI lists each.
    token = _token(access_token or web_token)
    if token.startswith(ACCESS_TOKEN_PREFIX):
        return _from_access_token(request, token)
    return _from_web_token(request, token)


def signed_in_job_seeker_id(request: Request, web_token: Annotated[Credentials, Depends(web_token_bearer)]) -> str:
    """The job seeker's id, from a web token only: for the Account routes, which a script can't use.

    A leaked Access token then can't delete the account or create tokens that outlive its revocation.
    """
    token = _token(web_token)
    if token.startswith(ACCESS_TOKEN_PREFIX):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "An Access token can't use Account routes. Sign in to Bigfoot and use the Account page.",
        )
    return _from_web_token(request, token)


JobSeekerId = Annotated[str, Depends(job_seeker_id)]
SignedInJobSeekerId = Annotated[str, Depends(signed_in_job_seeker_id)]
