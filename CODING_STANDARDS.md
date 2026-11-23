# Coding standards

Read when reviewing a PR. These are the judgement calls; anything a check can catch is in
`npm run verify`, `npm run smoke`, `npm run a11y` or CI instead.

## Every claim about data is backed

User-facing copy that says what Bigfoot does with personal information (the Privacy Policy,
the sign-in note, any future Terms or notice) says only what is true today. Each statement
traces to one of:

- code or config in the repo that makes it true, ideally read by the page instead of
  repeated (`SESSION_MAX_AGE_DAYS`, `HOSTING_PLANS`, `SUBPROCESSORS`);
- a provider's documented behaviour for the plan we're on, with the docs link next to the value;
- a Linear ticket that makes it true, named in the PR, and the copy says what happens until then.

A statement backed by none of these is a defect, however reasonable it sounds. So is a change
that makes an existing statement untrue, such as a new SDK, a plan change or a removed feature,
without updating the copy and adding a `PRIVACY_CHANGES` entry.

## GLOSSARY.md describes the product as it is

A PR that changes what a screen shows or does updates every GLOSSARY.md term that describes that
screen, in the same PR. A definition that names a removed view, column or control is a defect.

## UI works on a phone

Read [`docs/guidelines/mobile.md`](docs/guidelines/mobile.md). `npm run a11y` fails on touch
targets under 44×44px and on text cut off by an ellipsis. A PR that changes UI attaches
`npm run capture -- <page> --width 375` images (light and dark) for each page or state it touches.

## Green CI before approval

Approve only when the PR's latest `CI` and `PR naming` runs succeeded. A cancelled or skipped
run is not a pass: rerun it. GitHub can't enforce this on this private repo (branch protection
needs GitHub Pro), so the review is the only gate.

## What a job seeker types stays text

React escapes text, so typed values are shown as `{value}` and nothing else. A link built from
typed input uses `ExternalLink` (`src/components/ui/external-link.tsx`), which drops anything
but `http` and `https` and opens with `rel="noopener noreferrer"`. Typed values never go into
`<script>`, JSON-LD, inline event handlers or page metadata unescaped. Rich text, such as
Markdown Interview notes, renders through a sanitizer (DOMPurify, or a Markdown renderer with
raw HTML off), never `dangerouslySetInnerHTML`, which lint refuses. Forms check input with
`src/lib/validation.ts`, and the Server Action checks it again with the same function.
`src/features/dashboard/xss.test.tsx` feeds XSS payloads through every display and form: a new
display or form of typed text joins it.

## Where code goes

| Folder | Holds |
| --- | --- |
| `src/components/ui/` | The design system: anything that would make sense in a different app. shadcn/ui primitives (`npx shadcn add` writes here) and components built on them, one per file, no barrel. |
| `src/hooks/` | Hooks that know nothing about Bigfoot. |
| `src/features/<feature>/` | Everything else in the UI, one folder per feature: `applications`, `dashboard`, `auth`, `account`, `legal`, `landing`, and `shell` (header, footer, wordmark, illustrations). Presentational and stateful components share the folder. |
| `src/lib/` | Domain and server code: types, allowed values and their labels, data access. No colours or components. |
| `src/app/` | Routes: thin files that put features together. |
| `src/*.ts` | Next.js's root files: `auth.ts`, `proxy.ts`, `instrumentation.ts`. |

Stories (`<name>.stories.tsx`) sit beside the component they show, under the same import rules. Storybook's stand-ins for Server Actions sit in `__mocks__/actions.ts` beside each `actions.ts`.

A "dumb" component is one in `ui/`: it can't reach the domain, a server action or a feature, so
it can be reused anywhere. Who may import whom, including the few links between features, lives
in `eslint.config.mjs` ("Architecture"); `scripts/boundaries.test.ts` checks it still bites. A
new link between features is a design decision for review: the alternative is moving the shared
piece down into `ui/`.

## Lint rule groups

