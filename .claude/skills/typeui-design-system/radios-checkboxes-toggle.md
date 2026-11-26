# Radios, Checkboxes & Toggles

> Dependencies: `colors.md`, `radius.md`

## Checkbox

- Size: 16x16px
- Radius: 8px
- Border: 1px, line-medium
- Background: card
- Focus ring: 2px, brand-soft

### Disabled
- Border: border-light
- Text: body-subtle

## Radio

- Size: 16x16px
- Radius: fully rounded
- Border: 1px, line-medium
- Background: card
- Focus ring: 2px, brand-soft
- Checked: line-brand, indicator: surface-white color

### Disabled
- Border: border-light-medium
- Text: body-subtle

Group all radio items under the same `name` attribute.

## Toggle

### Track
- Fully rounded
- Background: line
- Focus-within ring: 2px, brand-soft
- Checked track: brand background
- Disabled track: card-strong background

### Thumb
- Fully rounded
- Background: white
- Border: border-buffer

### Disabled
- Track: card-strong background
- Label: body-subtle text

## Rules

- All selection inputs must have `id` matching label `htmlFor`
- Focus states use the appropriate brand token for each control type
- Disabled states: no hover/focus interaction
