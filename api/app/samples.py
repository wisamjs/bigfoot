"""Sample Applications (GLOSSARY.md): what a new job seeker finds in their Pipeline the first
time they load the dashboard, to show how Bigfoot works before they add their own.

Companies are made up. Dates are relative to when the job seeker is onboarded: applied in the
past few weeks, with the Technical round a few days ahead so "Coming up" isn't empty.
"""

from datetime import datetime, time, timedelta
from typing import Any


def sample_applications(now: datetime) -> list[dict[str, Any]]:
    today = now.date()
    # 17:00 UTC is mid-morning to mid-afternoon across the US and Canada.
    technical_at = datetime.combine(today + timedelta(days=3), time(17, 0), tzinfo=now.tzinfo)
    return [
        {
            "company": "Northwind Robotics",
            "title": "Frontend Engineer",
            "applied_on": today - timedelta(days=12),
            "stage": "in_progress",
            "previous_round": "recruiter_screen",
            "next_round": "technical",
            "next_round_at": technical_at,
        },
        {
            "company": "Juniper Labs",
            "title": "Software Engineer",
            "applied_on": today - timedelta(days=5),
            "stage": "in_progress",
            "previous_round": None,
            "next_round": "waiting",
            "next_round_at": None,
        },
        {
            "company": "Blue Heron Health",
            "title": "Product Engineer",
            "applied_on": today - timedelta(days=26),
            "stage": "offer",
            "previous_round": "onsite_loop",
            "next_round": None,
            "next_round_at": None,
        },
        {
            "company": "Cedarline",
            "title": "Full-stack Developer",
            "applied_on": today - timedelta(days=19),
            "stage": "rejected",
            "previous_round": "recruiter_screen",
            "next_round": None,
            "next_round_at": None,
        },
    ]
