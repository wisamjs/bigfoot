-- Done date and Outcome note (GLOSSARY.md, BIG-182): when a Done Application ended, and what the
-- company said. Both are optional, and only for a Done Application. Existing Done Applications get
-- no Done date: none is invented. The Outcome note's limit mirrors OUTCOME_NOTE_MAX_LENGTH in
-- api/app/domain.py and src/lib/applications.ts.

alter table applications
  add column done_on date,
  add column outcome_note text constraint applications_outcome_note_length
    check (char_length(outcome_note) <= 2000),
  add constraint applications_done_on_only_when_done check (done_on is null or status = 'done'),
  add constraint applications_outcome_note_only_when_done check (outcome_note is null or status = 'done'),
  add constraint applications_done_on_not_before_applied check (done_on >= applied_on);
