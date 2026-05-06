# Briefing para ChatGPT — Directorio Europeo de Entidades (E+ Tools)

> **Cómo usar este documento:** está pensado para pegarlo entero en una conversación nueva con ChatGPT y pedirle contraste sobre el plan. Es autocontenido — no necesita conocer nada más del proyecto.

---

## 0. Quién soy y qué quiero de ti (ChatGPT)

Soy Oscar, fundador de **EU Funding School** — una plataforma para profesionales que escriben propuestas Erasmus+ y proyectos europeos. Tengo un ecosistema de varias piezas:

- **WordPress** (`eufundingschool.com`): web pública, blog, captación.
- **E+ Tools** (`intake.eufundingschool.com`): SaaS Node.js + Vanilla JS donde están las herramientas reales (intake de proyectos, evaluador IA, writer de propuestas, módulo de organizaciones, etc.).
- **Designer projects** (Ana): repo aparte donde mi diseñadora produce la imagen visual de marca, presentaciones, etc.

Trabajo con dos instancias de Claude Code: una en mi PC (Claude Local) y otra en el VPS (Claude VPS). El que está construyendo este plan es Claude Local.

**Lo que necesito de ti:**
1. Que critiques el plan que viene a continuación: arquitectura, stack, fases, prioridades, riesgos.
2. Que me digas qué te parece sólido, qué te parece flojo, y qué cambiarías tú.
3. Que me ayudes a anticipar problemas (rendimiento, UX, monetización, mantenimiento) que mi equipo y yo no estemos viendo.

---

## 1. Qué tenemos hoy — el activo

Llevamos varias semanas crawlando la **API oficial Erasmus+ ORS** (Organisation Registration System). Resultado:

| Concepto | Filas |
|---|---|
| `entities` (universo total) | 288.294 |
| → con website (scrapeables) | 203.612 |
| → sin website | 84.682 |
| `entity_enrichment` (procesadas con scraper propio) | 203.506 |
| → archivadas (DNS fail + soft 404) | 37.900 |
| → **vivas y útiles** | **165.606** |
| `entity_classification` (categorizadas con heurística) | 147.550 |
| `entity_duplicates` detectados | 25.337 |

**Cobertura de campos sobre las 165.606 entidades vivas:**

| Campo | Cobertura | Calidad |
|---|---|---|
| `extracted_name` | 91,4% | alta |
| `score_professionalism` (0-100) | 91,4% | alta |
| `score_eu_readiness` (0-100) | 91,4% | alta |
| `score_vitality` (0-100) | 91,4% | alta |
| `website_languages` (JSON ISO) | 84,8% | alta |
| `cms_detected` (enum: WP, Drupal, Wix, etc.) | 68,8% | alta |
| `logo_url` | 68,2% | media |
| `social_links` (JSON multi-red) | 58,5% | alta |
| `description` | 57,7% | media |
| `phones` (JSON multi) | 53,8% | alta |
| `legal_form` (15 enums) | 48,3% | alta |
| `emails` (JSON multi) | 47,5% | alta |
| `eu_programs` (ya en Erasmus+) | 12,8% | alta |
| `students_count` | 12,5% | media (solo escuelas) |
| `year_founded` | 3,7% | OK |

**Distribución por país (top 15):**
- TR 24.686 · DE 14.786 · ES 13.470 · IT 11.723 · PL 11.062 · FR 9.402 · EL 5.740 · UK 5.397 · RO 4.778 · CZ 4.694 · BE 4.180 · AT 4.169 · PT 3.960 · HU 3.928 · NL 3.734.

**Categorías auto-detectadas (top):**
- school 35.485 · ngo 8.491 · university 7.777 · municipality 5.058 · foundation 3.201 · association 9.809 · company 9.244 · cultural 2.602.

**Calidad por entidad (sobre 9 campos clave):**
- 💎 Premium (7-9 campos): 15.364 entidades (9,3%)
- ⭐ Buena (5-6 campos): 68.619 (41,4%)
- 👌 Aceptable (3-4): 54.954 (33,2%)
- ❓ Mínima (0-2): 26.669 (16,1%)

