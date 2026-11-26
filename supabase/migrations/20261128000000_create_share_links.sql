-- Share links: private links a job seeker makes so a Viewer can follow their search without
-- signing in (GLOSSARY.md, docs/adr/0008). Each has its own Passcode, stored only as an argon2id
-- hash. passcode_version goes up when the Passcode changes, so a Viewer's cookie issued for an
-- older version stops working (BIG-197). Stopping a Share link deletes its row; so does deleting
-- the account (DELETE /me). Like access_tokens, rows are tied to a job seeker by id, with no
-- foreign key. At most 10 per job seeker, which the API enforces.

create table share_links (
  -- 10 random URL-safe characters: the link's path, /s/<id>.
  id text primary key check (id ~ '^[A-Za-z0-9_-]{10}$'),
  job_seeker_id text not null,
  label text not null check (btrim(label) <> '' and char_length(label) <= 100),
  passcode_hash text not null check (passcode_hash like '$argon2id$%'),
  passcode_version integer not null default 1 check (passcode_version >= 1),
  created_at timestamptz not null default now(),
  passcode_set_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  last_opened_at timestamptz
);

create index share_links_job_seeker_id_idx on share_links (job_seeker_id);

-- Only FastAPI reads this table (docs/adr/0001); RLS with no policies closes it to Supabase's API.
alter table share_links enable row level security;
