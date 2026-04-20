# E+ Tools — Arquitectura Writer Module + Admin Unificado

## Documento de diseño v1.0 — 9 abril 2026

---

## 1. VISIÓN GENERAL

### Flujo completo del producto

```
ADMIN (Data E+)                    USUARIO
═══════════════                    ═══════
                                   
Configura call:                    DESIGN (Intake)
├── Data                           ├── Elige call activa
├── Eligibility                    ├── Define proyecto
├── Form template                  ├── Partners, WPs, tareas
├── Criteria (cerebro humano)      └── Presupuesto
├── Docs (Programme Guide...)      
└── Activar                        WRITE (Writer) ← NUEVO
                                   ├── Fase 1: Contexto
                                   ├── Fase 2: Borrador IA
                                   ├── Fase 3: Pulido
                                   └── Fase 4: Revisión final
                                   
                                   EVALUATE (Evaluator)
                                   └── Scoring automático
                                       sobre lo que Writer generó
```

### De dónde sale cada cosa

```
Form Part B (formulario vacío)     → Estructura: secciones, preguntas, campos
Programme Guide (guía oficial)     → Reglas: pesos, scores, elegibilidad
Humano + Claude AI project         → Criterios: el cerebro evaluador (9 campos)
```

---

## 2. ADMIN UNIFICADO — "Convocatorias"

### 2.1 Cambio principal

Se eliminan los tabs separados "Evaluador" y "Calls". Se crea un único tab **"Convocatorias"**.

**Tabs del Admin tras el cambio:**

```
[Convocatorias] [Países] [Per Diem] [Personal] [Entidades] [Todos docs] [Docs oficiales] [Biblioteca]
```

### 2.2 Vista lista de convocatorias

```
┌──────────────────────────────────────────────────────────────────────┐
│  Convocatorias                                        [+ Nueva call] │
│  18 convocatorias activas                                            │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │ 📄 KA3 — Youth Together 2026                    €400,000  │     │
│  │    KA3-Youth · EACEA Form Part B                          │     │
│  │    ■ 5 secciones  ■ 22 criterios  ■ 3 docs               │     │
│  │                                     Deadline: 05/03/2026  │     │
│  │                                     [ACTIVA]  [Duplicar]  │     │
│  └─────────────────────────────────────────────────────────────┘     │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │ 📄 KA2 — Cooperation Partnerships ES (SEPIE) 2026         │     │
│  │    KA2 · NA KA2 Form                                      │     │
│  │    ■ 4 secciones  ■ 18 criterios  ■ 2 docs               │     │
│  │                                     Deadline: 12/03/2026  │     │
│  │                                     [ACTIVA]  [Duplicar]  │     │
│  └─────────────────────────────────────────────────────────────┘     │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐     │
│  │ 📄 KA3 — Youth Together 2025                    €400,000  │     │
│  │    KA3-Youth · EACEA Form Part B                          │     │
│  │    ■ 5 secciones  ■ 22 criterios  ■ 3 docs               │     │
│  │                                     Deadline: 05/03/2025  │     │
│  │                                     [INACTIVA]            │     │
│  └─────────────────────────────────────────────────────────────┘     │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Cada card muestra de un vistazo:**
- Nombre de la call
- Tipo de acción + form template vinculado
- Contadores: secciones de evaluación, criterios totales, documentos
- Deadline con color (rojo si urgente, gris si pasada)
- Estado: ACTIVA (verde) / INACTIVA (gris)
- Botón "Duplicar" (para crear la versión del año siguiente)

### 2.3 Editor de una call — 5 pestañas

Al hacer click en una call se abre el editor con sub-pestañas:

```
┌──────────────────────────────────────────────────────────────────────┐
│  ← Volver    KA3 — Youth Together 2026                    [ACTIVA]  │
├──────────┬──────────────┬──────────┬──────────────┬─────────────────┤
│   Data   │ Eligibility  │   Form   │  Criteria    │ Docs & Annexes  │
├──────────┴──────────────┴──────────┴──────────────┴─────────────────┤
│                                                                      │
│                    (contenido de la pestaña)                          │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

### 2.4 Pestaña DATA — Lo que ve el admin