**Estado:** la auditoría dice que la BD está "coherente, completa y limpia". El crawler está parado desde el 25-abr-2026 con rendimiento decreciente: lo recuperable está recuperado.

---

## 2. Qué queremos construir

Un **Directorio Europeo de Entidades** dentro del SaaS E+ Tools. La promesa al usuario:

> "En 30 segundos encuentras 5 partners reales, contactables y con info verificada para tu próxima propuesta Erasmus+."

No es un buscador frío. Lo concebimos como un **atlas vivo** del ecosistema Erasmus+: bonito, navegable, con gráficas, mapa de Europa, y una estética que remita a las presentaciones de mi diseñadora.

### Buyer personas

1. Profesional de oficina técnica que escribe propuestas Erasmus+
2. Coordinador internacional de centro educativo (escuela / FP / universidad)
3. Consultor freelance / ONG buscando socios europeos

Los tres comparten una necesidad: **encontrar partners europeos reales y contactables.**

### Funciones que tiene que dominar

1. **Explorar** — listado infinito con cards bonitas
2. **Buscar** — full-text + filtros combinables, URL state (compartible)
3. **Ver ficha** — detalle completo de cada entidad
4. **Visualizar** — mapa Europa interactivo + dashboard de stats
5. **Operar** — favoritos, listas, comparador 2-3 entidades, exportar CSV
6. **Conectar** — botón "contactar como partner" con plantilla pre-rellenada

### Pricing (decisión diferida)

Por ahora **abierto sin login** para validar tracción. Cuando esté validado lo gateamos:
- Free anónimo: 50 fichas/día, búsqueda básica
- Registrado gratis: 200/día, listas, comparador
- Pro de pago: ilimitado, export CSV, alertas, plantillas

Decisión actual: **NO gatear nada en MVP.** Construir abierto, validar, luego monetizar.

---

## 3. Identidad visual — la dirección estética

Mi diseñadora Ana ha creado un sistema de plantillas de presentación que define el lenguaje visual del proyecto. El directorio debe **sentirse como navegar dentro de una de sus slides**.

### Paleta (tokens compartidos en `web/brand/tokens.css`)

| Rol | Color | Hex | Uso |
|---|---|---|---|
| Primario | Azul profundo | `#1b1464` | Títulos, texto, nav activo, iconografía |
| Acento fuerte | Amarillo lima | `#fbff12` | Highlights, subrayados, donuts, barras |
| Secundario cálido | Lavanda | `#c7afdf` | Cards alternativas, scores, premium tier |
| Base | Blanco | `#ffffff` | Fondo |
| Surface | Gris casi blanco | `#f8f8f8` | Fondo app |
| Outline | Gris medio | `#cccccc` | Separadores, pills inactivas |

### Tipografía

Una sola: **Poppins** (Google Fonts). Toda la jerarquía con pesos: Black/ExtraBold para H1, Bold para H2/H3, Medium para body.

### Brand devices

- Subrayados amarillos dibujados a mano sobre UNA palabra clave por sección
- Flechas amarillas para guiar la mirada
- Cards con border-radius grande (nunca esquinas duras)
- Pills redondeadas para tags
- Splash/rayo amarillo decorativo en esquinas con aire
- Sombras tintadas con azul primario, nunca negras puras
- Donuts: anillo amarillo sobre track gris
- Barras de progreso amarillas

### Inspiración directa

Las plantillas de Ana que más nos sirven:
- **"Texto y varias gráficas"** → landing del directorio (KPI cards + donut + barra + número grande)
- **"Texto y gráfica 1"** → ficha individual (texto + donut grande de un score)
- **"Texto e imagen 1"** → bloques de la ficha (concepto + 2 sub-cards)
- **"Indice"** → tabla de stats por categoría/país

### Reglas de oro

- Un solo elemento protagonista por slide/pantalla (el que lleva el device amarillo)
- Generoso espacio en blanco
- Amarillo NUNCA como color de texto (solo highlight/fondo/device)
- Máx. 2 acentos por pantalla (amarillo + lavanda válido)

