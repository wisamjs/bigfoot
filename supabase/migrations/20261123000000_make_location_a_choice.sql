-- Location becomes a choice (BIG-172): In-Office, Remote or Hybrid, and for Hybrid how many days a
-- week in the office. Free text that names one of them keeps it; anything else (a city) is cleared.
-- Allowed values mirror api/app/domain.py and src/lib/applications.ts.

alter table applications drop constraint applications_location_length;

update applications set location = case lower(btrim(location))
  when 'remote' then 'remote'
  when 'hybrid' then 'hybrid'
  when 'in office' then 'in_office'
  when 'in-office' then 'in_office'
  when 'onsite' then 'in_office'
  when 'on-site' then 'in_office'
end
where location is not null;

alter table applications
  add constraint applications_location_check check (location in ('in_office', 'remote', 'hybrid')),
  add column office_days smallint check (office_days between 1 and 4),
  add constraint applications_office_days_only_hybrid check (office_days is null or location = 'hybrid');
