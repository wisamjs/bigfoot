# Bigfoot

Bigfoot is a job search tracker: it follows each role a job seeker is pursuing from first interest to final outcome.

## Language

_Planned_ marks behaviour that isn't built yet and names the ticket that builds it. Use the term anyway; just don't expect to find it in the app. Remove the marker when the ticket is done.

**Bigfoot**:
The product itself. Refer to the software by name. The name comes from the brand idea that job hunting is chasing Bigfoot, and an offer is finding yours. That hunt is a voice for marketing and microcopy only: it never renames a domain term.
_Avoid_: the application, the platform; hunt words as nouns (sighting, trail, tracks)

**Job seeker**:
The person running a job search in Bigfoot: its user. A job seeker has one account, created the first time they sign in with Google; there is no separate sign-up. On the Account page they can download a copy of their data (a CSV of their Applications, or JSON with their profile, every Application and their Access tokens' names and dates; both include Interview notes), manage their Access tokens and delete their account. Deleting the account removes the job seeker and all of their Applications, Interviews, Interview notes and Access tokens.
_Avoid_: user, owner, candidate, applicant

**Access token**:
A secret a job seeker creates on the Account page and gives a script, such as a cron job, so it can use Bigfoot's API as them without a browser. It reads that job seeker's Applications and Interviews, and nothing else: it can't change them, delete the account or manage Access tokens. A job seeker names each one and can have several. Bigfoot shows the secret once, when the token is created, and stores only a hash of it. The Account page lists each token's name and when it was created and expires. A token expires one year after it is created. Revoking one stops it working straight away and removes it from the list; this can't be undone.
_Avoid_: API key, personal access token, PAT, credential; delete (a token is revoked)

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
All of a job seeker's Applications. The board shows the In Progress ones, grouped by what they are waiting on, plus Offers. Its columns are Waiting, Interview scheduled and Offer, and a Done column for the other Done Applications when "Show done" is on; empty ones are left out. Each card lists all of its Application's Interviews, completed ones muted, and marks the ones that have Interview notes without showing the notes. Buttons on a card hide its completed Interviews and collapse it to its company, role and "Waiting since", each shown only when the card has something for it to hide; cards start expanded with every Interview shown, and go back to that on reload. Opening a card shows its whole Application in a side panel beside the board: details, Status, Outcome and every Interview with its Interview notes, all editable there. The panel hides the salary behind a Reveal button each time it opens, against someone looking at the screen; the data download still includes it. "Add application" opens the same panel, empty.
_Avoid_: board, funnel, tracker

**Interview**:
One conversation in a company's hiring process, belonging to one Application. It has a required, editable kind, an optional date and time and optional Interview notes, and no title. An Application can have many; kinds can repeat. Interviews are ordered by date, undated ones first, with no manual order and no per-company template. A cancelled Interview is deleted, and its Interview notes with it. Deleting the Application deletes its Interviews. The Coming up calendar shows every dated Interview of an In Progress Application, past ones muted. Its agenda lists this month's Interviews while there are five or fewer; past that, it narrows to the next 2 weeks, the next week or the next 2 days, whichever is widest with five or fewer, each starting now, so completed Interviews earlier today drop off.
_Avoid_: round, step, stage, meeting

**Questions for them**:
_Planned_ (BIG-63). Questions the job seeker means to ask the company, kept on the Application because they apply to its whole hiring process.
_Avoid_: reverse questions, my questions

**Questions to prepare for**:
_Planned_ (BIG-63). Questions the job seeker expects the company to ask them, kept on the Application.
_Avoid_: question bank, prep questions

**Interview kind**:
What sort of conversation an Interview is: Informal Chat, Recruiter Screen, Hiring Manager, Technical, Behavioural, Leadership, Onsite Loop, AI Assisted Coding Challenge, Coding Challenge, FE System Design, BE System Design, Technical Deep-Dive, Cross-Functional Interview, Strategy & Values Alignment or People Management. An Outcome is never a kind.
_Avoid_: round, type

**Interview notes**:
What the job seeker writes about one Interview: how it went, what they were asked, what they would do differently. Optional plain text of up to 20,000 characters, written and read in the side panel under its Interview, and saved with its own button. What the company says back is not Interview notes.
_Avoid_: feedback, comments, journal, debrief

**Completed** (an Interview):
Derived, never stored: the Interview's date is in the past, or it has no date. Nothing is written when Bigfoot reads Applications.
_Avoid_: done (that is a Status), past

**Waiting**:
Derived, never stored: an In Progress Application with no upcoming Interview, including a brand-new one. It shows "Waiting since" the date of the last completed Interview, or the applied date when there is none. A Done Application is never Waiting. The Pipeline board shows "Waiting since".
_Avoid_: pending, scheduled

**Assistant**:
_Planned_ (BIG-66). Bigfoot's AI helper. It answers a fixed set of prompts about the job seeker's own Pipeline and cites the Applications behind each answer. Only job seekers with AI access see it.
_Avoid_: chatbot, agent, copilot, AI

**AI access**:
_Planned_ (BIG-60). Whether, and how much, a job seeker may use the Assistant and other AI features: None, Limited or Full. Every job seeker starts at None. Full is still limited, only less so.
_Avoid_: admin, beta, allowlist, feature flag

**Access token**:
_Planned_ (BIG-57). A secret a job seeker creates on the Account page so a script or terminal can read and change their Applications without signing in with Google. It can be revoked at any time, and deleting the account revokes it.
_Avoid_: API key, password

**Insight**:
_Planned_ (BIG-66). One observation about a job seeker's Pipeline, such as which Interview kind their Rejected Applications ended after. Bigfoot computes it from their Applications and Interviews, and it always names the Applications behind it. The Assistant puts an Insight into words but never computes one.
_Avoid_: trend, analytics, stat, finding
