# Tables

> Dependencies: `colors.md`, `radius.md`, `shadows.md`

## Wrapper

- Horizontal scroll overflow
- Background: surface
- Radius: 24px (base)
- Border: 1px, line
- Shadow: shadow-xs

## Table Element

- Full width, left-aligned text (right-aligned for RTL)
- Font: 14px, body color

## Table Head

- Font: 14px, body color, medium weight
- Background: surface
- Bottom border: line
- Cell padding: 24px horizontal, 12px vertical

## Table Body

- Row background: surface-white
- Row bottom border: line (omit on last row to avoid doubling with wrapper border)
- Row hover: surface background (optional)
- Row header: medium weight, heading color, no-wrap
- Cell padding: 24px horizontal, 16px vertical

## Rules

- Wrapper must have horizontal scroll overflow for responsive scrolling
- Last row: omit bottom border to avoid doubling with wrapper border
- Row headers: always `scope="row"` for semantic structure
- Hover on rows is optional
- No arbitrary hex codes — use token colors only