`npm run lint` (`eslint.config.mjs`) fails on any warning. It runs in pre-commit (inside
`npm run verify`) and once in CI, in the `fast-checks` job. Every shared config below is raised to errors.
`scripts/lint-rules.test.ts` snapshots the rules that are on: a change to its snapshot is a
change to this table, so the table must say the same.

| Group | Files | Guards against |
| --- | --- | --- |
| `eslint-config-next` (core-web-vitals, TypeScript) | all | Next.js pitfalls (`<img>`, `<a>` for routes, sync scripts) and TypeScript mistakes. |
| `react-hooks` | all | Hooks called conditionally, and effects missing a dependency (`exhaustive-deps` is an error). |
| ESLint React `recommended-type-checked` | `src/**/*.{ts,tsx}` | React misuse: leaked `0` or `""` from `&&`, impure renders, setState in an effect, components defined inside components, unstable keys, refs not named `…Ref`, misused DOM props. Its two `disable-conflict-…` presets turn off the `eslint-plugin-react` and `react-hooks` rules it copies, so nothing is reported twice; `react-hooks` keeps `rules-of-hooks` and `exhaustive-deps`. |
| Performance (ESLint React, core, `eslint-plugin-unicorn`) | `src/**/*.{ts,tsx}` | The `vercel-react-best-practices` rules a linter can check: default props and context values rebuilt on every render (`rerender-memo-with-default-value`), `await` in a loop (`async-parallel`), `export *` barrels (`bundle-barrel-imports`), `.sort()` mutating in place (`js-tosorted-immutable`), `.filter()` where `.find()` or `.some()` stops early (`js-early-exit`), `.map().flat()` (`js-flatmap-filter`), and `Array#includes` on a fixed list (`js-set-map-lookups`). The rest of the skill is for review. |
| Script injection (ESLint React, core, typescript-eslint) | `src/**/*.{ts,tsx}` | Text a job seeker typed running as code: `dangerouslySetInnerHTML` and `javascript:` URLs in JSX (from ESLint React's preset), `eval`, `new Function`, `javascript:` strings, and string timers (`no-implied-eval`). |
| `jsx-a11y` `strict`, plus every live rule it leaves off | `**/*.{jsx,tsx}` | Semantic HTML and ARIA mistakes: a `role` where a native element exists (`prefer-tag-over-role`: `<fieldset>`, `<section>`, `<output>`), controls with no label, focusable elements hidden with `aria-hidden`, vague link text, missing labels and alt text, invalid roles, click handlers on non-interactive elements, `autoFocus`, `tabIndex` on non-interactive elements. Heading order and landmarks are runtime checks in `npm run a11y`. |
| `eslint-plugin-boundaries` (`dependencies`, `no-unknown-files`) | `src/**/*.{ts,tsx}` | Imports that cross the layers in "Where code goes": the design system reaching into a feature, the domain, `auth.ts` or a server action; `lib` importing UI; a feature importing a feature the config doesn't link it to, or a route; production code importing test fixtures. Anything not allowed is an error, and a file in a folder no rule covers is an error too. |
| `complexity` (ESLint core) and Ruff `C90` (mccabe), maximum 10 | all, including tests and scripts; `api/` and `scripts/*.py` for Ruff | A function with more than 10 independent paths through it (each `if`, loop, `case`, `&&`, `||`, `?:` and `catch` adds one). Every path needs a test, and a function with many has more bugs and is slower to change. Split it into smaller functions, or into components in React. |
| Testing Library (React) and jest-dom | `**/*.test.tsx` | Tests that reach into the DOM instead of querying as a user would, misnamed render results, and assertions with a clearer jest-dom matcher. |

An inline `eslint-disable` names its rule and gives a reason after `--`. Today's exceptions:
`autoFocus` where a dialog moves focus on purpose, a focusable scrolling region, the calendar
reading today's date while it renders, and the skeleton tests, which check `aria-hidden` shapes
that have no role or text to query by, and the axe test, which writes broken markup by hand and clears
the screen itself before `setup.ts` checks it. The XSS tests list `javascript:` URLs as payloads
(`src/test/xss.ts`) and look for injected tags, which have no role or text to query by.
