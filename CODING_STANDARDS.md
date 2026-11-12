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

## Green CI before approval

Approve only when the PR's latest `CI` and `PR naming` runs succeeded. A cancelled or skipped
run is not a pass: rerun it. GitHub can't enforce this on this private repo (branch protection
needs GitHub Pro), so the review is the only gate.
