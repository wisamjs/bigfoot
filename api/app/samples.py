"""Sample Applications (GLOSSARY.md): what a new job seeker finds in their Applications the first
time they load the dashboard, to show how Bigfoot works before they add their own.

Companies are made up. Dates are relative to when the job seeker is onboarded: applied in the
past few weeks, with an Interview a few days ahead so the Interviews calendar isn't empty. Each
sample shows a different state: one with a completed and an upcoming Interview, one new and
Waiting, one Done with an Offer, one Done with Rejected. Each Interview is (category, title, at,
Participants), each Participant (role, name); the same pair in two Interviews is one Participant.
"""

from datetime import datetime, time, timedelta
from typing import Any

RECRUITER = ("Recruiter", "Dana Lee")


def sample_applications(now: datetime) -> list[dict[str, Any]]:
    today = now.date()

    def at(days: int) -> datetime:
        # 17:00 UTC is mid-morning to mid-afternoon across the US and Canada.
        return datetime.combine(today + timedelta(days=days), time(17, 0), tzinfo=now.tzinfo)

    return [
        {
            "company": "Northwind Robotics",
            "title": "Frontend Engineer",
            "applied_on": today - timedelta(days=12),
            "interviews": [
                ("recruiter", "Recruiter Screen", at(-6), [RECRUITER]),
                (
                    "system_design",
                    "Frontend System Design",
                    at(3),
                    [("Staff Engineer", "Sam Okafor"), ("Engineering Manager", None)],
                ),
            ],
        },
        {
            "company": "Juniper Labs",
            "title": "Software Engineer",
            "applied_on": today - timedelta(days=5),
            "interviews": [],
        },
        {
            "company": "Blue Heron Health",
            "title": "Product Engineer",
            "applied_on": today - timedelta(days=26),
            "status": "done",
            "outcome": "offer",
            "interviews": [
                ("recruiter", "Recruiter Screen", at(-20), [("Talent Partner", "Maya Chen")]),
                ("technical", "Pair Programming", at(-13), [("Senior Engineer", "Leo Martins")]),
                ("hiring_manager", "Hiring Manager", at(-5), [("Engineering Manager", "Priya Shah")]),
            ],
        },
        {
            "company": "Cedarline",
            "title": "Full-stack Developer",
            "applied_on": today - timedelta(days=19),
            "status": "done",
            "outcome": "rejected",
            "interviews": [("recruiter", "Recruiter Screen", at(-11), [("Recruiter", None)])],
        },
    ]