---

## 4. Stack técnico — el "donde"

E+ Tools NO es Next.js ni React. Es un SaaS construido con:

- **Backend:** Node.js + Express, MySQL (mysql2), JWT auth
- **Frontend:** Vanilla JS (SPA con módulos IIFE), Tailwind CDN, Material Symbols
- **Deploy:** Coolify desde rama `main` → contenedor en VPS Hetzner
- **BD producción:** `eplus_tools` en MySQL del contenedor `wordpress-eufunding-db-1`
- **BD local:** Laragon con MySQL 8.4, mismo schema

**Estructura del repo:**
```
server.js                     → Entry point Express
node/src/modules/             → Módulos backend (auth, intake, calculator,
                                admin, organizations, developer, evaluator)
node/src/middleware/           → Auth middleware (JWT)
node/src/utils/               → DB connection, UUID
public/                       → SPA frontend (HTML + JS por módulo)
public/js/                    → api.js, auth.js, app.js, intake.js,
                                organizations.js, admin.js, developer.js
public/css/main.css           → Estilos
migrations/                   → SQL idempotentes (auto-ejecutadas en deploy)
```

**Patrón de módulo existente** (ej: `organizations`):
- `node/src/modules/organizations/{controller,model,routes}.js`
- `public/js/organizations.js` (módulo IIFE con render + API calls)
- Endpoints REST `/api/organizations/*`

**Decisión clave:** el directorio sigue este mismo patrón. No se introduce Next.js, ni React, ni shadcn. Es una decisión consciente para mantener un solo stack y no fragmentar la app.

### Librerías nuevas que sí se introducen

- **ApexCharts** — donuts, áreas, barras (estética alineada con Ana, ~280kb)
- **D3 + topojson Europa** — mapa interactivo (más ligero que MapLibre y editable píxel a píxel con la paleta)

---

## 5. Plan en 6 sesiones

| # | Sesión | Entregable | Dependencias |
|---|---|---|---|
| **S1** | **Datos + módulo backend** | Vista SQL `v_entities_public` que joinea entities + enrichment + classification con `quality_tier` calculado. Módulo `node/src/modules/entities/` con endpoints: `GET /api/entities` (lista paginada con filtros), `GET /api/entities/:oid` (ficha), `GET /api/stats/global`, `/api/stats/by-country`, `/api/stats/by-category`. Migrations idempotentes. | Decisión BD local (ver §6) |
| **S2** | **Explore (lista + filtros)** | `public/entities.html` con grid de cards + filtros laterales + searchbar + scroll infinito + URL state. Sin mapa. | S1 |
| **S3** | **Ficha individual** | Página `/entities/:oid` con bloques (sobre, scores con donuts, contacto, programas EU, tech stack, similares, CTAs). | S1 |
| **S4** | **Discover (landing)** | Hero KPIs + spotlight de premium + intro al directorio. Mapa estático. | S1, look definido en S2/S3 |
| **S5** | **Mapa interactivo + Stats dashboard** | D3 mapa Europa (click país → filtra), página `/entities/stats` completa. | S4 |
| **S6** | **Pulido Ana** | Splash decorativos, animaciones on-scroll, hover states, transiciones, performance, accesibilidad. | Todo |

**Estimación total:** 6 sesiones de Claude Code (cada una ~3-5 horas reloj efectivas). MVP visible en S2-S3.

**Premium / login NO entra en el MVP** — se añade cuando esté validado, gateando endpoints sin tocar el corazón del producto.

---

## 6. Decisión pendiente que estamos cerrando ahora

**Datos en local para iterar.**

Las tablas viven en el VPS. En el Laragon local no las tenemos. Tres opciones que evaluamos:

- (a) Dump completo del VPS → Laragon. Riesgo: 165k filas + JSONs es pesado de mover.
- (b) Conexión local→MySQL VPS. Lento, riesgoso (tocar prod).
- (c) Datos fake. Pierde el "feel" real.

