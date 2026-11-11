-- The person using Bigfoot is the job seeker (GLOSSARY.md), so the column says so too.
-- Values (Google account ids) are unchanged.

alter table applications rename column owner_id to job_seeker_id;
alter index applications_owner_id_idx rename to applications_job_seeker_id_idx;
