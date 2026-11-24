# Bigfoot

A job search tracker. Job hunting is chasing Bigfoot: Bigfoot keeps every Application in one place until you find yours, so nothing lives in a spreadsheet or a forgotten email thread.

![Bigfoot landing page](docs/screenshots/landing.png)

## Status

Bigfoot is an early proof of concept, built as a side project. Sign in with Google, add the roles you've applied to, log their Interviews, and follow them on a dashboard with two sections: **Interviews**, a calendar and agenda of what's coming, and **Applications**, a table ordered by what each one is waiting on. Each section has its own Add button.

![Bigfoot dashboard](docs/screenshots/dashboard.png)

## Use the API from a terminal

A script can read and change your Applications and Interviews without a browser, for example a cron job that adds an Interview when one appears in your calendar.

1. Sign in, open the **Account** page and create an **Access token**. Copy the secret straight away: Bigfoot shows it once and stores only a hash.
2. Send it as a bearer token. The production API is at `https://bigfoot-api.vercel.app` (locally, `http://localhost:8000`):

   ```bash
   export BIGFOOT_TOKEN="bigfoot_…"
   export BIGFOOT_API="https://bigfoot-api.vercel.app"

   # List your Applications, each with its Interviews
   curl -H "Authorization: Bearer $BIGFOOT_TOKEN" "$BIGFOOT_API/applications"

   # Add an Application
   curl -X POST "$BIGFOOT_API/applications" \
     -H "Authorization: Bearer $BIGFOOT_TOKEN" -H "Content-Type: application/json" \
     -d '{"company": "Northwind Robotics", "title": "Frontend Engineer"}'

   # Add an Interview to it, using the "id" from the response above
   curl -X POST "$BIGFOOT_API/applications/<application id>/interviews" \
     -H "Authorization: Bearer $BIGFOOT_TOKEN" -H "Content-Type: application/json" \
     -d '{"kind": "technical", "at": "2026-11-20T17:00:00Z"}'
   ```

Bigfoot doesn't match calendar events to Applications: a script finds the Application itself (for example by `company` in the list) and adds the Interview to it. Every route, field and Interview kind is in [`api/openapi.json`](api/openapi.json), and you can browse them locally ([Try the API](#try-the-api)).