**Decisión cerrada hoy:** **híbrido**.

1. **1.000 entidades random consistentes** en las 3 tablas (mismo set de OIDs en `entities`, `entity_enrichment`, `entity_classification`) — para iterar fichas, lista, filtros.
2. **~100 entidades que ya tengo en local** se conservan.
3. **Tabla `stats_cache` precomputada en VPS sobre los 165k reales** — agregados (50 filas con JSONs) que alimentan mapa, donuts globales, top países, etc.

**Resultado:** dashboard se ve impactante desde día 1 con datos reales (165k), pero solo navegas 1.100 fichas. Cuando subamos a VPS, los stats ya estarán bien y la lista pasa de 1.100 a 165k sin tocar código.

**Workflow del dump:**
1. Claude Local escribe `scripts/dump-entities-sample.sh` (queries SQL + mysqldump + gzip).
2. Yo (Oscar) hago `git pull && bash scripts/dump-entities-sample.sh` en el VPS.
3. Yo bajo el `.sql.gz` (~3-5 MB) a mi portátil.
4. Importo en Laragon con `bash scripts/import-entities-sample.sh`.
5. Claude Local arranca S1.

---

## 7. Modelo de vista pública (propuesta SQL)

```sql
CREATE OR REPLACE VIEW v_entities_public AS
SELECT
  e.oid,
  COALESCE(NULLIF(ee.extracted_name,''), e.legal_name) AS display_name,
  e.legal_name,
  e.country_code,
  e.city,
  e.website,
  e.vat,
  e.validity_label,
  ec.category,
  ec.confidence AS category_confidence,
  ee.description,
  ee.legal_form,
  ee.year_founded,
  ee.emails,
  ee.phones,
  ee.social_links,
  ee.website_languages,
  ee.cms_detected,
  ee.logo_url,
  ee.eu_programs,
  ee.has_erasmus_accreditation,
  ee.students_count,
  ee.score_professionalism,
  ee.score_eu_readiness,
  ee.score_vitality,
  -- quality_score_raw: cuántos de 9 campos clave están presentes
  (
    (ee.extracted_name IS NOT NULL) +
    (ee.description IS NOT NULL AND CHAR_LENGTH(ee.description) > 50) +
    (COALESCE(JSON_LENGTH(ee.emails),0) > 0) +
    (COALESCE(JSON_LENGTH(ee.phones),0) > 0) +
    (COALESCE(JSON_LENGTH(ee.social_links),0) > 0) +
    (ee.logo_url IS NOT NULL) +
    (ee.year_founded IS NOT NULL) +
    (ee.legal_form IS NOT NULL) +
    (COALESCE(JSON_LENGTH(ee.website_languages),0) > 0)
  ) AS quality_score_raw,
  CASE
    WHEN <raw 7-9> THEN 'premium'
    WHEN <raw 5-6> THEN 'good'
    WHEN <raw 3-4> THEN 'acceptable'
    ELSE 'minimal'
  END AS quality_tier,
  ee.last_fetched_at
FROM entities e
JOIN entity_enrichment ee ON ee.oid = e.oid AND ee.archived = 0
LEFT JOIN entity_classification ec ON ec.oid = e.oid;
```

**Índices necesarios:**
```sql
ALTER TABLE entity_enrichment ADD FULLTEXT INDEX ft_name_desc (extracted_name, description);
-- entities ya tiene country_code indexado
-- entity_classification ya tiene oid + category indexados
```

**Cache de stats:**
```sql
CREATE TABLE stats_cache (
  metric_key VARCHAR(50) PRIMARY KEY,
  value JSON,
  computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
-- Recompute hourly por cron en VPS
```

Métricas a precomputar: `by_country`, `by_category`, `by_cms`, `by_language`, `global_kpis`.

---

## 8. API contract propuesta

