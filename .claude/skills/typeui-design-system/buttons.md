# Buttons

> Dependencies: `colors.md`, `radius.md`, `shadows.md`

## Core Specs (every button except ghost and disabled)

- **Radius:** 8px (small-control radius) or 9999px for pills
- **Border:** 2px solid (use a transparent border so the gradient-border recipe can sit on top; outline variants keep their visible 2px border)
- **Shadow:** shadow-xs
- **Glint effect:** Every button except ghost and disabled gets a combined box-shadow that layers the base shadow with an inset top-edge highlight and a subtle outer color glow:
  - `var(--shadow-xs), inset var(--color-1-400) 0 6px 0px -5px, var(--color-1-700) 0 4px 10px -5px`
- **Font weight:** 500 (medium)
- **Font:** Allo
- **Text shadow:** subtle wine-toned text shadow for filled gradient buttons — `1px 1px 1px rgba(42,10,29,0.25)` (use a tone from the brand palette, never pure black)
- **Box sizing:** border-box
- **Transition:** all properties, 0.3s

## Brand Gradient Recipe (agnostic)

The primary/brand button uses a layered two-gradient fill — a solid-feeling candy gradient inside, framed by a lighter-to-darker gradient "rim". This is described in values so it can be reproduced in any stack/technology; do not couple it to a framework.

- **Fill (inner / "padding-box"):** linear gradient at ~140deg, from secondary-brand `#B5538C` (≈15%) to brand `#4F1135` (≈115%)
- **Rim (border / "border-box"):** linear gradient at ~142deg, from a light brand highlight `#E59CC4` (≈9%) to brand-strong `#3A0B27` (≈89%)
- **Border:** 2px solid transparent (lets the rim gradient show through)
- **Radius:** 8px
- **Text color:** white
- **Text shadow:** `1px 1px 1px rgba(42,10,29,0.25)`
- **Box shadow (resting):** a soft wine glow — `8px 8px 20px 0 rgba(79,17,53,0.35)` (toned from the brand palette, never pure black)
- **Padding:** 10px 40px (large), line-height 20px
- **Font size:** 18px (large), weight 500
- **Cursor:** pointer
- **Transition:** all 0.3s
- **Hover:** drop the box-shadow (`none`) and reduce opacity to ~80%

> All gradient stops, borders, and shadows must stay within the brand/secondary candy palette (brand `#4F1135`, secondary `#B5538C`, and their derived shades). Never introduce out-of-palette accents for the gradient, rim, or glow.

## Sizes

| Size | Font size | Horizontal padding | Vertical padding |
|---|---|---|---|
| Extra small | 12px | 12px | 6px |
| Small | 14px | 12px | 8px |
| Base (default) | 14px | 16px | 10px |
| Large | 16px | 20px | 12px |
| Extra large | 16px | 24px | 14px |

## Variants

### Brand
- **Background:** candy gradient fill (see Brand Gradient Recipe) — secondary-brand → brand
- **Border:** 2px transparent with the brand gradient rim
- **Text:** white
- **Hover:** drop the resting wine glow and reduce opacity to ~80%
- **Focus ring:** 4px, brand-medium color
- **Glint:** yes

### Secondary
- **Background:** neutral-secondary-medium
- **Border:** border-default-medium
- **Text:** body color
- **Hover:** neutral-tertiary-medium background, heading text color
- **Focus ring:** 4px, neutral-tertiary color
- **Glint:** yes

### Tertiary
- **Background:** neutral-primary-soft
- **Border:** border-default
- **Text:** body color
- **Hover:** neutral-secondary-medium background, heading text color
- **Focus ring:** 4px, neutral-tertiary-soft color
- **Glint:** yes

### Success
- **Background:** success token
- **Border:** transparent
- **Text:** white
- **Hover:** success-strong background
- **Focus ring:** 4px, success-medium color
- **Glint:** yes

### Danger
- **Background:** danger token
- **Border:** transparent
- **Text:** white
- **Hover:** danger-strong background
- **Focus ring:** 4px, danger-medium color
- **Glint:** yes

### Warning
- **Background:** warning token
- **Border:** transparent
- **Text:** white
- **Hover:** warning-strong background
- **Focus ring:** 4px, warning-medium color
- **Glint:** yes

### Dark
- **Background:** dark token
- **Border:** transparent
- **Text:** white
- **Hover:** dark-strong background
- **Focus ring:** 4px, neutral-tertiary color
- **Glint:** yes

### Ghost (NO shadow, NO glint)
- **Background:** transparent
- **Border:** transparent
- **Text:** heading color
- **Hover:** neutral-secondary-medium background
- **Focus ring:** 4px, neutral-tertiary color
- **No shadow, no glint effect**

### Disabled (NO shadow, NO glint)
- **Background:** disabled token
- **Border:** border-default-medium
- **Text:** fg-disabled color
- **Cursor:** not-allowed
- **No hover, no focus, no shadow, no glint**

## Icons in Buttons

- Icon size: 16x16px
- Spacing: 8px gap between icon and label
- Layout: inline-flex, vertically centered
