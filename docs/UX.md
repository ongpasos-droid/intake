# UX.md — Experiencia de usuario del ecosistema E+ Tools

> Fuente de verdad del comportamiento de la interfaz.
> Define cómo funciona la app, no cómo se ve (eso lo cubre DESIGN.md).
> Cuando hay contradicción entre este archivo y cualquier módulo, este archivo tiene razón.
> Última actualización: 3 de abril de 2026

---

## Principios UX

1. **El usuario nunca se pierde.** Siempre sabe dónde está, de dónde viene y qué puede hacer a continuación.
2. **Cero fricción en el flujo principal.** El camino del usuario hacia su objetivo no tiene pasos innecesarios.
3. **Autosave siempre.** El usuario nunca pierde trabajo. Los datos se guardan automáticamente.
4. **Errores claros y accionables.** Cuando algo falla, el mensaje dice qué pasó y qué hacer.
5. **Progresión visible.** En flujos largos (wizards), el usuario ve cuánto lleva y cuánto falta.

---

## Navegación: SPA con paneles por módulo

E+ Tools es una **Single Page Application (SPA)**. Todos los módulos viven en la misma página. La navegación entre módulos se hace cambiando el panel visible (JavaScript), sin recarga de página ni cambio de subdominio.

### Navegación global (sidebar)

El sidebar es la navegación principal entre módulos. Está siempre visible en pantalla (ver DESIGN.md para specs visuales).

```
Sidebar (240px fijo)
├── Logo + subtítulo
├── ─── Módulos ───
│   ├── Intake (M0)              → panel: intake
│   ├── Calculator (M1)          → panel: calculator
│   ├── Planner (M2)             → panel: planner
│   ├── Redactor (M3)            → panel: developer
│   ├── Evaluador (M4)           → panel: evaluator
│   └── Entidades (M5)           → panel: partners
├── ─── Separador ───
│   ├── Profile                  → panel: profile
│   └── Settings                 → panel: settings
└── Subscription                 → panel: subscription
```

**Reglas de navegación:**

- Al hacer click en un módulo del sidebar, se **oculta el panel actual y se muestra el nuevo**. No hay cambio de URL ni recarga.
- La URL puede actualizarse con `hash` o `pushState` para permitir deep linking (ej: `#intake`, `#calculator/projects/uuid`), pero la navegación es 100% JS.
- El módulo activo se resalta en el sidebar (fondo amarillo, ver DESIGN.md).
- Los módulos que el usuario no tiene contratados aparecen pero están deshabilitados (opacidad reducida, sin click, tooltip: "Disponible en Premium").
- El JWT se mantiene en memoria durante toda la sesión — no hay re-auth al cambiar de módulo.
- Dentro de un módulo, la navegación interna va en el **top bar** (Dashboard, Projects, Analytics...), nunca en el sidebar.

### Navegación interna (top bar)

Cada módulo tiene su propia navegación interna en el top bar. Los items cambian según el módulo, pero la estructura es siempre la misma:

- **Item activo:** texto Primary, bold, con borde inferior amarillo.
- **Items inactivos:** texto On Surface Variant, sin borde.
- Máximo 5 items en el top bar. Si un módulo necesita más, usar submenú dropdown.

### Links cruzados entre módulos

Dentro del contenido puede haber links que lleven a otro módulo cuando tiene sentido contextual. Por ejemplo, desde el Calculator puede haber un link "Ver este proyecto en Planner". Estos links:

- Cambian el panel activo al módulo destino (sin recargar).
- Llevan directamente al contexto relevante (no a la home del otro módulo).
- Se muestran como texto con icono `arrow_forward`, nunca como botón primario.

---

## Patrón: Wizard (formularios paso a paso)

Todos los formularios largos del ecosistema usan el patrón wizard. Un wizard divide un proceso complejo en pasos manejables.

### Estructura visual

```
┌──────────────────────────────────────────────────────┐
│  Top bar del módulo                                  │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Barra de progreso                                   │
│  ● Paso 1  ─── ○ Paso 2  ─── ○ Paso 3  ─── ○ Paso 4│
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │                                                │  │
│  │  Título del paso                               │  │
│  │  Descripción breve de qué se pide aquí         │  │
│  │                                                │  │
│  │  [ Campos del formulario ]                     │  │
│  │                                                │  │
│  │                                                │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  [← Anterior]                    [Siguiente paso →]  │
│                                                      │
│  Indicador de autosave: "Guardado ✓" / "Guardando…" │
└──────────────────────────────────────────────────────┘
```

