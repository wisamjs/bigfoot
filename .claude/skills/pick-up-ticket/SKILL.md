---
name: pick-up-ticket
description: "Pick up a Linear BIG ticket, named (BIG-n) or the next one: choose it, update main, open its worktree, do the work and open the PR. \"Pick up\" is the whole job; don't stop after the worktree to ask. Use when asked to pick up, start or take the next ticket."
---

Each step ends when its **done** line holds.

1. **Choose the ticket.**
   - A number is given: `get_issue` it with relations.
   - No number: `list_issues` with `team: "BIG"`, state Todo, `fields: ["id","title","status","priority","assignee"]`. Take the highest-priority ticket that nobody else (including "Agent") is assigned, then `get_issue` it with relations; move on if a blocker is not Done. Tell the user which ticket and why.

   **Done:** one ticket in hand whose "blocked by" tickets are all Done. A named ticket with an open blocker stops here: name the blockers to the user.

2. **Update main.** In the main checkout, `git fetch origin`, then fast-forward local `main` to `origin/main` (`git merge --ff-only origin/main` when main is checked out). The main checkout often holds uncommitted work, so leave it as it is: no reset, no stash. When main can't fast-forward, tell the user which files are in the way and use `origin/main` as the base.

   **Done:** a base (`main` or `origin/main`) at the tip of `origin/main`.

3. **Open the worktree.** `git worktree add -b <gitBranchName> .claude/worktrees/big-<n> <base>`, with the ticket's `gitBranchName` from Linear. Then `npm run worktree:setup` inside it. Do all ticket work there.

   **Done:** the worktree exists on the Linear branch name and `worktree:setup` printed `✓ installed node_modules`.

4. **Do the ticket.** Being asked to pick up a ticket is the go-ahead for this step: don't stop after the worktree to ask whether to continue. Move the ticket to In Progress, then in the worktree:
   - Meet every acceptance criterion. When a criterion names code that a later ticket has moved or replaced, adapt it to the current code and say so in the PR; don't stop to ask.
   - Run the Verify checks in `AGENTS.md`.
   - Commit, push and open the PR, named as `scripts/check-pr-naming.mjs` requires, with each acceptance criterion mapped to its change.
   - Share the PR URL and name any step the user must do by hand.

   **Done:** a pushed PR that meets every acceptance criterion, or names the manual steps that remain, and its URL given to the user.
