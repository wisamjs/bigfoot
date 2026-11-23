"""Migrations that change what job seekers already recorded: Interviews (BIG-38), Locations, requiring an
Interview's date (BIG-139) and splitting Interview notes (BIG-179)."""

from datetime import UTC

import psycopg
import pytest
from psycopg import sql

from tests.conftest import MIGRATIONS, TEST_SCHEMA

MIGRATION = "20261113000000_give_applications_many_interviews.sql"
REQUIRE_DATE = "20261124000000_require_interview_date.sql"


@pytest.mark.rebuilds_schema
def test_existing_rounds_and_stages_become_interviews_status_and_outcome(settings):
    before = [m for m in sorted(MIGRATIONS.glob("*.sql")) if m.name < MIGRATION]
    schema = sql.Identifier(TEST_SCHEMA)
    with psycopg.connect(settings.database_url, prepare_threshold=None, autocommit=True) as conn:
        conn.execute(sql.SQL("drop schema if exists {} cascade").format(schema))
        conn.execute(sql.SQL("create schema {}").format(schema))
        conn.execute(sql.SQL("set search_path to {}").format(schema))
        for migration in before:
            conn.execute(migration.read_text())

        rows = [
            # name, stage, previous_round, next_round, next_round_at
            ("round", "in_progress", "recruiter_screen", "technical", "2026-11-20T15:00:00Z"),
            ("undated-round", "in_progress", None, "leadership", None),
            ("scheduled", "in_progress", "technical", "scheduled", "2026-11-21T15:00:00Z"),
            ("waiting", "in_progress", "onsite_loop", "waiting", "2026-11-01T15:00:00Z"),
            ("fresh", "in_progress", None, None, None),
            ("offer", "offer", "onsite_loop", None, None),
            ("rejected", "rejected", None, None, None),
            ("fit", "not_the_right_fit", None, None, None),
        ]
        for name, *rest in rows:
            conn.execute(
                "insert into applications (job_seeker_id, company, title, stage, previous_round, next_round,"
                " next_round_at) values ('alice', %s, 'Engineer', %s, %s, %s, %s)",
                (name, *rest),
            )

        conn.execute((MIGRATIONS / MIGRATION).read_text())

        statuses = {r[0]: r[1:] for r in conn.execute("select company, status, outcome from applications").fetchall()}
        interviews: dict[str, list] = {}
        for company, kind, at in conn.execute(
            "select a.company, i.kind, i.at from interviews i join applications a on a.id = i.application_id"
            " order by i.at nulls first, i.kind"
        ):
            interviews.setdefault(company, []).append((kind, at.astimezone(UTC).isoformat() if at else None))

    assert statuses["round"] == ("in_progress", None)
    assert statuses["offer"] == ("done", "offer")
    assert statuses["rejected"] == ("done", "rejected")
    assert statuses["fit"] == ("done", "not_the_right_fit")

    assert interviews["round"] == [("recruiter_screen", None), ("technical", "2026-11-20T15:00:00+00:00")]
    assert interviews["undated-round"] == [("leadership", None)]
    assert interviews["scheduled"] == [("technical", None), ("informal_chat", "2026-11-21T15:00:00+00:00")]
    assert interviews["waiting"] == [("onsite_loop", None)]  # waiting creates nothing
    assert "fresh" not in interviews
    assert interviews["offer"] == [("onsite_loop", None)]


LOCATION_MIGRATION = "20261123000000_make_location_a_choice.sql"


@pytest.mark.rebuilds_schema
def test_free_text_locations_become_a_location_choice_or_nothing(settings):
    before = [m for m in sorted(MIGRATIONS.glob("*.sql")) if m.name < LOCATION_MIGRATION]
    schema = sql.Identifier(TEST_SCHEMA)
    with psycopg.connect(settings.database_url, prepare_threshold=None, autocommit=True) as conn:
        conn.execute(sql.SQL("drop schema if exists {} cascade").format(schema))
        conn.execute(sql.SQL("create schema {}").format(schema))
        conn.execute(sql.SQL("set search_path to {}").format(schema))
        for migration in before:
            conn.execute(migration.read_text())

        typed = [" Remote ", "HYBRID", "In Office", "in-office", "Onsite", "on-site", "Toronto, ON", None]
        for location in typed:
            conn.execute(
                "insert into applications (job_seeker_id, company, title, location) values ('alice', %s, 't', %s)",
                (str(location), location),
            )

        conn.execute((MIGRATIONS / LOCATION_MIGRATION).read_text())

        locations = dict(conn.execute("select company, location from applications").fetchall())

    assert locations == {
        " Remote ": "remote",
        "HYBRID": "hybrid",
        "In Office": "in_office",
        "in-office": "in_office",
        "Onsite": "in_office",
        "on-site": "in_office",
        "Toronto, ON": None,
        "None": None,
    }


