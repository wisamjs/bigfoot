# Shadows

Shadows are tinted with the wine/brand palette rather than pure black so elevation feels warm and on-brand. Where a stack supports it, prefer the brand-toned rgba below; otherwise the values gracefully read as a soft neutral shadow.

| Token | CSS value |
|---|---|
| shadow-2xs | `0 1px rgba(79,17,53,0.05)` |
| shadow-xs | `rgba(79,17,53,0.10) 0px 4px 6px -1px, rgba(79,17,53,0.06) 0px 2px 4px -1px` |
| shadow-sm | `0 1px 3px 0 rgba(79,17,53,0.1), 0 1px 2px -1px rgba(79,17,53,0.1)` |
| shadow-md | `0 4px 6px -1px rgba(79,17,53,0.1), 0 2px 4px -2px rgba(79,17,53,0.1)` |
| shadow-lg | `0 10px 15px -3px rgba(79,17,53,0.1), 0 4px 6px -4px rgba(79,17,53,0.1)` |
| shadow-xl | `0 20px 25px -5px rgba(79,17,53,0.1), 0 8px 10px -6px rgba(79,17,53,0.1)` |
| shadow-2xl | `0 25px 50px -12px rgba(79,17,53,0.25)` |

## Component Mapping

| Component type | Token |
|---|---|
| Subtle separators, tiny UI details | shadow-2xs or shadow-xs |
| Cards, inputs, buttons, small controls, lightweight surfaces | shadow-xs |
| Standard cards, popovers, dropdowns | shadow-md |
| Prominent cards, sticky surfaces | shadow-lg |
| Modals, high-priority overlays | shadow-xl |
| Hero overlays, top-level emphasis (sparingly) | shadow-2xl |

## Rules

- Use only these tokens — no custom box-shadow values
- Keep elevation steps intentional; avoid jumping multiple levels
- Components in the same family share the same baseline elevation
- Hover/focus on interactive elevated elements: step up by one level
- Never stack multiple shadow tokens on one element
- Never use shadow-xl/shadow-2xl for dense list items or body containers
