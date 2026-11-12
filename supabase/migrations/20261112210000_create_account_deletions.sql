-- Account deletions: proof that a job seeker's request to delete their account was honoured
-- (DELETE /me). Holds no personal information: the job seeker id is stored only as a SHA-256
-- hash, so a deletion can be confirmed for someone who gives us their Google account id, but
-- the table alone says nothing about who they were.

create table account_deletions (
  id bigint generated always as identity primary key,
  job_seeker_hash text not null check (job_seeker_hash ~ '^[0-9a-f]{64}$'),
  deleted_at timestamptz not null default now()
);

-- Only FastAPI reads this table (docs/adr/0001); RLS with no policies closes it to Supabase's API.
alter table account_deletions enable row level security;