### Reglas del wizard

- **Barra de progreso** siempre visible en la parte superior del contenido. Muestra todos los pasos con nombre. El paso actual está resaltado (Primary), los completados tienen check, los pendientes están en gris.
- **Navegación libre entre pasos completados.** El usuario puede hacer click en cualquier paso ya visitado para volver. No puede saltar a un paso futuro no visitado.
- **Botones de navegación** en la parte inferior: "Anterior" (izquierda, estilo secundario) y "Siguiente" (derecha, estilo primario/CTA).
- **Validación al avanzar.** Antes de pasar al siguiente paso, se validan los campos requeridos del paso actual. Si hay errores, se muestran inline (ver sección Errores).
- **Autosave por campo.** Cada campo se guarda automáticamente al perder el foco (blur) o tras 2 segundos de inactividad. No hay botón "Guardar".
- **Indicador de guardado** discreto en la esquina inferior: "Guardado ✓" (texto verde sutil) o "Guardando..." (texto gris con spinner mínimo).
- **El último paso del wizard es siempre un resumen** donde el usuario revisa todo antes de confirmar. Desde ahí puede editar cualquier sección.

### Wizards por módulo

**Intake (M0) — Crear proyecto nuevo:**

| Paso | Contenido | Datos (→ SCHEMA) |
|---|---|---|
| 1. Programa | Seleccionar convocatoria Erasmus+ | → `intake_programs` (lectura) |
| 2. Proyecto | Nombre, tipo, fechas, grant, cofinanciación | → `projects` |
| 3. Consorcio | Añadir socios con país, ciudad, rol | → `partners` |
| 4. Contexto | Problema, grupos destinatarios, enfoque | → `intake_contexts` |
| 5. Resumen | Vista general + botón "Crear proyecto" | — |

**Calculator (M1) — Configurar presupuesto:**

| Paso | Contenido | Datos (→ SCHEMA) |
|---|---|---|
| 1. Tarifas | Tarifas per diem y de personal por socio | → `partner_rates`, `worker_rates` |
| 2. Rutas | Distancias entre socios, eco-travel | → `routes`, `extra_destinations` |
| 3. Work Packages | Crear WPs, asignar líderes | → `work_packages` |
| 4. Actividades | Crear actividades dentro de cada WP | → `activities` + tablas de detalle |
| 5. Resumen | Presupuesto total desglosado | — (cálculo) |

**Planner (M2) — Planificación temporal:**

| Paso | Contenido | Datos (→ SCHEMA) |
|---|---|---|
| 1. Timeline | Definir fases del proyecto en meses | → (tabla futura: `timeline_phases`) |
| 2. Asignación | Asociar actividades a fases | → (tabla futura) |
| 3. Gantt | Vista Gantt interactiva | — (visualización) |
| 4. Resumen | Cronograma final exportable | — |

**Partners (M5) — PIF Wizard (Partner Information Form):**

| Paso | Contenido | Datos |
|---|---|---|
| 1. Inicio | ID interno, estado del registro | Generado automáticamente |
| 2. Identidad | País, nombre, acrónimo, PIC/OID, tipo org, dirección, contacto | → datos del partner |
| 3. Legal | Public body, non-profit, acreditaciones | → datos del partner |
| 4. Contactos | Lista dinámica de contactos (nombre, email, rol, legal rep, main contact) | → relación 1:N |
| 5. Capacidad | Presentación, experiencia, staff size, expertise areas | → datos del partner |
| 6. Staff | Lista dinámica de personal clave (nombre, rol, skills) | → relación 1:N |
| 7. Proyectos UE | Lista dinámica de proyectos previos (programa, año, código, rol) | → relación 1:N |
| 8. Revisión | Associated partners + JSON preview exportable | — |

---

## Patrón: Autosave

### Comportamiento