```
┌──────────────────────────────────────────────────────────────────────┐
│  PROGRAMME / CALL                                                    │
│  ─────────────────────────────────────────────────────────────────── │
│                                                                      │
│  Programme name     [KA3 — Youth Together 2026_________________]     │
│  Action type        [KA3-Youth________]    Status  [● Activa ▼]     │
│                                                                      │
│  ─── Plazos y fechas ───────────────────────────────────────────     │
│  Deadline           [2026-03-05]                                     │
│  Start date from    [2026-09-01]      Start date to  [2027-03-01]   │
│  Duration min       [24] meses        Duration max   [36] meses     │
│                                                                      │
│  ─── Financiación ──────────────────────────────────────────────     │
│  EU Grant max       [400000] €                                       │
│  Co-financing       [20] %            Indirect costs [7] %           │
│  Min partners       [4]                                              │
│                                                                      │
│  ─── Reglas de escritura ───────────────────────────────────────     │
│  Writing style      [Formal, third person, evidence-based...___]     │
│  AI detection rules [Avoid repetitive structures, vary sentence_]    │
│                                                                      │
│                                              [💾 Guardar call data]  │
└──────────────────────────────────────────────────────────────────────┘
```

**Idéntico a lo que ahora es "Call Data" en el Evaluador.** No cambia nada, solo se mueve de sitio.

---

### 2.5 Pestaña ELIGIBILITY — Lo que ve el admin

```
┌──────────────────────────────────────────────────────────────────────┐
│  ELIGIBILITY RULES                                                   │
│  ─────────────────────────────────────────────────────────────────── │
│                                                                      │
│  ─── Países elegibles ──────────────────────────────────────────     │
│  Tipos de país      [☑ EU Member] [☑ Associated] [☐ Third country]  │
│                                                                      │
│  ─── Tipos de entidad ──────────────────────────────────────────     │
│  ┌──────────────────┬──────────────┐                                 │
│  │ Tipo             │ Puede coord. │                                 │
│  ├──────────────────┼──────────────┤                                 │
│  │ NGO              │ ✓ Sí         │                                 │
│  │ University       │ ✓ Sí         │                                 │
│  │ Public body      │ ✓ Sí         │                                 │
│  │ For-profit       │ ✗ No         │                                 │
│  └──────────────────┴──────────────┘                                 │
│                                                                      │
│  ─── Consorcio ─────────────────────────────────────────────────     │
│  Min partners       [4]              Min countries    [4]            │
│  Max coord. apps    [1]                                              │
│                                                                      │
│  ─── Ubicación actividades ─────────────────────────────────────     │
│  [☑ Programme countries] [☐ Partner countries] [☐ Third countries]   │
│                                                                      │
│  ─── Reglas adicionales ────────────────────────────────────────     │
│  [textarea con reglas en texto libre________________________________]│
│                                                                      │
│                                          [💾 Guardar eligibilidad]   │
└──────────────────────────────────────────────────────────────────────┘
```

**Idéntico a lo que ahora se gestiona en call_eligibility.** Se mueve de sitio.

---

### 2.6 Pestaña FORM — Lo que ve el admin

```
┌──────────────────────────────────────────────────────────────────────┐
│  FORM TEMPLATE                                                       │
│  ─────────────────────────────────────────────────────────────────── │
│                                                                      │
│  ─── Template vinculado ────────────────────────────────────────     │
│  Form template   [EACEA Form Part B ▼]     Version: 2.0 (2022)     │
│                                             [Cambiar template]       │
│                                                                      │
│  ─── Estructura del formulario (read-only) ─────────────────────     │
│                                                                      │
│  ┌─ Sidebar ──────────┐  ┌─ Contenido ──────────────────────────┐   │
│  │                     │  │                                      │   │
│  │  ▸ Cover Page       │  │  Section 1 — Relevance               │   │
│  │  ▸ Project Summary  │  │  ─────────────────────────────────── │   │
│  │  ▾ 1. Relevance     │  │                                      │   │
│  │    · 1.1 Background │  │  1.1 Background, context & rationale │   │
│  │    · 1.2 Needs      │  │                                      │   │
│  │    · 1.3 Innovation │  │  Type: textarea                      │   │
│  │  ▸ 2.1 Quality      │  │  Guidance: "Describe the background  │   │
│  │  ▸ 2.2 Partnership  │  │  and general context of your         │   │
│  │  ▸ 3. Impact        │  │  project..."                         │   │
│  │  ▸ 4. Work Plan     │  │                                      │   │
│  │  ▸ 5. Other         │  │  1.2 Needs analysis & objectives     │   │
│  │  ▸ 6. Declarations  │  │                                      │   │
│  │  ▸ Annexes          │  │  Type: textarea                      │   │
│  │                     │  │  Guidance: "Describe the specific     │   │
│  └─────────────────────┘  │  needs..."                            │   │
│                           │                                      │   │
│                           └──────────────────────────────────────┘   │
│                                                                      │
│  ℹ️ El template es compartido entre calls del mismo tipo.            │
│  Para editar la estructura, ve a la gestión de templates.            │
└──────────────────────────────────────────────────────────────────────┘
```

