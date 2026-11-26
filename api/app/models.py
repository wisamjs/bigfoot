"""The API's request and response models, and the text rules they share."""

import re
import unicodedata
from datetime import UTC, date, datetime, timedelta
from typing import Annotated, Any, Literal
from uuid import UUID

from fastapi import Path
from pydantic import AfterValidator, BaseModel, BeforeValidator, ConfigDict, Field, field_validator, model_validator

from app.auth import ACCESS_TOKEN_PREFIX
from app.domain import (
    COMPANY_MAX_LENGTH,
    HOW_IT_WENT_MAX_LENGTH,
    INTERVIEW_PREP_NOTES_MAX_LENGTH,
    INTERVIEW_TITLE_MAX_LENGTH,
    OFFICE_DAYS_MAX,
    OFFICE_DAYS_MIN,
    OUTCOME_NOTE_MAX_LENGTH,
    POSTING_URL_MAX_LENGTH,
    SALARY_MAX_LENGTH,
    TAKEAWAY_MAX_LENGTH,
    TITLE_MAX_LENGTH,
    WHAT_THEY_ASKED_MAX_LENGTH,
    InterviewCategory,
    Location,
    Outcome,
    Status,
)

ACCESS_TOKEN_NAME_MAX = 100  # also a check constraint on access_tokens.name
SHARE_LINK_LABEL_MAX = 100  # also a check constraint on share_links.label
SHARED_BY_MAX = 200  # also a check constraint on share_links.shared_by
PASSCODE_MIN_LENGTH = 8
PASSCODE_MAX_LENGTH = 128
SHARE_LINKS_MAX = 10
EXAMPLE_PASSCODE = "maple-river-42"
URL_PATTERN = re.compile(r"^https?://\S+$", re.IGNORECASE)


def _required_text(value: str) -> str:
    value = value.strip()
    if not value:
        raise ValueError("must not be blank")
    return value


def _optional_text(value: str | None) -> str | None:
    value = value.strip() if value is not None else None
    return value or None


def _posting_url(value: str | None) -> str | None:
    value = _optional_text(value)
    if value is not None and not URL_PATTERN.match(value):
        raise ValueError("must be an http(s) URL")
    return value


# Bidirectional controls make text display in a different order than it is stored.
BIDI_CONTROLS = frozenset("\u061c\u200e\u200f\u202a\u202b\u202c\u202d\u202e\u2066\u2067\u2068\u2069")


def _no_control_characters(value: str) -> str:
    """Rejects control characters, including bidirectional ones, so a name shows as it is stored."""
    if any(char in BIDI_CONTROLS or unicodedata.category(char) == "Cc" for char in value):
        raise ValueError("must not contain control characters")
    return value


def _not_blank(value: str) -> str:
    """Rejects text that is only whitespace, without trimming it: a Passcode is kept exactly as sent."""
    if not value.strip():
        raise ValueError("must not be blank")
    return value


RequiredText = Annotated[str, AfterValidator(_required_text)]
# Lengths are checked as sent, before the ends are trimmed. The database checks them too.
Company = Annotated[str, Field(max_length=COMPANY_MAX_LENGTH), AfterValidator(_required_text)]
Title = Annotated[str, Field(max_length=TITLE_MAX_LENGTH), AfterValidator(_required_text)]
InterviewTitle = Annotated[str, Field(max_length=INTERVIEW_TITLE_MAX_LENGTH), AfterValidator(_required_text)]
OfficeDays = Annotated[int, Field(ge=OFFICE_DAYS_MIN, le=OFFICE_DAYS_MAX)]
Salary = Annotated[str | None, Field(max_length=SALARY_MAX_LENGTH), AfterValidator(_optional_text)]
PostingUrl = Annotated[str | None, Field(max_length=POSTING_URL_MAX_LENGTH), AfterValidator(_posting_url)]
WhatTheyAsked = Annotated[str | None, Field(max_length=WHAT_THEY_ASKED_MAX_LENGTH), AfterValidator(_optional_text)]
HowItWent = Annotated[str | None, Field(max_length=HOW_IT_WENT_MAX_LENGTH), AfterValidator(_optional_text)]
Takeaway = Annotated[str | None, Field(max_length=TAKEAWAY_MAX_LENGTH), AfterValidator(_optional_text)]
PrepNotes = Annotated[str | None, Field(max_length=INTERVIEW_PREP_NOTES_MAX_LENGTH), AfterValidator(_optional_text)]
OutcomeNote = Annotated[str | None, Field(max_length=OUTCOME_NOTE_MAX_LENGTH), AfterValidator(_optional_text)]


