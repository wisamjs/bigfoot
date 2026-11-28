# An Interview can be Unscheduled

Supersedes ADR 0005.

ADR 0005 required every Interview to have a date and time, because ADR 0002's undated Interviews counted as completed and were listed first. But a job seeker often hears they're through to the next round before a date is set, and couldn't record that Interview until it was. We decided an Interview's date and time are optional together: an Interview without them is Unscheduled, shown as "Date TBD". Unlike ADR 0002's undated Interviews, an Unscheduled Interview is never Completed, since Completed still means "its date is in the past". It is upcoming, and ordered after every Scheduled Interview of its Application.

A date is still never invented. When an Application is marked Done, the job seeker says whether each Unscheduled Interview happened, giving its date if it did; one that didn't stays undated and, on a Done Application, is Abandoned. Abandoned, like Completed, is worked out and never stored, so Reopening an Application makes them Unscheduled again.

`interviews.at` is nullable again. The API keeps `at` a required key when creating an Interview, with `null` meaning Unscheduled, so a script that leaves it out still gets an error rather than an Unscheduled Interview.
