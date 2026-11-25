"""The request models' rules, checked on the models themselves: no database, no HTTP. The API tests
check that a route answers 422 for them; these check each rule and each boundary."""

from datetime import UTC, date, datetime, timedelta
from typing import Any

import pytest
from pydantic import BaseModel, ValidationError

from app.domain import (
    COMPANY_MAX_LENGTH,
    HOW_IT_WENT_MAX_LENGTH,
    INTERVIEW_PREP_NOTES_MAX_LENGTH,
    OFFICE_DAYS_MAX,
    OFFICE_DAYS_MIN,
    OUTCOME_NOTE_MAX_LENGTH,
    POSTING_URL_MAX_LENGTH,
    SALARY_MAX_LENGTH,
    TAKEAWAY_MAX_LENGTH,
    TITLE_MAX_LENGTH,
    WHAT_THEY_ASKED_MAX_LENGTH,
)
from app.models import (
    ACCESS_TOKEN_NAME_MAX,
    AccessTokenCreate,
    ApplicationCreate,
    ApplicationPatch,
    InterviewCreate,
    InterviewPatch,
    check_done,
    check_office_days,
    check_outcome,
    latest_done_on,
)

APPLICATION = {"company": "Northwind", "title": "Engineer"}
INTERVIEW = {"category": "technical", "title": "Technical", "at": "2026-11-20T17:00:00Z"}
DONE = {"status": "done", "outcome": "offer"}


def errors(model: type[BaseModel], data: dict[str, Any]) -> list[str]:
    """Each problem Pydantic finds, as `field: message`, or `message` for a whole-model rule."""
    with pytest.raises(ValidationError) as caught:
        model.model_validate(data)
    return [
        f"{'.'.join(str(part) for part in error['loc'])}: {error['msg']}" if error["loc"] else error["msg"]
        for error in caught.value.errors()
    ]


# Text


@pytest.mark.parametrize("field", ["company", "title"])
@pytest.mark.parametrize("value", ["", "   ", "\n\t"])
def test_required_text_must_not_be_blank(field, value):
    assert errors(ApplicationCreate, APPLICATION | {field: value}) == [f"{field}: Value error, must not be blank"]


def test_required_text_is_trimmed():
    application = ApplicationCreate.model_validate({"company": "  Northwind ", "title": "\tEngineer\n"})
    assert (application.company, application.title) == ("Northwind", "Engineer")


@pytest.mark.parametrize("value", [None, "", "   "])
def test_blank_optional_text_is_stored_as_null(value):
    assert ApplicationCreate.model_validate(APPLICATION | {"salary": value}).salary is None


def test_optional_text_is_trimmed():
    assert ApplicationCreate.model_validate(APPLICATION | {"salary": " $120k "}).salary == "$120k"


# Each capped field: (model, the rest of a valid body, field, cap, a valid value of a given length).
CAPS = [
    (ApplicationCreate, APPLICATION, "company", COMPANY_MAX_LENGTH, lambda n: "c" * n),
    (ApplicationCreate, APPLICATION, "title", TITLE_MAX_LENGTH, lambda n: "t" * n),
    (ApplicationCreate, APPLICATION, "salary", SALARY_MAX_LENGTH, lambda n: "s" * n),
    (ApplicationCreate, APPLICATION, "posting_url", POSTING_URL_MAX_LENGTH, lambda n: "https://" + "u" * (n - 8)),
    (ApplicationCreate, APPLICATION | DONE, "outcome_note", OUTCOME_NOTE_MAX_LENGTH, lambda n: "o" * n),
    (InterviewCreate, INTERVIEW, "what_they_asked", WHAT_THEY_ASKED_MAX_LENGTH, lambda n: "w" * n),
    (InterviewCreate, INTERVIEW, "how_it_went", HOW_IT_WENT_MAX_LENGTH, lambda n: "h" * n),
    (InterviewCreate, INTERVIEW, "takeaway", TAKEAWAY_MAX_LENGTH, lambda n: "k" * n),
    (InterviewCreate, INTERVIEW, "prep_notes", INTERVIEW_PREP_NOTES_MAX_LENGTH, lambda n: "p" * n),
    (AccessTokenCreate, {}, "name", ACCESS_TOKEN_NAME_MAX, lambda n: "n" * n),
]


@pytest.mark.parametrize(("model", "body", "field", "cap", "text"), CAPS, ids=[case[2] for case in CAPS])
def test_text_up_to_its_cap_is_kept_and_one_more_character_is_refused(model, body, field, cap, text):
    assert getattr(model.model_validate(body | {field: text(cap)}), field) == text(cap)
    assert errors(model, body | {field: text(cap + 1)}) == [f"{field}: String should have at most {cap} characters"]


def test_length_is_checked_before_the_ends_are_trimmed():
    assert errors(ApplicationCreate, APPLICATION | {"company": " " + "c" * COMPANY_MAX_LENGTH}) == [
        f"company: String should have at most {COMPANY_MAX_LENGTH} characters"
    ]


# Posting URL


