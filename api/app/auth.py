"""Who is calling: the Next.js server signs a short-lived JWT per request (docs/adr/0001)."""

from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.monitoring import tag_job_seeker

AUDIENCE = "bigfoot-api"
ISSUER = "bigfoot-web"

# Declared so OpenAPI lists the scheme and Swagger UI shows its Authorize dialog. auto_error is
# off so a missing or non-bearer header gets this module's 401, not FastAPI's.
bearer = HTTPBearer(
    auto_error=False,
    scheme_name="BearerToken",
    bearerFormat="JWT",
    description=(
        "A short-lived HS256 JWT signed with API_SECRET, with `sub` set to the job seeker's id, "
        f"`aud` {AUDIENCE!r} and `iss` {ISSUER!r}. The Next.js server signs one per request; locally, "
        "`node scripts/dev-api-token.mjs` prints one for the test job seeker."
    ),
)


def job_seeker_id(
    request: Request, credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]
) -> str:
    """The job seeker's id, taken from a verified bearer token."""
    if credentials is None or not credentials.credentials:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")
    try:
        claims = jwt.decode(
            credentials.credentials,
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


JobSeekerId = Annotated[str, Depends(job_seeker_id)]
