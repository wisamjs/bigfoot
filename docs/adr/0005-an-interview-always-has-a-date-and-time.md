# An Interview always has a date and time

ADR 0002 made an Interview's date optional, so an undated Interview counted as completed and was listed first. In practice an Interview is a conversation at a known time, and an undated one muddled what was upcoming and what was done. We decided that an Interview's date and time are both required, so Completed means only "its date is in the past" and Interviews are ordered by date alone. Interviews are also added to Done Applications, to keep a record of how they went, and those always have a past date.

A migration can't make up a date, and giving old Interviews their Application's applied date would show invented dates on cards and the calendar. So the API and web app required a date first, and the database followed once production had none without one (BIG-139): `interviews.at` is NOT NULL. The migration deletes any left elsewhere rather than invent a date for them.

_Superseded by ADR 0009_: an Interview can be Unscheduled, with no date and time yet, shown as "Date TBD"; `interviews.at` is nullable again (BIG-221).
