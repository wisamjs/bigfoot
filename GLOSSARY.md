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
A secret a job seeker creates on the Account page and gives a script, such as a cron job, so it can use Bigfoot's API as them without a browser. It reads and writes that job seeker's Applications and Interviews, and nothing else: it can't delete the account or manage Access tokens. A job seeker names each one and can have several. Bigfoot shows the secret once, when the token is created, and stores only a hash of it. The Account page lists each token's name and when it was created, last used and expires. A token expires one year after it is created. Revoking one stops it working straight away and removes it from the list; this can't be undone.
_Avoid_: API key, personal access token, PAT, credential; delete (a token is revoked)

**Application**:
One role at one company that the job seeker has applied to. It is added on the Add Application page, opened by the dashboard's Add Application button: company, title and applied date are required (the applied date starts at today), Location and job posting are optional; the salary is added on the Application page. Adding it opens its Application page, which asks "Got an Interview lined up? Add it here." and puts focus on Add Interview.
_Avoid_: job, opportunity, lead

**Application page**:
An Application on a page of its own, at `/applications/[id]`, with a "← Dashboard" link back. Its heading shows the company, then the role and Location, with the Application's Progress (Waiting and for how long, Interview scheduled, Offer, or Done with its Outcome), **Mark done…** (the Change Status choices; "Change Status…" once Done, with Reopen) and a ⋯ menu holding Delete Application, which asks first; on a phone Mark done… folds into ⋯. Under it, a strip with one segment per Interview by date: completed ones green, the next one in the brand colour. Then the Next up card for the next Interview: its date and kind, Open Interview, the last paragraph of the latest completed Interview's notes ("Carried forward from <kind> notes"), and its own Interview notes or Add Interview notes, which opens its Interview page. Then the Interviews card: Add Interview, then Later (the other upcoming ones) and Done (completed ones, newest first, each with its Interview notes in full, folded behind "Show all notes" on a phone). Each Interview opens its Interview page, where it is edited. With no Interviews, the card shows Bigfoot and a first Add Interview. Beside them on wide screens, under them on phones, the Details card shows the applied date, the salary and the job posting as text ("Not added" when empty), the salary hidden behind Reveal each time the page opens; its edit button turns every detail, company and title included, into fields that each save when left, with the salary masked until Show, and Done turns them back into text. The data download still includes the salary. A deleted Application, an id that isn't one and another job seeker's Application all show the same "Application not found" page, with Back to dashboard and the Applications this browser opened recently that still exist. It is opened from a row in the Applications list, which is a link, so it can be bookmarked or opened in a new tab.
_Avoid_: panel, side panel, detail view

**Sample Application**:
An Application that Bigfoot creates for a new job seeker, to show how Bigfoot works before they add their own. A job seeker receives sample Applications once. They can be edited or deleted like any other Application, and are always marked as samples.
_Avoid_: demo, example, placeholder, seed data

**Location**:
How often an Application's role is in the office: In-Office, Remote or Hybrid, picked from a toggle group rather than typed; none is picked until the job seeker picks one, and picking the picked one again clears it. Picking Hybrid asks "Days in office": 1, 2, 3 or 4 a week, also optional. It reads as one line of text wherever it is shown: "In-Office", "Remote", "Hybrid", or "Hybrid - 3x a Week". It is not a city.
_Avoid_: work arrangement, work mode, office policy

**Status**:
Whether an Application is still going: In Progress or Done. A new Application is In Progress. Waiting and Scheduled are not Statuses.
_Avoid_: stage, phase, column

**Outcome**:
How a Done Application ended: Offer, Rejected, Position Filled, Withdrawn, No Open Position or Not the Right Fit. Required when the Status is Done, and only then. Reopening an Application clears it. On the Application page, Status is an In Progress | Done control with no Save button: choosing Done shows the Outcomes as chips, and picking one saves Done and that Outcome together, so a Done Application is never saved without one.
_Avoid_: closed stage, result, archived

