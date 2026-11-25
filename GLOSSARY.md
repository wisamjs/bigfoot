# Bigfoot

Bigfoot is a job search tracker: it follows each role a job seeker is pursuing from first interest to final outcome.

## Language

_Planned_ marks behaviour that isn't built yet and names the ticket that builds it. Use the term anyway; just don't expect to find it in the app. Remove the marker when the ticket is done.

**Bigfoot**:
The product itself. Refer to the software by name. The name comes from the brand idea that job hunting is chasing Bigfoot, and an offer is finding yours. That hunt is a voice for marketing and microcopy only: it never renames a domain term.
_Avoid_: the application, the platform; hunt words as nouns (sighting, trail, tracks)

**Job seeker**:
The person running a job search in Bigfoot: its user. A job seeker has one account, created the first time they sign in with Google; there is no separate sign-up. On the Account page they can download a copy of their data (a CSV of their Applications, or JSON with their profile, every Application and their Access tokens' names and dates; both include Interview notes and Prep notes), manage their Access tokens and delete their account. Deleting the account removes the job seeker and all of their Applications, Interviews, Interview notes, Prep notes and Access tokens.
_Avoid_: user, owner, candidate, applicant

**Access token**:
A secret a job seeker creates on the Account page and gives a script, such as a cron job, so it can use Bigfoot's API as them without a browser. It reads and writes that job seeker's Applications and Interviews, and nothing else: it can't delete the account or manage Access tokens. A job seeker names each one and can have several. Bigfoot shows the secret once, when the token is created, and stores only a hash of it. The Account page lists each token's name and when it was created, last used and expires. A token expires one year after it is created. Revoking one stops it working straight away and removes it from the list; this can't be undone.
_Avoid_: API key, personal access token, PAT, credential; delete (a token is revoked)

**Application**:
One role at one company that the job seeker has applied to. It is added on the Add Application page, opened by the dashboard's Add Application button: company, title and applied date are required (the applied date starts at today), Location and job posting are optional; the salary is added on the Application page. Adding it opens its Application page, which asks "Got an Interview lined up? Add it here." and puts focus on Add Interview.
_Avoid_: job, opportunity, lead

**Application page**:
An Application on a page of its own, at `/applications/[id]`, with a "← Dashboard" link back. Its heading shows the company, then the role and Location, with the Application's Progress (Waiting and for how long, Interview scheduled, Offer, or Done with its Outcome), **Mark done…** (the Change Status choices; "Change Status…" once Done, with Reopen) and a ⋯ menu holding Delete Application, which asks first; on a phone Mark done… folds into ⋯. Under it, a strip with one segment per Interview by date, each with its date and Interview title and opening its Interview page ("Nov 6 · Completed"; on a phone, "2 of 4 Interviews completed" under it): completed ones green, or grey once the Application is Done, the next one in the brand colour. Then the Next up card for the next Interview: its date, its Interview title with its Interview category as a tag, Open Interview, the takeaways that apply to it (up to two, as **Takeaway for next time** says) and They asked last time (the What they asked of this Application's latest completed Interview, when it has any), as its Interview page's Prep notes card shows them, and its own Interview notes or Add Interview notes, which opens its Interview page. Once the Application is Done, the Outcome card: "Outcome · Nov 16" (its Done date, when it has one), the Outcome as its heading, "After 2 Interviews, 27 days from applying." (the completed Interviews, and the days from the applied date to the Done date when there is one), the Outcome note in quotes, and "What you're taking from it": the Takeaway for next time of each of its Interviews that has one, newest first, each "From <title> · <date>" (left out when none has one). Then the Interviews card: Add Interview, then Later (the other upcoming ones) and Completed (completed ones, newest first, each marked "✓ Completed" with its Interview notes in full, folded behind "Show all notes" on a phone). Each Interview opens its Interview page, where it is edited. With no Interviews, the card shows Bigfoot and a first Add Interview. Beside them on wide screens, under them on phones, the Details card shows the applied date, once Done "Ended" (the Done date and the Outcome), the salary and the job posting as text ("Not added" when empty), the salary hidden behind Reveal each time the page opens; its edit button turns every detail, company and title included, and once Done the Done date and the Outcome note, into fields that each save when left, with the salary masked until Show, and Done turns them back into text. The data download still includes the salary. A deleted Application, an id that isn't one and another job seeker's Application all show the same "Application not found" page, with Back to dashboard and the Applications this browser opened recently that still exist. It is opened from a row in the Applications list, which is a link, so it can be bookmarked or opened in a new tab.
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
How a Done Application ended: Offer, Rejected, Position Filled, Withdrawn, No Open Position or Not the Right Fit. Required when the Status is Done, and only then. On the Application page, Mark done… holds "Mark <Outcome>" for each Outcome, and picking one saves Done and that Outcome together, so a Done Application is never saved without one; marking an In Progress Application Done also sets its **Done date** to today. Once Done, the same menu ("Change Status…") changes the Outcome, keeping the Done date, or Reopens it, which clears the Outcome, the Done date and the **Outcome note**. A Done Application's page sums it up in its Outcome card.
_Avoid_: closed stage, result, archived