A token can do anything to your Applications and Interviews, so treat it like a password. It can't delete your account or manage tokens. It expires a year after you create it; revoke it on the Account page at any time. A revoked, expired or mistyped token gets `401`.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, Cache Components) and React 19
- [Auth.js](https://authjs.dev) with Google sign-in and encrypted cookie sessions
- [Tailwind CSS 4](https://tailwindcss.com), with every design token defined in [`src/app/globals.css`](src/app/globals.css)
- [FastAPI](https://fastapi.tiangolo.com) (Python, in [`api/`](api)) serving Applications from [Supabase](https://supabase.com) Postgres. The browser never calls it: the Next.js server does, with a short-lived token naming the signed-in user ([ADR 0001](docs/adr/0001-fastapi-behind-nextjs-with-authjs.md)). A job seeker's own scripts can call it too, with an Access token ([ADR 0003](docs/adr/0003-access-tokens-open-fastapi-to-scripts.md))
- TypeScript and Python

## Run it locally

You need Node.js 24, [uv](https://docs.astral.sh/uv/getting-started/installation/), a Google account and a Supabase project.

1. Clone the repo and install dependencies:

   ```bash
   git clone https://github.com/wisamjs/bigfoot.git
   cd bigfoot
   npm install
   cd api && uv sync && cd ..
   ```

2. Copy the example environment file:

   ```bash
   cp .env.example .env.local
   ```

3. Generate a session secret and paste it into `AUTH_SECRET` in `.env.local`:

   ```bash
   openssl rand -base64 33
   ```

4. Create a Google OAuth client:
   1. Open [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials).
   2. Create an **OAuth client ID** of type **Web application**.
   3. Add `http://localhost:3300/api/auth/callback/google` as an authorized redirect URI.
   4. Paste the client ID and secret into `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` in `.env.local`.

5. Set up the database:
   1. Apply [`supabase/migrations`](supabase/migrations) to your Supabase project (SQL editor or `supabase db push`).
   2. In the Supabase dashboard, click **Connect → Session pooler**, and paste the URI (with your database password) into `DATABASE_URL` in `.env.local`.
   3. Generate the API secret and paste it into `API_SECRET`:

      ```bash
      openssl rand -base64 33
      ```

6. Start the API and the dev server in two terminals. The dev server always runs on port 3300, which the redirect URI and `npm run smoke` expect:

   ```bash
   npm run dev:api
   npm run dev
   ```

7. Open [http://localhost:3300](http://localhost:3300) and sign in.

### Try the API

With `API_DOCS="true"` in `.env.local` (as in `.env.example`), the API serves interactive docs at [http://localhost:8000/docs](http://localhost:8000/docs) (Swagger UI), [`/redoc`](http://localhost:8000/redoc) and [`/openapi.json`](http://localhost:8000/openapi.json). They are off unless `API_DOCS` is `true`, so never set it in production.

A production server checks its environment variables when it starts, and a Vercel build checks them before deploying: both fail with one message naming every missing variable. In Vercel's Production environment, `API_URL` must also not be a `localhost` address and `API_DOCS` must not be `true`. The lists are in [`src/lib/env.ts`](src/lib/env.ts) (Next.js) and [`api/app/settings.py`](api/app/settings.py) (API), and a test keeps them matching `.env.example`.

To send requests from the docs, click **Authorize** and paste an Access token from your local Account page. Or, to act as the test job seeker (and to reach the Account routes, which Access tokens can't), print a web token (valid for an hour, signed with `API_SECRET`):

```bash
node scripts/dev-api-token.mjs
```

Paste it into **Authorize**, then **Try it out** on any route. The schema is committed as [`api/openapi.json`](api/openapi.json): after changing the API, run `npm run openapi` and commit the result. If you forget, the pre-commit hook rewrites it and stops the commit until you `git add` it.

### Skip Google sign-in

To see the dashboard without setting up Google (step 4), you only need `AUTH_SECRET` (plus the database and API from steps 5 and 6). Generate a session cookie for a test user:

```bash
node scripts/dev-session.mjs
```

In your browser's developer tools, add a cookie named `authjs.session-token` for `localhost` with that value, then open [http://localhost:3300/dashboard](http://localhost:3300/dashboard).

Like any new job seeker, the test user receives Sample Applications the first time they open the dashboard. For a fuller dashboard, run `node scripts/dev-applications.mjs remove` and then `add` (and `remove` again to empty it).

### Retake the screenshots

With the dev server and API running, `npm run screenshots` retakes the two screenshots in this README.

### Coding agents (optional)

If you use a coding agent such as Claude Code, install Vercel's React and Next.js performance rules for your user, not the repo:

```bash
npx skills add vercel-labs/agent-skills -s vercel-react-best-practices -g
```

Where the skill and the Next.js docs in `node_modules/next/dist/docs/` disagree, follow the docs. Skip the skill's SWR, `better-all` and LRU cache rules: this app uses neither SWR nor `better-all`, and caches with `"use cache"`.

## Quality checks

| Command | What it checks |
| --- | --- |
| `npm run verify` | Canadian spelling (cspell), that components use design tokens instead of raw colours and corner radii, Python lint and format, the API unit tests, that the staged `api/openapi.json` matches the API (if not, it rewrites the file for you to `git add`), types, lint, `npm test` and `npm run test-storybook`, cheapest first. The pre-commit hook runs it. The old name, `check`, still runs it with a deprecation line |
| `npm test` | Vitest unit and component tests (React Testing Library in happy-dom), failing if coverage drops below the floor in `vitest.config.mts`. `npm run test:watch` reruns them on save |
| `npm run storybook` | Storybook at [localhost:6006](http://localhost:6006): every design-system component in `src/components/ui/` in each of its states, the Applications list and editor on sample data, and the design tokens read from `globals.css`. `npm run build-storybook` builds it to `storybook-static/` |
| `npm run test-storybook` | Renders every story in Chrome (Vitest browser mode with `@storybook/addon-vitest`) and fails on a story's play function or an axe-core WCAG 2.2 AA violation, colour contrast included |
| `npm run openapi` | Rewrites [`api/openapi.json`](api/openapi.json) from the API code; browse it at [`/docs`](http://localhost:8000/docs) with the API running ([Try the API](#try-the-api)) |
| `npm run test:api:unit` | The API unit tests: every pytest test not marked `db`, in about two seconds with no database, held to their own coverage floor of the logic modules (CODING_STANDARDS.md). `npm run verify` runs them |
| `npm run test:api` | Every API test (pytest), the database ones against the real database, in a throwaway test schema built once per run: `bigfoot_test_big<n>` on a BIG ticket branch, `bigfoot_test` elsewhere, one per run in CI. `npm run db:drop-test-schema` drops it |
| `npm run smoke` | Loads every route signed in and signed out against the running dev server and API (starting either if needed), and fails on any server error |
| `npm run a11y` | axe-core WCAG 2.2 AA on the same pages and their open dialogs, light and dark, and uses each dialog by keyboard: focus stays inside, Escape closes it, focus returns |
| `npm run build` | Production build (stop `next dev` first: they share `.next/`) |

[CI](.github/workflows/ci.yml) runs all of these but `npm run openapi` on every push and pull request, as parallel jobs: `fast-checks` (the steps of `npm run verify` but the Vitest and story tests, then the build), `unit-tests`, `storybook` (builds Storybook and runs the story tests), `runtime` (API tests and smoke) and `accessibility` (a11y in two shards, `A11Y_SHARD=1/2`). `ci-passed` fails when any of them fails, and is the check `main` requires. Its tests, smoke and a11y run against a Postgres 17 service container on the runner (no secret, so Dependabot PRs run them too). Only the `migrations-applied` job on pushes to `main` needs the `DATABASE_URL` repository secret, for the dev database. To run the same database locally: `docker run --rm -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:17`, then `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres npm run test:api`.

## Databases

Two Supabase projects, both in `us-east-1`:

- **`Bigfoot`** (Free plan) is for local development (`public` schema) and the `migrations-applied` CI job. `.env.local` and the CI `DATABASE_URL` secret point here. Tests, smoke and a11y in CI use a Postgres container instead.
- **`bigfoot-prod`** (Pro plan: daily backups, never pauses) holds real job seekers' data. Its URLs are only in Vercel's Production environment and the password manager, never in the repo or CI.

Merged migrations reach both on their own: CI applies them to `Bigfoot` on each push to `main`, and the `bigfoot-api` Vercel build applies them to `bigfoot-prod` before the new API goes live. [`docs/runbooks/database.md`](docs/runbooks/database.md) covers connecting to prod, applying migrations and restoring from a backup.

## Deployments

Only `main` deploys to Vercel (Production). Branches and PRs get no preview deployment, because the Hobby plan's limit of 100 deployments a day ran out. [`docs/runbooks/vercel.md`](docs/runbooks/vercel.md) says how it is set up and how to turn previews back on.

## How it was built

Bigfoot was built with AI coding agents working from the project rules in [`AGENTS.md`](AGENTS.md).

[`GLOSSARY.md`](GLOSSARY.md) defines the product's terms (Application, Status, Outcome, Interview, Applications list, Access token).

## License

[MIT](LICENSE) © 2026 Wisam Zaghal
