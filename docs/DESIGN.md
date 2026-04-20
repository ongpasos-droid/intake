# DESIGN.md — Sistema visual del ecosistema E+ Tools

> Fuente de verdad del diseño.
> Cuando hay contradicción entre este archivo y cualquier módulo, este archivo tiene razón.
> Última actualización: 13 de abril de 2026

---

## Logotipo

**EU Funding School** — Dos versiones (fondo claro y fondo oscuro):

![Logo EU Funding School](/img/logo-eufundingschool.jpg)

- **Versión principal (fondo claro):** Texto Deep Navy + icono lápiz/EU + "u" en Neon Yellow
- **Versión invertida (fondo oscuro):** Texto blanco + icono blanco + "u" en Neon Yellow
- **Archivo:** `/public/img/logo-eufundingschool.jpg`
- **URL pública:** `https://intake.eufundingschool.com/img/logo-eufundingschool.jpg`

---

## Principios de diseño

1. **Coherencia total entre módulos.** Un usuario que pasa de Calculator a Planner no debe notar un cambio visual. Mismos colores, misma tipografía, mismos componentes.
2. **Mínimo ruido.** Fondos claros, texto oscuro, acentos de color solo donde hay acción.
3. **Jerarquía clara.** Los elementos importantes (botones primarios, títulos) destacan sin competir entre sí.
4. **Profesional pero accesible.** Estética institucional europea, no startup americana.

---

## Paleta de colores

### Colores principales

| Nombre | Hex | Uso |
|---|---|---|
| **Primary** | `#06003E` | Texto principal, títulos grandes, máxima jerarquía |
| **Primary Container** | `#1B1464` | Fondo del sidebar, avatares, iconos sobre fondo claro |
| **Secondary Fixed** | `#E7EB00` | Botones primarios (CTA), indicador de elemento activo en sidebar, acentos |
| **Surface** | `#F0F4FA` | Fondo general de la aplicación (Azul Hielo — identidad europea) |
| **Surface Container Low** | `#E8EEF6` | Fondo de inputs, iconos contenidos |
| **Surface Container Lowest** | `#FFFFFF` | Fondo de cards |
| **On Surface** | `#191C1E` | Texto general del cuerpo |
| **On Surface Variant** | `#474551` | Texto secundario, descripciones, placeholders |
| **Outline** | `#787682` | Bordes sutiles, separadores |
| **Outline Variant** | `#C8C5D2` | Bordes muy sutiles, decoración |
| **Error** | `#BA1A1A` | Estados de error, validaciones fallidas |

### Reglas de contraste

