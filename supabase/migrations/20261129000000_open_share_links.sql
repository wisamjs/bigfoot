-- A Viewer opens a Share link with its Passcode and reads the job seeker's Journey (GLOSSARY.md,
-- docs/adr/0008, BIG-197).

-- The job seeker's name as their Viewers see it ("Wisam shared a job search with you"), taken from
-- their Google account when the link is made. Links made before this have none, and their pages
-- word it without a name.
alter table share_links
  add column shared_by text not null default ''
    check (char_length(shared_by) <= 200);

-- One row per wrong Passcode typed for a Share link. 5 within 15 minutes lock the link until the
-- oldest of them is 15 minutes old. Rows older than that are deleted on the next try, and every
-- row goes with its Share link.
create table share_link_wrong_tries (
  id bigint generated always as identity primary key,
  share_link_id text not null references share_links (id) on delete cascade,
  tried_at timestamptz not null default now()
);

create index share_link_wrong_tries_link_idx on share_link_wrong_tries (share_link_id, tried_at);

-- Only FastAPI reads this table (docs/adr/0001); RLS with no policies closes it to Supabase's API.
alter table share_link_wrong_tries enable row level security;
