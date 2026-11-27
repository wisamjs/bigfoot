# Database runbook

Bigfoot has two Supabase projects, in two organizations:

| Project | Ref | Organization | Plan | Used by |
| --- | --- | --- | --- | --- |
| `Bigfoot` | `vhinumtqipwettgqtrob` | the Free one | Free (pauses after a week idle, no backups) | local dev (`public` schema, through `.env.local`) and CI's `migrations-applied` job (the `DATABASE_URL` repository secret). CI's tests use a Postgres container instead. |
| `bigfoot-prod` | `bvgfhfuofzfmjmqyraee` | the Pro one | Pro (daily backups kept 7 days, never pauses) | production only |

Both are in `us-east-1`, next to Vercel's `iad1` region. The Privacy Policy says Applications are stored in the United States.

Keep `bigfoot-prod` the only project in the Pro organization. The Pro plan's compute credit covers one Micro instance, and every other active project in the organization is billed on top.

## Connecting to production

The prod database URLs live only in the `bigfoot-api` Vercel project's Production environment and in the password manager. Never put them in `.env.local`, the repo or CI secrets.

| Variable | Pooler | Used by |
| --- | --- | --- |
| `DATABASE_URL` | Transaction pooler (port 6543) | The API at runtime |
| `MIGRATIONS_DATABASE_URL` | Session pooler (port 5432) | The build step that applies migrations (see "Applying migrations") |

- **From Vercel Functions**, use the **transaction pooler** (Supabase dashboard → Connect → Transaction pooler, port 6543). `configure()` in `api/app/main.py` already turns off prepared statements. Its session-level `set search_path` and `set timezone` don't stick across transactions in this mode, but prod doesn't need them: the server's time zone is UTC, and the `postgres` role's `search_path` includes `public`.
- **From your machine** (one-off checks), use the session pooler (port 5432). The direct host is IPv6-only.

To check the role defaults after any Supabase change:

```sql
select current_setting('TimeZone'), current_setting('search_path');
-- expected: UTC | "$user", public, extensions
```

## Applying migrations

A migration merged to `main` reaches both databases on its own. Never apply one before its PR merges: `main`'s code may not work with it.

- **Dev:** CI's `migrations-applied` job runs `npm run db:status -- --apply` on every push to `main`.
- **Prod:** the `bigfoot-api` Vercel project's build step runs `scripts/db-status.py --deploy` (set in `api/pyproject.toml` under `[tool.vercel.scripts]`). It applies every migration prod is missing to `MIGRATIONS_DATABASE_URL`, then the build finishes and the new API goes live. So a migration reaches prod before the API that needs it, never after.

Both compare migrations by name, not version: Supabase records the time a migration was applied, not the repo's timestamp, so `supabase db push` would try to re-run them. A Postgres advisory lock means two builds running at once never apply the same migration twice.

### Why the build step, not CI (decided 2026-11-23, BIG-71)

The repo is public. `bigfoot-api`'s Production environment already holds a prod URL for the running API, so any merged code can already reach prod through it. A build step there adds no new place that can reach prod. Applying from GitHub Actions would have put the prod URL in a GitHub secret too, with public Actions logs and third-party actions running beside it. The build also runs only for `main` (`vercel.json`), so a migration can't reach prod before its merge.

### Write migrations the running API survives

The old API keeps serving while the build applies the migration, for a minute or two. Make each migration work with the code already in production: add a column or table before code uses it, and drop one only after a deployment that no longer reads it.

### When it fails

Production fails loudly instead of running behind the repo:

- A migration that fails, or a Production build without `MIGRATIONS_DATABASE_URL`, fails the `bigfoot-api` build. The `main` commit gets a red Vercel check on GitHub, Vercel sends a deployment-failed notification, and the previous deployment keeps serving, still matching its schema. Earlier migrations in the same run stay applied: each runs in its own transaction.
- Read the build log (Vercel → `bigfoot-api` → Deployments → the failed one), fix the migration in a new PR, and merge it. If the SQL was right and the database was the problem (a pause, a password change), fix that, then click **Redeploy** on the failed deployment.

### Applying a migration by hand

Only when the build can't, for example while `MIGRATIONS_DATABASE_URL` is being replaced:

1. Run its SQL through the Supabase MCP's `apply_migration` against project `bvgfhfuofzfmjmqyraee`, with the name from the filename after the timestamp (`20261112000000_create_job_seekers.sql` → `create_job_seekers`). Or, from your machine: `DATABASE_URL='<prod session pooler URI>' npm run db:status -- --apply`, which applies every missing one the same way. Type the URL into the command; never save it in `.env.local`.
2. Check that prod matches the repo: `DATABASE_URL='<prod session pooler URI>' npm run db:status`.
3. Check the Security Advisor (dashboard → Advisors, or the MCP's `get_advisors`). The only expected finding is `rls_enabled_no_policy` (INFO) on each table: only FastAPI reads the tables, so RLS with no policies keeps them closed to Supabase's public API.

### Setting up the build step

Once, in Vercel → `bigfoot-api` → Settings → Environment Variables: add `MIGRATIONS_DATABASE_URL` for **Production**, with the prod session pooler URI (Supabase dashboard → `bigfoot-prod` → Connect → Session pooler, user `postgres.bvgfhfuofzfmjmqyraee`, host `aws-1-us-east-1.pooler.supabase.com:5432`). Mark it Sensitive. Update it whenever the database password changes, together with `DATABASE_URL`.

Preview builds apply nothing unless Preview has its own `MIGRATIONS_DATABASE_URL`. Set one, to the **dev** database only, to test the build step with a CLI preview deployment (`vercel deploy` from the repo root, linked to `bigfoot-api`), and remove it afterwards.

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
