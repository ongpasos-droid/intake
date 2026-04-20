# Research Module — Biblioteca Inteligente de Fuentes E+

## Vision

Construir un sistema de inteligencia documental que ayude a profesionales Erasmus+ a encontrar, organizar y aprovechar investigaciones y datos oficiales para redactar propuestas de alta calidad — y que cada usuario que lo use haga la plataforma mejor para todos.

---

## Problema que resuelve

Escribir una propuesta Erasmus+ competitiva requiere justificar cada eje temático con datos reales: estadísticas, investigaciones, informes oficiales. Hoy esto es un proceso manual que consume días:

1. Buscar en Google Scholar, Eurostat, CORDIS... sin saber exactamente dónde mirar
2. Leer decenas de documentos para encontrar los datos relevantes
3. Organizar las fuentes por tema y país
4. Extraer citas y estadísticas útiles
5. Redactar las secciones de justificación con esas fuentes

Un consultor externo cobra 2,000-5,000€ por este trabajo. Nuestra herramienta lo hace mejor, más rápido y por una fracción del coste.

---

## Estrategia de tres capas

### Capa 1 — Base fundacional (la creamos nosotros)

Documentos oficiales de la UE que son relevantes para CUALQUIER proyecto Erasmus+:

- Marcos estratégicos EU (Digital Education Action Plan, European Education Area, etc.)
- Informes Eurydice por país y temática
- Estadísticas Eurostat sobre educación, empleo juvenil, digitalización
- Guías de programas Erasmus+ y prioridades por convocatoria
- Informes CORDIS de proyectos financiados anteriores

**Se hace una vez, sirve para todos los usuarios. Coste: tiempo + suscripción.**

### Capa 2 — Enriquecimiento orgánico (los usuarios)

Cada proyecto que un usuario trabaja añade ~30 fuentes validadas por un profesional E+. Estas fuentes, cuando son papers públicos/open access, enriquecen la base común:

- Un usuario busca "mathematics education rural schools Italy" → encuentra 5 papers → los guarda
- Esos papers quedan vectorizados y disponibles para el siguiente usuario con un proyecto similar
- **La plataforma mejora con cada usuario. Crecimiento orgánico, coste cero.**

### Capa 3 — Harvesting automatizado (biblioteca barata)

Script nocturno en VPS que recorre OpenAlex/CORDIS por temáticas clave E+:

- Define temáticas: inclusión, digitalización, sostenibilidad, ciudadanía, STEM, etc.
- Cada noche descarga X papers open access por temática
- Extrae texto, chunkea, vectoriza, almacena
- **Coste: $0 en APIs. Solo disco y CPU del VPS. 1,000+ papers/noche.**

---

## Estructura de un proyecto tipo

```
Proyecto: "Matemáticas innovadoras en escuelas"
├── Eje 1: Metodologías innovadoras en STEM
│   ├── EU: Informe Eurydice "Mathematics Education in Europe" (vale para todos)
│   ├── España: Estudio INEE sobre competencia matemática
│   ├── Italia: Rapporto INVALSI matemática
│   └── Polonia: Raport IBE edukacja matematyczna
├── Eje 2: Inclusión digital en educación
│   ├── EU: Digital Education Action Plan — estadísticas
│   ├── España: Informe INTEF digitalización aulas
│   ├── Italia: Piano Nazionale Scuola Digitale — datos
│   └── Polonia: Raport cyfryzacja edukacji
├── Eje 3: Formación docente
│   ├── EU: TALIS 2024 teacher training data
│   ├── España: ...
│   └── ...
└── ~30 fuentes totales, organizadas por eje + país
```

---

## Fases del pipeline completo

| Fase | Qué pasa | Contexto AI | Modelo | Coste |
|------|----------|-------------|--------|-------|
| 1. Búsqueda | Usuario busca papers por tema+país | — | — | Gratis |
| 2. Selección | Usuario revisa abstracts, elige fuentes | — | — | Gratis |
| 3. Extracción | Sistema descarga PDF, extrae texto, vectoriza | Local | — | Gratis |
| 4. Resumen | AI resume cada fuente: hallazgos, stats, citas | ~300K tokens | Sonnet | ~$1.50 |
| 5. Borrador | AI redacta secciones con las fuentes (RAG) | ~100-500K tokens | Sonnet | ~$5-15 |
| 6. Redacción final | AI con contexto completo refina y da coherencia | ~1M tokens | Opus | ~$30-50 |
| 7. Revisión | Iteraciones de mejora | ~500K tokens | Opus | ~$20-40 |

**Coste total por proyecto: ~$60-150 (vs $3,000-5,000 de un consultor)**

---

## Ventaja competitiva (moat)

La base vectorizada curada por profesionales E+ es lo que nadie más tiene:

