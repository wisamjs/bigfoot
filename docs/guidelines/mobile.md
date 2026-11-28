# Mobile guidelines

Read when building or reviewing UI. "Phone" means 375×812 with touch; `npm run a11y` checks it.
To see a page the way a phone does: `npm run capture -- <page> --width 375`.
Other guidelines (BIG-78) are added to this folder beside this file.

## Rules

1. **Touch targets are at least 44×44px on touch screens.** A thumb is about 10mm wide, and
   2px-apart 24px buttons get mis-tapped. Source: Apple Human Interface Guidelines (44pt) and
   WCAG 2.5.5 Target Size (Enhanced, AAA); we exceed the AA minimum of 24px (2.5.8). Inline text
   links in a sentence are exempt; a link alone in its own list item is not. The icon can stay
   small: grow the hit area with `.touch-target` (globals.css) or `pointer-coarse:` utilities.
   Buttons, fields, and selects already grow on touch screens. *Checked by `npm run a11y`.*
2. **Text that matters isn't cut off with an ellipsis at 375px.** A company, a date, or a heading
   that is cut to "…" says little. Wrap it (`break-words`) or shorten it. *Checked by
   `npm run a11y`.*
3. **A sheet's or form's primary action is reachable without scrolling to the end.** On a phone
   it sits in a sticky footer (`AddFormActions`). Source: reach on a tall form, which is what
   BIG-123's audit found. *Checked by human review with `npm run capture`.*
4. **The main task on a page starts within one screen.** On the dashboard that is the
   Applications card, which comes first, above the Interviews card.
   Long lists get a sticky row of chips that jump to each group. *Checked by human review.*
5. **Pages reflow at 320px with no sideways scrolling.** Source: WCAG 1.4.10 Reflow.
   *Checked by `npm run a11y`.*
6. **Text fields are at least 16px on touch screens.** iOS Safari zooms in on a focused field
   under 16px and stays zoomed when the page changes under it, so the next page comes up cut off
   at both edges (BIG-204: a Journey opened from its Passcode field). `globals.css` raises every
   field to 16px on touch screens; don't override it. *Checked by `npm run a11y`.*

## Exceptions

A control that can't reach 44px goes in `TOUCH_TARGET_EXCEPTIONS` in `scripts/mobile-checks.mjs`
with its reason. There are none today.