**Viene del actual tab "Calls" → "View Form".** Aquí es read-only porque el template es compartido. Si necesitas editarlo, vas a una sección separada de gestión de templates (para no romper otras calls que usan el mismo template).

---

### 2.7 Pestaña CRITERIA — Lo que ve el admin

Esta es la pestaña más importante. Es el actual editor del Evaluador, intacto.

```
┌──────────────────────────────────────────────────────────────────────┐
│  EVALUATION CRITERIA                                                 │
│  ─────────────────────────────────────────────────────────────────── │
│                                                                      │
│  ┌─ Sidebar ──────────┐  ┌─ Editor ─────────────────────────────┐   │
│  │                     │  │                                      │   │
│  │  1. Relevance       │  │  ███████████████████ 30 pts          │   │
│  │     max 30 pts      │  │  Score distribution:                 │   │
│  │  ─────────────────  │  │  [1.1: 10] [1.2: 10] [1.3: 10] ✓   │   │
│  │  · 1.1 Background   │  │                                      │   │
│  │  · 1.2 Needs        │  │  ─── Question 1.1 ──────────────    │   │
│  │  · 1.3 Innovation   │  │  Code  [1.1]                        │   │
│  │                     │  │  Title [Background & rationale___]   │   │
│  │  2.1 Quality design │  │  Description [________________]      │   │
│  │     max 30 pts      │  │  Word limit [2000]  Pages [3.0]     │   │
│  │  ─────────────────  │  │  Writing guidance [____________]     │   │
│  │  · 2.1.1 Method.    │  │  Scoring logic [Sum ▼]              │   │
│  │  · 2.1.2 Mgmt       │  │                                      │   │
│  │  · 2.1.3 Staff      │  │  ─── Criteria (5) ──────────────    │   │
│  │  · 2.1.4 Cost eff.  │  │                                      │   │
│  │  · 2.1.5 Risk       │  │  ┌─ Criterion 1 ─── max 2 pts ──┐  │   │
│  │                     │  │  │ Title    [Problem documented_] │  │   │
│  │  2.2 Partnership    │  │  │ Meaning  [__________________ ] │  │   │
│  │     max 20 pts      │  │  │ Structure[__________________ ] │  │   │
│  │  ─────────────────  │  │  │ Relations[__________________ ] │  │   │
│  │  · 2.2.1 Setup      │  │  │ Rules    [__________________ ] │  │   │
│  │  · 2.2.2 Decision   │  │  │ Red flags[__________________ ] │  │   │
│  │                     │  │  │ Rubric   [{"0":"No","2":"Yes"}]│  │   │
│  │  3. Impact          │  │  │ Max score[2]  Mandatory [Yes▼] │  │   │
│  │     max 20 pts      │  │  │                     [💾 Save]  │  │   │
│  │  ─────────────────  │  │  └────────────────────────────────┘  │   │
│  │  · 3.1 Impact       │  │                                      │   │
│  │  · 3.2 Communic.    │  │  ┌─ Criterion 2 ─── max 2 pts ──┐  │   │
│  │  · 3.3 Sustainab.   │  │  │ ...                           │  │   │
│  │                     │  │  └────────────────────────────────┘  │   │
│  │  4. Work Plan       │  │                                      │   │
│  │  5. Other           │  │  [+ Añadir criterio]                 │   │
│  │                     │  │                                      │   │
│  │  [+ Añadir sección] │  │                                      │   │
│  └─────────────────────┘  └──────────────────────────────────────┘   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Es exactamente el editor actual del Evaluador.** No cambia, solo se mueve a esta pestaña.

---

### 2.8 Pestaña DOCS & ANNEXES — Lo que ve el admin

```
┌──────────────────────────────────────────────────────────────────────┐
│  CALL DOCUMENTS & ANNEXES                                            │
│  ─────────────────────────────────────────────────────────────────── │
│                                                                      │
│  ─── Subir documento ───────────────────────────────────────────     │
│  Archivo  [Seleccionar archivo] (.pdf, .docx, .xlsx, .txt)          │
│  Título   [Programme Guide 2026_______________________________]     │
│  Tipo     [Programme Guide ▼]                                        │
│           (programme_guide | call_document | annex | template | faq) │
│  Tags     [ka3, youth, 2026____________________________________]    │
│                                                    [📤 Subir doc]   │
│                                                                      │
│  ─── Documentos de esta call (3) ───────────────────────────────     │
│                                                                      │
│  ┌────────┬─────────────────────────────┬──────────┬────────────┐   │
│  │ Tipo   │ Título                      │ Formato  │ Acciones   │   │
│  ├────────┼─────────────────────────────┼──────────┼────────────┤   │
│  │ 📕 PG  │ Programme Guide 2026        │ PDF      │ 👁 🗑     │   │
│  │ 📘 Call│ Call Document KA3 Youth     │ PDF      │ 👁 🗑     │   │
│  │ 📎 Ann.│ Budget Template Annex III   │ XLSX     │ 👁 🗑     │   │
│  └────────┴─────────────────────────────┴──────────┴────────────┘   │
│                                                                      │
│  ℹ️ Los documentos se vectorizan automáticamente y estarán           │
│  disponibles como contexto para el Writer (IA).                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Viene del actual "Call Documents" del tab Calls**, pero ahora vinculado a la call (tabla `call_documents`) en vez de al template.

