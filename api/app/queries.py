"""Database helpers the routes share: column lists, ordering, and turning rows into models."""

from datetime import UTC, date, datetime
from typing import Any
from uuid import UUID

from fastapi import HTTPException, Request, status
from psycopg import sql
from psycopg_pool import ConnectionPool

from app.domain import is_completed, waiting_since
from app.models import Application, Interview


def pool(request: Request) -> ConnectionPool:
    return request.app.state.pool


APPLICATION_COLUMNS = (
    "id, company, title, posting_url, location, office_days, salary, applied_on, status, outcome, done_on,"
    " outcome_note, is_sample, created_at, updated_at"
)
COLUMNS = sql.SQL(APPLICATION_COLUMNS)
# `expired` is derived on every read, never stored, like an Interview's `completed`.
ACCESS_TOKEN_COLUMNS = sql.SQL("id, name, created_at, last_used_at, expires_at, expires_at <= now() as expired")
SHARE_LINK_COLUMNS = sql.SQL(
    "id, label, created_at, passcode_set_at, expires_at, last_opened_at, expires_at <= now() as expired"
)
INTERVIEW_COLUMNS = sql.SQL(
    "id, application_id, category, title, at, what_they_asked, how_it_went, takeaway, prep_notes, created_at,"
    " updated_at"
)
# By date, then Unscheduled Interviews (no date) last in the order added: Postgres sorts nulls last
# (docs/adr/0009).
INTERVIEW_ORDER = sql.SQL("order by at nulls last, created_at, id")


def interview_view(row: dict[str, Any], participants: list[dict[str, Any]], now: datetime) -> Interview:
    return Interview(**row, participants=participants, completed=is_completed(row["at"], now))


def participants_of(conn: Any, interview_ids: list[UUID]) -> dict[UUID, list[dict[str, Any]]]:
    """Each Interview's Participants, in the order the job seeker listed them; [] for one with none."""
    by_interview: dict[UUID, list[dict[str, Any]]] = {interview_id: [] for interview_id in interview_ids}
    if interview_ids:
        rows = conn.execute(
            "select ip.interview_id, p.id, p.role, p.name from interview_participants ip"
            " join participants p on p.id = ip.participant_id"
            " where ip.interview_id = any(%s) order by ip.interview_id, ip.position",
            (interview_ids,),
        ).fetchall()
        for row in rows:
            by_interview[row.pop("interview_id")].append(row)
    return by_interview


def interview_views(conn: Any, rows: list[dict[str, Any]], now: datetime) -> list[Interview]:
    """The Interviews of these rows with their Participants."""
    participants = participants_of(conn, [row["id"] for row in rows])
    return [interview_view(row, participants[row["id"]], now) for row in rows]


def _application(row: dict[str, Any], views: list[Interview], now: datetime) -> Application:
    waiting = row["status"] == "in_progress" and not any(not i.completed for i in views)
    since: datetime | date | None = None
    if waiting:
        since = waiting_since([i.at for i in views], row["applied_on"])
    return Application(**row, interviews=views, is_waiting=waiting, waiting_since=since)


def application_views(conn: Any, rows: list[dict[str, Any]]) -> list[Application]:
    """Attach each row's Interviews and derived Waiting data, reading the clock once."""
    now = datetime.now(UTC)
    by_application: dict[UUID, list[Interview]] = {row["id"]: [] for row in rows}
    if rows:
        interviews = conn.execute(
            sql.SQL("select {} from interviews where application_id = any(%s) {}").format(
                INTERVIEW_COLUMNS, INTERVIEW_ORDER
            ),
            ([row["id"] for row in rows],),
        ).fetchall()
        for interview in interview_views(conn, interviews, now):
            by_application[interview.application_id].append(interview)
    return [_application(row, by_application[row["id"]], now) for row in rows]


def owned(conn: Any, job_seeker: str, application_id: UUID, *, lock: bool = False) -> str:
    """The Application's Status; 404 unless the Application is the job seeker's. `lock` holds its row
    until the transaction ends, so concurrent Interview inserts on it take turns."""
    found = conn.execute(
        sql.SQL("select status from applications where id = %s and job_seeker_id = %s {}").format(
            sql.SQL("for update" if lock else "")
        ),
        (application_id, job_seeker),
    ).fetchone()
    if found is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Application not found")
    return found["status"]