**Done date**:
The day an Application was marked Done: set to today (the job seeker's) when it is marked Done, cleared when it is reopened, and editable in its Application page's Details card, never before the applied date nor in the future. Applications marked Done before Bigfoot recorded it (BIG-182) have none, shown as "Not added"; none is invented. The Outcome card counts the days from the applied date to it.
_Avoid_: closed date, end date, rejected date

**Outcome note**:
What the company said when the Application ended ("They went with an internal candidate."): optional plain text on a Done Application, written in its Details card and shown in quotes on its Outcome card. Reopening clears it. It is not Interview notes, which are about one Interview, and it is not a takeaway: what the job seeker takes from the hiring process is the Takeaway for next time of each Interview.
_Avoid_: rejection reason, feedback, outcome notes

**Summary line**:
The line under the dashboard's heading: "1 Offer to decide · 4 Interviews in the next 2 weeks · 2 waiting to hear back". It counts Offers (Done Applications with Outcome Offer, as the Applications list's Offer rows), the upcoming Interviews of In Progress Applications in the next 14 days, and the Applications that are **Waiting**, leaving out any count at zero; Offers are in the success colour. With every count at zero, there is no line.
_Avoid_: stats, headline

**Next up card**:
The card for an Interview still ahead, worked out each time, never stored. On an Application page, it is that Application's next Interview (see **Application page**). On the dashboard, above the Applications list, it is the job seeker's soonest upcoming Interview of an In Progress Application: its date tile, "NEXT UP · TOMORROW", its Interview title, its Interview category as a tag, "company · role · day and time", Open Interview, the takeaways that apply to it (at most two, as **Takeaway for next time** says) and its Prep notes, or Add Prep notes with "No Prep notes yet.", which opens its Interview page. With no upcoming Interview, the dashboard has no Next up card.
_Avoid_: next interview widget, upcoming card