---

## 3. WRITER MODULE — Lo que ve el usuario

### 3.1 Vista de entrada: selección de proyecto

```
┌──────────────────────────────────────────────────────────────────────┐
│  ✏️  Write your proposal                                             │
│  Transforma tu diseño en una propuesta ganadora                      │
│                                                                      │
│  ─── Mis proyectos ─────────────────────────────────────────────     │
│  Selecciona un proyecto diseñado para redactar la propuesta.         │
│                                                                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │ 📄               │  │ 📄               │  │ 📄               │   │
│  │                   │  │                   │  │                   │   │
│  │  ARISE            │  │  EMOCIONES 2.0   │  │  test             │   │
│  │  KA3-Youth        │  │  KA3-Youth       │  │  KA3-Youth        │   │
│  │                   │  │                   │  │                   │   │
│  │  04/04/2026       │  │  03/04/2026      │  │  02/04/2026       │   │
│  │  [Borrador]       │  │  [Borrador]      │  │  [Borrador]       │   │
│  │                   │  │                   │  │                   │   │
│  │     Escribir →    │  │     Escribir →   │  │     Escribir →    │   │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘   │
│                                                                      │
│  ─── Importar propuesta existente ──────────────────────────────     │
│  📤 Sube un .docx Form Part B y mejóralo con IA. [Subir DOCX →]    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.2 FASE 1: Contexto — Lo que ve el usuario

Al hacer click en un proyecto, entra en el Writer. Primera fase: revisar que todo el contexto está listo.

```
┌──────────────────────────────────────────────────────────────────────┐
│  ← Mis proyectos    ARISE — KA3 Youth Together 2026                 │
├──────────┬──────────────┬──────────┬────────────────────────────────┤
│ Contexto │  Borrador    │  Pulido  │  Revisión final                │
│  ● ━━━━  │  ○ ────      │  ○ ────  │  ○ ────                       │
├──────────┴──────────────┴──────────┴────────────────────────────────┤
│                                                                      │
│  Antes de generar el borrador, revisa que toda la información        │
│  está completa.                                                      │
│                                                                      │
│  ─── 1. Datos del proyecto (automático) ─────────────── ✅ Listo     │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  Proyecto: ARISE                                             │    │
│  │  Call: KA3 — Youth Together 2026                             │    │
│  │  Partners: 5 (3 países)                                      │    │
│  │  WPs: 4 work packages, 12 tareas                             │    │
│  │  Duración: 24 meses · Inicio: sept 2026                     │    │
│  │  Contexto: problema ✓  target groups ✓  approach ✓          │    │
│  │                                               [Ver detalle]  │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ─── 2. Presupuesto ────────────────────────────────── ✅ Listo     │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  EU Grant: €350,000 · Cofin: 20% · Indirect: 7%             │    │
│  │  Budget por WP: WP1 €80k · WP2 €120k · WP3 €95k · WP4 €55k│    │
│  │                                               [Ver detalle]  │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ─── 3. Documentos de la call (automático) ────────── ✅ 3 docs     │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  📕 Programme Guide 2026 (vectorizado)                       │    │
│  │  📘 Call Document KA3 Youth (vectorizado)                    │    │
│  │  📎 Budget Template Annex III                                │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ─── 4. Documentos adicionales (opcional) ─────────── ⚠️ 0 docs    │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  Sube documentos relevantes sobre la temática, el contexto   │    │
│  │  del proyecto o los países participantes.                    │    │
│  │                                                              │    │
│  │  [📤 Subir documentos]                                      │    │
│  │                                                              │    │
│  │  También puedes vincular papers de tu biblioteca Research:   │    │
│  │  [🔗 Vincular papers]                                       │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ─── 5. Criterios de evaluación ───────────────────── ✅ 22 crit.  │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  La IA usará estos criterios para escribir una propuesta     │    │
│  │  que maximice la puntuación:                                 │    │
│  │                                                              │    │
│  │  1. Relevance (30 pts) · 3 preguntas · 8 criterios          │    │
│  │  2.1 Quality design (30 pts) · 5 preguntas · 6 criterios    │    │
│  │  2.2 Partnership (20 pts) · 2 preguntas · 4 criterios       │    │
│  │  3. Impact (20 pts) · 3 preguntas · 4 criterios             │    │
│  │                                               [Ver criterios]│    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │         🚀 Generar borrador de propuesta                     │    │
│  │                                                              │    │
│  │  La IA generará las 15+ secciones del Form Part B usando    │    │
│  │  toda la información de arriba como contexto.                │    │
│  │  Tiempo estimado: 2-4 minutos.                               │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

