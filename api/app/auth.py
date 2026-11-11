"""Who is calling: the Next.js server signs a short-lived JWT per request (docs/adr/0001)."""

from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, Request, status

AUDIENCE = "bigfoot-api"
ISSUER = "bigfoot-web"


def job_seeker_id(request: Request) -> str:
    """The job seeker's id, taken from a verified bearer token."""
    header = request.headers.get("authorization", "")
    scheme, _, token = header.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")
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


JobSeekerId = Annotated[str, Depends(job_seeker_id)]
