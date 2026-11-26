"""Who is calling. Two kinds of bearer token name a job seeker (docs/adr/0001, docs/adr/0003):

- a web token: the short-lived JWT the Next.js server signs per request, for a signed-in job seeker;
- an Access token (GLOSSARY.md): a long-lived secret the job seeker created for a script.

Both resolve to the same job seeker id, so routes scope their queries the same way for either.

A third kind names a Share link, not a job seeker (docs/adr/0008): a Viewer token, which this API
signs when a Viewer types the right Passcode. It reads that one link's Journey and nothing else.
"""

import hashlib
import re
import secrets
import string
from dataclasses import dataclass
from datetime import datetime
from typing import Annotated

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError
from argon2.low_level import Type
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.monitoring import tag_job_seeker

AUDIENCE = "bigfoot-api"
ISSUER = "bigfoot-web"
# A Viewer token's own audience and issuer, so neither kind of JWT passes for the other.
VIEWER_AUDIENCE = "bigfoot-viewer"
VIEWER_ISSUER = "bigfoot-api"

# Marks a bearer token as an Access token, so this module can tell the two kinds apart, and so a
# secret scanner given this pattern can find a leaked one.
ACCESS_TOKEN_PREFIX = "bigfoot_"
# Every Access token new_access_token makes: the prefix, then 32 random bytes in URL-safe base64.
# Anything else is refused before it reaches the database.
ACCESS_TOKEN_PATTERN = re.compile(rf"^{ACCESS_TOKEN_PREFIX}[A-Za-z0-9_-]{{43}}$")
# How stale last_used_at may get. Writing it on every request would make a script's parallel
# requests wait on the token's row lock, and turn every read into a write.
LAST_USED_RESOLUTION = "1 minute"

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

viewer_token_bearer = HTTPBearer(
    auto_error=False,
    scheme_name="ViewerToken",
    bearerFormat="JWT",
    description=(
        "A Viewer token: an HS256 JWT this API returns when a Viewer types a Share link's Passcode. It reads "
        "that Share link's Journey only, and stops working when the link is stopped, expires or gets a new "
        "Passcode. The Next.js server keeps it in the Viewer's cookie for that link."
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


# A Share link's id (GLOSSARY.md): 10 characters from the URL-safe base64 alphabet, 60 random bits.
# It is the link's path, so a Viewer needs both it and the Passcode (docs/adr/0008).
SHARE_LINK_ID_ALPHABET = string.ascii_letters + string.digits + "-_"
SHARE_LINK_ID_LENGTH = 10
SHARE_LINK_ID_PATTERN = re.compile(rf"^[A-Za-z0-9_-]{{{SHARE_LINK_ID_LENGTH}}}$")

# argon2id with argon2-cffi's defaults (RFC 9106's low-memory profile): a Passcode is chosen by a
# person, so it gets a slow, salted hash, unlike an Access token's random secret.
_passcode_hasher = PasswordHasher(type=Type.ID)


def new_share_link_id() -> str:
    return "".join(secrets.choice(SHARE_LINK_ID_ALPHABET) for _ in range(SHARE_LINK_ID_LENGTH))


def passcode_hash(passcode: str) -> str:
    """How share_links stores a Passcode: an argon2id hash in PHC form, with its own salt."""
    return _passcode_hasher.hash(passcode)


def passcode_matches(stored_hash: str, passcode: str) -> bool:
    """Whether `passcode` is the one `stored_hash` was made from."""
    try:
        return _passcode_hasher.verify(stored_hash, passcode)
    except (VerificationError, InvalidHashError):
        return False


@dataclass(frozen=True)
class Viewer:
    """Who a Viewer token names: one Share link, at the passcode version it was issued for."""

    share_link_id: str
    passcode_version: int


def new_viewer_token(secret: str, share_link_id: str, passcode_version: int, expires_at: datetime) -> str:
    """A Viewer token for one Share link, valid until the link expires. Changing the Passcode raises
    the link's version, so tokens issued before stop working (docs/adr/0008)."""
    claims = {
        "sub": share_link_id,
        "ver": passcode_version,
        "aud": VIEWER_AUDIENCE,
        "iss": VIEWER_ISSUER,
        "exp": int(expires_at.timestamp()),
    }
    return jwt.encode(claims, secret, algorithm="HS256")


def viewer(request: Request, credentials: Annotated[Credentials, Depends(viewer_token_bearer)]) -> Viewer:
    """The Share link a Viewer token names. Only checks the signature and expiry: the route checks the
    link still exists at that passcode version. A web token or Access token is refused."""
    token = _token(credentials)
    try:
        claims = jwt.decode(
            token,
            request.app.state.settings.api_secret,
            algorithms=["HS256"],
            audience=VIEWER_AUDIENCE,
            issuer=VIEWER_ISSUER,
            options={"require": ["exp", "sub", "ver"]},
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token") from exc
    if not isinstance(claims["ver"], int) or not isinstance(claims["sub"], str):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
    return Viewer(share_link_id=claims["sub"], passcode_version=claims["ver"])


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
    tag_job_seeker(claims["sub"])
    return claims["sub"]


def _from_access_token(request: Request, token: str) -> str:
    """One statement both checks the token and records its use, at most once per
    LAST_USED_RESOLUTION. A revoked token has no row."""
    if not ACCESS_TOKEN_PATTERN.fullmatch(token):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
    with request.app.state.pool.connection() as conn:
        row = conn.execute(
            f"""
            with found as (
                select id, job_seeker_id, last_used_at from access_tokens
                where token_hash = %s and expires_at > now()
            ), touched as (
                update access_tokens set last_used_at = now() from found
                where access_tokens.id = found.id
                    and (found.last_used_at is null
                         or found.last_used_at < now() - interval '{LAST_USED_RESOLUTION}')
            )
            select job_seeker_id from found
            """,
            (access_token_hash(token),),
        ).fetchone()
    if row is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")
    tag_job_seeker(row["job_seeker_id"])
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
ViewerOf = Annotated[Viewer, Depends(viewer)]
