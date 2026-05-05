# Directory Refactor — Plan de ejecución

**Fecha:** 2026-04-29
**Status:** APROBADO el diseño · BLOQUEADO en pre-requisito (integración BBDD proyectos EU)
**Owner:** Oscar
**Doc canónico:** este. Cualquier cambio de alcance se registra aquí.

---

## 0 · Contexto y motivación

El directorio de entidades actual (`/v1/entities` + UI sidebar de filtros) tiene 4 problemas que justifican un refactor:

1. **Búsqueda no encuentra cosas obvias.** Usa `MATCH ... AGAINST` (FULLTEXT NATURAL MODE) sobre `extracted_name + description`. Como muchos `extracted_name` salieron del scraping con basura ("Cantabria" en lugar de "Permacultura Cantabria"), buscar "permacultura" no encuentra esa entidad. Tampoco busca en `legal_name`.
2. **Filtros poco útiles** (tier, idioma, CMS, contacto): Oscar no quiere que el usuario los vea. La calidad de tier es opaca. El idioma se deduce del país. El contacto entra en conflicto con RGPD.
3. **Datos personales visibles** (email, teléfono): viola RGPD si se muestran sin consentimiento explícito de la organización dueña.
4. **Scoring opaco e irrelevante**: las 3 barras (`score_professionalism`, `score_eu_readiness`, `score_vitality`) se calculan a partir de heurística scraping y no responden a la pregunta real del usuario: *"¿esta entidad tiene los datos que necesito para escribir un proyecto con ella?"*.

---

## 1 · Decisiones cerradas (Q&A 2026-04-29)

| # | Pregunta | Decisión |
|---|---|---|
| Q1 | Búsqueda: substring vs prefix | **Substring puro** (`%perma%`). Cubre el caso "alfa" → "Alphatest" y "test" → "Alpha test". |
| Q2 | Entidades no reclamadas en cards | Mostrar 3 barras igual, calculadas con **heurística "proyectos EU"**: ≥5 proyectos verificados → asume mín. 1-2 personal y 12 stakeholders. **Badge visible:** "No es miembro de la plataforma" en cards no-reclamadas. |
| Q2b | Diferenciación funcional reclamada vs no | **Calculator (presupuestar): permite ambas.** **Writer (escribir): solo entidades reclamadas con datos completos + acuerdo del consorcio.** |
| Q3 | Estructura "Personal" | Aprovecha tablas existentes: `org_key_staff` (representantes/personal). Definición de "completo" + fórmula en §4. |
| Q4 | Fuente de "Experiencia" | **Dos fuentes:** (a) BBDD externa proyectos EU verificados (pre-requisito Oscar) + (b) `org_eu_projects` rellena por usuario. Suman. |
| Q5 | Stakeholders | Ya existe `org_stakeholders`. Modelo: entidades locales/nacionales con las que la org colabora (colegios, ayuntamientos, cámaras de comercio, AMPAs, medios, etc.). |
| Q6 | RGPD email/phone | **OCULTOS por defecto en TODOS los sitios.** Visibilidad solo si: (i) la org está reclamada, Y (ii) el responsable hace click en toggle "hacer datos visibles". Aplica en cards, ficha, Atlas popup, smart shortlist. |
| Q7 | Scores viejos | **Eliminar** (UI primero, columnas DB en una limpieza posterior). No aportan UX. |

---

## 2 · Pre-requisito (Oscar trabaja en esto antes que nosotros)

**Integración BBDD externa de proyectos EU verificados.**

Origen: portal europeo (EU Funding & Tenders / Cordis / equivalente).
Esquema esperado (Oscar afina, esto es propuesta):