def _has_a_time(value: Any) -> Any:
    """Refuses a date with no time, which Pydantic would otherwise read as midnight: no time is assumed."""
    if isinstance(value, str) and re.fullmatch(r"\s*\d{4}-\d{2}-\d{2}\s*", value):
        raise ValueError("needs a time as well as a date")
    return value


# An Interview always has a date and time (docs/adr/0005).
InterviewAt = Annotated[datetime, BeforeValidator(_has_a_time)]


# Example values shared by the request and response schemas.
EXAMPLE_COMPANY = "Northwind Robotics"
EXAMPLE_TITLE = "Frontend Engineer"
EXAMPLE_URL = "https://jobs.example.com/northwind/frontend-engineer"

COMPANY = Field(description="The company the job seeker applied to.", examples=[EXAMPLE_COMPANY])
TITLE = Field(description="The role's job title.", examples=[EXAMPLE_TITLE])
POSTING_URL = Field(default=None, description="The job posting, as an http(s) URL.", examples=[EXAMPLE_URL])
LOCATION = Field(
    default=None,
    description="How often the role is in the office (GLOSSARY.md, Location): in_office, remote or hybrid.",
    examples=["hybrid"],
)
OFFICE_DAYS = Field(
    default=None,
    description=(
        f"For a Hybrid role, how many days a week in the office ({OFFICE_DAYS_MIN}–{OFFICE_DAYS_MAX}). "
        "Only when the Location is hybrid, and optional then."
    ),
    examples=[3],
)
SALARY = Field(default=None, description="The pay range, as the job seeker writes it.", examples=["$120k–$140k"])
STATUS = "Whether the Application is still going (GLOSSARY.md, Status)."
OUTCOME = "How a Done Application ended. Required when the status is `done`, and only then."
DONE_ON = (
    "Done date (GLOSSARY.md): the day the Application was marked Done. Only for a Done Application, never before "
    "`applied_on` nor in the future. Set to today when it is marked Done without one, and cleared when it is "
    "reopened. Null for an Application marked Done before Bigfoot recorded the date."
)
OUTCOME_NOTE = (
    "Outcome note (GLOSSARY.md): what the company said when the Application ended, as plain text of at most "
    f"{OUTCOME_NOTE_MAX_LENGTH:,} characters. Only for a Done Application; cleared when it is reopened. Null when "
    "there is none."
)
EXAMPLE_OUTCOME_NOTE = "They went with an internal candidate."
CATEGORY = (
    "What the Interview assesses (GLOSSARY.md, Interview category, docs/adr/0007): recruiter, hiring_manager, "
    "technical, system_design, project_deep_dive, people_management, project_delivery, collaboration, culture or "
    "decision_maker."
)
INTERVIEW_TITLE = (
    "The Interview's name in the job seeker's own words (GLOSSARY.md, Interview title), at most "
    f"{INTERVIEW_TITLE_MAX_LENGTH} characters. Required; the ends are trimmed."
)
EXAMPLE_INTERVIEW_TITLE = "Retrospective System Design"
AT = "When the Interview happens: a date and time, with a time zone. Required (docs/adr/0005)."
# Interview notes (GLOSSARY.md) are these three fields together.
WHAT_THEY_ASKED = (
    "What they asked (GLOSSARY.md, Interview notes): the questions the Interview asked, one per line, as plain "
    f"text of at most {WHAT_THEY_ASKED_MAX_LENGTH:,} characters. Null when there are none."
)
HOW_IT_WENT = (
    "How it went (GLOSSARY.md, Interview notes): what the job seeker wrote about this Interview, as plain text "
    f"of at most {HOW_IT_WENT_MAX_LENGTH:,} characters. Null when there is none."
)
TAKEAWAY = (
    "Takeaway for next time (GLOSSARY.md, Interview notes): one thing to do differently, as plain text of at "
    f"most {TAKEAWAY_MAX_LENGTH:,} characters. Null when there is none."
)
EXAMPLE_WHAT_THEY_ASKED = "How would you cache a feed?\nTell me about a disagreement with a designer."
EXAMPLE_HOW_IT_WENT = "Friendly. The caching question ran long."
EXAMPLE_TAKEAWAY = "Draw the diagram first."
PREP_NOTES = (
    "Prep notes (GLOSSARY.md): what the job seeker wrote to get ready for this Interview, separate from its "
    f"Interview notes, as plain text of at most {INTERVIEW_PREP_NOTES_MAX_LENGTH:,} characters. "
    "Null when there are none."
)
EXAMPLE_PREP_NOTES = "Review the caching chapter. Ask about the on-call rotation."
INTERVIEW_ORDER_DESCRIPTION = "Ordered by date."


