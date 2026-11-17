"""Allowed values for an Application and its Interviews (GLOSSARY.md).

Mirrors the check constraints in supabase/migrations and the labels in src/lib/applications.ts.
"""

from typing import Literal

Status = Literal["in_progress", "done"]

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