### 3.3 FASE 2: Borrador — Lo que ve el usuario

```
┌──────────────────────────────────────────────────────────────────────┐
│  ← Mis proyectos    ARISE — KA3 Youth Together 2026                 │
├──────────┬──────────────┬──────────┬────────────────────────────────┤
│ Contexto │  Borrador    │  Pulido  │  Revisión final                │
│  ✅ ━━━━ │  ● ━━━━      │  ○ ────  │  ○ ────                       │
├──────────┴──────────────┴──────────┴────────────────────────────────┤
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │                                                              │    │
│  │  Generando tu propuesta...                                   │    │
│  │                                                              │    │
│  │  ████████████████████░░░░░░░░░░  12/15 secciones             │    │
│  │                                                              │    │
│  │  ✅ Cover Page                                               │    │
│  │  ✅ Project Summary                                          │    │
│  │  ✅ 1.1 Background, context and rationale                    │    │
│  │  ✅ 1.2 Needs analysis and specific objectives               │    │
│  │  ✅ 1.3 Complementarity, innovation, EU added value          │    │
│  │  ✅ 2.1.1 Concept and methodology                            │    │
│  │  ✅ 2.1.2 Project management and quality assurance           │    │
│  │  ✅ 2.1.3 Project teams, staff and experts                   │    │
│  │  ✅ 2.1.4 Cost effectiveness and financial management        │    │
│  │  ✅ 2.1.5 Risk management                                    │    │
│  │  ✅ 2.2.1 Consortium set-up                                  │    │
│  │  ✅ 2.2.2 Consortium management and decision-making          │    │
│  │  ⏳ 3.1 Impact and ambition...                               │    │
│  │  ○  3.2 Communication, dissemination and visibility          │    │
│  │  ○  3.3 Sustainability and continuation                      │    │
│  │                                                              │    │
│  │  💡 Mientras generas: ¿Sabías que los evaluadores dedican    │    │
│  │     una media de 4 horas por propuesta?                      │    │
│  │                                                              │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Al terminar, avanzarás automáticamente a la fase de Pulido.         │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Cada sección se genera como una llamada independiente a Claude:**
- Claude recibe: datos proyecto + presupuesto + contexto call + criterios de ESA sección + docs relevantes
- Guarda resultado en `form_field_values` (misma tabla que usa el Evaluator)
- Si una sección falla, se puede reintentar sin perder las demás

---

### 3.4 FASE 3: Pulido — Lo que ve el usuario

Esta es la fase donde el usuario trabaja sección por sección con el asistente.

```
┌──────────────────────────────────────────────────────────────────────┐
│  ← Mis proyectos    ARISE — KA3 Youth Together 2026                 │
├──────────┬──────────────┬──────────┬────────────────────────────────┤
│ Contexto │  Borrador    │  Pulido  │  Revisión final                │
│  ✅ ━━━━ │  ✅ ━━━━     │  ● ━━━━  │  ○ ────                       │
├──────────┴──────────────┴──────────┴────────────────────────────────┤
│                                                                      │
│ ┌─ Secciones ──────────┐  ┌─ Editor ────────────────────────────┐   │
│ │                       │  │                                     │   │
│ │  ✅ Cover Page        │  │  1.1 — Background, context          │   │
│ │  ✅ Project Summary   │  │        and rationale                │   │
│ │                       │  │  ────────────────────────────────── │   │
│ │  1. RELEVANCE 30pts  │  │                                     │   │
│ │  🟡 1.1 Background   │  │  ┌─ Texto generado (editable) ───┐ │   │
│ │  🟡 1.2 Needs        │  │  │                                │ │   │
│ │  🟡 1.3 Innovation   │  │  │ The ARISE project addresses    │ │   │
│ │                       │  │  │ the growing challenge of youth │ │   │
│ │  2.1 QUALITY 30pts   │  │  │ disengagement in democratic    │ │   │
│ │  🟡 2.1.1 Method.    │  │  │ processes across Europe...     │ │   │
│ │  🟡 2.1.2 Mgmt       │  │  │                                │ │   │
│ │  🟡 2.1.3 Staff      │  │  │ [1,847 / 2,000 palabras]      │ │   │
│ │  🟡 2.1.4 Cost eff.  │  │  └────────────────────────────────┘ │   │
│ │  🟡 2.1.5 Risk       │  │                                     │   │
│ │                       │  │  ─── Criterios de esta sección ─── │   │
│ │  2.2 PARTNERSHIP 20  │  │                                     │   │
│ │  🟡 2.2.1 Setup      │  │  ┌─ Criterio 1: Problema docum. ─┐ │   │
│ │  🟡 2.2.2 Decision   │  │  │ ✅ Cumple — datos y fuentes    │ │   │
│ │                       │  │  │ citados en párrafo 2           │ │   │
│ │  3. IMPACT 20pts     │  │  └─────────────────────────────────┘ │   │
│ │  🟡 3.1 Impact       │  │  ┌─ Criterio 2: Alineamiento EU ─┐ │   │
│ │  🟡 3.2 Communic.    │  │  │ ⚠️ Mejorable — no menciona     │ │   │
│ │  🟡 3.3 Sustainab.   │  │  │ la EU Youth Strategy 2027      │ │   │
│ │                       │  │  └─────────────────────────────────┘ │   │
│ │  4. WORK PLAN        │  │  ┌─ Criterio 3: Innovación ──────┐ │   │
│ │  🟡 4.1 Overview     │  │  │ ❌ Débil — el enfoque no se    │ │   │
│ │  🟡 WPs              │  │  │ diferencia de proyectos previos │ │   │
│ │                       │  │  └─────────────────────────────────┘ │   │
│ │                       │  │                                     │   │
│ │  ──────────────────  │  │  ─── Preguntas para mejorar ─────── │   │
│ │  Progreso: 0/15      │  │                                     │   │
│ │  🔴 0 revisadas      │  │  💬 "¿Qué metodologías específicas │   │
│ │  🟡 15 generadas     │  │  de participación juvenil vais a    │   │
│ │  🟢 0 completas      │  │  usar? (ej: World Café, Design     │   │
│ │                       │  │  Thinking, Theatre of the           │   │
│ │                       │  │  Oppressed...)"                     │   │
│ │                       │  │                                     │   │
│ │                       │  │  Tu respuesta:                      │   │
│ │                       │  │  [________________________________] │   │
│ │                       │  │  [Aplicar mejora con IA]            │   │
│ │                       │  │                                     │   │
│ │                       │  │  💬 "Los datos de contexto son de  │   │
│ │                       │  │  2019. ¿Tienes datos más            │   │
│ │                       │  │  recientes post-COVID?"             │   │
│ │                       │  │                                     │   │
│ │                       │  │  Tu respuesta:                      │   │
│ │                       │  │  [________________________________] │   │
│ │                       │  │  [Aplicar mejora con IA]            │   │
│ │                       │  │                                     │   │
│ │                       │  │  ──────────────────────────────     │   │
│ │                       │  │  [✅ Marcar como revisada]          │   │
│ │                       │  │  [→ Siguiente sección]              │   │
│ │                       │  │                                     │   │
│ └───────────────────────┘  └─────────────────────────────────────┘   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**El flujo por sección:**
1. Usuario ve el texto generado (editable directamente)
2. Debajo, la IA ha evaluado el texto contra cada criterio de esa sección
3. Criterios con semáforo: ✅ cumple, ⚠️ mejorable, ❌ débil
4. Preguntas específicas generadas por la IA para mejorar los puntos débiles
5. El usuario responde → click "Aplicar mejora" → la IA reescribe integrando la respuesta
6. Cuando está satisfecho → "Marcar como revisada" → pasa a 🟢
7. Siguiente sección

