# E+ Tools — Design Rules

## Color Palette

| Token | Hex | Usage |
|---|---|---|
| Primary (deep blue) | `#06003e` | Text headings, active states, borders |
| Primary Container (sidebar blue) | `#1b1464` | **Primary action buttons background**, sidebar nav |
| Accent (yellow) | `#e7eb00` | **Primary action button text**, sidebar active link bg |
| Surface blue (light) | `#edf2f9` | Evaluator sidebar bg, light panels |
| Blue tints | `#1e3a5f`, `#2563eb`, `#3b82f6`, `#60a5fa`, `#93c5fd` | Section dots, zone headers, per diem cards |
| Criterion tints | `#f8fafc`, `#eff6ff`, `#f0f4fa`, `#e8eef6`, `#dbeafe`, `#edf2f9` | Alternating criterion card backgrounds |

## Button Styles

### Primary action buttons (Save, Add, Configure, Create)
- Background: `#1b1464` (sidebar blue)
- Text: `#e7eb00` (accent yellow)
- Hover: `#1b1464/80` (opacity)
- Rounded: `rounded-xl` for main actions, `rounded-lg` for inline/smaller

### Secondary / Cancel buttons
- Background: transparent
- Border: `border-outline-variant/30`
- Text: `text-on-surface-variant`
- Hover: `hover:bg-gray-50`

### Danger / Delete buttons
- Default state: `text-red-400 border border-red-200` (subtle)
- Hover: `hover:bg-red-50 hover:text-red-600`
- Delete confirmation modal: red header, requires typing "DELETE"

## Badge / Chip Styles

| Badge | Style |
|---|---|
| Active | `bg-blue-100 text-blue-800` |
| Inactive | `bg-gray-100 text-gray-500` |
| EU Member | `bg-blue-100 text-blue-800` |
| Associated country | `bg-blue-50 text-blue-600` |
| Third country | `bg-gray-100 text-gray-600` |
| MANDATORY | `bg-blue-900/10 text-blue-900` |
| Optional | `bg-gray-100 text-gray-500` |
| Per diem zone | `bg-primary/10 text-primary` |

## General Rules

- **No green, amber, or orange** in the UI. Everything in blue tones + gray.
- Exception: delete/danger uses red but only on hover or in confirmation modals.
- Sidebar nav active link: yellow bg `#e7eb00` + dark blue text `#1b1464` (brand identity).
- Toast notifications: OK = `#06003e`, Error = `#ba1a1a`.
- All animations: subtle, `0.2s-0.3s ease`.
- Scrollbar: thin (6px), thumb `#c8c5d2`.
