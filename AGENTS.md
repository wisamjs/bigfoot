<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Bigfoot

- **Tickets**: pick up a Linear `BIG-n` ticket, named or next, with the `pick-up-ticket` skill. It covers the work through the open PR, so start without asking. A ticket's work, docs included, ships in its one PR.
- **Review**: `CODING_STANDARDS.md`. Every PR but one changing only `.md` files waits for the owner's click in CI's `review-gate`, so an agent never merges.
- **Domain language**: `GLOSSARY.md`. Use its terms in code, UI copy, and tickets.
- **Spelling**: Canadian English with the Oxford comma everywhere, tickets included. cspell checks the repo; new words go in `cspell.json`.
- **UI work**: load the `typeui-design-system` skill first. Primitives come from `npx shadcn add <name>` and are restyled with Candy tokens before use, as Button, Dialog, and Sheet are; dialogs build on `src/components/ui/modal.tsx`. A changed component's stories change with it. Before calling a layout done, look at it at 375 px and in dark mode: `npm run capture -- --help`.
- **Verify**: committing runs `npm run verify` (the pre-commit hook); before a PR, also `npm run smoke` and `npm run a11y`. In a fresh worktree, run `npm run worktree:setup` first, and again after a merge that changes `package.json`. `docs/contributing.md` has what each check covers, the local Postgres, CI failures, test sessions without Google, and "Troubleshooting" for a dev server that disagrees with the tests.
- **TypeUI MCP installs**: results are too large to read; apply the saved result with `python3 scripts/typeui-apply.py <result-file>`.
