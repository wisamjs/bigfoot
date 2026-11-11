"""Allowed values for an Application (GLOSSARY.md).

Mirrors the check constraints in supabase/migrations and the labels in src/lib/applications.ts.
"""

from typing import Literal

Stage = Literal[
    "in_progress",
    "offer",
    # Closed stages
    "rejected",
    "position_filled",
    "withdrawn",
    "no_open_position",
    "not_the_right_fit",
]

Round = Literal[
    "informal_chat",
    "recruiter_screen",
    "hiring_manager",
    "technical",
    "behavioural",
    "leadership",
    "onsite_loop",
]

# Next round may also say the kind is unknown (Scheduled) or the company owes a reply (Waiting).
NextRound = Literal[
    "waiting",
    "scheduled",
    "informal_chat",
    "recruiter_screen",
    "hiring_manager",
    "technical",
    "behavioural",
    "leadership",
    "onsite_loop",
]
