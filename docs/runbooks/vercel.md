# Vercel deployments

Only `main` deploys. Pushing any other branch, or opening or updating a PR, creates no Vercel deployment and no preview URL. A merge to `main` deploys to Production at `https://bigfoot.wisamzaghal.com`.

## Why previews are off

The Hobby plan allows 100 deployments per rolling 24 hours (error code `api-deployments-free-per-day`). Every deployment counts: Preview, Production, CLI and dashboard redeploys. Each push to a PR branch made a Preview deployment, so stacked PRs and parallel branches used the quota up, and then Production could not deploy either. CI (the steps of `npm run verify`, smoke, a11y) already verifies each PR.

## How it works

`vercel.json` sets `git.deploymentEnabled`:

```json
"git": { "deploymentEnabled": { "**": false, "main": true } }
```

`**` matches every branch name, including ones with a `/` such as `wisamzaghal/big-141-…`. `main` matches both rules, and Vercel deploys a branch when any matching rule is `true`.

This is not an Ignored Build Step (`ignoreCommand`). Vercel counts builds an Ignored Build Step cancels as full deployments, so they would still use the quota.

Nothing in CI or branch protection waits for Vercel: the required checks are `ci-passed` and `pr-naming`.

## Turn previews back on

Either upgrade the Vercel plan to Pro, which lifts the limit, or delete the `git` block from `vercel.json`. Check that the tickets that need a Preview URL (Lighthouse and Web Vitals checks, same-commit API previews, Sentry errors from previews) still match what you want.

To preview one branch without turning previews on for all of them, add a rule for it, for example `"wisamzaghal/big-200-*": true`, and remove it when you are done.
