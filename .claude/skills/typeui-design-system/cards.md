# Cards

> Dependencies: `colors.md`, `radius.md`, `shadows.md`, `typography.md`

## Core Specs

- **Background:** card (the card surface — a derived tone of the section it sits on, e.g. #F5D6E3 over the #FAEBF1 surface)
- **Border:** 1px, line color (#E3C6D7)
- **Radius:** 24px (base)
- **Shadow:** shadow-xs

## Layering Rule

Cards always sit on top of a section surface. A card's background must be a derived tone of the surface it sits over (one step from the section's neutral) so it reads as a distinct, lighter/contrasting layer — never the exact same color as the section. On the default light surface this means the card uses card; nested cards step one tone further so each layer stays visually separated.

## Card Heading

- Desktop: 20px, medium weight, heading color
- Mobile: 16px, medium weight, heading color
- Never skip heading levels — the page hierarchy must logically arrive at the card heading level.

## States

### Static Card (no interactivity)
- Background: card
- Border: 1px, line
- Radius: 24px
- Shadow: shadow-xs
- No hover styles. Non-interactive cards must NOT have hover background changes.

### Interactive Card (clickable)
- Same base styles as static card
- Hover: card-strong background
- Transition: colors
- Cursor: pointer

## Rules

- Background: card (derived tone of the section surface)
- Border: 1px, line
- Radius: 24px
- Shadow: shadow-xs
- Interactive hover: card-strong background
- Non-interactive: no hover styles
