-- ADR 0009: an Interview can be Unscheduled. Its date and time are optional together, so `at` is
-- nullable again; a null `at` means "Date TBD". Supersedes the NOT NULL of
-- 20261124000000_require_interview_date.sql (ADR 0005).
alter table interviews alter column at drop not null;
