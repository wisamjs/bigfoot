"""Database helpers the routes share: column lists, ordering, and turning rows into models."""

from datetime import UTC, date, datetime
from typing import Any
from uuid import UUID

from fastapi import HTTPException, Request, status
from psycopg import sql
from psycopg_pool import ConnectionPool

from app.models import Application, Interview


def pool(request: Request) -> ConnectionPool:
    return request.app.state.pool


APPLICATION_COLUMNS = (
    "id, company, title, posting_url, location, salary, applied_on, status, outcome, is_sample, created_at, updated_at"
)
COLUMNS = sql.SQL(APPLICATION_COLUMNS)
# `expired` is derived on every read, never stored, like an Interview's `completed`.
ACCESS_TOKEN_COLUMNS = sql.SQL("id, name, created_at, last_used_at, expires_at, expires_at <= now() as expired")
INTERVIEW_COLUMNS = sql.SQL("id, application_id, kind, at, notes, created_at, updated_at")
# By date alone (docs/adr/0005). An Interview with no date yet has no place by date, so it sorts last,
# Postgres' default for nulls in ascending order.
INTERVIEW_ORDER = sql.SQL("order by at, created_at, id")


def interview_view(row: dict[str, Any], now: datetime) -> Interview:
    return Interview(**row, completed=row["at"] is None or row["at"] <= now)


def _application(row: dict[str, Any], interviews: list[dict[str, Any]], now: datetime) -> Application:
    views = [interview_view(i, now) for i in interviews]
    waiting = row["status"] == "in_progress" and not any(not i.completed for i in views)
    since: datetime | date | None = None
    if waiting:
        dated = [i.at for i in views if i.at is not None]
        since = max(dated) if dated else row["applied_on"]
    return Application(**row, interviews=views, is_waiting=waiting, waiting_since=since)


def application_views(conn: Any, rows: list[dict[str, Any]]) -> list[Application]:
    """Attach each row's Interviews and derived Waiting data, reading the clock once."""
    now = datetime.now(UTC)
    by_application: dict[UUID, list[dict[str, Any]]] = {row["id"]: [] for row in rows}
    if rows:
        interviews = conn.execute(
            sql.SQL("select {} from interviews where application_id = any(%s) {}").format(
                INTERVIEW_COLUMNS, INTERVIEW_ORDER
            ),
            ([row["id"] for row in rows],),
        ).fetchall()
        for interview in interviews:
            by_application[interview["application_id"]].append(interview)
    return [_application(row, by_application[row["id"]], now) for row in rows]


def owned(conn: Any, job_seeker: str, application_id: UUID, *, lock: bool = False) -> None:
    """404 unless the Application is the job seeker's. `lock` holds its row until the transaction
    ends, so concurrent Interview inserts on it take turns."""
    found = conn.execute(
        sql.SQL("select 1 from applications where id = %s and job_seeker_id = %s {}").format(
            sql.SQL("for update" if lock else "")
        ),
        (application_id, job_seeker),
    ).fetchone()
    if found is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Application not found")
