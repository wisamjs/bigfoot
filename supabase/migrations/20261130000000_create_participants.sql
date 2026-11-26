-- Participants (GLOSSARY.md, BIG-191): the people from the company a job seeker meets in an
-- Interview. A Participant belongs to one Application and can be in several of its Interviews
-- (interview_participants). The API deletes a Participant once no Interview has them; deleting the
-- Application, or the account with it, deletes its Participants through the cascade. Interviews
-- from before this migration have none: it invents none. Limits mirror api/app/domain.py and
-- src/lib/applications.ts.

create table participants (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications (id) on delete cascade,
  role text not null check (btrim(role) <> '' and char_length(role) <= 200),
  -- Optional: null when the job seeker knows only the role.
  name text check (btrim(name) <> '' and char_length(name) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index participants_application_id_idx on participants (application_id);

create table interview_participants (
  interview_id uuid not null references interviews (id) on delete cascade,
  participant_id uuid not null references participants (id) on delete cascade,
  -- The order the job seeker listed them in, from 0.
  position integer not null check (position >= 0),
  primary key (interview_id, participant_id)
);

create index interview_participants_participant_id_idx on interview_participants (participant_id);

-- Only FastAPI reads these tables (docs/adr/0001); RLS with no policies closes them to Supabase's API.
alter table participants enable row level security;
alter table interview_participants enable row level security;
