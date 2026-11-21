-- Caps each Application text field (BIG-111): without them, one account could store megabytes
-- per row by calling the API in a loop. Mirrors api/app/domain.py and src/lib/applications.ts.

alter table applications
  add constraint applications_company_length check (char_length(company) <= 200),
  add constraint applications_title_length check (char_length(title) <= 200),
  add constraint applications_location_length check (char_length(location) <= 200),
  add constraint applications_salary_length check (char_length(salary) <= 100),
  add constraint applications_posting_url_length check (char_length(posting_url) <= 2048);