---

### 3.5 FASE 4: Revisión final — Lo que ve el usuario

```
┌──────────────────────────────────────────────────────────────────────┐
│  ← Mis proyectos    ARISE — KA3 Youth Together 2026                 │
├──────────┬──────────────┬──────────┬────────────────────────────────┤
│ Contexto │  Borrador    │  Pulido  │  Revisión final                │
│  ✅ ━━━━ │  ✅ ━━━━     │  ✅ ━━━━ │  ● ━━━━                       │
├──────────┴──────────────┴──────────┴────────────────────────────────┤
│                                                                      │
│  ─── Resumen de la propuesta ───────────────────────────────────     │
│                                                                      │
│  ┌──────────────────┬─────────┬──────────┬────────────────────┐     │
│  │ Sección          │ Score   │ Palabras │ Estado             │     │
│  ├──────────────────┼─────────┼──────────┼────────────────────┤     │
│  │ 1. Relevance     │ 27/30   │ 5,420    │ ✅ Revisada        │     │
│  │ 2.1 Quality      │ 26/30   │ 7,830    │ ✅ Revisada        │     │
│  │ 2.2 Partnership  │ 17/20   │ 3,210    │ ✅ Revisada        │     │
│  │ 3. Impact        │ 18/20   │ 4,560    │ ✅ Revisada        │     │
│  │ 4. Work Plan     │ —       │ 2,100    │ ✅ Revisada        │     │
│  │ 5. Other         │ —       │    680   │ ✅ Revisada        │     │
│  ├──────────────────┼─────────┼──────────┼────────────────────┤     │
│  │ TOTAL            │ 88/100  │ 23,800   │                    │     │
│  └──────────────────┴─────────┴──────────┴────────────────────┘     │
│                                                                      │
│  ─── Checks de consistencia ────────────────────────────────────     │
│                                                                      │
│  ✅ WPs mencionados en narrativa coinciden con Work Plan             │
│  ✅ Partners mencionados coinciden con consorcio                     │
│  ✅ Presupuesto por WP alineado con narrativa sección 2.1.4         │
│  ⚠️ Sección 3.2 menciona "website del proyecto" pero no hay         │
│     partida de budget para website en WP4                            │
│  ✅ Word limits respetados en todas las secciones                    │
│  ✅ No se detectan secciones vacías                                  │
│                                                                      │
│  ─── Acciones ──────────────────────────────────────────────────     │
│                                                                      │
│  ┌────────────────────┐  ┌────────────────────┐                     │
│  │ 📊 Enviar a        │  │ 📄 Exportar DOCX   │                     │
│  │    Evaluator       │  │    (próximamente)   │                     │
│  │                     │  │                     │                     │
│  │ Evalúa la propuesta │  │ Descarga el Form   │                     │
│  │ con los criterios   │  │ Part B completo    │                     │
│  │ oficiales           │  │ listo para enviar  │                     │
│  └────────────────────┘  └────────────────────┘                     │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 4. MODELO DE DATOS — Cambios necesarios

### 4.1 Nueva tabla: call_documents

```sql
CREATE TABLE IF NOT EXISTS call_documents (
  id          CHAR(36) PRIMARY KEY,
  program_id  CHAR(36) NOT NULL,
  document_id INT NOT NULL,
  doc_type    ENUM('programme_guide','call_document','annex','template','faq','other')
              DEFAULT 'other',
  label       VARCHAR(200),
  sort_order  INT DEFAULT 0,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (program_id) REFERENCES intake_programs(id) ON DELETE CASCADE,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);
