"""OpenAPI response descriptions the routers share."""

from typing import Any

from app.models import ErrorMessage

UNAUTHORIZED: dict[int | str, dict[str, Any]] = {
    401: {"model": ErrorMessage, "description": "The bearer token is missing, expired or invalid."}
}
ACCOUNT_ONLY: dict[int | str, dict[str, Any]] = {
    403: {"model": ErrorMessage, "description": "The bearer token is an Access token, which can't use Account routes."}
}
APPLICATION_NOT_FOUND: dict[int | str, dict[str, Any]] = {
    404: {"model": ErrorMessage, "description": "No Application with this id belongs to the job seeker."}
}
INTERVIEW_NOT_FOUND: dict[int | str, dict[str, Any]] = {
    404: {
        "model": ErrorMessage,
        "description": "The Application isn't the job seeker's, or has no Interview with this id.",
    }
}
