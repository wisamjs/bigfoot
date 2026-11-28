"""Rules about an Interview's date that every route shares (docs/adr/0009)."""

from datetime import UTC, date, datetime, timedelta

from app.domain import is_completed, waiting_since

NOW = datetime(2026, 11, 27, 12, tzinfo=UTC)


def test_completed_means_the_date_is_in_the_past():
    assert is_completed(NOW - timedelta(minutes=1), NOW) is True
    assert is_completed(NOW, NOW) is True
    assert is_completed(NOW + timedelta(minutes=1), NOW) is False


def test_an_unscheduled_interview_is_never_completed():
    assert is_completed(None, NOW) is False


def test_waiting_since_the_last_dated_interview_or_the_applied_date():
    applied = date(2026, 10, 2)
    assert waiting_since([], applied) == applied
    assert waiting_since([None], applied) == applied
    earlier, later = NOW - timedelta(days=9), NOW - timedelta(days=2)
    assert waiting_since([later, None, earlier], applied) == later