def _add_application(conn) -> str:
    return conn.execute(
        "insert into applications (job_seeker_id, company, title) values ('alice', 'Ramp', 'Engineer') returning id"
    ).fetchone()[0]


def test_the_database_requires_an_interviews_date(settings):
    with psycopg.connect(settings.database_url, prepare_threshold=None, autocommit=True) as conn:
        conn.execute(sql.SQL("set search_path to {}").format(sql.Identifier(TEST_SCHEMA)))
        application = _add_application(conn)
        with pytest.raises(psycopg.errors.NotNullViolation):
            conn.execute("insert into interviews (application_id, kind) values (%s, 'technical')", (application,))


@pytest.mark.rebuilds_schema
def test_the_date_migration_deletes_undated_interviews_and_keeps_dated_ones(settings):
    before = [m for m in sorted(MIGRATIONS.glob("*.sql")) if m.name < REQUIRE_DATE]
    schema = sql.Identifier(TEST_SCHEMA)
    with psycopg.connect(settings.database_url, prepare_threshold=None, autocommit=True) as conn:
        conn.execute(sql.SQL("drop schema if exists {} cascade").format(schema))
        conn.execute(sql.SQL("create schema {}").format(schema))
        conn.execute(sql.SQL("set search_path to {}").format(schema))
        for migration in before:
            conn.execute(migration.read_text())

        application = _add_application(conn)
        conn.execute(
            "insert into interviews (application_id, kind, at, notes)"
            " values (%s, 'technical', '2026-09-15T16:00:00Z', 'Draw the diagram first.')",
            (application,),
        )
        conn.execute(
            "insert into interviews (application_id, kind, notes) values (%s, 'recruiter_screen', 'Undated.')",
            (application,),
        )

        conn.execute((MIGRATIONS / REQUIRE_DATE).read_text())

        interviews = conn.execute("select kind, at, notes from interviews").fetchall()
        nullable = conn.execute(
            "select is_nullable from information_schema.columns"
            " where table_schema = %s and table_name = 'interviews' and column_name = 'at'",
            (TEST_SCHEMA,),
        ).fetchone()[0]

    assert [(kind, at.astimezone(UTC).isoformat(), notes) for kind, at, notes in interviews] == [
        ("technical", "2026-09-15T16:00:00+00:00", "Draw the diagram first.")
    ]
    assert nullable == "NO"


SPLIT_NOTES = "20261125000000_split_interview_notes.sql"


@pytest.mark.rebuilds_schema
def test_splitting_interview_notes_moves_existing_notes_unchanged_into_how_it_went(settings):
    before = [m for m in sorted(MIGRATIONS.glob("*.sql")) if m.name < SPLIT_NOTES]
    schema = sql.Identifier(TEST_SCHEMA)
    written = "Asked about caching.\n\n- Why us?\n- Why now?\n\nNext time: draw the diagram first.  "
    with psycopg.connect(settings.database_url, prepare_threshold=None, autocommit=True) as conn:
        conn.execute(sql.SQL("drop schema if exists {} cascade").format(schema))
        conn.execute(sql.SQL("create schema {}").format(schema))
        conn.execute(sql.SQL("set search_path to {}").format(schema))
        for migration in before:
            conn.execute(migration.read_text())

        application = _add_application(conn)
        for kind, notes in [("technical", written), ("leadership", "é" * 20_000), ("recruiter_screen", None)]:
            conn.execute(
                "insert into interviews (application_id, kind, at, notes) values (%s, %s, '2026-09-15T16:00:00Z', %s)",
                (application, kind, notes),
            )

        conn.execute((MIGRATIONS / SPLIT_NOTES).read_text())

        rows = conn.execute(
            "select kind, what_they_asked, how_it_went, takeaway from interviews order by kind"
        ).fetchall()
        # The new columns keep their limits.
        with pytest.raises(psycopg.errors.CheckViolation):
            conn.execute("update interviews set takeaway = %s", ("x" * 501,))
        with pytest.raises(psycopg.errors.CheckViolation):
            conn.execute("update interviews set what_they_asked = %s", ("x" * 20_001,))
        with pytest.raises(psycopg.errors.CheckViolation):
            conn.execute("update interviews set how_it_went = %s", ("x" * 20_001,))

    assert rows == [
        ("leadership", None, "é" * 20_000, None),
        ("recruiter_screen", None, None, None),
        ("technical", None, written, None),
    ]