```sql
CREATE TABLE eu_projects (
  project_id        VARCHAR(50) PRIMARY KEY,        -- ID oficial UE
  programme         VARCHAR(50),                    -- 'Erasmus+', 'Horizon Europe', etc.
  call_year         INT,                            -- 2014..2027
  title             VARCHAR(500),
  topic             VARCHAR(50),                    -- topic id si aplica
  total_budget_eur  DECIMAL(12,2),
  start_date        DATE,
  end_date          DATE,
  source            VARCHAR(50),                    -- 'cordis' | 'funding-tenders' | ...
  imported_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_year (call_year),
  INDEX idx_programme (programme)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE eu_project_partners (
  project_id        VARCHAR(50) NOT NULL,
  oid               VARCHAR(15) NOT NULL,           -- FK a entities.oid
  pic               VARCHAR(15) NULL,
  role              VARCHAR(20),                    -- 'coordinator' | 'partner' | 'associated'
  contribution_eur  DECIMAL(12,2),
  PRIMARY KEY (project_id, oid),
  INDEX idx_oid (oid),
  CONSTRAINT fk_eup_proj FOREIGN KEY (project_id) REFERENCES eu_projects(project_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Por qué así:**
- `oid` es el conector con `entities` (el que devuelve ORS).
- `pic` se guarda redundante para casos donde `entities.oid` está vacío pero conoces el PIC.
- N:M para que un proyecto liste sus partners y una entidad liste sus proyectos.

**Cuándo arrancamos el refactor:** cuando Oscar diga *"BBDD EU integrada"* y exista la tabla con datos.

---

## 3 · Nuevo modelo de datos

### 3.1 — Tablas existentes que aprovechamos

| Tabla | Uso en refactor |
|---|---|
| `organizations` | Datos generales (`name, vat, country, address`, …) y campos de contacto (`email`, `phone`) |
| `org_key_staff` | Score Personal: `name + skills_summary` |
| `org_eu_projects` | Score Experiencia (rama manual): proyectos pasados que el usuario carga |
| `org_stakeholders` | Score Stakeholders: red local/nacional |
| `org_accreditations` | Acreditaciones (mostrar en ficha, no entra en score por ahora) |
| `entities` + `entity_enrichment` | Datos básicos del crawl ORS para entidades NO reclamadas |
| **`eu_projects` + `eu_project_partners`** *(nuevo)* | Score Experiencia (rama verificada): proyectos UE crawleados |

### 3.2 — Tablas/columnas nuevas

**Migración nueva — `095_org_contacts_visibility.sql`:**
```sql
-- Toggle RGPD: por defecto OFF, el responsable lo activa para hacer públicos email/phone
ALTER TABLE organizations
  ADD COLUMN contacts_public TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN contacts_public_at DATETIME NULL;
```

**Sin nuevas tablas más allá de las EU del pre-requisito.** Todo lo demás se reutiliza.

---

## 4 · Fórmulas de las 3 barras nuevas

Las barras devuelven valor 0..100. Se calculan en backend, en una función `computeOrgPower(orgId)` (orgs reclamadas) o `inferEntityPower(oid)` (entidades no reclamadas, heurística vía proyectos EU).

### 4.1 — Personal (orgs reclamadas)

| Componente | Peso |
|---|---|
| Contacto principal: `name` no vacío | 30% |
| Contacto principal: `email` no vacío | 30% |
| Contacto principal: `role` (cargo) no vacío | 30% |
| Por cada `org_key_staff` adicional con `name` no vacío | +10% |
| Cap máximo | 100% |

> *Pendiente confirmar con Oscar: ¿el contacto principal está en `organizations` (campos `contact_name`, `contact_email`, `contact_role`) o se infiere del primer `org_key_staff`? Por defecto asumo lo segundo. Si no existen esas columnas, las añadimos en la mig 095.*

### 4.2 — Experiencia (orgs reclamadas)

```
n_projects = COUNT(org_eu_projects WHERE organization_id = X)
           + COUNT(eu_project_partners WHERE oid = X)  -- evitar duplicados por project_id
score = MIN(100, n_projects * 10)
```

### 4.3 — Stakeholders (orgs reclamadas)

```
n_stakeholders = COUNT(org_stakeholders WHERE organization_id = X)
score = MIN(100, n_stakeholders * 10)
```

### 4.4 — Heurística para entidades NO reclamadas

Con la BBDD EU integrada (pre-requisito):

```
n_eu_projects = COUNT(eu_project_partners WHERE oid = X)

