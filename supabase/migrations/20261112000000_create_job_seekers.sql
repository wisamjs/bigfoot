-- Job seekers: the people using Bigfoot (GLOSSARY.md). A job seeker is identified by their
-- Google account id, the `sub` of the API token (docs/adr/0001). The row is created the first
-- time they load the dashboard (POST /me/onboard), and records that they received their
-- Sample Applications, so they get them only once.

create table job_seekers (
  job_seeker_id text primary key,
  created_at timestamptz not null default now(),
  samples_seeded_at timestamptz,
  last_seen_at timestamptz not null default now()
);

-- Only FastAPI reads this table (docs/adr/0001); RLS with no policies closes it to Supabase's API.
alter table job_seekers enable row level security;

-- Job seekers who already have Applications never receive Sample Applications.
insert into job_seekers (job_seeker_id, created_at, samples_seeded_at, last_seen_at)
select job_seeker_id, min(created_at), now(), max(updated_at)
from applications
group by job_seeker_id;

-- Sample Applications stay marked as samples, even after the job seeker edits them.
alter table applications add column is_sample boolean not null default false;
