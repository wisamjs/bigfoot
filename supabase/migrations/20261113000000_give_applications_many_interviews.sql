-- An Application holds a list of Interviews, a Status and an Outcome (GLOSSARY.md,
-- docs/adr/0002), instead of one Previous round, one Next round and a seven-value Stage.
-- Allowed values mirror api/app/domain.py and src/lib/applications.ts.

create table interviews (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references applications (id) on delete cascade,
  kind text not null check (kind in (
    'informal_chat', 'recruiter_screen', 'hiring_manager', 'technical',
    'behavioural', 'leadership', 'onsite_loop',
    'ai_assisted_coding_challenge', 'coding_challenge', 'fe_system_design', 'be_system_design',
    'technical_deep_dive', 'cross_functional_interview', 'strategy_and_values_alignment',
    'people_management'
  )),
  -- Optional. An Interview without a date counts as completed.
  at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index interviews_application_id_idx on interviews (application_id);

-- Only FastAPI reads this table (docs/adr/0001); RLS with no policies closes it to Supabase's API.
alter table interviews enable row level security;

-- A Previous round becomes an undated Interview.
insert into interviews (application_id, kind, created_at)
select id, previous_round, created_at from applications where previous_round is not null;

-- A Round-kind Next round becomes an Interview at its date; Scheduled (booked, kind unknown)
-- becomes an Informal Chat keeping its date; Waiting creates nothing.
insert into interviews (application_id, kind, at, created_at)
select id, case when next_round = 'scheduled' then 'informal_chat' else next_round end, next_round_at, created_at
from applications
where next_round is not null and next_round <> 'waiting';

alter table applications
  add column status text not null default 'in_progress' check (status in ('in_progress', 'done')),
  add column outcome text check (outcome in (
    'offer', 'rejected', 'position_filled', 'withdrawn', 'no_open_position', 'not_the_right_fit'
  ));

-- Offer becomes Done with Outcome Offer; each Closed stage becomes Done with the matching Outcome.
update applications set status = 'done', outcome = stage where stage <> 'in_progress';

alter table applications
  add constraint applications_outcome_matches_status check ((status = 'done') = (outcome is not null)),
  drop column stage,
  drop column previous_round,
  drop column next_round,
  drop column next_round_at;
