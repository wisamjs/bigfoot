"""Sample Applications (GLOSSARY.md) are dated from the moment a job seeker is onboarded, and each shows
a different state. test_onboarding.py checks they reach the database once."""

from datetime import UTC, date, datetime, time, timedelta

from app.models import ApplicationCreate, InterviewCreate
from app.samples import sample_applications

NOW = datetime(2026, 11, 20, 9, 15, tzinfo=UTC)


def test_samples_are_four_made_up_applications_in_different_states():
    samples = sample_applications(NOW)
    assert [(s["company"], s.get("status", "in_progress"), s.get("outcome")) for s in samples] == [
        ("Northwind Robotics", "in_progress", None),
        ("Juniper Labs", "in_progress", None),
        ("Blue Heron Health", "done", "offer"),
        ("Cedarline", "done", "rejected"),
    ]


def test_samples_applied_in_the_past_few_weeks():
    assert [s["applied_on"] for s in sample_applications(NOW)] == [
        date(2026, 11, 8),
        date(2026, 11, 15),
        date(2026, 10, 25),
        date(2026, 11, 1),
    ]


def test_interviews_are_at_17_utc_relative_to_today_with_one_upcoming():
    interviews = [at for s in sample_applications(NOW) for *_, at in s["interviews"]]
    assert all(at.time() == time(17) and at.tzinfo == UTC for at in interviews)
    assert [at for at in interviews if at > NOW] == [datetime(2026, 11, 23, 17, tzinfo=UTC)]


def test_the_new_sample_has_no_interviews_so_it_is_waiting():
    assert next(s for s in sample_applications(NOW) if s["company"] == "Juniper Labs")["interviews"] == []


def test_every_sample_passes_the_rules_a_job_seeker_s_own_application_does():
    for sample in sample_applications(NOW):
        fields = {key: value for key, value in sample.items() if key != "interviews"}
        ApplicationCreate.model_validate(fields)
        for category, title, at in sample["interviews"]:
            InterviewCreate.model_validate({"category": category, "title": title, "at": at})
        assert all(at.date() >= sample["applied_on"] for *_, at in sample["interviews"])


def test_samples_move_with_the_day_they_are_made():
    later = sample_applications(NOW + timedelta(days=30))
    assert later[0]["applied_on"] == date(2026, 11, 8) + timedelta(days=30)