- Cualquiera puede conectar OpenAlex + Claude API
- Nadie tiene 30,000+ papers seleccionados por profesionales Erasmus+
- Con RAG, buscamos en nuestra base primero → solo los chunks relevantes van a Claude
- **10x reducción de coste** vs enviar documentos completos
- Cada usuario nuevo hace la plataforma mejor y más barata para todos

---

## Modelo de monetización (futuro)

### Recomendado: Híbrido suscripción + créditos

| Plan | Precio/mes | Incluye |
|------|-----------|---------|
| Free | $0 | Buscador + 3 fuentes guardadas |
| Pro | $49/mes | 2 proyectos, resúmenes AI, redacción asistida |
| Agency | $199/mes | 10 proyectos, redacción completa, prioridad |

### Proyección a 1,000 usuarios

- Ingreso: ~$49,000/mes
- Coste API (con RAG): ~$15,000-30,000/mes
- Infra: ~$200/mes
- **Margen: $19,000-34,000/mes**

---

## APIs de datos (todas gratuitas)

| Fuente | URL | Qué ofrece | Límites |
|--------|-----|------------|---------|
| OpenAlex | api.openalex.org | 250M+ papers, abstracts, open access PDFs | Gratis, ilimitado con email |
| CORDIS | cordis.europa.eu/api | Proyectos EU financiados | Gratis |
| Eurostat | ec.europa.eu/eurostat/api | Estadísticas europeas | Gratis |
| Semantic Scholar | api.semanticscholar.org | Papers + citaciones | 100 req/s gratis |
| OpenAIRE | api.openaire.eu | Publicaciones open access EU | Gratis |

---

## Modelo de datos

### Tabla: `research_sources` (fuentes encontradas y guardadas)

```sql
CREATE TABLE IF NOT EXISTS research_sources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  external_id VARCHAR(500),          -- DOI, OpenAlex ID, CORDIS ID
  source_api VARCHAR(50),            -- openalex, cordis, eurostat, manual
  title VARCHAR(500) NOT NULL,
  authors TEXT,                       -- JSON array
  publication_year INT,
  abstract TEXT,
  url VARCHAR(1000),
  pdf_url VARCHAR(1000),             -- open access PDF link
  language VARCHAR(10),
  country_focus VARCHAR(10),         -- ISO code if country-specific, NULL if EU-wide
  topics TEXT,                        -- JSON array of topics/keywords
  citation_count INT DEFAULT 0,
  is_open_access BOOLEAN DEFAULT FALSE,
  -- Contenido extraído
  full_text LONGTEXT,                -- texto completo extraído del PDF
  status ENUM('reference','downloaded','extracted','vectorized','error') DEFAULT 'reference',
  file_path VARCHAR(500),            -- ruta local del PDF descargado
  -- Metadatos
  added_by VARCHAR(36),              -- user ID de quien lo añadió primero
  visibility ENUM('public','private') DEFAULT 'public',  -- papers son public, docs privados son private
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_external_id (external_id, source_api)
);
```

### Tabla: `project_sources` (vinculación proyecto ↔ fuente)

```sql
CREATE TABLE IF NOT EXISTS project_sources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  source_id INT NOT NULL,
  axis VARCHAR(100),                 -- eje temático del proyecto
  country_context VARCHAR(10),       -- para qué país se usa esta fuente
  relevance_notes TEXT,              -- notas del usuario sobre por qué es relevante
  added_by VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_project_source (project_id, source_id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (source_id) REFERENCES research_sources(id) ON DELETE CASCADE
);
```

### Tabla existente: `document_chunks` (ya creada — reutilizamos)

Se reutiliza para almacenar los chunks vectorizados de las fuentes. Se añade referencia a `research_sources`:

```sql
-- Ya existe, solo añadir columna:
ALTER TABLE document_chunks ADD COLUMN source_id INT NULL;
ALTER TABLE document_chunks ADD FOREIGN KEY (source_id) REFERENCES research_sources(id);
```

---

## Tareas de implementación

### Fase 1 — Buscador OpenAlex (MVP)

- [ ] **1.1** Backend: servicio OpenAlex (`node/src/services/openalex.js`)
  - Función `search(query, filters)` — buscar papers por texto + filtros
  - Función `getWork(id)` — obtener detalle de un paper
  - Filtros: año, país, open access, temática
  - Parsear respuesta a formato normalizado interno

- [ ] **1.2** Backend: rutas y controller research (`node/src/modules/research/`)
  - `GET /v1/research/search?q=...&country=...&year=...` — búsqueda
  - `GET /v1/research/sources/:id` — detalle de fuente
  - `POST /v1/research/sources` — guardar fuente en BD
  - `DELETE /v1/research/sources/:id` — eliminar fuente
  - `GET /v1/research/sources` — listar fuentes guardadas (propias + públicas)

- [ ] **1.3** Migración SQL: crear tablas `research_sources` y `project_sources`

