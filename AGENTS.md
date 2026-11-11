<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Bigfoot

- **Tickets**: before starting a Linear `BIG-n` ticket, fetch it with its relations; every "blocked by" ticket must be Done, otherwise stop and name the blockers.
- **Domain language**: `GLOSSARY.md`. Use its terms in code, UI copy and tickets.
- **UI work**: read `.claude/skills/typeui-design-system/` (TypeUI Candy) before writing or restyling components. Token values live only in `src/app/globals.css`.
- **Verify**: `npm run check` (types, lint, design tokens), then `npm run smoke` (every route, signed in and out; fails on server errors logged to `.next/dev/logs/next-development.log`, which build and lint miss). Smoke reuses running servers; CI starts them cold, so when smoke is slow or flaky, read the CI run (`gh run list`) too.
- **Migrations**: apply a merged migration to the dev database (`npm run db:status` lists what's missing and how); CI on main stays red until you do.
- **Stale dev CSS**: stop `next dev` before `npm run build` (they share `.next/`). If a Tailwind class has no effect in dev (also after edits made outside the editor, e.g. `sed`), restart with `rm -rf .next/dev && npm run dev` before debugging; `npm run build` output is the authoritative CSS.
- **Signed-in pages without Google**: `node scripts/dev-session.mjs` prints an `authjs.session-token` cookie value for a test user.
- **TypeUI MCP installs**: results are too large to read; apply the saved result with `python3 scripts/typeui-apply.py <result-file>`.