-- Personal inferido
if n_eu_projects >= 5:    personal = 60   (asume contacto + 1-2 trabajadores)
if n_eu_projects >= 10:   personal = 80
if n_eu_projects >= 20:   personal = 100
else:                     personal = MIN(50, n_eu_projects * 10)

-- Experiencia (real, verificada)
experiencia = MIN(100, n_eu_projects * 10)

-- Stakeholders inferidos por co-participación
n_co_partners = COUNT(DISTINCT eu_project_partners.oid
                      FROM eu_project_partners epA
                      JOIN eu_project_partners epB ON epA.project_id = epB.project_id
                      WHERE epA.oid = X AND epB.oid <> X)
stakeholders = MIN(100, n_co_partners * 10)
```

> *Cap a 50% para Personal cuando no está reclamada* — para que reclamar siempre suba el score, no baje. Ajustable.

### 4.5 — Resumen visual (cards)

```
[ logo ] Permacultura Cantabria (ES · Penagos)
         Asociación cultural y medioambiental
         Personal     ████████░░  80%
         Experiencia  ██████░░░░  60%
         Stakeholders ████░░░░░░  40%
         [⚠ No es miembro de la plataforma]    ← solo si !claimed
```

---

## 5 · Búsqueda — implementación

### 5.1 — Backend (`node/src/modules/entities/model.js · listEntities`)

**Cambio:**
```js
// ANTES: MATCH AGAINST (extracted_name, description)
// DESPUÉS:
if (q && q.trim().length >= 2) {
  const like = `%${q.trim()}%`;
  where.push(`(
    e.legal_name LIKE ?
    OR ee.extracted_name LIKE ?
    OR ee.description LIKE ?
  )`);
  params.push(like, like, like);
}
```

### 5.2 — Índices

Para los 288k entities, `LIKE %x%` sin índice tira en ~150ms con cobertura de columna. Si crece a 1M+ valoramos `MATCH AGAINST` con `WITH PARSER ngram` (n-grams chinos/japoneses, pero MySQL soporta n=2 que cubre nuestro caso).

**Por ahora:** sin índices nuevos. Medimos en local con dataset real.

### 5.3 — Filtros que se conservan

- `country` (dropdown ISO list)
- `category` (dropdown — usar `entity_classification.category`)

### 5.4 — Filtros que se eliminan

`tier`, `language`, `cms`, `has_email`, `has_phone` → ignorados en backend (no rompen si llegan, pero quitamos del UI).

### 5.5 — Display name — fix Permacultura Cantabria

Cambio en la vista `v_entities_public`:

```sql
-- ANTES
COALESCE(NULLIF(ee.extracted_name, ''), e.legal_name) AS display_name

-- DESPUÉS — preferir legal_name si extracted_name es 1 sola palabra "sospechosa"
-- (caso típico: WordPress title "Cantabria" cuando legal_name es muy distinto)
CASE
  WHEN ee.extracted_name IS NULL OR ee.extracted_name = '' THEN e.legal_name
  WHEN CHAR_LENGTH(ee.extracted_name) < CHAR_LENGTH(e.legal_name) / 3
       AND e.legal_name LIKE CONCAT('%', ee.extracted_name, '%')
       THEN e.legal_name
  ELSE ee.extracted_name