- Texto sobre `Surface` (#F0F4FA): usar `On Surface` (#191C1E) o `Primary` (#06003E).
- Texto sobre `Primary Container` (#1B1464): usar blanco (`#FFFFFF`) o `Secondary Fixed` (#E7EB00).
- Texto en botones `Secondary Fixed` (#E7EB00): usar `Primary Container` (#1B1464) — nunca blanco sobre amarillo.
- Links activos en sidebar: fondo `Secondary Fixed`, texto `Primary Container`.
- Links inactivos en sidebar: blanco al 70% (`rgba(255,255,255,0.7)`), hover blanco 100%.

### Identidad europea: Azul Hielo

El fondo general de la aplicación usa un azul muy sutil (#F0F4FA, "Azul Hielo") en lugar de un gris neutro. Este azul aporta identidad europea sin sobrecargar la interfaz. Las variantes de Surface siguen la misma base azulada:

| Token | Hex | Nota |
|---|---|---|
| Surface | `#F0F4FA` | Fondo general (Azul Hielo) |
| Surface Container Low | `#E8EEF6` | Inputs, iconos contenidos |
| Surface Container | `#E4EAF2` | Contenedores medianos |
| Surface Container High | `#DCE4EE` | Contenedores con más presencia |
| Surface Container Highest | `#D6DEE8` | Máximo contraste de contenedor |
| Surface Container Lowest | `#FFFFFF` | Cards (blanco puro sobre fondo azul) |

La combinación del fondo azul sutil con los acentos amarillos (#E7EB00) y el azul oscuro profundo (#06003E, #1B1464) crea la identidad visual: limpia, profesional, europea.

### Modo oscuro (futuro)

El sistema está preparado para dark mode (clase `dark` en `<html>`). Los colores oscuros equivalentes:

| Light | Dark |
|---|---|
| Surface `#F0F4FA` | `#06003E` o similar |
| Primary Container `#1B1464` | Se mantiene para sidebar |
| On Surface `#191C1E` | `#E0E3E5` |

> No implementar dark mode hasta que el light mode esté 100% estable en todos los módulos.

---

## Tipografía

### Familia tipográfica

**Manrope** — única familia para todo el ecosistema.

```html
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
```

### Escala tipográfica

| Elemento | Peso | Tamaño | Tracking | Ejemplo de uso |
|---|---|---|---|---|
| Hero / H1 | 800 (extrabold) | `text-5xl` (3rem) | `tracking-tighter` | Títulos de página vacía, landing |
| H2 | 700 (bold) | `text-xl` (1.25rem) | `tracking-tight` | Títulos de card, secciones |
| H3 | 700 (bold) | `text-lg` (1.125rem) | `tracking-tight` | Subtítulos |
| Body | 500 (medium) | `text-sm` (0.875rem) | `tracking-tight` | Texto general, navegación |
| Small / Label | 400 (regular) | `text-xs` (0.75rem) | normal | Descripciones, metadata |
| Micro | 400 (regular) | `text-[10px]` | `tracking-widest` | Footers, versiones, uppercase |

### Reglas tipográficas

- **Nunca mezclar familias.** Todo es Manrope.
- **Headlines siempre bold o extrabold** con tracking tight o tighter.
- **Body siempre medium** (500), nunca regular (400) para texto principal.
- **Uppercase solo en micro-labels** (versión, metadata, separadores de sección).
- **Antialiasing siempre activo:** `-webkit-font-smoothing: antialiased`.

---

## Bordes y radios

| Nombre | Valor | Uso |
|---|---|---|
| Default | `0.125rem` (2px) | Mínimo, apenas perceptible |
| lg | `0.25rem` (4px) | Botones, cards |
| xl | `0.5rem` (8px) | Contenedores medianos |
| full | `0.75rem` (12px) | Sidebar links, badges |
| Circular | `rounded-full` | Inputs de búsqueda, avatares |

**Regla:** las esquinas son casi rectas. El diseño es arquitectónico, no redondeado. `rounded-md` es el máximo habitual para botones y cards.

---

## Iconografía

**Material Symbols Outlined** — familia única de iconos.

```html
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
```

### Configuración base

```css
.material-symbols-outlined {
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}
```

- **FILL 0** — iconos outlined (no rellenos).
- **Tamaño por defecto:** 24px. Usar `text-sm` para reducir en contextos compactos.
- **Color:** hereda del padre. No asignar color directamente al icono.

### Iconos del ecosistema

| Módulo / Sección | Icono | Nombre Material |
|---|---|---|
| Redactor (Developer) | `edit_note` | edit_note |
| Evaluador | `fact_check` | fact_check |
| Entidades (Partners) | `groups` | groups |
| Escribas (Writers) | `history_edu` | history_edu |
| Perfil | `person` | person |
| Ajustes | `settings` | settings |
| Suscripción | `payments` | payments |
| Buscar | `search` | search |
| Notificaciones | `notifications` | notifications |
| Ayuda | `help_outline` | help_outline |
| Crear nuevo | `add_circle` | add_circle |
| Nuevo documento | `edit_document` | edit_document |
| Subir archivo | `upload_file` | upload_file |
| Siguiente | `arrow_forward` | arrow_forward |
| Arquitectura (branding) | `architecture` | architecture |

---

## Componentes compartidos

Estos componentes son idénticos en todos los módulos. Ningún módulo los modifica.

### Sidebar (navegación lateral)

- **Ancho:** 240px fijo.
- **Fondo:** `#1B1464` (Primary Container). En dark mode: `#06003E`.
- **Posición:** `fixed left-0 top-0 h-full`, z-index 50.
- **Logo:** texto "EU Funding SaaS" en blanco, `text-xl font-black tracking-tighter`. Subtítulo en blanco/50%, 10px, uppercase, tracking widest.
- **Links inactivos:** texto `white/70`, padding `px-4 py-3`, margin `mx-2`. Hover: `white/100` + fondo `white/10`.
- **Link activo:** fondo `#FBFF12` (Secondary Fixed), texto `#1B1464`, `rounded-md`, con sombra `0px 24px 48px rgba(27,20,100,0.06)`.
- **Separador de sección:** borde top `white/10`, con padding y opacidad 30%.
- **Icono + texto** en cada link, gap de 12px (gap-3).

### Top bar (navegación superior)

- **Altura:** 64px (h-16).
- **Posición:** `fixed top-0`, comienza en `left-[240px]`, z-index 40.
- **Fondo:** blanco al 80% con `backdrop-blur-md`. Borde inferior `#1B1464` al 10%.
- **Navegación interna:** links de texto. El activo lleva `border-b-2 border-[#FBFF12]` y `font-bold`. Los inactivos usan `On Surface Variant` (#474551).
- **Zona derecha:** input de búsqueda + iconos de notificación/ayuda + avatar.

### Input de búsqueda (top bar)

- **Fondo:** `Surface Container Low` (#F2F4F6).
- **Sin borde** visible. `rounded-full`.
- **Icono de búsqueda** a la izquierda, dentro del input.
- **Ancho:** `w-64` (16rem).
- **Focus:** ring amarillo `focus:ring-2 focus:ring-[#FBFF12]`.
- **Placeholder:** "Search projects..." en `text-xs`.

### Botón primario (CTA)

- **Fondo:** `Secondary Fixed` (#E7EB00).
- **Texto:** `Primary Container` (#1B1464), `font-bold`, `text-lg`.
- **Padding:** `px-10 py-5`.
- **Radio:** `rounded-md`.
- **Sombra:** `0px 24px 48px rgba(27,20,100,0.1)`.
- **Hover:** `scale-[1.02]` con transición.
- **Active (click):** `scale-95`.
- **Icono opcional** a la izquierda con gap-3.

### Cards (contenido)

- **Fondo:** `Surface Container Lowest` (#FFFFFF).
- **Padding:** `p-8`.
- **Sin borde visible** por defecto.
- **Borde inferior hover:** `border-b-2 border-[#FBFF12]` (Secondary Fixed), transición 300ms.
- **Contenido:** icono contenido (48x48, fondo `Surface Container Low`), título bold en `Primary`, descripción en `On Surface Variant`, link de acción con flecha.
- **Link de acción en card:** texto `Primary`, bold, `text-sm`, con icono `arrow_forward`. Hover: el gap entre texto y flecha crece (gap-2 → gap-4).

### Avatar

- **Tamaño:** 32x32px (h-8 w-8).
- **Forma:** `rounded-full`.
- **Fondo fallback:** `Primary Container`.
- **Imagen:** `object-cover`.

---

## Fondos y decoración

### Grid arquitectónico (fondo global)

Una rejilla sutil detrás de todo el contenido, visible al 3% de opacidad:

```css
background-image:
    linear-gradient(#1B1464 1px, transparent 1px),
    linear-gradient(90deg, #1B1464 1px, transparent 1px);
background-size: 60px 60px;
opacity: 0.03;
```

- **Posición:** `fixed inset-0`, z-index -1, `pointer-events-none`.

### Gradientes decorativos

Dos manchas de luz difusa en esquinas opuestas:

- **Superior derecha:** `from-secondary-fixed/5 to-transparent`, `blur-3xl`, 50vw x 512px.
- **Inferior izquierda:** `from-primary-container/5 to-transparent`, `blur-3xl`, 50vw x 512px.

---

## Sombras

| Nombre | Valor CSS | Uso |
|---|---|---|
| Suave | `0px 24px 48px rgba(27,20,100,0.06)` | Sidebar link activo |
| Media | `0px 24px 48px rgba(27,20,100,0.1)` | Botón CTA principal |

**Regla:** las sombras siempre usan el color primary como base (`rgba(27,20,100,...)`) con muy baja opacidad. Nunca negro puro.

---

## Animaciones y transiciones

| Efecto | Propiedades | Duración |
|---|---|---|
| Hover escala botón | `hover:scale-[1.02]` | `transition-transform` (150ms default) |
| Click escala | `active:scale-95` | `transition-transform` |
| Hover color links | `transition-colors` | `duration-200` |
| Hover borde card | `transition-all` | `duration-300` |
| Entrada de contenido | `animate-in fade-in slide-in-from-bottom-4` | `duration-1000` |

**Regla:** todas las transiciones son sutiles. Nunca usar bounces, rotaciones, ni animaciones que distraigan.

---

## Espaciado y layout

### Grid general

- **Sidebar:** 240px fijo a la izquierda.
- **Contenido principal:** `ml-[240px] pt-16` (respeta sidebar y topbar).
- **Ancho máximo del contenido:** `max-w-6xl` (72rem) centrado.
- **Padding del contenido:** `px-12 py-20`.

### Espaciado entre elementos

- Entre secciones principales: `space-y-12` (3rem).
- Entre elementos dentro de una card: `space-y-4` (1rem).
- Entre items de navegación sidebar: `space-y-1` (0.25rem).
- Gap en grid de cards: `gap-8` (2rem).

---

## Dependencias externas

```html
<!-- Tailwind CSS con plugins -->
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>

<!-- Tipografía -->
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">

<!-- Iconos -->
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">
```

> En producción, Tailwind se compilará localmente (no CDN). Los Google Fonts se pueden cachear o servir localmente si se requiere GDPR compliance.

---

## Configuración Tailwind

Esta es la configuración que extiende Tailwind para el ecosistema. Todos los módulos deben usar exactamente esta configuración:

```javascript
tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#06003e",
        "primary-container": "#1b1464",
        "secondary": "#606200",
        "secondary-fixed": "#e7eb00",
        "secondary-container": "#e4e800",
        "surface": "#f0f4fa",
        "surface-dim": "#d0d8e2",
        "surface-bright": "#f0f4fa",
        "surface-container": "#e4eaf2",
        "surface-container-low": "#e8eef6",
        "surface-container-high": "#dce4ee",
        "surface-container-highest": "#d6dee8",
        "surface-container-lowest": "#ffffff",
        "surface-variant": "#e0e3e5",
        "surface-tint": "#5855a3",
        "on-surface": "#191c1e",
        "on-surface-variant": "#474551",
        "on-primary": "#ffffff",
        "on-primary-container": "#8481d3",
        "on-secondary": "#ffffff",
        "on-secondary-container": "#656600",
        "on-tertiary": "#ffffff",
        "on-tertiary-container": "#8481d3",
        "on-error": "#ffffff",
        "on-error-container": "#93000a",
        "on-background": "#191c1e",
        "background": "#f0f4fa",
        "error": "#ba1a1a",
        "error-container": "#ffdad6",
        "tertiary": "#06003e",
        "tertiary-container": "#1b1464",
        "outline": "#787682",
        "outline-variant": "#c8c5d2",
        "inverse-surface": "#2d3133",
        "inverse-on-surface": "#eff1f3",
        "inverse-primary": "#c4c0ff",
        "primary-fixed": "#e3dfff",
        "primary-fixed-dim": "#c4c0ff",
        "on-primary-fixed": "#13095d",
        "on-primary-fixed-variant": "#403d8a",
        "secondary-fixed-dim": "#cbce00",
        "on-secondary-fixed": "#1c1d00",
        "on-secondary-fixed-variant": "#484a00",
        "tertiary-fixed": "#e3dfff",
        "tertiary-fixed-dim": "#c4c0ff",
        "on-tertiary-fixed": "#13095d",
        "on-tertiary-fixed-variant": "#403d8a"
      },
      fontFamily: {
        "headline": ["Manrope"],
        "body": ["Manrope"],
        "label": ["Manrope"]
      },
      borderRadius: {
        "DEFAULT": "0.125rem",
        "lg": "0.25rem",
        "xl": "0.5rem",
        "full": "0.75rem"
      }
    }
  }
}
```

---

*Actualiza este documento cada vez que se añada, modifique o elimine un elemento visual del sistema.*