ApplicationId = Annotated[UUID, Path(description="The Application's id.")]
InterviewId = Annotated[UUID, Path(description="The Interview's id.")]
AccessTokenId = Annotated[UUID, Path(description="The Access token's id.")]
ShareLinkId = Annotated[
    str, Path(description="The Share link's id: 10 URL-safe characters.", pattern=r"^[A-Za-z0-9_-]{10}$")
]


class ErrorMessage(BaseModel):
    detail: str = Field(description="What went wrong.", examples=["Application not found"])


class ApplicationCreate(BaseModel):
    """A new Application. Blank optional text is stored as null."""

    model_config = ConfigDict(extra="forbid")

    company: Company = COMPANY
    title: Title = TITLE
    posting_url: PostingUrl = POSTING_URL
    location: Location | None = LOCATION
    office_days: OfficeDays | None = OFFICE_DAYS
    salary: Salary = SALARY
    applied_on: date | None = Field(
        default=None, description="When the job seeker applied. Defaults to today.", examples=["2026-11-02"]
    )
    status: Status = Field(default="in_progress", description=STATUS)
    outcome: Outcome | None = Field(default=None, description=OUTCOME)
    done_on: date | None = Field(default=None, description=DONE_ON, examples=["2026-11-16"])
    outcome_note: OutcomeNote = Field(
        default=None, description=f"{OUTCOME_NOTE} Blank is stored as null.", examples=[EXAMPLE_OUTCOME_NOTE]
    )

    @model_validator(mode="after")
    def _outcome_matches_status(self) -> "ApplicationCreate":
        check_outcome(self.status, self.outcome)
        check_office_days(self.location, self.office_days)
        check_done(self.status, self.done_on, self.outcome_note, self.applied_on)
        return self


class ApplicationPatch(BaseModel):
    """Only the fields sent are changed; send null to clear an optional field.

    Setting the status to in_progress without an outcome clears the outcome, Done date and Outcome note
    (reopening); setting it to done from in_progress without a done_on sets the Done date to today. Setting the
    location to anything but hybrid without office_days clears the office days.
    """

    model_config = ConfigDict(extra="forbid")

    company: Company | None = Field(default=None, description=COMPANY.description, examples=COMPANY.examples)
    title: Title | None = Field(default=None, description=TITLE.description, examples=TITLE.examples)
    posting_url: PostingUrl = POSTING_URL
    location: Location | None = LOCATION
    office_days: OfficeDays | None = OFFICE_DAYS
    salary: Salary = SALARY
    applied_on: date | None = Field(
        default=None, description="When the job seeker applied. Cannot be cleared.", examples=["2026-11-02"]
    )
    status: Status | None = Field(default=None, description=f"{STATUS} Cannot be cleared.", examples=["done"])
    outcome: Outcome | None = Field(default=None, description=OUTCOME, examples=["offer"])
    done_on: date | None = Field(default=None, description=DONE_ON, examples=["2026-11-16"])
    outcome_note: OutcomeNote = Field(
        default=None, description=f"{OUTCOME_NOTE} Blank is stored as null.", examples=[EXAMPLE_OUTCOME_NOTE]
    )

    @model_validator(mode="after")
    def _required_fields_not_cleared(self) -> "ApplicationPatch":
        for name in ("company", "title", "applied_on", "status"):
            if name in self.model_fields_set and getattr(self, name) is None:
                raise ValueError(f"{name} cannot be cleared")
        return self


