-- Applications: one role at one company that the job seeker has applied to (GLOSSARY.md).
-- Names are unqualified so the same SQL builds the public schema and the test schema.
-- Allowed values mirror api/app/domain.py and src/lib/applications.ts.

create table applications (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  company text not null check (btrim(company) <> ''),
  title text not null check (btrim(title) <> ''),
  posting_url text check (posting_url ~* '^https?://\S+$'),
  location text,
  salary text,
  applied_on date not null default current_date,
  stage text not null default 'in_progress' check (stage in (
    'in_progress', 'offer',
    'rejected', 'position_filled', 'withdrawn', 'no_open_position', 'not_the_right_fit'
  )),
  previous_round text check (previous_round in (
    'informal_chat', 'recruiter_screen', 'hiring_manager', 'technical',
    'behavioural', 'leadership', 'onsite_loop'
  )),
  next_round text check (next_round in (
    'waiting', 'scheduled',
    'informal_chat', 'recruiter_screen', 'hiring_manager', 'technical',
    'behavioural', 'leadership', 'onsite_loop'
  )),
  next_round_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index applications_owner_id_idx on applications (owner_id);

-- Only FastAPI reads this table, over a direct Postgres connection (docs/adr/0001).
-- RLS with no policies keeps it closed to Supabase's public API.
alter table applications enable row level security;
