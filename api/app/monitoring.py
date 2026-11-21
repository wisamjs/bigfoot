"""Error reports to Sentry (BIG-14), without job seekers' Applications or identity.

The SDK collects no user data, cookies, headers, query strings, bodies, SQL parameters or local
variables, and `scrub` removes emails and tokens from what is left. The job seeker is named only by
a hash of their job seeker id (`tag_job_seeker`).
"""

import hashlib
import re
from collections.abc import Mapping
from typing import Any

import sentry_sdk

EMAIL = re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.IGNORECASE)
# Three base64url segments, as in a JWT (the API's bearer tokens).
JWT = re.compile(r"\beyJ[\w-]*\.[\w-]+\.[\w-]+")


def scrub_text(text: str) -> str:
    return JWT.sub("[token]", EMAIL.sub("[email]", text))


def _scrub(value: Any, depth: int = 0) -> Any:
    if isinstance(value, str):
        return scrub_text(value)
    if depth > 8:
        return value
    if isinstance(value, dict):
        return {key: _scrub(item, depth + 1) for key, item in value.items()}
    if isinstance(value, list):
        return [_scrub(item, depth + 1) for item in value]
    return value


def scrub(event: dict[str, Any], _hint: Any = None) -> dict[str, Any]:
    """`before_send`: drops cookies, headers and bodies, and scrubs emails and JWTs from every string."""
    request = event.get("request")
    if isinstance(request, dict):
        for key in ("cookies", "headers", "data", "query_string", "env"):
            request.pop(key, None)
    user = event.get("user")
    if isinstance(user, dict):
        event["user"] = {"id": user["id"]} if user.get("id") else {}
    return _scrub(event)


def environment(env: Mapping[str, str]) -> str:
    """The Vercel environment (`production`, `preview`), or `development` off Vercel."""
    return env.get("VERCEL_ENV") or "development"


def traces_sample_rate(env_name: str) -> float:
    """All traces locally, so a test shows one; a tenth elsewhere, to stay in the free tier."""
    return 1.0 if env_name == "development" else 0.1


OFF = {"mode": "off"}


def init(dsn: str | None, env: Mapping[str, str]) -> None:
    """Start Sentry. Without a DSN (tests, most local runs) the SDK sends nothing."""
    env_name = environment(env)
    sentry_sdk.init(
        dsn=dsn or None,
        environment=env_name,
        release=env.get("VERCEL_GIT_COMMIT_SHA") or None,
        traces_sample_rate=traces_sample_rate(env_name),
        data_collection={
            "user_info": False,
            # `False` here means the default denylist, not off.
            "cookies": OFF,
            "http_headers": {"request": OFF, "response": OFF},
            "http_bodies": [],
            "url_query_params": OFF,
            "database_query_data": False,
            "stack_frame_variables": False,
        },
        before_send=scrub,
    )


def job_seeker_tag(job_seeker_id: str) -> str:
    """The job seeker as Sentry sees them: a SHA-256 of their job seeker id, never the id itself."""
    return hashlib.sha256(job_seeker_id.encode()).hexdigest()


def tag_job_seeker(job_seeker_id: str) -> None:
    sentry_sdk.set_user({"id": job_seeker_tag(job_seeker_id)})
