-- Interview notes (GLOSSARY.md) become three optional plain-text fields (BIG-179): What they asked,
-- How it went and Takeaway for next time. Every Interview's existing notes move, unchanged, into
-- How it went. The limits mirror api/app/domain.py and src/lib/applications.ts.

alter table interviews rename column notes to how_it_went;
alter table interviews rename constraint interviews_notes_check to interviews_how_it_went_length;

alter table interviews
  add column what_they_asked text constraint interviews_what_they_asked_length
    check (char_length(what_they_asked) <= 20000),
  add column takeaway text constraint interviews_takeaway_length check (char_length(takeaway) <= 500);
