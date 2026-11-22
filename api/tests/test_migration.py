"""The Interviews migration keeps what job seekers recorded (BIG-38); the date migration requires one (BIG-139)."""

import psycopg
import pytest
from psycopg import sql

from tests.conftest import MIGRATIONS, TEST_SCHEMA

MIGRATION = "20261113000000_give_applications_many_interviews.sql"
REQUIRE_DATE = "20261122000000_require_interview_date.sql"


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
            interviews.setdefault(company, []).append((kind, at.isoformat() if at else None))

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


def _schema_before(conn, migration):
    schema = sql.Identifier(TEST_SCHEMA)
    conn.execute(sql.SQL("drop schema if exists {} cascade").format(schema))
    conn.execute(sql.SQL("create schema {}").format(schema))
    conn.execute(sql.SQL("set search_path to {}").format(schema))
    for earlier in sorted(MIGRATIONS.glob("*.sql")):
        if earlier.name < migration:
            conn.execute(earlier.read_text())


def _add_application(conn):
    return conn.execute(
        "insert into applications (job_seeker_id, company, title) values ('alice', 'Ramp', 'Engineer') returning id"
    ).fetchone()[0]


def test_the_database_requires_an_interviews_date(settings):
    with psycopg.connect(settings.database_url, prepare_threshold=None, autocommit=True) as conn:
        conn.execute(sql.SQL("set search_path to {}").format(sql.Identifier(TEST_SCHEMA)))
        application = _add_application(conn)
        with pytest.raises(psycopg.errors.NotNullViolation):
            conn.execute("insert into interviews (application_id, kind) values (%s, 'technical')", (application,))


def test_the_date_migration_keeps_dated_interviews_and_refuses_an_undated_one(settings):
    with psycopg.connect(settings.database_url, prepare_threshold=None, autocommit=True) as conn:
        _schema_before(conn, REQUIRE_DATE)
        application = _add_application(conn)
        conn.execute(
            "insert into interviews (application_id, kind, at) values (%s, 'technical', '2026-09-15T16:00:00Z')",
            (application,),
        )
        migration = (MIGRATIONS / REQUIRE_DATE).read_text()
        conn.execute(migration)
        assert conn.execute("select count(*) from interviews").fetchone()[0] == 1

        _schema_before(conn, REQUIRE_DATE)
        application = _add_application(conn)
        conn.execute("insert into interviews (application_id, kind) values (%s, 'technical')", (application,))
        with pytest.raises(psycopg.errors.NotNullViolation):
            conn.execute(migration)