**Applications list**:
The dashboard's Applications card: all of a job seeker's Applications, with its own Show done and Add Application controls beside its heading. It is one table, a row per Application, showing the In Progress ones plus Offers, and the other Done ones when "Show done" is on. Rows are ordered by what they are waiting on: Waiting, Interview scheduled, Offer, then Done. Each row answers "what's next here?" in four columns: Application (company and role), Progress (Waiting, Interview scheduled, Offer or Done, with one mark per completed Interview, green while In Progress and grey once Done, and a mark when any have Interview notes, which aren't shown), Next (the Interview title of each upcoming Interview in its category’s colour, soonest first, with its category and date on hover; "Waiting since" when there is none; the Outcome of a Done row other than an Offer) and Location. Under the table, a line says how many Done Applications Show done would add. With no Applications at all, the card shows Bigfoot and "Add your first Application" instead. At phone width Location is hidden and Progress moves under the role. A row is a link to its Application page, and ends in a chevron saying so; changing a Status or Outcome happens there.
_Avoid_: pipeline, board, kanban, funnel, tracker, column

**Interview**:
One conversation in a company's hiring process, belonging to one Application, In Progress or Done (one added to a Done Application keeps a record of how it went). It has a required, editable Interview category and Interview title, a required date and time and optional Interview notes and Prep notes. It is added on the Add Interview page, opened by the dashboard's Add Interview button or an Application's own: the Application (chosen as "company · role", In Progress ones first, then Done), category, title (filled in from the category until the job seeker edits it), date and time are required there, and no time is assumed. It can take How it went there too; the other Interview notes fields are written on its Interview page. Adding it goes back to where it was opened from: the Application page, or the dashboard. The category, title and date can be changed but never cleared. An Application can have many; categories and titles can repeat. Interviews are ordered by date alone, with no manual order and no per-company template. A cancelled Interview is deleted, and its Interview notes and Prep notes with it. Deleting the Application deletes its Interviews. The dashboard's Interviews card, beside the Applications card on wide screens and under it on phones, has its own Add Interview button and shows every dated Interview of an In Progress Application, past ones muted: a month grid (Monday first) where any day can be picked, today until another is; the picked day's Interviews under it; then the agenda. Days with Interviews are tinted with a dot. Its agenda lists this month's Interviews while there are five or fewer; past that, it narrows to the next 2 weeks, the next week or the next 2 days, whichever is widest with five or fewer, each starting now, so completed Interviews earlier today drop off. Each agenda item and each of the picked day's Interviews, past or upcoming, is a link, marked ›, that opens the Interview's Interview page. With nothing to list this month, the card says how many Applications are waiting to hear back, or that all is quiet. The calendar's month and picked day are in the dashboard's URL (`?month=2026-12&day=2026-12-04`), so Back and "← Dashboard" return to the same view.
_Avoid_: round, step, stage, meeting

**Interview page**:
An Interview on a page of its own, at `/applications/[id]/interviews/[interviewId]`, opened from the Interviews agenda on the dashboard or from its row or segment on its Application page. Its "← <company>" link goes back to the Application page, as the Interview page belongs to it. Its heading shows the company and role, the Interview title and the date and time with the year, with its Interview category as a tag and a badge for where it stands ("Upcoming · in 2 days", "Completed · 10 days ago", the days counted as everywhere else) and, once the Application is Done, its "Done · Rejected" badge. On the right, **Edit details** turns the category, the title and the date into fields in place (the title following a new category while it is still the old category’s name) (Enter, Save or leaving them saves; Escape or Cancel puts back what was saved) and a ⋯ menu holds Delete Interview, which asks first and then returns to the Application page, which says "Interview deleted"; on a phone Edit details folds into ⋯. Under the heading is the Application's strip of Interviews, this one outlined ("This interview · Nov 13") and each segment opening its own Interview page; on a phone it reads "Interview 2 of 4" with a "Next: <title> →" link. Then its notes cards, in an order that follows the Interview. Before it happens: the Prep notes card ("Before"), headed "Get ready for Wednesday" within the next 7 days and "Get ready for Dec 2" after that, with the takeaways that apply (see **Takeaway for next time**) and They asked last time (the What they asked of this Application's latest completed Interview, when it has any), then the Prep notes or Add Prep notes; then the Interview notes card ("After"), dashed and saying "Nothing yet, that’s expected" with Add Interview notes while there are none. Once it is completed: the Takeaway for next time in its own card, saying where it shows ("Shows on the prep for Technical Deep-Dive · in 2 days →"), then the Interview notes card, then the Prep notes folded below it to their first lines behind Show Prep notes (and not shown at all when there are none). The Interview notes card reads as text until edited (How it went, then They asked as a list; an Edit button at its top right, or Add Interview notes while there are none, or, for a completed Interview with none, the three fields already open under "How did it go?"): Edit turns them into three fields, What they asked, How it went and Takeaway for next time, each saving by itself with its own save status, and Done goes back to the text, staying in a field while its save has failed. The Prep notes card reads as text too (lines starting "- " as a list, an Edit button at its top right, or Add Prep notes) and edits into a field that saves by itself with its own save status. Leaving with a change to the category, the title, the date, an Interview notes field or the Prep notes not yet saved asks first. A deleted Interview, an id that isn't one and another job seeker's Interview all show the same "Interview not found" page. It is a link, so it can be bookmarked or opened in a new tab; a signed-out job seeker who opens one signs in and lands back on it.
_Avoid_: interview details, interview screen

