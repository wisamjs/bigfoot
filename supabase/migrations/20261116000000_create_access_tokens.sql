-- Access tokens: secrets a job seeker gives a script so it can use the API without a browser
-- (GLOSSARY.md, docs/adr/0003). Bigfoot stores only the SHA-256 hash of each secret, so the
-- table can't be used to recover one. Revoking a token deletes its row; so does deleting the
-- account (DELETE /me). Like applications, rows are tied to a job seeker by id, with no foreign
-- key: a job seeker's row in job_seekers is created on their first dashboard load.

create table access_tokens (
  id uuid primary key default gen_random_uuid(),
  job_seeker_id text not null,
  name text not null check (btrim(name) <> '' and char_length(name) <= 100),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '1 year')
);

create index access_tokens_job_seeker_id_idx on access_tokens (job_seeker_id);

-- Only FastAPI reads this table (docs/adr/0001); RLS with no policies closes it to Supabase's API.
alter table access_tokens enable row level security;
