# Database runbook

Bigfoot has two Supabase projects, in two organizations:

| Project | Ref | Organization | Plan | Used by |
| --- | --- | --- | --- | --- |
| `Bigfoot` | `vhinumtqipwettgqtrob` | the Free one | Free (pauses after a week idle, no backups) | local dev (`public` schema) and CI (`bigfoot_test_*` schemas) |
| `bigfoot-prod` | `bvgfhfuofzfmjmqyraee` | the Pro one | Pro (daily backups kept 7 days, never pauses) | production only |

Both are in `us-east-1`, next to Vercel's `iad1` region. The Privacy Policy says Applications are stored in the United States.

Keep `bigfoot-prod` the only project in the Pro organization. The Pro plan's compute credit covers one Micro instance, and every other active project in the organization is billed on top.

## Connecting to production

The prod `DATABASE_URL` lives only in Vercel (Production environment) and the password manager. Never put it in `.env.local`, the repo or CI secrets.

- **From Vercel Functions**, use the **transaction pooler** (Supabase dashboard → Connect → Transaction pooler, port 6543). `configure()` in `api/app/main.py` already turns off prepared statements. Its session-level `set search_path` and `set timezone` don't stick across transactions in this mode, but prod doesn't need them: the server's time zone is UTC, and the `postgres` role's `search_path` includes `public`.
- **From your machine** (one-off checks), use the session pooler (port 5432). The direct host is IPv6-only.

To check the role defaults after any Supabase change:

```sql
select current_setting('TimeZone'), current_setting('search_path');
-- expected: UTC | "$user", public, extensions
```

## Applying migrations

Apply every new file in `supabase/migrations` to **dev first, then prod**, after its PR merges.

1. Run its SQL through the Supabase MCP's `apply_migration` against project `bvgfhfuofzfmjmqyraee`, with the name from the filename after the timestamp (`20261112000000_create_job_seekers.sql` → `create_job_seekers`). Supabase records the name with its own timestamp, so names, not versions, are what match.
2. Check that prod matches the repo: `DATABASE_URL='<prod session pooler URI>' npm run db:status`.
3. Check the Security Advisor (dashboard → Advisors, or the MCP's `get_advisors`). The only expected finding is `rls_enabled_no_policy` (INFO) on each table: only FastAPI reads the tables, so RLS with no policies keeps them closed to Supabase's public API.

## Restoring from a backup

Supabase takes a daily physical backup and keeps 7 days (dashboard → Database → Backups → Scheduled backups).

A restore **overwrites the whole database** with the backup, and everything written after it is lost. The project is unreachable while it runs (minutes for a small database), so the app shows errors until it finishes.

1. Decide which backup to use: the newest one taken *before* the problem.
2. Note what will be lost: everything written since that backup.
3. Dashboard → Database → Backups → Scheduled backups → **Restore** on that backup, and confirm.
4. Wait for the dashboard's "restoration complete" notice.
5. Check the data:

   ```sql
   select count(*) from applications;
   select count(*) from job_seekers;
   select name from supabase_migrations.schema_migrations order by version;
   ```

6. Re-apply any migration that merged after the backup was taken (see "Applying migrations").
7. Load the dashboard signed in and check that Applications show.

To restore into a separate project instead (e.g. to copy back a few rows without losing newer ones), use **Restore to a new project** on the same page. It creates and bills a new project; delete it when you're done.

### Restore test log

| Date | Backup used | Result |
| --- | --- | --- |
| _pending_ | first daily backup of `bigfoot-prod` | |