**Questions for them**:
_Planned_ (BIG-63). Questions the job seeker means to ask the company, kept on the Application because they apply to its whole hiring process.
_Avoid_: reverse questions, my questions

**Questions to prepare for**:
_Planned_ (BIG-63). Questions the job seeker expects the company to ask them, kept on the Application.
_Avoid_: question bank, prep questions

**Prep notes**:
What the job seeker writes to get ready for one Interview: what to review, what to say, what to ask. Optional plain text of up to 20,000 characters, one field on each Interview, written and read on its Interview page (the dashboard's **Next up card** shows them too), where it is the first card before the Interview and folds under the Interview notes once it is completed, and saved by itself as a draft like Interview notes. It is about this one Interview, so it is neither **Interview notes** (what happened, written afterwards) nor **Questions to prepare for** (questions the company may ask, kept on the whole Application). Deleting the Interview deletes its Prep notes, and the data download includes them.
_Avoid_: preparation notes

**Interview category**:
What an Interview assesses, one of a fixed list: Recruiter, Hiring Manager, Technical, System Design, Project Deep-dive, People Management, Project Delivery, Collaboration, Culture or Decision Maker. Every Interview has exactly one; job seekers can't add their own. A takeaway carries over to an Interview at another Application when both have the same category.
_Avoid_: kind, type, round type

**Interview title**:
An Interview's name in the job seeker's own words, such as "Retrospective System Design" or "Strategic Alignment with Sr Director". It is required, starts as its category's name, and is shown wherever an Interview is named, with its category beside it.
_Avoid_: name, label

**Interview notes**:
What the job seeker writes about one Interview, as three optional plain-text fields: **What they asked**, **How it went** and **Takeaway for next time**. An Interview has Interview notes when any of the three has text. They are written and read on its Interview page, where they read as text until edited, each field saved by itself as a draft, with its own save status, after a pause in typing and on leaving the field; a completed Interview with none opens straight into the three empty fields under "How did it go?". Its Application page shows them inline on each completed Interview. Notes written before the split (BIG-179) are How it went. What the company says back is not Interview notes, and neither is getting ready for the Interview, which goes in **Prep notes**.
_Avoid_: feedback, comments, journal, debrief

**What they asked**:
The Interview notes field for the questions the Interview asked, one per line, read as a list under "They asked". Up to 20,000 characters.
_Avoid_: questions asked, question log

**How it went**:
The Interview notes field for free text about the Interview: what landed and what didn't. Lines starting "- " read as a list. Up to 20,000 characters.
_Avoid_: summary, debrief

**Takeaway for next time**:
The Interview notes field for one short line: one thing to do differently. Read in its own card, with a lightbulb, above the rest of the Interview notes. Up to 500 characters. It shows again before the Interviews it applies to, worked out each time and never stored: an upcoming Interview's prep (its Prep notes card, the Next up card on its Application page, and the dashboard's Next up card when it is the soonest) shows at most two takeaways, each in a box with a lightbulb and where it came from. First, from the latest completed Interview of the same Application that has one ("Takeaway from Hiring Manager · Nov 13"); then, from the job seeker's latest completed Interview of the same Interview category at another Application, Done Applications included, as a lesson from a rejected Application is still a lesson ("From your last Hiring Manager · Lumen Bio"). A completed Interview's takeaway card says, in a line linking to each, where it shows: the next Interview of its Application ("Shows on the prep for Technical Deep-Dive · in 2 days →") and the next Interview of the same category at another In Progress Application ("Shows on the prep for your next Hiring Manager · Tilth Agritech, tomorrow →"), or nothing when neither is booked or a later takeaway shows there instead.
_Avoid_: lesson, learning, action item

**Completed** (an Interview):
Derived, never stored: the Interview's date is in the past. Nothing is written when Bigfoot reads Applications. The app labels it "Completed", never "Done". Its marks, on the Application page's strip and in the Applications list's Progress, are green while its Application is In Progress and grey once it is Done: the hiring process is over.
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
_Planned_ (BIG-66). One observation about a job seeker's Applications, such as which Interview category their Rejected Applications ended after. Bigfoot computes it from their Applications and Interviews, and it always names the Applications behind it. The Assistant puts an Insight into words but never computes one.
_Avoid_: trend, analytics, stat, finding
