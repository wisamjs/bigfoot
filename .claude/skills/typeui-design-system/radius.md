# Border Radius

| Token | Value | Default usage |
|---|---|---|
| base | 24px | Cards, modals, sections, containers, large components (not fields: inputs use the 8px control radius, see `inputs.md`) |
| default | 8px | Buttons, badges, tooltips, dropdown items, small controls |
| sm | 8px | Checkboxes, tiny elements |
| full | 9999px | Pills, avatars, toggles, dot indicators |

## Rules

- 24px is the default radius for cards, surfaces, and large components — the system leans into soft, rounded candy shapes
- 8px is the radius for smaller interactive controls (buttons, badges, tooltips, small chips)
- Never use arbitrary radius values outside this scale
- Radius must be consistent within each component family
