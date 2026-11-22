# An Interview always has a date and time

ADR 0002 made an Interview's date optional, so an undated Interview counted as completed and was listed first. In practice an Interview is a conversation at a known time, and an undated one muddled what was upcoming and what was done. We decided that an Interview's date and time are both required, so Completed means only "its date is in the past" and Interviews are ordered by date alone. Interviews are also added to Done Applications, to keep a record of how they went, and those always have a past date.

A migration can't make up a date, and giving old Interviews their Application's applied date would show invented dates on cards and the calendar. So an Interview saved before this shows "Date needed" until the job seeker sets one, any change to it must set one, and the database requires a date only once none are left without one.
