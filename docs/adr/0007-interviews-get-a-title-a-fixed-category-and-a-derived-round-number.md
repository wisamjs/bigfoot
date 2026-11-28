# Interviews get a title, a fixed category, and a derived round number

ADR 0002 gave an Interview a kind from a fixed list and no title, and the glossary avoided "round". In practice the 15 kinds both overlapped (Technical, Coding Challenge, AI Assisted Coding Challenge) and missed real Interviews: a project deep-dive that is strategic rather than technical, or a "Strategic Alignment with Sr Director" that is close to, but not the same as, a "Product Alignment" with a Product Manager. Job seekers had no way to name the Interview they were actually having.

We split the kind into two things. An **Interview category** is one of ten fixed values (Recruiter, Hiring Manager, Technical, System Design, Project Deep-dive, People Management, Project Delivery, Collaboration, Culture, Decision Maker) that says what the Interview assesses. An **Interview title** is free text in the job seeker's words, required and starting as the category's name. Categories stay fixed and single-valued, not user-defined or multi-valued, because Takeaway for next time carries a lesson to "your next Hiring Manager" at another Application and Insights group by it: both need a stable value to match on, and free titles would almost never match.

The **Round number** comes back, but derived: an Interview's place by date among its Application's Interviews, never stored. A stored round could match the company's own numbering, but it would drift when Interviews are added out of order or deleted, which is the drift ADR 0002 removed. Each Interview in a **Panel Interview** counts as its own round.

The migration keeps every old kind's label as the title and maps it to a category; an Onsite Loop stays one Interview, category Hiring Manager, for the job seeker to split. The API renames `kind` to `category` in one step, with no period accepting both, which breaks scripts that still send `kind`.

_Supersedes in part ADR 0002_: Interviews now have a title, and a category in place of a kind.