def check_outcome(status: str, outcome: str | None) -> None:
    if status == "done" and outcome is None:
        raise ValueError("outcome is required when the status is done")
    if status == "in_progress" and outcome is not None:
        raise ValueError("outcome is only for a done application")


def latest_done_on() -> date:
    """The latest Done date allowed: tomorrow in UTC, which is already today in the time zones ahead of it."""
    return datetime.now(UTC).date() + timedelta(days=1)


def check_done(status: str, done_on: date | None, outcome_note: str | None, applied_on: date | None) -> None:
    """The Done date and Outcome note are only for a Done Application; the date is between applying and today."""
    if status != "done":
        if done_on is not None:
            raise ValueError("done_on is only for a done application")
        if outcome_note is not None:
            raise ValueError("outcome_note is only for a done application")
        return
    if done_on is None:
        return
    if applied_on is not None and done_on < applied_on:
        raise ValueError("done_on cannot be before applied_on")
    if done_on > latest_done_on():
        raise ValueError("done_on cannot be in the future")


def check_office_days(location: str | None, office_days: int | None) -> None:
    if office_days is not None and location != "hybrid":
        raise ValueError("office_days is only for a hybrid location")


class InterviewCreate(BaseModel):
    """A new Interview for an Application."""

    model_config = ConfigDict(extra="forbid")

    category: InterviewCategory = Field(description=CATEGORY, examples=["system_design"])
    title: InterviewTitle = Field(description=INTERVIEW_TITLE, examples=[EXAMPLE_INTERVIEW_TITLE])
    at: InterviewAt = Field(description=AT, examples=["2026-11-20T17:00:00Z"])
    what_they_asked: WhatTheyAsked = Field(
        default=None, description=f"{WHAT_THEY_ASKED} Blank is stored as null.", examples=[None]
    )
    how_it_went: HowItWent = Field(default=None, description=f"{HOW_IT_WENT} Blank is stored as null.", examples=[None])
    takeaway: Takeaway = Field(default=None, description=f"{TAKEAWAY} Blank is stored as null.", examples=[None])
    prep_notes: PrepNotes = Field(
        default=None, description=f"{PREP_NOTES} Blank is stored as null.", examples=[EXAMPLE_PREP_NOTES]
    )


