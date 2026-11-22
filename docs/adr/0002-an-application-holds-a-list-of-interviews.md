# An Application holds a list of Interviews, not one round

An Application used to hold one Previous round, one Next round, one Next round date and a seven-value Stage. That could not say that a job seeker had done three interviews, or had two booked. We replaced it with a Status (In Progress or Done), an Outcome (required when Done) and any number of Interviews, each with a kind and an optional date. Kinds can repeat, Interviews have no title, and their order is by date, undated first.

Whether an Interview is completed, and whether an Application is Waiting, are derived from the dates and the clock, never stored. That drops "advancing a round": Bigfoot no longer rewrites Applications when it reads them, so a read has no side effects and nothing can drift out of date. The cost is that the API works out Waiting on every read, and an undated Interview counts as completed, so a job seeker who wants an Interview to count as upcoming must give it a date.

The migration keeps what job seekers recorded: a Previous round became an undated Interview, a Round-kind Next round became an Interview at its date, Scheduled became an Informal Chat keeping its date, and Waiting created nothing.

_Superseded in part by ADR 0005_: an Interview's date and time are now required, Interviews are ordered by date alone, and one saved without a date shows "Date needed" until it gets one.
