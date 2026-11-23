"""Allowed values for an Application and its Interviews (GLOSSARY.md).

Mirrors the check constraints in supabase/migrations and the labels in src/lib/applications.ts.
"""

from typing import Literal

Status = Literal["in_progress", "done"]

# Location: how often the role is in the office. Hybrid can say how many days a week.
Location = Literal["in_office", "remote", "hybrid"]
OFFICE_DAYS_MIN = 1
OFFICE_DAYS_MAX = 4

# Required when an Application is Done, and only then.
Outcome = Literal[
    "offer",
    "rejected",
    "position_filled",
    "withdrawn",
    "no_open_position",
    "not_the_right_fit",
]

InterviewKind = Literal[
    "informal_chat",
    "recruiter_screen",
    "hiring_manager",
    "technical",
    "behavioural",
    "leadership",
    "onsite_loop",
    "ai_assisted_coding_challenge",
    "coding_challenge",
    "fe_system_design",
    "be_system_design",
    "technical_deep_dive",
    "cross_functional_interview",
    "strategy_and_values_alignment",
    "people_management",
]

# Interview notes are plain text; generous enough that nobody writing by hand reaches it.
INTERVIEW_NOTES_MAX_LENGTH = 20_000

# The longest text each Application field stores, in characters. Generous for anything typed or
# pasted by hand; they stop a script from storing megabytes per row.
COMPANY_MAX_LENGTH = 200
TITLE_MAX_LENGTH = 200
SALARY_MAX_LENGTH = 100
POSTING_URL_MAX_LENGTH = 2_048

# The most a job seeker can have, so one account can't fill the database: far more than a job
# search needs.
APPLICATIONS_MAX = 1_000
INTERVIEWS_PER_APPLICATION_MAX = 50
