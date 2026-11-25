-- Interview category and Interview title (GLOSSARY.md, docs/adr/0007, BIG-189) replace the
-- Interview kind. Each existing Interview keeps its old kind's label as its title and gets the
-- category the project's mapping table gives it; an Onsite Loop becomes one Hiring Manager
-- Interview for the job seeker to split. Allowed values and the title's limit mirror
-- api/app/domain.py and src/lib/applications.ts.

alter table interviews
  add column category text,
  add column title text;

update interviews set
  category = case kind
    when 'informal_chat' then 'recruiter'
    when 'recruiter_screen' then 'recruiter'
    when 'hiring_manager' then 'hiring_manager'
    when 'technical' then 'technical'
    when 'coding_challenge' then 'technical'
    when 'ai_assisted_coding_challenge' then 'technical'
    when 'fe_system_design' then 'system_design'
    when 'be_system_design' then 'system_design'
    when 'technical_deep_dive' then 'project_deep_dive'
    when 'people_management' then 'people_management'
    when 'leadership' then 'people_management'
    when 'behavioural' then 'culture'
    when 'cross_functional_interview' then 'collaboration'
    when 'strategy_and_values_alignment' then 'decision_maker'
    when 'onsite_loop' then 'hiring_manager'
  end,
  title = case kind
    when 'informal_chat' then 'Informal Chat'
    when 'recruiter_screen' then 'Recruiter Screen'
    when 'hiring_manager' then 'Hiring Manager'
    when 'technical' then 'Technical'
    when 'coding_challenge' then 'Coding Challenge'
    when 'ai_assisted_coding_challenge' then 'AI Assisted Coding Challenge'
    when 'fe_system_design' then 'FE System Design'
    when 'be_system_design' then 'BE System Design'
    when 'technical_deep_dive' then 'Technical Deep-Dive'
    when 'people_management' then 'People Management'
    when 'leadership' then 'Leadership'
    when 'behavioural' then 'Behavioural'
    when 'cross_functional_interview' then 'Cross-Functional Interview'
    when 'strategy_and_values_alignment' then 'Strategy & Values Alignment'
    when 'onsite_loop' then 'Onsite Loop'
  end;

alter table interviews
  alter column category set not null,
  alter column title set not null,
  add constraint interviews_category_check check (category in (
    'recruiter', 'hiring_manager', 'technical', 'system_design', 'project_deep_dive',
    'people_management', 'project_delivery', 'collaboration', 'culture', 'decision_maker'
  )),
  add constraint interviews_title_not_blank check (btrim(title) <> ''),
  add constraint interviews_title_length check (char_length(title) <= 200),
  drop column kind;