@pytest.mark.parametrize("url", ["https://jobs.example.com/1", "http://example.com", "HTTPS://EXAMPLE.COM/A?b=c"])
def test_a_posting_url_is_an_http_or_https_url(url):
    assert ApplicationCreate.model_validate(APPLICATION | {"posting_url": url}).posting_url == url


def test_a_posting_url_is_trimmed_and_blank_is_null():
    assert ApplicationCreate.model_validate(APPLICATION | {"posting_url": " https://a.b "}).posting_url == "https://a.b"
    assert ApplicationCreate.model_validate(APPLICATION | {"posting_url": "  "}).posting_url is None


@pytest.mark.parametrize(
    "url", ["jobs.example.com", "ftp://example.com", "javascript:alert(1)", "https://", "https://a b", "https:/a"]
)
def test_anything_else_is_not_a_posting_url(url):
    assert errors(ApplicationCreate, APPLICATION | {"posting_url": url}) == [
        "posting_url: Value error, must be an http(s) URL"
    ]


# Location and office days


@pytest.mark.parametrize("days", [OFFICE_DAYS_MIN, OFFICE_DAYS_MAX])
def test_a_hybrid_role_can_say_how_many_office_days(days):
    application = ApplicationCreate.model_validate(APPLICATION | {"location": "hybrid", "office_days": days})
    assert application.office_days == days


@pytest.mark.parametrize(("days", "message"), [(OFFICE_DAYS_MIN - 1, "greater"), (OFFICE_DAYS_MAX + 1, "less")])
def test_office_days_outside_the_range_are_refused(days, message):
    [error] = errors(ApplicationCreate, APPLICATION | {"location": "hybrid", "office_days": days})
    assert error.startswith(f"office_days: Input should be {message} than or equal to")


@pytest.mark.parametrize("location", [None, "in_office", "remote"])
def test_office_days_are_only_for_a_hybrid_role(location):
    assert errors(ApplicationCreate, APPLICATION | {"location": location, "office_days": 2}) == [
        "Value error, office_days is only for a hybrid location"
    ]
    check_office_days(location, None)


def test_a_location_is_one_of_the_choices():
    [error] = errors(ApplicationCreate, APPLICATION | {"location": "on_the_moon"})
    assert error.startswith("location: Input should be 'in_office', 'remote' or 'hybrid'")


# Status, Outcome, Done date and Outcome note


def test_an_application_starts_in_progress_with_no_outcome():
    application = ApplicationCreate.model_validate(APPLICATION)
    assert (application.status, application.outcome, application.done_on, application.outcome_note) == (
        "in_progress",
        None,
        None,
        None,
    )


def test_a_done_application_needs_an_outcome():
    assert errors(ApplicationCreate, APPLICATION | {"status": "done"}) == [
        "Value error, outcome is required when the status is done"
    ]


def test_an_outcome_is_only_for_a_done_application():
    assert errors(ApplicationCreate, APPLICATION | {"outcome": "offer"}) == [
        "Value error, outcome is only for a done application"
    ]


def test_check_outcome_accepts_the_matching_pairs():
    check_outcome("done", "rejected")
    check_outcome("in_progress", None)


@pytest.mark.parametrize(
    ("extra", "message"),
    [
        ({"done_on": "2026-11-16"}, "done_on is only for a done application"),
        ({"outcome_note": "Not now."}, "outcome_note is only for a done application"),
    ],
)
def test_the_done_date_and_outcome_note_are_only_for_a_done_application(extra, message):
    assert errors(ApplicationCreate, APPLICATION | extra) == [f"Value error, {message}"]


def test_a_done_application_may_have_no_done_date():
    check_done("done", None, None, date(2026, 11, 1))


def test_the_done_date_can_be_the_applied_date_and_not_before():
    applied = date(2026, 11, 1)
    check_done("done", applied, "Went with someone else.", applied)
    with pytest.raises(ValueError, match="done_on cannot be before applied_on"):
        check_done("done", applied - timedelta(days=1), None, applied)


def test_the_done_date_is_checked_against_the_applied_date_only_when_there_is_one():
    check_done("done", date(2000, 1, 1), None, None)


def test_the_done_date_can_be_today_anywhere_but_not_later():
    # Tomorrow in UTC is already today in the time zones ahead of it.
    assert latest_done_on() == datetime.now(UTC).date() + timedelta(days=1)
    check_done("done", latest_done_on(), None, None)
    with pytest.raises(ValueError, match="done_on cannot be in the future"):
        check_done("done", latest_done_on() + timedelta(days=1), None, None)


def test_a_blank_outcome_note_is_null_so_an_in_progress_application_may_send_one():
    assert ApplicationCreate.model_validate(APPLICATION | {"outcome_note": "  "}).outcome_note is None


# Changing an Application


def test_a_patch_changes_only_what_is_sent():
    assert ApplicationPatch.model_validate({"salary": "$1"}).model_fields_set == {"salary"}


