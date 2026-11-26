"""Participants (GLOSSARY.md): saving who is in an Interview, and deleting those left in none."""

from typing import Any
from uuid import UUID

from fastapi import HTTPException, status

from app.models import ParticipantInput

PARTICIPANT_NOT_FOUND = "A Participant sent by id isn't on this Application."


def set_participants(conn: Any, application_id: UUID, interview_id: UUID, inputs: list[ParticipantInput]) -> None:
    """Make `inputs` the Interview's Participants, in order: existing ones (by id, on this Application) take
    the role and name sent, on every Interview they are in, and the rest are added to the Application.
    Then deletes any of the Application's Participants left in no Interview. 422 for an id that isn't the
    Application's."""
    known = [p.id for p in inputs if p.id is not None]
    if known:
        found = conn.execute(
            "select count(*) from participants where application_id = %s and id = any(%s)", (application_id, known)
        ).fetchone()["count"]
        if found != len(known):
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, PARTICIPANT_NOT_FOUND)
    ids: list[UUID] = []
    for participant in inputs:
        if participant.id is None:
            ids.append(
                conn.execute(
                    "insert into participants (application_id, role, name) values (%s, %s, %s) returning id",
                    (application_id, participant.role, participant.name),
                ).fetchone()["id"]
            )
            continue
        conn.execute(
            "update participants set role = %s, name = %s, updated_at = now()"
            " where id = %s and (role, name) is distinct from (%s, %s)",
            (participant.role, participant.name, participant.id, participant.role, participant.name),
        )
        ids.append(participant.id)
    conn.execute("delete from interview_participants where interview_id = %s", (interview_id,))
    with conn.cursor() as cur:
        cur.executemany(
            "insert into interview_participants (interview_id, participant_id, position) values (%s, %s, %s)",
            [(interview_id, participant_id, position) for position, participant_id in enumerate(ids)],
        )
    prune_participants(conn, application_id)


def prune_participants(conn: Any, application_id: UUID) -> None:
    """Delete the Application's Participants that no Interview has any more."""
    conn.execute(
        "delete from participants p where p.application_id = %s"
        " and not exists (select 1 from interview_participants ip where ip.participant_id = p.id)",
        (application_id,),
    )