```
GET  /api/entities                  ?country=ES&category=school&tier=premium&page=1&limit=24
GET  /api/entities/search?q=texto   full-text + filtros
GET  /api/entities/:oid             ficha completa
GET  /api/entities/:oid/similar     3 entidades similares (mismo país + categoría)
GET  /api/stats/global              KPIs cards
GET  /api/stats/by-country
GET  /api/stats/by-category
GET  /api/stats/by-cms
GET  /api/stats/by-language

# Fase 2 (cuando haya login):
POST /api/entities/export           CSV (auth required)
POST /api/lists                     crear lista
POST /api/lists/:id/items           añadir a lista
GET  /api/me/lists                  listas del usuario
```

**Caché Redis:**
- `/stats/*`: 1 hora
- `/entities/:oid`: 1 hora
- `/entities` (listado): 5 min, key = hash de query params
- Rate limit: 100 req/min IP no-auth, 1000 req/min auth

---

## 9. Las 4 pantallas (wireframes ASCII)

### 9.1 Discover — `/entities`

Inspirado en plantilla Ana "Texto y varias gráficas".

```
┌─────────────────────────────────────────────────────────────┐
│  EU FUNDING SCHOOL · Atlas              [splash amarillo →] │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│   [ Hero KPI ]                          [ Donut: tiers ]   │
│   165.606                                premium 9%        │
│   entidades europeas                     buena    41%      │
│   en el atlas Erasmus+                   aceptab. 33%      │
│                                                             │
│   [ KPI lavanda ]  [ KPI blanca ]  [ KPI con barra ]      │
│   33 países         147k             47% con email         │
│                     clasificadas     contactable           │
│                                                             │
│   ─────────── Mapa interactivo Europa ──────────────       │
│                  (heatmap por densidad)                    │
│                                                             │
│   ─── Spotlight: 6 entidades premium destacadas ────       │
└─────────────────────────────────────────────────────────────┘
```

### 9.2 Explore — `/entities/search`

```
┌──────────┬──────────────────────────────────────────┐
│ FILTROS  │  Searchbar full-width con yellow underline│
│          │  ─────────────────────────────────────── │
│ País     │  Resultados (8.749) · ordenar por ▾     │
│ □ ES 13k │                                          │
│ □ DE 14k │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │
│ □ IT 11k │  │[logo]│ │[logo]│ │[logo]│ │[logo]│  │
│          │  │ Name │ │ Name │ │ Name │ │ Name │  │
│ Tipo     │  │🇪🇸 ES │ │🇩🇪 DE │ │🇮🇹 IT │ │🇫🇷 FR │  │
│ □ School │  │●●●○○ │ │●●●●● │ │●●●●○ │ │●●○○○ │  │
│ □ NGO    │  │ pills│ │ pills│ │ pills│ │ pills│  │
│ □ Univ   │  └──────┘ └──────┘ └──────┘ └──────┘  │
│          │                                          │
│ Calidad  │  [scroll infinito]                       │
│ ◉ 💎 +   │                                          │
│ ○ ⭐ +    │                                          │
│          │                                          │
│ Idioma   │                                          │
│ ☑ EN     │                                          │
│ □ ES     │                                          │
└──────────┴──────────────────────────────────────────┘
```

Card: logo + nombre Bold + pill país + 3 mini-dots amarillos (los 3 scores) + tier badge. Hover = lift + shadow azul tintada. Click → ficha.

### 9.3 Ficha — `/entities/:oid`

```
┌─────────────────────────────────────────────────────────┐
│  [← back]                              eufundingschool  │
│                                                         │
│  [LOGO]   NOMBRE DE LA ENTIDAD                         │
│           🇪🇸 Madrid, ES · NGO · 💎 Premium             │
│           ━━━━━━━━━━━━━ ← yellow underline              │
│                                                         │
│  ┌── Sobre ──────────┐  ┌── Scores ─────────────┐     │
│  │ Descripción...    │  │ donut donut donut    │     │
│  │ Fundada 1998      │  │  82    91    74      │     │
│  │ Asociación        │  │ Prof. EU.Rdy Vital   │     │
│  │ ES · EN · FR      │  └──────────────────────┘     │
│  └───────────────────┘                                 │
│                                                         │
│  ┌── Contacto ──────────────────────┐                  │
│  │ ✉ info@org.es        ☎ +34 91…  │                  │
│  │ 🌐 website.es  🐦 @x  💼 in/y   │                  │
│  └──────────────────────────────────┘                  │
│                                                         │
│  ┌── Programas EU ──┐  ┌── Tech ──┐                   │
│  │ ✅ Erasmus+ KA1   │  │ WordPress│                   │
│  │ ✅ Acreditada    │  │ [shot]   │                   │
│  └──────────────────┘  └──────────┘                   │
│                                                         │
│  ─── 3 entidades similares ───                          │
│  [card] [card] [card]                                   │
│                                                         │
│  [+ Añadir a mi pool]   [✉ Contactar]   [↗ Web]       │
└─────────────────────────────────────────────────────────┘
```

