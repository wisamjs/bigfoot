# Tooltips & Popovers

> Dependencies: `colors.md`, `radius.md`, `shadows.md`

## Tooltips

### Core Specs
- Padding: 12px horizontal, 8px vertical
- Font: 14px, medium weight
- Radius: 8px (default)
- Shadow: shadow-xs
- Transition: opacity, 300ms

### Dark (Default)
- Background: dark
- Text: white
- Border: transparent

### Light
- Background: card
- Text: heading color
- Border: 1px, line

## Popovers

### Core Specs
- Background: surface-white
- Radius: 24px (base)
- Shadow: shadow-md
- Border: 1px, line
- Transition: opacity, 300ms

### Header / Title
- Padding: 12px horizontal, 8px vertical
- Background: surface
- Bottom border: line
- Font: 14px, medium weight, heading color

### Body / Content
- Standard: 12px horizontal, 8px vertical padding; 14px, body color
- Rich: 16px padding; 14px, body color

## Arrows

- Size: 8x8px rotated 45deg
- Color must match the background of the tooltip/popover variant

## Rules

- Tooltips: 8px radius
- Popovers: 24px radius
- Dark tooltips: dark background, white text
- Light tooltips/popovers: semantic neutral background + border tokens
- Arrows match parent background color
