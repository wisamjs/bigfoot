-- Interview notes (GLOSSARY.md): what the job seeker writes about one Interview. Optional plain
-- text; the limit mirrors INTERVIEW_NOTES_MAX_LENGTH in api/app/domain.py and src/lib/applications.ts.

alter table interviews
  add column notes text check (char_length(notes) <= 20000);