class InterviewPatch(BaseModel):
    """Only the fields sent are changed; send null for one of the Interview notes fields or `prep_notes` to clear it.

    The date can't be cleared.
    """

    model_config = ConfigDict(extra="forbid")

    category: InterviewCategory | None = Field(
        default=None, description=f"{CATEGORY} Cannot be cleared.", examples=["hiring_manager"]
    )
    title: InterviewTitle | None = Field(
        default=None,
        description=f"{INTERVIEW_TITLE} Cannot be cleared.",
        examples=["Strategic Alignment with Sr Director"],
    )
    at: InterviewAt | None = Field(
        default=None, description=f"{AT} Cannot be cleared.", examples=["2026-11-27T15:30:00Z"]
    )
    what_they_asked: WhatTheyAsked = Field(
        default=None, description=f"{WHAT_THEY_ASKED} Blank is stored as null.", examples=[EXAMPLE_WHAT_THEY_ASKED]
    )
    how_it_went: HowItWent = Field(
        default=None, description=f"{HOW_IT_WENT} Blank is stored as null.", examples=[EXAMPLE_HOW_IT_WENT]
    )
    takeaway: Takeaway = Field(
        default=None, description=f"{TAKEAWAY} Blank is stored as null.", examples=[EXAMPLE_TAKEAWAY]
    )
    prep_notes: PrepNotes = Field(
        default=None, description=f"{PREP_NOTES} Blank is stored as null.", examples=[EXAMPLE_PREP_NOTES]
    )

    @field_validator("at")
    @classmethod
    def _at_not_cleared(cls, value: datetime | None) -> datetime | None:
        # Runs only when `at` is sent, so null here means clearing it.
        if value is None:
            raise ValueError("cannot be cleared: an Interview always has a date and time")
        return value

    @model_validator(mode="after")
    def _category_and_title_not_cleared(self) -> "InterviewPatch":
        for field in ("category", "title"):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"{field} cannot be cleared")
        return self


class Interview(BaseModel):
    """One conversation in a company's hiring process, belonging to one Application."""

    id: UUID
    application_id: UUID = Field(description="The Application this Interview belongs to.")
    category: InterviewCategory = Field(description=CATEGORY, examples=["system_design"])
    title: str = Field(description=INTERVIEW_TITLE, examples=[EXAMPLE_INTERVIEW_TITLE])
    at: datetime = Field(description=AT, examples=["2026-11-20T17:00:00Z"])
    what_they_asked: str | None = Field(description=WHAT_THEY_ASKED, examples=[EXAMPLE_WHAT_THEY_ASKED])
    how_it_went: str | None = Field(description=HOW_IT_WENT, examples=[EXAMPLE_HOW_IT_WENT])
    takeaway: str | None = Field(description=TAKEAWAY, examples=[EXAMPLE_TAKEAWAY])
    prep_notes: str | None = Field(description=PREP_NOTES, examples=[EXAMPLE_PREP_NOTES])
    completed: bool = Field(
        description="Derived, never stored: the date is in the past.",
        examples=[False],
    )
    created_at: datetime
    updated_at: datetime


class Application(BaseModel):
    """One role at one company that the job seeker has applied to, with its Interviews."""

    id: UUID
    company: str = COMPANY
    title: str = TITLE
    posting_url: str | None = Field(description=POSTING_URL.description, examples=POSTING_URL.examples)
    location: Location | None = Field(description=LOCATION.description, examples=LOCATION.examples)
    office_days: int | None = Field(description=OFFICE_DAYS.description, examples=OFFICE_DAYS.examples)
    salary: str | None = Field(description=SALARY.description, examples=SALARY.examples)
    applied_on: date = Field(description="When the job seeker applied.", examples=["2026-11-02"])
    status: Status = Field(description=STATUS)
    outcome: Outcome | None = Field(description=OUTCOME)
    done_on: date | None = Field(description=DONE_ON, examples=["2026-11-16"])
    outcome_note: str | None = Field(description=OUTCOME_NOTE, examples=[EXAMPLE_OUTCOME_NOTE])
    interviews: list[Interview] = Field(description=INTERVIEW_ORDER_DESCRIPTION)
    is_waiting: bool = Field(
        description="Derived (GLOSSARY.md, Waiting): In Progress with no upcoming Interview, including a new one."
    )
    waiting_since: datetime | date | None = Field(
        description=(
            "While waiting: when the last dated, completed Interview happened (a timestamp), or else the "
            "applied date. Null when not waiting."
        ),
        examples=["2026-11-08T17:00:00Z"],
    )
    is_sample: bool = Field(description="A Sample Application that Bigfoot created for a new job seeker.")
    created_at: datetime
    updated_at: datetime