- Cada campo de formulario se guarda al servidor **automáticamente** cuando:
  - El campo pierde el foco (evento `blur`).
  - Han pasado **2 segundos** desde la última pulsación de tecla (debounce).
- No existe botón "Guardar" en ningún formulario del ecosistema.

### Indicador visual

- **Estado guardado:** texto "Guardado ✓" en verde sutil (`#2E7D32` o similar), posición fija en la esquina inferior del contenido.
- **Estado guardando:** texto "Guardando..." en gris con un spinner mínimo (circle animado de 12px).
- **Estado error:** texto "Error al guardar — Reintentar" en rojo (`Error` #BA1A1A), con link para reintentar.
- El indicador desaparece 3 segundos después de mostrar "Guardado ✓".

### Implementación técnica

```
Usuario escribe → debounce 2s → PATCH /v1/{modulo}/{recurso}/{id}
                                   ├── 200 OK → "Guardado ✓"
                                   ├── 4xx → mostrar error de validación inline
                                   └── 5xx → "Error al guardar — Reintentar"
```

- Cada campo se envía individualmente (PATCH parcial), no el formulario entero.
- Si el usuario cambia de paso del wizard, se fuerza el guardado de todos los campos pendientes antes de navegar.

---

## Patrón: Listas dinámicas (dentro de wizards)

Muchos pasos del wizard contienen listas de items que el usuario puede añadir y eliminar libremente (contactos, staff, proyectos previos, socios asociados).

### Estructura visual

```
┌────────────────────────────────────────────────┐
│  TÍTULO DE SECCIÓN                             │
├────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────┐  │
│  │  Contacto 1                   [Eliminar] │  │
│  │  [Name]  [Title]  [Email]  [Phone]       │  │
│  │  ☑ Legal representative  ☑ Main contact  │  │
│  └──────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────┐  │
│  │  Contacto 2                   [Eliminar] │  │
│  │  [Name]  [Title]  [Email]  [Phone]       │  │
│  └──────────────────────────────────────────┘  │
│                                                │
│  [+ Añadir contacto]                           │
└────────────────────────────────────────────────┘
```

### Reglas

- Cada item es una **item-card** con borde sutil, dentro de la card de sección.
- **Cabecera del item:** título numerado ("Contacto 1") a la izquierda + botón "Eliminar" a la derecha (rojo, pequeño).
- **Campos del item:** grid de 2 columnas (g2) para campos cortos, 1 columna para textareas.
- **Checkboxes** cuando aplican: en una fila horizontal debajo de los campos.
- **Botón "+ Añadir":** debajo de todos los items, estilo dashed (borde discontinuo), color accent suave. Texto: "+ Añadir contacto", "+ Añadir persona", etc.
- **Eliminar:** si solo queda 1 item, el botón eliminar no se muestra (siempre debe haber al menos 1).
- **No hay límite superior** de items. Si la lista crece, la card de sección crece con ella (scroll natural de la página).
- Cada item nuevo se genera con un **ID interno único** (generado en el cliente, formato: `{prefix}_{timestamp}_{random}`).
- **Autosave por campo** dentro de cada item: al perder foco se envía el campo al servidor.

---

## Patrón: Listas y tablas de datos

Muchas vistas muestran listas de elementos (proyectos, socios, actividades). Todas siguen el mismo patrón.

### Lista de proyectos (Dashboard)

```
┌──────────────────────────────────────────────────────┐
│  Mis proyectos                    [+ Nuevo proyecto] │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │  FOCUS — KA3-Youth              Draft     ···  │  │
│  │  5 socios · 24 meses · 500.000 €               │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │  BRIDGE — KA220-VET             Submitted ···  │  │
│  │  3 socios · 36 meses · 400.000 €               │  │
│  └────────────────────────────────────────────────┘  │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Reglas:**

- Cada proyecto es una card clickable que lleva al detalle.
- El menú `···` (tres puntos) abre opciones contextuales: Editar, Duplicar, Eliminar.
- El badge de estado (Draft, Submitted, Approved, Rejected) usa colores semánticos:
  - Draft: gris (Outline)
  - Submitted: azul (Surface Tint `#5855A3`)
  - Approved: verde
  - Rejected: rojo (Error)

### Tablas editables (dentro de wizards)

Para datos tabulares como socios, tarifas o actividades, se usa una tabla inline editable:

- Las celdas son editables directamente (click para editar).
- Autosave por celda al perder foco.
- Fila nueva: botón "+ Añadir" debajo de la tabla.
- Eliminar fila: icono `delete` al final de cada fila, con confirmación.
- Reordenar: drag & drop por el icono `drag_indicator` a la izquierda.

---

## Patrón: Empty states

Cuando una sección no tiene datos (primer uso, lista vacía), se muestra un empty state con:

1. **Icono grande** centrado (Material Symbols, 48-64px, color Primary Container al 50%).
2. **Título descriptivo** en H2 ("Aún no tienes proyectos").
3. **Descripción breve** que explica qué puede hacer aquí.
4. **CTA principal** (botón amarillo) que inicia la acción ("Crear tu primer proyecto").

**Regla:** nunca mostrar una página en blanco sin contexto. Siempre hay un empty state que guía al usuario.

---

## Patrón: Confirmaciones y acciones destructivas

### Acciones que NO requieren confirmación

- Guardar datos (es automático).
- Navegar entre pasos del wizard.
- Cambiar de módulo (cambiar panel).
- Abrir/cerrar paneles o secciones.

### Acciones que SÍ requieren confirmación

Antes de ejecutarse, muestran un diálogo modal centrado:

- **Eliminar** cualquier registro (proyecto, socio, actividad, WP).
- **Salir del wizard** con cambios no guardados (en caso de error de autosave).
- **Acciones irreversibles** como "Marcar como enviado" (submitted).

### Diálogo de confirmación

```
┌─────────────────────────────────────┐
│                                     │
│  ¿Eliminar el socio "PERMA"?       │
│                                     │
│  Se eliminarán también sus tarifas  │
│  y participaciones en actividades.  │
│                                     │
│  [Cancelar]      [Eliminar]         │
│                                     │
└─────────────────────────────────────┘
```

- Fondo oscurecido (overlay `rgba(0,0,0,0.3)`).
- Modal centrado, fondo blanco, max-width 400px.
- El botón destructivo está en rojo (Error), a la derecha.
- El botón cancelar está en gris, a la izquierda.
- El texto explica las consecuencias (qué se eliminará en cascada, según las FK del SCHEMA).

---

## Patrón: Errores y validación

### Validación inline (en formularios)

- Se valida al perder foco (blur) o al intentar avanzar de paso en el wizard.
- El campo con error muestra un borde rojo (Error `#BA1A1A`) y un mensaje debajo en rojo, texto pequeño.
- El mensaje describe qué está mal: "Este campo es obligatorio", "El grant máximo para esta convocatoria es 500.000 €", "Necesitas al menos 2 socios".
- Los campos válidos NO muestran indicador verde. Solo los errores son visibles.

### Errores del servidor (toast notifications)

Cuando una operación del servidor falla (error de red, timeout, 500):

- Se muestra un **toast** en la esquina inferior derecha.
- Fondo: `Error Container` (#FFDAD6), texto: `On Error Container` (#93000A).
- Duración: 6 segundos, con botón "✕" para cerrar antes.
- El toast incluye: qué falló + acción sugerida ("Error al guardar las tarifas. Comprueba tu conexión e inténtalo de nuevo.").

### Errores de permisos

Si el usuario intenta acceder a un módulo no contratado o a un proyecto ajeno:

- Se muestra una página de error con empty state.
- Título: "No tienes acceso a este módulo".
- CTA: "Ver planes disponibles" → lleva al panel de Subscription.

---

## Patrón: Notificaciones

### Tipos de notificación

| Tipo | Icono | Cuándo |
|---|---|---|
| Info | `info` | Acciones completadas, novedades del sistema |
| Warning | `warning` | Deadline cercano, datos incompletos |
| Error | `error` | Fallos de guardado, errores del servidor |
| Success | `check_circle` | Proyecto enviado, export completado |

### Dónde aparecen

- **Toast** (efímero): esquina inferior derecha, para feedback inmediato de acciones.
- **Badge en campana** (persistente): el icono de notificaciones del top bar muestra un contador rojo cuando hay notificaciones no leídas.
- **Panel de notificaciones**: al hacer click en la campana, se abre un panel lateral con la lista de notificaciones recientes.

---

## Flujos principales

### Flujo 1: Usuario nuevo (onboarding)

```
1. Registro
   └── Email + contraseña + nombre
2. Verificación de email
   └── Link en el correo → email_verified = 1
3. Primera visita al Dashboard
   └── Empty state: "Crea tu primer proyecto"
4. Click en CTA
   └── Wizard de Intake (M0) — crear proyecto
5. Al completar el wizard
   └── Proyecto creado (status: draft)
   └── Muestra el Dashboard con el proyecto visible
6. Desde el proyecto, puede ir a Calculator, Planner, etc.
   └── Click → cambia de panel (no recarga)
```

### Flujo 2: Crear proyecto completo (Intake → Calculator)

```
1. Dashboard → "+ Nuevo proyecto"
2. Wizard Intake paso 1: seleccionar programa
   └── Autocompleta campos del proyecto según intake_programs
3. Wizard Intake paso 2: datos del proyecto
4. Wizard Intake paso 3: añadir socios (mínimo según programa)
5. Wizard Intake paso 4: contexto (problema, target groups, approach)
6. Wizard Intake paso 5: resumen → "Crear proyecto"
7. Proyecto creado → Dashboard
8. Click en el proyecto → Panel del proyecto
9. Desde el panel → "Ir a Calculator" (cambia panel, no recarga)
10. Wizard Calculator paso 1: tarifas
11. Wizard Calculator paso 2: rutas entre socios
12. Wizard Calculator paso 3: work packages
13. Wizard Calculator paso 4: actividades
14. Wizard Calculator paso 5: resumen presupuestario
```

### Flujo 3: Editar proyecto existente

```
1. Dashboard → Click en card del proyecto
2. Panel del proyecto (vista general con resumen)
3. Tabs de sección: Datos, Consorcio, Contexto, Presupuesto, Planificación
4. Click en cualquier tab → Vista editable (mismos campos del wizard)
5. Autosave en cada campo
```

---

## Responsive y mobile

### Breakpoints

| Nombre | Ancho | Comportamiento |
|---|---|---|
| Desktop | ≥ 1024px | Layout completo: sidebar + topbar + contenido |
| Tablet | 768–1023px | Sidebar colapsado (solo iconos, 64px). Click para expandir. |
| Mobile | < 768px | Sidebar oculto. Hamburger menu en top bar para abrir. |

### Reglas responsive

- **El sidebar se colapsa** en tablet (solo iconos) y se oculta en mobile (hamburger).
- **Las tablas editables** pasan a formato card en mobile (una card por fila).
- **Los wizards** mantienen su estructura en todos los tamaños. Los botones Anterior/Siguiente se hacen full-width en mobile.
- **La barra de progreso** del wizard pasa a formato compacto en mobile: solo muestra "Paso 2 de 5" en texto, sin la línea completa.
- **El grid de cards** (2 columnas en desktop) pasa a 1 columna en mobile.

---

## Accesibilidad

### Requisitos mínimos

- **Contraste:** todos los textos cumplen WCAG AA (ratio mínimo 4.5:1). Los colores del DESIGN.md ya cumplen esto.
- **Navegación por teclado:** todos los elementos interactivos son accesibles con Tab. El foco visible usa un ring amarillo (Secondary Fixed) de 2px.
- **Labels en formularios:** todos los inputs tienen label asociado. Nunca usar solo placeholder como label.
- **Aria labels:** los iconos sin texto llevan `aria-label` descriptivo.
- **Mensajes de error:** asociados al campo con `aria-describedby` para lectores de pantalla.
- **Idioma del HTML:** `lang="es"` en la UI española, `lang="en"` en la UI inglesa (si aplica).

---

## Idioma de la interfaz

- **UI inicial:** español. Los labels de formulario, botones, mensajes y navegación están en español.
- **Código y datos:** siempre en inglés (nombres de campo, valores de BD, clases CSS).
- **Internacionalización (futuro):** los textos de la UI se externalizan en archivos de traducción. No hardcodear strings en el HTML.

---

*Actualiza este documento cada vez que se defina un nuevo patrón, flujo o comportamiento de la interfaz.*