END AS display_name
```

> Esto arregla "Cantabria" → "ASOCIACION CULTURAL Y MEDIOAMBIENTAL PERMACULTURA CANTABRIA" automáticamente, y muchos casos similares, sin tener que re-scrapear.

---

## 6 · UI — rediseño del directorio

### 6.1 — Layout

```
┌─────────────────────────────────────────────────────────┐
│ 🔍 [ buscar...                ]  [País ▾]  [Tipo ▾] [⌕] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌───────┐  ┌───────┐  ┌───────┐  ┌───────┐            │
│  │ card  │  │ card  │  │ card  │  │ card  │            │
│  └───────┘  └───────┘  └───────┘  └───────┘            │
│                                                         │
│  (paginación)                                           │
└─────────────────────────────────────────────────────────┘
```

Eliminado: sidebar izquierda completa.

### 6.2 — Card

```
┌─────────────────────────────────────┐
│ [logo]  ASOCIACION CULTURAL Y...    │
│         ES · Penagos · ONG          │
│                                     │
│         Personal      ███████░ 70%  │
│         Experiencia   ████░░░░ 40%  │
│         Stakeholders  ███████░ 70%  │
│                                     │
│  ⚠ No es miembro                    │ ← solo si !claimed
└─────────────────────────────────────┘
```

**Sin email, sin teléfono.** Solo por debajo, si la org está reclamada Y `contacts_public=1`, podríamos añadir un mini icono que enlaza a la ficha — pero en cards mantenemos limpio.

### 6.3 — Ficha de detalle

- Header: logo + display_name + país + ciudad + tipo + status (reclamada/no)
- 3 barras grandes
- Pestañas: Datos generales · Personal · Experiencia · Stakeholders · Acreditaciones
- Email / phone:
  - Si **!claimed** → no se muestran. Mensaje: *"Esta organización aún no es miembro de la plataforma. Reclámala si te pertenece."*
  - Si **claimed** AND `contacts_public=1` → visibles
  - Si **claimed** AND `contacts_public=0` → ocultos con mensaje *"El responsable ha optado por mantener los datos de contacto privados."*

### 6.4 — Toggle de visibilidad RGPD

En **Mi Organización · Datos generales** (solo el dueño/admin de la org):

```
Visibilidad de datos de contacto
○ Privados (solo yo)               [predeterminado]
○ Públicos (visibles en directorio, ficha, atlas, shortlist)
```

Aplica a `email` + `phone` en simultáneo. Granularidad fina (mostrar email pero no phone) la dejamos para v2 si alguien lo pide.

---

## 7 · Fases de ejecución

| Fase | Descripción | Bloqueado por | Estimación | Archivos clave |
|---|---|---|---|---|
| **PRE** | Oscar integra BBDD proyectos EU verificados (`eu_projects` + `eu_project_partners`) | — | Oscar | nuevas migrations + script ETL |
| **F1** | Refactor búsqueda + UI (top bar + cards limpias + fix display_name) + eliminar filtros viejos en UI | PRE *(opcional para F1: las cards mostrarán scores nuevos a 0 hasta que entren los datos EU. Si Oscar prefiere, F1 sigue mostrando scores viejos hasta F2)* | 3-4h | `model.js`, `controller.js`, `public/js/<directorio>.js`, view migration |
| **F2** | Cálculo de scores nuevos + endpoint power + integración en cards/ficha | PRE + F1 | 1 día | model.js, nuevo `power.js`, frontend cards |
| **F3** | RGPD: migration `contacts_public`, toggle UI en Mi Org, gating en cards/ficha/atlas/shortlist | — (paralelo a F2) | 3-4h | mig 095, organizations.js, todas las pantallas que mostraban contactos |
| **F4** | Limpieza scores viejos: quitar columnas tras 30d sin reclamaciones | F2 estable | 30min cuando toque | mig nueva |

---

## 8 · Funciones del refactor que NO se incluyen (out of scope)

- Re-enrichment masivo del scraper (nombres de website mejor extraídos). Lo hacemos solo si tras F1 + display_name fix sigue siendo problema visible.
- Granularidad fina de visibilidad RGPD (email sí, phone no).
- Filtros avanzados (idioma, CMS, etc.) — explícitamente quitados.
- Mensajería interna entre orgs (Oscar dice: "no hemos pensado cómo contactar"). Tema futuro.
- Filtro "solo reclamadas" en directorio — para más adelante.

---

## 9 · Punto de retorno

Cuando Oscar diga *"BBDD EU lista"*, retomamos así:

1. Releer este doc.
2. Verificar tablas `eu_projects` + `eu_project_partners` existen en local con datos.
3. Confirmar que las decisiones del §1 siguen vigentes (preguntar a Oscar si cambió algo).
4. Arrancar F1.

Si pasan >2 semanas sin tocar el plan, revalidar todo antes de empezar — el contexto cambia rápido.
