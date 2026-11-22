-- When each Access token was last used (BIG-112), so a job seeker can spot a token they don't
-- recognize being used, or one that's safe to revoke. The API writes it at most once a minute
-- per token (api/app/auth.py), so null means never used.

alter table access_tokens add column last_used_at timestamptz;