@pytest.mark.parametrize("field", ["company", "title", "applied_on", "status"])
def test_a_patch_cannot_clear_a_required_field(field):
    assert errors(ApplicationPatch, {field: None}) == [f"Value error, {field} cannot be cleared"]


@pytest.mark.parametrize("field", ["posting_url", "location", "office_days", "salary", "outcome", "done_on"])
def test_a_patch_can_clear_an_optional_field(field):
    assert getattr(ApplicationPatch.model_validate({field: None}), field) is None


@pytest.mark.parametrize("model", [ApplicationCreate, ApplicationPatch, InterviewCreate, InterviewPatch])
def test_unknown_fields_are_refused(model):
    body = {ApplicationCreate: APPLICATION, InterviewCreate: INTERVIEW}.get(model, {})
    assert errors(model, body | {"stage": "onsite"}) == ["stage: Extra inputs are not permitted"]


# Interviews


@pytest.mark.parametrize("at", ["2026-11-20", " 2026-11-20 "])
def test_an_interview_needs_a_time_as_well_as_a_date(at):
    assert errors(InterviewCreate, INTERVIEW | {"at": at}) == ["at: Value error, needs a time as well as a date"]


def test_an_interview_at_a_date_and_time_keeps_its_time_zone():
    interview = InterviewCreate.model_validate(INTERVIEW | {"at": "2026-11-20T09:30:00-08:00"})
    assert interview.at == datetime(2026, 11, 20, 17, 30, tzinfo=UTC)


def test_an_interview_at_a_datetime_object_is_kept():
    at = datetime(2026, 11, 20, 17, tzinfo=UTC)
    assert InterviewCreate.model_validate(INTERVIEW | {"at": at}).at == at


def test_an_interview_needs_a_category_a_title_and_a_date():
    assert errors(InterviewCreate, {}) == [
        "category: Field required",
        "title: Field required",
        "at: Field required",
    ]


def test_an_interview_category_is_one_of_the_choices():
    [error] = errors(InterviewCreate, INTERVIEW | {"category": "onsite_loop"})
    assert error.startswith("category: Input should be 'recruiter', 'hiring_manager'")


def test_an_interview_no_longer_takes_a_kind():
    assert errors(InterviewCreate, INTERVIEW | {"kind": "technical"}) == ["kind: Extra inputs are not permitted"]


def test_an_interview_title_is_trimmed_required_and_capped():
    assert InterviewCreate.model_validate(INTERVIEW | {"title": "  Retro  "}).title == "Retro"
    assert errors(InterviewCreate, INTERVIEW | {"title": " "}) == ["title: Value error, must not be blank"]
    [error] = errors(InterviewCreate, INTERVIEW | {"title": "x" * 201})
    assert error.startswith("title: String should have at most 200 characters")


def test_blank_interview_notes_are_null():
    interview = InterviewCreate.model_validate(
        INTERVIEW | {"what_they_asked": " ", "how_it_went": "", "takeaway": "\n", "prep_notes": None}
    )
    assert (interview.what_they_asked, interview.how_it_went, interview.takeaway, interview.prep_notes) == (
        None,
        None,
        None,
        None,
    )


def test_an_interview_patch_cannot_clear_the_date_category_or_title():
    assert errors(InterviewPatch, {"at": None}) == [
        "at: Value error, cannot be cleared: an Interview always has a date and time"
    ]
    assert errors(InterviewPatch, {"category": None}) == ["Value error, category cannot be cleared"]
    assert errors(InterviewPatch, {"title": None}) == ["Value error, title cannot be cleared"]


def test_an_interview_patch_can_move_the_date_and_clear_the_notes():
    patch = InterviewPatch.model_validate({"at": "2026-11-27T15:30:00Z", "how_it_went": None, "takeaway": " "})
    assert patch.at == datetime(2026, 11, 27, 15, 30, tzinfo=UTC)
    assert (patch.how_it_went, patch.takeaway) == (None, None)
    assert patch.model_fields_set == {"at", "how_it_went", "takeaway"}


def test_an_interview_patch_still_needs_a_time():
    assert errors(InterviewPatch, {"at": "2026-11-27"}) == ["at: Value error, needs a time as well as a date"]


# Access tokens


def test_an_access_token_name_is_trimmed_and_must_not_be_blank():
    assert AccessTokenCreate.model_validate({"name": "  Calendar cron  "}).name == "Calendar cron"
    assert errors(AccessTokenCreate, {"name": "  "}) == ["name: Value error, must not be blank"]


@pytest.mark.parametrize(
    "char",
    ["\x00", "\x07", "\x1b", "\x7f", "‮", "⁦", "‏", "؜"],
    ids=["null", "bell", "escape", "delete", "right-to-left override", "isolate", "right-to-left mark", "arabic mark"],
)
def test_an_access_token_name_refuses_control_characters(char):
    assert errors(AccessTokenCreate, {"name": f"cron{char}job"}) == [
        "name: Value error, must not contain control characters"
    ]


def test_an_access_token_name_keeps_other_unicode():
    assert AccessTokenCreate.model_validate({"name": "Café ☕ 日本"}).name == "Café ☕ 日本"
