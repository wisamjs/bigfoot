# Badges

> Dependencies: `colors.md`, `radius.md`

## Core Specs

- **Border:** 1px
- **Default radius:** 8px
- **Pill radius:** 9999px

## Sizes

| Size | Font size | Horizontal padding | Vertical padding |
|---|---|---|---|
| Default (small) | 12px | 6px | 2px |
| Large | 14px | 8px | 4px |

## Variants

### Brand
- **Background:** brand-softer
- **Border:** line-brand-subtle
- **Text:** fg-brand-strong

### Alternative (Neutral Soft)
- **Background:** surface
- **Border:** line
- **Text:** heading

### Gray (Neutral Medium)
- **Background:** card
- **Border:** line
- **Text:** heading

### Danger
- **Background:** danger-soft
- **Border:** line-danger-subtle
- **Text:** fg-danger

### Success
- **Background:** success-soft
- **Border:** line-success-subtle
- **Text:** fg-success-strong

### Warning
- **Background:** warning-soft
- **Border:** line-warning-subtle
- **Text:** fg-warning

### Dark
- **Background:** dark
- **Border:** transparent
- **Text:** white

## Pill Badges

Use 9999px radius instead of 8px on any variant.

## Badges with Icons

- Icon size (default): 12x12px
- Icon size (large): 14x14px
- Icon spacing: 4px margin next to label

## Icon-only Badge

Square shape — equalize dimensions to 24x24px, no horizontal text padding.

## Dismissible Badges

Badge content + a close button. Close button hover backgrounds per variant:

| Variant | Close button hover background |
|---|---|
| Brand | brand-soft |
| Alternative | card-strong |
| Gray | line |
| Danger | danger-medium |
| Success | success-medium |
| Warning | warning-medium |

## Dot / Notification Badge

- Positioned absolutely: -4px top, -4px right
- Size: 12x12px, fully rounded
- 2px border in border-buffer color
- Background: danger
