-- ADR 0005: an Interview always has a date and time. Production had no Interview without one when
-- this was written (BIG-139), so this fails, rather than invents a date, if one has appeared since.
alter table interviews alter column at set not null;