### 9.4 Stats — `/entities/stats`

Dashboard puro con plantilla Ana llevada a web:
- 4 KPI cards arriba (total, países, idiomas, % con email)
- Mapa Europa heatmap grande
- Donut categorías + barra horizontal CMS (con logos)
- Bar chart top 15 países con barras amarillas
- Bar idiomas web

---

## 10. Riesgos y dudas que ya estamos viendo

1. **Rendimiento del mapa:** D3 + topojson Europa con 33 países ≠ 165k entidades. El mapa solo muestra agregados por país (color por densidad). Pero al hacer click → filtra el listado. ¿Es suficiente la interacción o el usuario espera "drill down" a entidad concreta desde el mapa?

2. **Search performance:** MySQL FULLTEXT sobre 165k filas con descripción + nombre. ¿Aguanta o necesitamos Meilisearch ya en S2? Mi instinto: aguanta para MVP, migramos si crece.

3. **Mantenimiento del crawl:** los datos están "frescos" hoy pero envejecen. ¿Reactivar crawl periódico? ¿Cada cuánto?

4. **Calidad de datos visible:** mostrar `quality_tier` puede penalizar a las entidades "minimal" (16% del total). ¿Las ocultamos por defecto, las mostramos con badge claro, o las dejamos sin filtro?

5. **Monetización:** el directorio puede ser:
   - El gancho freemium del SaaS (mi tesis actual)
   - Un producto separado con su propio plan
   - Algo que solo se incluye en el plan Pro general
   
   ¿Tu opinión?

6. **GDPR / contacto frío:** los emails y teléfonos son públicos (vienen de webs corporativas), pero exponer "lista de 165k orgs con email" es un imán para spam. ¿Cómo balanceamos accesibilidad vs protección?

7. **SEO vs producto:** las 165k fichas indexables podrían ser un imán de tráfico orgánico, pero implica SSR/SSG. Hoy E+ Tools es SPA pura (no SSR). ¿Vale la pena romper el patrón o renunciamos a SEO en este módulo?

---

## 11. Lo que te pido (ChatGPT)

Crítica honesta sobre:

1. **El plan de 6 sesiones** — ¿hay algo mal ordenado? ¿algo que falta? ¿algo que sobra?
2. **Stack técnico** — ¿es razonable mantener Express + Vanilla JS o estoy "ahorrándome" Next.js a un coste futuro alto?
3. **Estrategia de datos** — ¿1.100 random + stats reales precomputadas es el approach correcto para iterar?
4. **Estética vs funcionalidad** — ¿estoy obsesionado con la estética en exceso? ¿debería priorizar otra cosa primero?
5. **Monetización** — ¿el modelo freemium tiene sentido o mejor abrir todo y monetizar otro punto del funnel?
6. **Riesgos no mencionados** — ¿qué se me escapa que un equipo serio no se dejaría?

Si en algo crees que estamos mal, dilo claro. No quiero validación, quiero contraste.

---

**Archivo generado:** `docs/PARA_CHATGPT_DIRECTORIO.md` en repo `eplus-tools` rama `dev-local`.
**Plan original (más extenso) escrito por Claude VPS:** `docs/ENTIDADES_DASHBOARD_PLAN.md` en rama `dev-vps`.
**Fecha:** 2026-04-25.