**Applications list**:
The dashboard's Applications card: all of a job seeker's Applications, with its own Show done and Add Application controls beside its heading. It is one table, a row per Application, showing the In Progress ones plus Offers, and the other Done ones when "Show done" is on. Rows are ordered by what they are waiting on: Waiting, Interview scheduled, Offer, then Done. Each row answers "what's next here?" in four columns: Application (company and role), Progress (Waiting, Interview scheduled, Offer or Done, with one mark per completed Interview and a mark when any have Interview notes, which aren't shown), Next (the kind of each upcoming Interview, soonest first, with its date on hover; "Waiting since" when there is none; the Outcome of a Done row other than an Offer) and Location. Under the table, a line says how many Done Applications Show done would add. With no Applications at all, the card shows Bigfoot and "Add your first Application" instead. At phone width Location is hidden and Progress moves under the role. A row is a link to its Application page, and ends in a chevron saying so; changing a Status or Outcome happens there.
_Avoid_: pipeline, board, kanban, funnel, tracker, column

**Interview**:
One conversation in a company's hiring process, belonging to one Application, In Progress or Done (one added to a Done Application keeps a record of how it went). It has a required, editable kind, a required date and time and optional Interview notes, and no title. It is added on the Add Interview page, opened by the dashboard's Add Interview button or an Application's own: the Application (chosen as "company · role", In Progress ones first, then Done), kind, date and time are required there, and no time is assumed. Adding it goes back to where it was opened from: the Application page, or the dashboard. The date can be changed but never cleared. An Application can have many; kinds can repeat. Interviews are ordered by date alone, with no manual order and no per-company template. A cancelled Interview is deleted, and its Interview notes with it. Deleting the Application deletes its Interviews. The dashboard's Interviews card, beside the Applications card on wide screens and under it on phones, has its own Add Interview button and shows every dated Interview of an In Progress Application, past ones muted: a month grid (Monday first) where any day can be picked, today until another is; the picked day's Interviews under it; then the agenda. Days with Interviews are tinted with a dot. Its agenda lists this month's Interviews while there are five or fewer; past that, it narrows to the next 2 weeks, the next week or the next 2 days, whichever is widest with five or fewer, each starting now, so completed Interviews earlier today drop off. Each agenda item and each of the picked day's Interviews, past or upcoming, is a link, marked ›, that opens the Interview's Interview page. With nothing to list this month, the card says how many Applications are waiting to hear back, or that all is quiet. The calendar's month and picked day are in the dashboard's URL (`?month=2026-12&day=2026-12-04`), so Back and "← Dashboard" return to the same view.
_Avoid_: round, step, stage, meeting

**Interview page**:
An Interview on a page of its own, at `/applications/[id]/interviews/[interviewId]`, opened from the Interviews agenda on the dashboard or from its row on its Application page. Its "← <company>" link goes back to the Application page, as the Interview page belongs to it. Its heading shows the company, then the role, the Interview kind and the date and time, with a Status and Outcome badge ("Done · Rejected") when the Application is Done. An edit button in the heading turns the kind and the date into fields in place: Enter, Save or leaving them saves, and Escape or Cancel puts back what was saved. Below the heading are the Interview notes, saving by themselves with their own save status, and Delete Interview, which asks first and then returns to the Application page, which says "Interview deleted". Leaving with a change to the kind, the date or the Interview notes not yet saved asks first. A deleted Interview, an id that isn't one and another job seeker's Interview all show the same "Interview not found" page. It is a link, so it can be bookmarked or opened in a new tab; a signed-out job seeker who opens one signs in and lands back on it.
_Avoid_: interview details, interview screen

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
What the job seeker writes about one Interview: how it went, what they were asked, what they would do differently. Optional plain text of up to 20,000 characters, written and read on its Interview page (its Application page shows only the first line), and saved by itself as a draft, after a pause in typing and on leaving the field. What the company says back is not Interview notes.
_Avoid_: feedback, comments, journal, debrief

**Completed** (an Interview):
Derived, never stored: the Interview's date is in the past. Nothing is written when Bigfoot reads Applications.
_Avoid_: done (that is a Status), past

**Waiting**:
Derived, never stored: an In Progress Application with no upcoming Interview, including a brand-new one. It shows "Waiting since" the date of the last completed Interview, or the applied date when there is none. A Done Application is never Waiting. The Applications list shows "Waiting since".
_Avoid_: pending, scheduled

**Assistant**:
_Planned_ (BIG-66). Bigfoot's AI helper. It answers a fixed set of prompts about the job seeker's own Applications and cites the Applications behind each answer. Only job seekers with AI access see it.
_Avoid_: chatbot, agent, copilot, AI

**AI access**:
_Planned_ (BIG-60). Whether, and how much, a job seeker may use the Assistant and other AI features: None, Limited or Full. Every job seeker starts at None. Full is still limited, only less so.
_Avoid_: admin, beta, allowlist, feature flag

**Access token**:
_Planned_ (BIG-57). A secret a job seeker creates on the Account page so a script or terminal can read and change their Applications without signing in with Google. It can be revoked at any time, and deleting the account revokes it.
_Avoid_: API key, password

**Insight**:
_Planned_ (BIG-66). One observation about a job seeker's Applications, such as which Interview kind their Rejected Applications ended after. Bigfoot computes it from their Applications and Interviews, and it always names the Applications behind it. The Assistant puts an Insight into words but never computes one.
_Avoid_: trend, analytics, stat, finding