class AccessTokenCreate(BaseModel):
    """A new Access token. Only its name is chosen; it always expires a year after it is created."""

    model_config = ConfigDict(extra="forbid")

    name: Annotated[RequiredText, AfterValidator(_no_control_characters)] = Field(
        max_length=ACCESS_TOKEN_NAME_MAX,
        description="What the token is for, so the job seeker can tell their tokens apart. Names can repeat.",
        examples=["Calendar cron job"],
    )


class AccessToken(BaseModel):
    """A secret a job seeker gives a script so it can use the API as them (GLOSSARY.md). Never includes
    the secret: Bigfoot stores only its hash."""

    id: UUID
    name: str = Field(description="What the job seeker called the token.", examples=["Calendar cron job"])
    created_at: datetime
    last_used_at: datetime | None = Field(
        description="When a request last used the token, to within a minute; null until one does.",
        examples=["2026-11-20T17:00:00Z"],
    )
    expires_at: datetime = Field(
        description="When the token stops working: a year after it was created.", examples=["2027-11-16T17:00:00Z"]
    )
    expired: bool = Field(
        description="Derived, never stored: `expires_at` has passed, so the token no longer works.", examples=[False]
    )


class NewAccessToken(AccessToken):
    """An Access token as returned once, when it is created."""

    token: str = Field(
        description="The secret to send as `Authorization: Bearer …`. Shown only in this response.",
        examples=[f"{ACCESS_TOKEN_PREFIX}3q2-7wQx0yJm5kV9nRb8sT1uZc4dEfGhIjKlMnOpQr"],
    )


Passcode = Annotated[
    str,
    Field(
        min_length=PASSCODE_MIN_LENGTH,
        max_length=PASSCODE_MAX_LENGTH,
        description=(
            f"The Passcode (GLOSSARY.md) a Viewer types to open the Share link: {PASSCODE_MIN_LENGTH} to "
            f"{PASSCODE_MAX_LENGTH} characters, kept exactly as sent. Bigfoot stores only an argon2id hash of it."
        ),
        examples=[EXAMPLE_PASSCODE],
    ),
    AfterValidator(_not_blank),
    AfterValidator(_no_control_characters),
]


class ShareLinkCreate(BaseModel):
    """A new Share link: who it's for and its Passcode. It always expires 7 days after it is created."""

    model_config = ConfigDict(extra="forbid")

    label: Annotated[RequiredText, AfterValidator(_no_control_characters)] = Field(
        max_length=SHARE_LINK_LABEL_MAX,
        description="Who the link is for, so the job seeker can tell their links apart. Only they see it.",
        examples=["Mom & Dad"],
    )
    passcode: Passcode
    shared_by: Annotated[RequiredText, AfterValidator(_no_control_characters)] = Field(
        max_length=SHARED_BY_MAX,
        description='The job seeker\'s name as their Viewers see it: "Shared by Wisam Zaghal".',
        examples=["Wisam Zaghal"],
    )


class PasscodeChange(BaseModel):
    """A Share link's new Passcode."""

    model_config = ConfigDict(extra="forbid")

    passcode: Passcode


class ShareLink(BaseModel):
    """A private link a job seeker makes so a Viewer can follow their search (GLOSSARY.md). Never
    includes the Passcode: Bigfoot stores only its hash."""

    id: str = Field(description="10 URL-safe characters: the link is `/s/<id>`.", examples=["k7Qm2x9PaB"])
    label: str = Field(description="Who the link is for, as the job seeker wrote it.", examples=["Mom & Dad"])
    created_at: datetime
    passcode_set_at: datetime = Field(
        description="When the Passcode was last set: at creation, or by Change passcode.",
        examples=["2026-11-20T17:00:00Z"],
    )
    expires_at: datetime = Field(
        description="When the link stops working: 7 days after it was created or last renewed.",
        examples=["2026-11-27T17:00:00Z"],
    )
    last_opened_at: datetime | None = Field(
        description="When a Viewer last opened the link; null until one does.", examples=["2026-11-21T13:12:00Z"]
    )
    expired: bool = Field(
        description="Derived, never stored: `expires_at` has passed, so the link no longer opens.", examples=[False]
    )


