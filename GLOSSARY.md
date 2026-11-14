# Bigfoot

Bigfoot is a job search tracker: it follows each role a job seeker is pursuing from first interest to final outcome.

## Language

_Planned_ marks behaviour that isn't built yet and names the ticket that builds it. Use the term anyway; just don't expect to find it in the app. Remove the marker when the ticket is done.

**Bigfoot**:
The product itself. Refer to the software by name. The name comes from the brand idea that job hunting is chasing Bigfoot, and an offer is finding yours. That hunt is a voice for marketing and microcopy only: it never renames a domain term.
_Avoid_: the application, the platform; hunt words as nouns (sighting, trail, tracks)

**Job seeker**:
The person running a job search in Bigfoot: its user. A job seeker has one account, created the first time they sign in with Google; there is no separate sign-up. On the Account page they can download a copy of their data (a CSV of their Applications, or JSON with their profile and every Application) and delete their account. Deleting the account removes the job seeker and all of their Applications and Interviews.
_Avoid_: user, owner, candidate, applicant

**Application**:
One role at one company that the job seeker has applied to.
_Avoid_: job, opportunity, lead

**Sample Application**:
An Application that Bigfoot creates for a new job seeker, to show how Bigfoot works before they add their own. A job seeker receives sample Applications once. They can be edited or deleted like any other Application, and are always marked as samples.
_Avoid_: demo, example, placeholder, seed data

**Status**:
Whether an Application is still going: In Progress or Done. A new Application is In Progress. Waiting and Scheduled are not Statuses.
_Avoid_: stage, phase, column

**Outcome**:
How a Done Application ended: Offer, Rejected, Position Filled, Withdrawn, No Open Position or Not the Right Fit. Required when the Status is Done, and only then. Reopening an Application clears it.
_Avoid_: closed stage, result, archived

**Pipeline**:
All of a job seeker's Applications. The board shows the In Progress ones, grouped by what they are waiting on, plus Offers. Its columns are Waiting, Interview scheduled and Offer, and a Done column for the other Done Applications when "Show done" is on; empty ones are left out. Each card lists all of its Application's Interviews, completed ones muted. Opening a card edits its Application.
_Avoid_: board, funnel, tracker

**Interview**:
One conversation in a company's hiring process, belonging to one Application. It has a required, editable kind and an optional date and time, and no title. An Application can have many; kinds can repeat. Interviews are ordered by date, undated ones first, with no manual order and no per-company template. A cancelled Interview is deleted. Deleting the Application deletes its Interviews. The Coming up calendar shows every dated Interview of an In Progress Application, past ones muted.
_Avoid_: round, step, stage, meeting

**Interview kind**:
What sort of conversation an Interview is: Informal Chat, Recruiter Screen, Hiring Manager, Technical, Behavioural, Leadership, Onsite Loop, AI Assisted Coding Challenge, Coding Challenge, FE System Design, BE System Design, Technical Deep-Dive, Cross-Functional Interview, Strategy & Values Alignment or People Management. An Outcome is never a kind.
_Avoid_: round, type

**Completed** (an Interview):
Derived, never stored: the Interview's date is in the past, or it has no date. Nothing is written when Bigfoot reads Applications.
_Avoid_: done (that is a Status), past

**Waiting**:
Derived, never stored: an In Progress Application with no upcoming Interview, including a brand-new one. It shows "Waiting since" the date of the last completed Interview, or the applied date when there is none. A Done Application is never Waiting. The Pipeline board shows "Waiting since".
_Avoid_: pending, scheduled
