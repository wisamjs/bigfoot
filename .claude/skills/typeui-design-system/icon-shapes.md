# Icon Shapes

> Dependencies: `colors.md`, `radius.md`

## Core Specs

- Box sizing: border-box
- Icon must be perfectly centered (inline-flex, centered both axes)
- Circle: fully rounded (9999px)
- Rounded square: 24px radius (MD/LG/XL), 8px radius (XS/SM)

## Default Shape Treatment (always apply)

Every icon shape uses this candy treatment by default so all icon containers stay consistent. Described in values/tokens so it can be reproduced in any stack — never couple it to a framework.

- **Fill:** soft brand gradient — a linear gradient at ~145deg from `brand-softer` to `brand-soft`
- **Border guard:** 1px solid `border-brand-subtle`, framing the shape on all sides (the "guard" ring that outlines the icon)
- **Inner highlight:** a subtle inset top sheen — `inset 0 1px 0 rgba(255,255,255,0.5)` (toned from the white token, never a hard line or pure-black shadow)
- **Icon color:** `fg-brand-strong`, centered on both axes
- **Radius:** follow the rounded-square scale above (24px for MD/LG/XL, 8px for XS/SM), or fully rounded (9999px) for the circle variant

This soft-fill + border-guard + inner-highlight combination is the standard look for all icon shapes; status/accent variants only swap their fill and icon color tokens while keeping the same gradient-fill, guard border, and inset highlight structure.

## Sizes

| Size | Container | Icon |
|---|---|---|
| XS | 24x24px | 14x14px |
| SM | 32x32px | 16x16px |
| MD | 40x40px | 20x20px |
| LG | 48x48px | 24x24px |
| XL | 56x56px | 28x28px |

## Color Variants

All variants keep the Default Shape Treatment (soft gradient fill, 1px guard border, inset top highlight) and only change which tokens drive the fill and icon color.

### Brand
- Shape: circle or rounded square
- Fill: gradient from brand-softer to brand-soft
- Guard border: border-brand-subtle
- Icon color: fg-brand-strong

### Gray
- Shape: circle
- Background: neutral-secondary-soft
- Icon color: body

### Danger
- Shape: circle
- Background: danger-soft
- Icon color: fg-danger-strong

### Success
- Shape: circle
- Background: success-soft
- Icon color: fg-success-strong

### Warning
- Shape: circle
- Background: warning-soft
- Icon color: fg-warning

## Rules

- The icon must always be perfectly centered inside the shape — both vertically and horizontally — on every size and variant. Center it on both axes (e.g. flex/grid centering or equivalent) and never rely on padding offsets or manual nudging that would push it off-center.