class NewShareLink(ShareLink):
    """A Share link as returned when it is created or its Passcode changes: the one time the Passcode is shown."""

    passcode: str = Field(description="The Passcode, shown only in this response.", examples=[EXAMPLE_PASSCODE])


class PasscodeAttempt(BaseModel):
    """What a Viewer typed to open a Share link."""

    model_config = ConfigDict(extra="forbid")

    passcode: str = Field(max_length=PASSCODE_MAX_LENGTH, description="The Passcode as typed.")


class ViewerToken(BaseModel):
    """A Viewer's credential for one Share link, returned when the Passcode is right (docs/adr/0008)."""

    token: str = Field(description="Send as `Authorization: Bearer …` to read the Journey.")
    expires_at: datetime = Field(description="When the token stops working: when the Share link expires.")


class ShareLinkStatus(BaseModel):
    """What a Share link's Passcode page needs, before the Passcode is typed. Nothing else about the
    job seeker: the link id alone opens no more than this."""

    shared_by: str | None = Field(
        description="The job seeker's name as their Viewers see it; null for a link made before Bigfoot stored it.",
        examples=["Wisam Zaghal"],
    )
    expired: bool = Field(description="The link has expired: it opens again only once the job seeker renews it.")
    locked: bool = Field(
        description="5 wrong Passcodes were typed in the last 15 minutes, so none is accepted until they age out."
    )


class JourneyInterview(BaseModel):
    """An Interview as a Viewer sees it: what it is and when, never its notes."""

    model_config = ConfigDict(extra="forbid")

    category: InterviewCategory = Field(description=CATEGORY, examples=["hiring_manager"])
    title: str = Field(description=INTERVIEW_TITLE, examples=["Hiring Manager"])
    at: datetime = Field(description=AT, examples=["2026-11-24T19:00:00Z"])
    completed: bool = Field(description="Derived, never stored: the date is in the past.", examples=[False])


class JourneyApplication(BaseModel):
    """An In Progress Application or an Offer as a Viewer sees it: no salary, job posting, Location or notes."""

    model_config = ConfigDict(extra="forbid")

    company: str = COMPANY
    title: str = TITLE
    applied_on: date = Field(description="When the job seeker applied.", examples=["2026-11-02"])
    offer: bool = Field(description="Done with an Offer; otherwise the Application is In Progress.")
    is_waiting: bool = Field(
        description="Derived (GLOSSARY.md, Waiting): In Progress with no upcoming Interview, including a new one."
    )
    waiting_since: datetime | date | None = Field(
        description=(
            "While waiting: when the last completed Interview happened (a timestamp), or else the applied date. "
            "Null when not waiting."
        ),
        examples=["2026-11-08T17:00:00Z"],
    )
    interviews: list[JourneyInterview] = Field(description=INTERVIEW_ORDER_DESCRIPTION)


class Journey(BaseModel):
    """What a Viewer of a Share link sees (GLOSSARY.md, Journey; docs/adr/0008): the job seeker's In
    Progress Applications and Offers, and nothing the job seeker keeps private."""

    model_config = ConfigDict(extra="forbid")

    shared_by: str | None = Field(
        description="The job seeker's name as their Viewers see it; null for a link made before Bigfoot stored it.",
        examples=["Wisam Zaghal"],
    )
    applications: list[JourneyApplication] = Field(description="Oldest applied first.")


class Onboarding(BaseModel):
    samples_seeded: bool = Field(
        description="Whether this call gave the job seeker Sample Applications. True the first time only."
    )


class Health(BaseModel):
    status: Literal["ok"]


class JobSeeker(BaseModel):
    """Everything Bigfoot's database holds about the job seeker besides their Applications."""

    job_seeker_id: str = Field(description="The Google account id.")
    created_at: datetime = Field(description="When they first signed in: their account's created date.")
    samples_seeded_at: datetime | None = Field(
        description="When they received their Sample Applications; null until then."
    )
    last_seen_at: datetime = Field(description="When they last signed in.")
