# Color Tokens

Colours come in two tiers. Both live in `src/app/globals.css`, the only file that holds colour values; `npm run tokens` (`scripts/check-tokens.mjs`) enforces the tiers.

1. **Base scales** (`@tokens base`): one numbered scale per hue, 50 lightest to 950 darkest. The only hex values in the app, the same in light and dark. A scale lists only the steps a role uses.
2. **Roles** (`@tokens roles`, dark values in `@tokens dark`): named for their job. Each points at a base step, and dark mode points it at another. Components use roles only, through Tailwind utilities (`bg-card`, `text-heading`, `border-line`); base steps have no utilities.

Storybook's **Design tokens** page shows both tiers, read from `globals.css`.

## Adding a colour

Reuse a role first. When no role fits, point a role at an existing base step. Add a role only for a new job (a new status, a new kind of surface), never for one component's shade; add a base step only when no step on the scale is close enough. `npm run tokens` fails a hex value outside the base block, two base steps with one value, and a token nothing uses.

## Base scales

| Scale | Steps | For |
|---|---|---|
| mauve | 50–950 | The pink-tinted neutrals: surfaces, text, lines |
| pink | 50–900 | The brand, bubblegum to wine |
| white | | Text on the brand, fields and popovers in light mode |
| green, red, orange, yellow, blue, slate, purple, gray | a few steps each | Status and Round and Stage colours: a soft fill (50–100), its line (200–300), its text (700–800) and the dark-mode fill (950) |
| google-red, -blue, -yellow, -green | | Google's "G" logo only |

## Roles

| Role | Light | Dark | Use |
|---|---|---|---|
| surface | mauve-50 | mauve-900 | Every page and section background |
| surface-white | white | mauve-950 | Fields, popovers, dialogs: contrasts with the surface |
| card | mauve-100 | mauve-800 | Cards over a section; secondary and tertiary buttons' hover |
| card-strong | mauve-200 | mauve-700 | A layer nested in a card; hover on a card-coloured control |
| brand | pink-800 | pink-400 | Primary actions, selected states |
| brand-soft | pink-100 | pink-800 | Soft brand fills (icon shapes, highlights) |
| brand-softer | pink-50 | mauve-900 | The lightest brand fill |
| on-brand | white | mauve-900 | Text and icons on `brand` |
| heading | pink-900 | mauve-50 | Headings |
| body | mauve-600 | mauve-300 | Body text |
| body-subtle | mauve-500 | mauve-400 | Secondary text, placeholders, disabled text |
| fg-brand | pink-800 | pink-300 | Links and brand-coloured text |
| fg-brand-strong | pink-900 | pink-100 | Brand text that needs more weight |
| line | mauve-300 | mauve-800 | Default borders and dividers |
| line-medium | mauve-400 | mauve-700 | Field borders, stronger dividers |
| line-brand-subtle | pink-200 | pink-600 | Brand-tinted borders (dashboard and Journey cards, icon shapes), the button focus ring |
| line-brand | pink-800 | pink-300 | Selected and focused borders |
| skeleton | mauve-300 | pink-600 | Loading shapes |
| success-soft, fg-success-strong, line-success-subtle | green | green | Success fill, text, border |
| warning-soft, fg-warning, line-warning-subtle | orange | orange | Warning fill, text, border |
| danger-soft, fg-danger, line-danger-subtle, line-danger | red | red | Error fill, text, borders; `line-danger` also for destructive actions |
| tone-*, tone-*-fg, tone-*-line | that hue | that hue | Round and Stage colours (purple, slate, blue, green, yellow, orange, red, gray): badge fill, text, border |
| glint-highlight, glint-shadow | white 30%, pink-800 18% | white 14%, mauve-950 30% | The button glint (`buttons.md`) |
| shadow-xs, -md, -lg, -2xl | pink-800 tint | same | Elevation (`shadows.md`) |

shadcn/ui's theme variables (`--background`, `--primary`, `--destructive`…, in `@tokens shadcn`) point at these roles, so `npx shadcn add` output matches without editing its colours.

## Not built yet

The module files name some Candy colours no screen uses yet: `disabled` (background), `dark` and `dark-strong` (tooltips, dark badges and buttons), solid `success`, `danger` and `warning` with their `-medium` and `-strong` hovers and rings, `border-success`, `border-warning`, and the accent colours (`fg-purple`, `fg-cyan`…). When a component needs one, follow **Adding a colour**: reuse a role (disabled text is `body-subtle`; a disabled background is `card`) or add the role on an existing scale.

## Semantic Usage Rules

- Page and section backgrounds: surface, the same on every section.
- Cards over a section: card, so the card reads as a distinct layer above the surface.
- Inputs: surface-white against the pink surface, so fields stay legible.
- Primary buttons: brand (candy gradient in `buttons.md`).
- Headings: heading. Body text: body. CTA links: fg-brand.
- Default borders: line. Status borders match intent: line-success-subtle, line-danger, line-warning-subtle.

## Prohibited

- No raw hex or rgb values outside the base block of `globals.css`: components use roles.
- No brand text colour for long-form paragraphs.
- No brand or accent backgrounds for large layout surfaces (pages, sections) unless it's a hero or campaign area.
- No manual light/dark swapping: point the role at a different base step in `@tokens dark`.
