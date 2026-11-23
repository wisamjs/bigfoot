-- Prep notes (GLOSSARY.md): what the job seeker writes to get ready for one Interview, separate
-- from its Interview notes. Optional plain text; the limit mirrors INTERVIEW_PREP_NOTES_MAX_LENGTH
-- in api/app/domain.py and src/lib/applications.ts, and is the same as the Interview notes limit.

alter table interviews
  add column prep_notes text check (char_length(prep_notes) <= 20000);
