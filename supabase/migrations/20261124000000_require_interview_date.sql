-- ADR 0005: an Interview always has a date and time. Any Interview saved before dates were required
-- and still without one is deleted, its Interview notes with it, rather than given an invented date
-- (BIG-139: production had none left; the dev database's were test data).
delete from interviews where at is null;
alter table interviews alter column at set not null;