- [ ] **1.4** Frontend: sección Research en la SPA (`public/js/research.js`)
  - Barra de búsqueda con filtros (tema, país, año, open access)
  - Lista de resultados con: título, autores, año, abstract, fuente, open access badge
  - Botón "Guardar fuente" en cada resultado
  - Vista de "Mis fuentes guardadas"

- [ ] **1.5** Frontend: integración en index.html
  - Nueva sección/tab "Research" en la navegación
  - Estilos consistentes con el resto de la app

### Fase 2 — Vincular fuentes a proyectos

- [ ] **2.1** Backend: rutas de vinculación
  - `POST /v1/research/projects/:projectId/link` — vincular fuente a proyecto
  - `DELETE /v1/research/projects/:projectId/:sourceId` — desvincular
  - `GET /v1/research/projects/:projectId` — fuentes de un proyecto (por eje y país)

- [ ] **2.2** Frontend: pestaña "Fuentes" dentro de un proyecto
  - Buscador inline (busca en base propia + OpenAlex)
  - Selector de eje y país al vincular
  - Vista organizada por eje → país → fuentes
  - Notas de relevancia por fuente

### Fase 3 — Descarga y vectorización de papers

- [ ] **3.1** Backend: descargar PDF open access
  - Descargar desde `pdf_url` del paper
  - Guardar en `public/uploads/research/`
  - Actualizar status a 'downloaded'

- [ ] **3.2** Backend: extraer texto y vectorizar
  - Reutilizar `vectorize.js` existente
  - Extraer texto del PDF descargado
  - Chunkear y generar embeddings
  - Guardar chunks en `document_chunks` con `source_id`
  - Actualizar status a 'vectorized'

- [ ] **3.3** Backend: búsqueda semántica en base propia
  - Endpoint `POST /v1/research/semantic-search`
  - Busca primero en chunks vectorizados propios
  - Si no hay suficientes resultados, complementa con OpenAlex
  - Devuelve chunks relevantes con contexto del paper original

### Fase 4 — Base fundacional EU

- [ ] **4.1** Identificar documentos clave EU por temática E+
  - Digital Education Action Plan
  - European Education Area strategic framework
  - Eurydice reports principales
  - TALIS reports
  - Estadísticas Eurostat clave

- [ ] **4.2** Script para ingestar documentos fundacionales
  - Descargar PDFs oficiales
  - Extraer texto, vectorizar
  - Marcar como `added_by: 'system'`, `visibility: 'public'`

### Fase 5 — Harvester automático (VPS)

- [ ] **5.1** Script harvester (`scripts/harvest-papers.js`)
  - Lista de queries por temática E+
  - Recorre OpenAlex por cada query
  - Filtra por: open access, relevancia, idioma
  - Descarga, extrae, vectoriza
  - Corre como cron nocturno en VPS

- [ ] **5.2** Deduplicación
  - Verificar por DOI/external_id antes de insertar
  - Merge de metadatos si la fuente ya existe

### Fase 6 — Agentes AI (futuro)

- [ ] **6.1** Agente resumidor — lee fuentes y extrae: hallazgos, stats, citas
- [ ] **6.2** Agente redactor — con contexto RAG, redacta secciones de la propuesta
- [ ] **6.3** Metering — medir tokens consumidos por usuario/operación
- [ ] **6.4** Sistema de créditos/límites por plan

---

## Arquitectura técnica

```
┌─────────────────────────────────────────────────────┐
│                    Frontend SPA                      │
│  research.js — búsqueda, resultados, guardar        │
│  project-sources.js — fuentes por proyecto          │
├─────────────────────────────────────────────────────┤
│                  Express Backend                     │
│  /v1/research/* — búsqueda, CRUD fuentes            │
│  services/openalex.js — cliente API                 │
│  services/vectorize.js — extracción + embeddings    │
├─────────────────────────────────────────────────────┤
│                    MySQL                             │
│  research_sources — metadatos papers                │
│  project_sources — vinculación proyecto↔fuente      │
│  document_chunks — chunks vectorizados (compartida) │
├─────────────────────────────────────────────────────┤
│              Almacenamiento local                    │
│  public/uploads/research/ — PDFs descargados        │
├─────────────────────────────────────────────────────┤
│              VPS (futuro)                            │
│  Harvester nocturno — crecimiento automático        │
│  Agentes AI — resúmenes, redacción                  │
└─────────────────────────────────────────────────────┘
```

---

## Estado actual

- **Fecha:** 2026-04-05
- **Fase actual:** Pre-implementación. Diseño completado, listo para comenzar Fase 1.
- **Módulo de documentos:** Operativo (MySQL, local disk, vectorización, admin table)
- **Infraestructura:** Node.js + Express + MySQL en Laragon (local) y Coolify (producción)
- **Próximo paso:** Implementar Fase 1 — Buscador OpenAlex
