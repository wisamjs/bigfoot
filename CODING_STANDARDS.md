# Coding standards

Read when reviewing a PR. These are the judgement calls; anything a check can catch is in
`npm run check`, `npm run smoke`, `npm run a11y` or CI instead.

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

## Green CI before approval

Approve only when the PR's latest `CI` and `PR naming` runs succeeded. A cancelled or skipped
run is not a pass: rerun it. GitHub can't enforce this on this private repo (branch protection
needs GitHub Pro), so the review is the only gate.

## Lint rule groups

`npm run lint` (`eslint.config.mjs`) fails on any warning. It runs in pre-commit (inside
`npm run check`) and as its own `lint` job in CI. Every shared config below is raised to errors.

| Group | Files | Guards against |
| --- | --- | --- |
| `eslint-config-next` (core-web-vitals, TypeScript) | all | Next.js pitfalls (`<img>`, `<a>` for routes, sync scripts) and TypeScript mistakes. |
| `react-hooks` | all | Hooks called conditionally, and effects missing a dependency (`exhaustive-deps` is an error). |
| ESLint React `recommended-type-checked` | `src/**/*.{ts,tsx}` | React misuse: leaked `0` or `""` from `&&`, impure renders, unstable keys and context values, refs not named `…Ref`, misused DOM props. Its `disable-conflict-eslint-plugin-react` preset turns off the overlapping `eslint-plugin-react` rules so nothing is reported twice. |
| `jsx-a11y` `strict` | `**/*.{jsx,tsx}` | ARIA and HTML mistakes: missing labels and alt text, invalid roles, click handlers on non-interactive elements, `autoFocus`, `tabIndex` on non-interactive elements. Runtime checks stay with `npm run a11y`. |
| Testing Library (React) and jest-dom | `**/*.test.tsx` | Tests that reach into the DOM instead of querying as a user would, misnamed render results, and assertions with a clearer jest-dom matcher. |

An inline `eslint-disable` names its rule and gives a reason after `--`. Today's exceptions:
`autoFocus` where a dialog moves focus on purpose, a focusable scrolling region, the calendar
reading today's date while it renders, and the skeleton tests, which check `aria-hidden` shapes
that have no role or text to query by.
