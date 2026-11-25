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

# Interview category (GLOSSARY.md, docs/adr/0007): what an Interview assesses. Fixed, so a
# Takeaway for next time can match across Applications on it.
InterviewCategory = Literal[
    "recruiter",
    "hiring_manager",
    "technical",
    "system_design",
    "project_deep_dive",
    "people_management",
    "project_delivery",
    "collaboration",
    "culture",
    "decision_maker",
]
# Interview title: the job seeker's own name for an Interview, required.
INTERVIEW_TITLE_MAX_LENGTH = 200

# Interview notes are three plain-text fields. What they asked and How it went are generous enough
# that nobody writing by hand reaches them; Takeaway for next time is one short line.
WHAT_THEY_ASKED_MAX_LENGTH = 20_000
HOW_IT_WENT_MAX_LENGTH = 20_000
TAKEAWAY_MAX_LENGTH = 500
# Prep notes are the same sort of text as How it went, with the same limit.
INTERVIEW_PREP_NOTES_MAX_LENGTH = 20_000

# The longest text each Application field stores, in characters. Generous for anything typed or
# pasted by hand; they stop a script from storing megabytes per row.
COMPANY_MAX_LENGTH = 200
TITLE_MAX_LENGTH = 200
SALARY_MAX_LENGTH = 100
POSTING_URL_MAX_LENGTH = 2_048
# The Outcome note: what the company said when the Application ended, a few sentences at most.
OUTCOME_NOTE_MAX_LENGTH = 2_000

# The most a job seeker can have, so one account can't fill the database: far more than a job
# search needs.
APPLICATIONS_MAX = 1_000
INTERVIEWS_PER_APPLICATION_MAX = 50
