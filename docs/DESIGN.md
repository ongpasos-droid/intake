# DESIGN.md — Sistema visual del ecosistema E+ Tools

> Alineado con `designer-projects/Presentation Templates/DESIGN_GUIDELINES.md` (visión de Ana — responsable de imagen y formato de EU Funding School).
> Fuente de verdad de tokens: `web/brand/tokens.css`. Consumido por WP theme y Tailwind config de la SPA.

## 1. Identidad

- **Marca:** EU Funding School
- **Web pública:** `eufundingschool.com`
- **Audiencia:** emprendedores, estudiantes de máster, jóvenes profesionales interesados en proyectos europeos.
- **Tono:** didáctico formal con guiños cercanos. No acartonado.

## 2. Paleta

**Principales (los 3 colores que construyen la identidad):**

| Rol | Hex | Uso |
|---|---|---|
| Azul de marca (único) | `#1b1464` | Títulos, cuerpo, nav activo, iconografía, botones primarios, sidebar |
| Amarillo lima | `#fbff12` | CTA, highlights, subrayados, flechas, comillas grandes, devices decorativos |
| Blanco | `#ffffff` | Fondo por defecto de contenido |

**De apoyo:**

| Rol | Hex | Uso |
|---|---|---|
| Lavanda | `#c7afdf` | Cards secundarias, acentos suaves, subtítulos decorativos, empty states |
| Gris medio | `#cccccc` | Separadores, pills inactivas, bordes suaves |
| Gris casi blanco | `#f8f8f8` | Fondo de app, cards suaves, zonas de módulo |

No hay verdes, ámbares ni naranjas. El rojo se usa únicamente para error/danger.

## 3. Tipografía

**Única familia: Poppins.** Pesos disponibles 300–900.

- Portadas/H1 hero: Black (900) o ExtraBold (800), MAYÚSCULAS
- H2: Bold (700), title case
- H3 / subtítulos decorativos: Bold (700) en lavanda `#c7afdf`
- Cuerpo: Medium (500) default, Regular (400) para denso
- Micro: Medium (500), pequeño

## 4. Elementos distintivos ("brand devices")

Usar con intención, no decorativamente:
- Subrayados amarillos dibujados a mano sobre una palabra clave
- Flechas amarillas dirigiendo la mirada
- Scribbles/círculos amarillos rodeando un texto
- Comillas grandes amarillas (quotes destacados)
- Cards con border-radius grande
- Pills redondeadas

## 5. Reglas de composición

- Un elemento protagonista por pantalla/slide (el que lleva el amarillo)
- Máximo 2 acentos por vista (amarillo + lavanda OK; más rompe el sistema)
- Títulos H1: máx 2 líneas
- Highlight amarillo: máx 2–3 palabras por pantalla
- Imágenes: reales, personas estudiando/trabajando. Evitar stock genérico.
- Aire generoso, no saturar cards

## 6. Qué evitar

- Amarillo como color de texto en párrafos (baja legibilidad). Excepción documentada: botones interactivos del tool — el contraste y tamaño compensan.
- Esquinas duras en cards
- MAYÚSCULAS fuera de portadas, nombres de sección o micro-tags
- Alterar el chrome de marca (logo top-left, nav top-center, URL top-right en presentaciones)

## 7. Aplicación por medio

| Medio | Aplicación |
|---|---|
| Presentaciones (Ana) | Estricto: paleta + Poppins + devices + no amarillo-como-texto |
| Blog WP (eufundingschool.com) | Estricto: mismos tokens, tipografía, acentos |
| Tool SaaS (`intake.eufundingschool.com`) | Alineado: misma paleta y fuente, **con una excepción documentada** — los botones primarios conservan "azul `#1b1464` + texto amarillo `#fbff12`" como firma interactiva del tool |

## 8. Tokens técnicos

Fuente de verdad: `web/brand/tokens.css`. Consumido por:

- Tema WP: `web/wordpress/astra-eufunding/style.css` (fallback :root duplicado, se mantiene en sync manual).
- Tool SPA: Tailwind config inline en `public/index.html` (`theme.extend.colors`). **Al cambiar tokens.css hay que reflejar el cambio también aquí** porque Tailwind CDN no lee tokens.css directamente.

## 9. Buttons (referencia rápida)

### Primary (Save, Add, Create)
- `bg-[#1b1464]` + `text-[#fbff12]`
- Hover: `bg-[#1b1464]/80`
- Radius: `rounded-xl` (principales), `rounded-lg` (inline)

### Secondary / Cancel
- `bg-transparent` + `border border-outline-variant/30` + `text-on-surface-variant`
- Hover: `hover:bg-[#f8f8f8]`

### Danger / Delete
- Default: `text-red-400 border border-red-200`
- Hover: `hover:bg-red-50 hover:text-red-600`
- Modal de confirmación requiere escribir "DELETE"