```

### 4.2 Tablas existentes que NO cambian

- `intake_programs` — ya tiene todo lo necesario (form_template_id, active, etc.)
- `call_eligibility` — ya vinculada a program_id
- `eval_sections/questions/criteria` — ya vinculadas a program_id
- `form_templates` — reutilizables entre calls
- `form_instances` — ya tiene project_id + program_id + template_id
- `form_field_values` — el Writer escribe aquí, el Evaluator lee de aquí

### 4.3 Posible nueva tabla: writer_questions (fase pulido)

```sql
CREATE TABLE IF NOT EXISTS writer_questions (
  id            CHAR(36) PRIMARY KEY,
  instance_id   CHAR(36) NOT NULL,
  section_path  VARCHAR(200) NOT NULL,
  question_text TEXT NOT NULL,
  user_answer   TEXT,
  applied       TINYINT(1) DEFAULT 0,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (instance_id) REFERENCES form_instances(id) ON DELETE CASCADE
);
```

Para trackear las preguntas que la IA genera y las respuestas del usuario en la fase de pulido.

---

## 5. FLUJO DE DATOS COMPLETO

```
                    ADMIN configura call
                    ┌─────────────────┐
                    │ intake_programs  │
                    │ call_eligibility │
                    │ eval_*           │
                    │ call_documents   │
                    │ form_templates   │
                    └────────┬────────┘
                             │
           ┌─────────────────┼─────────────────┐
           │                 │                  │
           ▼                 ▼                  ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │    DESIGN    │  │    WRITER    │  │  EVALUATOR   │
    │   (Intake)   │  │              │  │              │
    ├──────────────┤  ├──────────────┤  ├──────────────┤
    │              │  │              │  │              │
    │ Lee:         │  │ Lee:         │  │ Lee:         │
    │ • programs   │  │ • projects   │  │ • form_field │
    │ • eligibility│  │ • budget     │  │   _values    │
    │              │  │ • eval_*     │  │ • eval_*     │
    │ Escribe:     │  │ • call_docs  │  │              │
    │ • projects   │  │ • form_tpl   │  │ Escribe:     │
    │ • partners   │  │ • documents  │  │ • scores     │
    │ • tasks      │  │              │  │ • feedback   │
    │ • budget     │  │ Escribe:     │  │              │
    │              │  │ • form_field │  │              │
    │              │  │   _values    │  │              │
    │              │  │ • writer_    │  │              │
    │              │  │   questions  │  │              │
    └──────────────┘  └──────────────┘  └──────────────┘
           │                 │                  │
           │                 │                  │
           └────────►────────┘                  │
            project_id              form_instance_id
                                    (misma instancia)
```

---

## 6. ORDEN DE IMPLEMENTACIÓN

```
FASE 1 — Modelo de datos
  └── Migración: call_documents
  └── Migración: writer_questions

FASE 2 — Admin unificado "Convocatorias"
  ├── Fusionar tabs Evaluador + Calls
  ├── Vista lista con contadores
  ├── Editor con 5 sub-pestañas
  ├── Botón "Duplicar call"
  └── Backend: endpoint duplicar call

FASE 3 — Writer frontend
  ├── Vista selección de proyecto (cards)
  ├── Fase 1: Contexto (resumen read-only)
  ├── Fase 2: Borrador (llamadas a Claude por sección)
  ├── Fase 3: Pulido (editor + criterios + preguntas)
  └── Fase 4: Revisión final (tabla resumen + checks)

FASE 4 — Writer backend
  ├── Endpoints CRUD writer
  ├── Servicio de generación IA por sección
  ├── Servicio de evaluación IA por criterio
  ├── Servicio de preguntas de mejora
  └── Checks de consistencia

FASE 5 — Conexión Writer → Evaluator
  └── Botón "Enviar a Evaluator" (misma form_instance)
```
