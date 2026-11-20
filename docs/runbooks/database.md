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

Supabase takes a daily physical backup and keeps 7 days (dashboard → `bigfoot-prod` → Database → Backups → Scheduled backups). Each backup row has two buttons, and they do very different things:

| Button | What it does | Use it for |
| --- | --- | --- |
| **Restore to a new project** | Creates a new project from the backup. Prod is untouched. The new project is billed until you delete it. | Tests, and copying back a few rows without losing newer ones |
| **Restore** | Overwrites `bigfoot-prod` with the backup. Everything written since is lost, and the app shows errors while it runs (a few minutes). | Only when prod itself is beyond repair |

**Default to Restore to a new project.** Only use **Restore** after going through "Before you restore in place".

### Restore to a new project

1. Pick the backup, click **Restore to a new project**, and confirm.
2. When it's ready, copy the **new** project's ref from the address bar (`/dashboard/project/<ref>`). It must not be `bvgfhfuofzfmjmqyraee`: that is prod.
3. Run the checks below against the new ref.
4. Copy back what you need, then delete the new project (Project Settings → General → Delete project).

### Before you restore in place

1. Check the project name at the top of the dashboard says `bigfoot-prod`, and that this is what you mean to overwrite.
2. Pick the newest backup taken *before* the problem. Note its time: every row and every migration applied after it will be lost.
3. If any data since then matters, restore to a new project first and copy it from there afterwards.

Then click **Restore** on that backup, confirm, and wait for the dashboard's "restoration complete" notice.

### After any restore

1. Check the data and the migrations:

   ```sql
   select count(*) from applications;
   select count(*) from job_seekers;
   select name from supabase_migrations.schema_migrations order by version;
   ```

2. If you restored in place, re-apply every migration missing from that list (see "Applying migrations"), then run its checks: `npm run db:status` and the Security Advisor.
3. Sign in to the dashboard and check that Applications show.

### Restore test log

| Date | Backup used | Result |
| --- | --- | --- |
| 2026-11-17 | A scheduled backup taken before 2026-11-16 18:50 UTC | Meant as a test into a new project, but the restore ran on prod in place (Postgres restarted at 03:27 UTC). Prod came back consistent with the backup in minutes: 3 migrations, no rows. Lost: the `create_account_deletions` and `give_applications_many_interviews` migrations (applied by hand after the backup) and every row, which was the developer's own test data (1 job seeker, 26 Applications, 74 Interviews). Recovered by re-applying both migrations; all 5 match the repo, RLS is on for all 4 tables, and the Security Advisor shows only `rls_enabled_no_policy`. Lesson: an in-place restore is easy to start by mistake, so this runbook now defaults to Restore to a new project and checks the ref first. |
