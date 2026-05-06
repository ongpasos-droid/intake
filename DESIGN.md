# E+ Tools — Design Rules

> Alineado con `designer-projects/Presentation Templates/DESIGN_GUIDELINES.md` (visión de Ana — responsable de imagen y formato de EU Funding School). Single source of truth de tokens: `web/brand/tokens.css`.

## Color Palette

| Token | Hex | Usage |
|---|---|---|
| Primary (brand blue) | `#1b1464` | Títulos, texto principal, botones primarios, sidebar, nav activo, iconografía |
| Accent (lime yellow) | `#fbff12` | Texto de botones primarios, highlights, subrayados, flechas, devices de marca |
| Accent warm (lavender) | `#c7afdf` | Cards secundarias, acentos suaves, empty states |
| Surface | `#f8f8f8` | Fondo app (gris casi blanco) |
| Surface container | `#eeeeee` | Cards neutras, separadores suaves |
| Line / outline | `#cccccc` | Bordes, pills inactivas, separadores |
| Body text | `#191c1e` | Cuerpo |
| Muted text | `#474551` | Texto secundario, placeholders |
| Error | `#ba1a1a` | Danger / delete |

## Typography

**Familia única: Poppins** (cargada desde Google Fonts). Toda la jerarquía con distintos pesos:

- H1 (portada / hero): Poppins Black (900) o ExtraBold (800), MAYÚSCULAS si es portada
- H2 (sección): Poppins Bold (700), title case
- H3 y subtítulos decorativos: Poppins Bold (700) — en lavanda `#c7afdf` si es decorativo
- Cuerpo: Poppins Medium (500) por defecto, Regular (400) para texto denso
- Micro-texto (nav, pills, URL): Poppins Medium (500), tamaño pequeño

No mezclar con otras familias.

## Button Styles

### Primary action buttons (Save, Add, Configure, Create)
- Background: `#1b1464`
- Text: `#fbff12`
- Hover: `#1b1464/80` (opacity)
- Radius: `rounded-xl` para principales, `rounded-lg` para inline

> **Excepción deliberada a Ana:** sus guidelines prohíben amarillo como color de texto en presentaciones (baja legibilidad en párrafos). En botones interactivos del tool la legibilidad está garantizada por el contraste y el contexto de interacción — mantenemos "amarillo sobre azul" como firma del tool.

### Secondary / Cancel buttons
- Background: transparent
- Border: `border-outline-variant/30`
- Text: `text-on-surface-variant`
- Hover: `hover:bg-[#f8f8f8]`

### Danger / Delete buttons
- Default state: `text-red-400 border border-red-200`
- Hover: `hover:bg-red-50 hover:text-red-600`
- Delete confirmation modal: red header, requires typing "DELETE"

## Badge / Chip Styles

| Badge | Style |
|---|---|
| Active | `bg-[#1b1464]/10 text-[#1b1464]` |
| Inactive | `bg-[#cccccc]/40 text-[#474551]` |
| EU Member | `bg-[#1b1464]/10 text-[#1b1464]` |
| Associated country | `bg-[#c7afdf]/30 text-[#1b1464]` |
| Third country | `bg-[#cccccc]/40 text-[#474551]` |
| MANDATORY | `bg-[#1b1464]/15 text-[#1b1464]` |
| Optional | `bg-[#cccccc]/40 text-[#474551]` |

## General Rules

- **Sin verde, ámbar ni naranja** en la UI. Todo en azul `#1b1464` + amarillo `#fbff12` + lavanda `#c7afdf` + neutros.
- Excepción: delete/danger usa rojo solo en hover o modales de confirmación.
- Cards: border-radius generoso (`rounded-xl` o `rounded-2xl`). Nunca esquinas duras.
- Toast notifications: OK = `#1b1464` fondo con texto blanco; Error = `#ba1a1a`.
- Animaciones: sutiles, `0.2s–0.3s ease`.
- Scrollbar: thin (6px), thumb `#cccccc`.
- Un solo elemento protagonista por pantalla/card (el que lleva el amarillo).
- Amarillo como highlight/fondo/device, no como texto en párrafos largos.
