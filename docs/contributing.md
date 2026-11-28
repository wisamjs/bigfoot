# Contributing

How to work on Bigfoot once it [runs locally](../README.md#run-it-locally). Every command is a script in [`package.json`](../package.json); this page says when to reach for each and what it doesn't say itself.

## Checks

- **`npm run verify`** runs the checks that need no server, cheapest first: spelling (Canadian English), design tokens, Storybook stories present, Python lint and format, the API unit tests, the OpenAPI schema, types, lint, `npm test`, then every story rendered in Chrome. The pre-commit hook runs it, so a commit that lands has passed. A commit of only `.md` files runs just spelling.
- **`npm run smoke`** loads every page in [`scripts/pages.mjs`](../scripts/pages.mjs), signed in and out, and fails on any server error, including ones logged only to `.next/dev/logs/next-development.log`, which build and lint miss. **`npm run a11y`** runs axe-core (WCAG 2.2 AA) on the same pages and their `states`, such as open dialogs, light and dark, and checks each dialog's keyboard focus and Escape. Both reuse this checkout's running dev server and API, or start their own. `A11Y_SHARD=1/2 npm run a11y` runs one of CI's two shards.
- **`npm run worktree:setup`** readies a fresh git worktree: `npm ci`, Chromium for the story tests, `.env.local` from the main checkout, and git's larger push buffer. Run it again after a merge that changes `package.json`.
- **`npm run pr-check`** runs CI's PR naming check and the behind-`main` check before you open or edit a PR.
- **`npm run test:api`** runs every API test, the database ones too, in a throwaway schema (`bigfoot_test_big<n>` on a ticket branch). To use a local Postgres like CI's instead of Supabase:

  ```bash
  docker run --rm -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:17
  DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres npm run test:api
  ```

- **`npm run build`** shares `.next/` with `next dev`: stop the dev server first.

Coverage floors live in [`vitest.config.mts`](../vitest.config.mts) and the `test:api:unit` script.

## CI

[`ci.yml`](../.github/workflows/ci.yml) runs the same checks as parallel jobs behind one required check, `ci-passed`. Its database is a Postgres 17 container, so it needs no secret. When it fails, `npm run ci-failures` prints each failed job's log tail. CI starts its servers cold, so when smoke or a11y is slow or flaky locally, read the CI run (`gh run list`) too. Every PR that changes more than `.md` files also waits for the owner's approval (the `review-gate` job).

## The API

- After changing the API, run `npm run openapi` and commit [`api/openapi.json`](../api/openapi.json). If you forget, the pre-commit hook rewrites it and stops the commit until you `git add` it.
- With `API_DOCS="true"` in `.env.local`, the API serves Swagger UI at [localhost:8000/docs](http://localhost:8000/docs). Click **Authorize** and paste an Access token from your local Account page, or a web token for the test job seeker from `node scripts/dev-api-token.mjs` (valid for an hour; it also reaches the Account routes, which Access tokens can't).
- Both servers check their environment variables at startup and name every missing one: [`src/lib/env.ts`](../src/lib/env.ts) and [`api/app/settings.py`](../api/app/settings.py), kept in step with `.env.example` by a test.

## Skip Google sign-in

You need only `AUTH_SECRET`, the database and the API. `node scripts/dev-session.mjs` prints a session cookie for a test user: in your browser's developer tools, add it as `authjs.session-token` for `localhost`, then open [localhost:3300/dashboard](http://localhost:3300/dashboard).

The test user gets Sample Applications on first visit. `node scripts/dev-applications.mjs remove`, then `add`, gives them a fuller dashboard (`remove` again empties it).

## Pictures

- **`npm run storybook`** shows every component and page story, and the design tokens.
- **`npm run snapshots`** saves every Pages story, in each state, desktop and phone, dark and light, to `docs/snapshots/` (git-ignored). Every commit retakes the ones that changed.
- **`npm run screenshots`** retakes the README screenshots, with the dev server and API running.

## Troubleshooting

- **A Tailwind class has no effect in dev**, also after edits made outside the editor (say with `sed`): restart with `rm -rf .next/dev && npm run dev` before debugging. `npm run build` output is the authoritative CSS.
- **A push fails with `RPC failed; HTTP 400`**: a branch with screenshots outgrew git's push buffer. `npm run worktree:setup` raises it; `git config http.postBuffer 524288000` does it alone.

## Coding agents

Rules for agents are in [`AGENTS.md`](../AGENTS.md). Optionally, install Vercel's React rules for your user, not the repo:

```bash
npx skills add vercel-labs/agent-skills -s vercel-react-best-practices -g
```

Where it disagrees with the Next.js docs in `node_modules/next/dist/docs/`, follow the docs. Skip its SWR, `better-all`, and LRU cache rules: Bigfoot uses none of them and caches with `"use cache"`.
