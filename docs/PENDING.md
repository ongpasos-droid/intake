# Tareas pendientes — E+ Tools

> **Cómo funciona este doc:** lista canónica de trabajo pendiente coordinado entre sesiones de Claude. Cuando Oscar pregunte "¿qué tareas tenemos pendientes?", la primera respuesta es leer este fichero. Cada tarea tiene owner, status, bloqueante, y dónde está el plan detallado.
>
> **Quién edita:** cualquier Claude o Oscar. Cuando una tarea se completa, mover a §3 (Recientemente cerrado) con la fecha. Cuando se planifica nueva, añadir a §1.

---

## 1 · En curso · bloqueadas en pre-requisito

### TASK-001 — Refactor del directorio de entidades
**Status:** APROBADO el diseño · BLOQUEADO en pre-requisito
**Owner del bloqueo:** Oscar
**Doc canónico:** `docs/DIRECTORY_REFACTOR_PLAN.md`
**Fecha plan:** 2026-04-29

**Qué incluye:**
- Búsqueda substring (`%perma%` encuentra "permacultura cantabria")
- Eliminar sidebar de filtros · top bar con search + 2 dropdowns (país, tipo)
- Sustituir 3 scores viejos (prof/EU/vitality) por **Personal · Experiencia · Stakeholders**
- Heurística para entidades no reclamadas usando proyectos EU verificados
- RGPD: ocultar email/phone hasta opt-in del responsable (toggle `contacts_public`)
- Calculator: permite usar entidades no reclamadas. Writer: solo reclamadas con datos completos
- Fix bug display_name (caso "Permacultura Cantabria" aparece como "Cantabria")

**Pre-requisito YA RESUELTO por VPS Claude (2026-05-05):**
La fusión existe en Postgres `erasmus-pg` del VPS, no en MySQL como inicialmente preví:
- `eplus2021.projects` (317.559 filas)
- `eplus2021.organisations` (198.519 filas)
- `eplus2021.project_organisations` (839.569 filas)
- `directory.entities_master` matview (331k entities con bucketing both/directory_only/erasmus_only)
- `directory.entity_project_stats`, `entity_top_copartners`, `entity_yearly_timeline`

**Decisión arquitectural pendiente** (en `docs/handoffs/PARA_VPS.md` 2026-05-05): cómo consume la app Node los datos de Postgres — favorito: llamar a `directorio.eufundingschool.com/api/*` desde Node. Hasta cerrar esto, F1 (fix INNER JOIN bug) sigue parado.

**Cuando arrancar el desarrollo:**
Tras: (1) acuerdo Local↔VPS sobre arquitectura de consumo, (2) primer dump base de Postgres replicado en local. Ambas en curso vía buzones `docs/handoffs/`.

**Avance 2026-04-29 — bug raíz F1 confirmado:**
Sesión auditando el desajuste Consortium↔Directorio en LIVE. Confirmado contra ORS API + endpoint `/v1/entities` + BD local + VPS:
- Bug: `node/src/modules/entities/model.js:117-193` (`listEntities`) hace **INNER JOIN** con `entity_enrichment.archived=0` y busca `q` solo en `MATCH(ee.extracted_name, ee.description)`.
- Consecuencia: 165k visibles vs **288k reales** en `entities`. ~123k sin enrich son invisibles, incluido Permacultura Cantabria (validity=waiting).
- Selector Consortium (`public/js/intake.js:843-990`) además pega contra tabla vieja `organizations` (23 orgs en local). Hay que apuntarlo a `/v1/entities`.
- OIDs de test para revincular `BICYCLE` / `bicicle 2`: Permacultura Cantabria `E10151149` (PIC 940435371), Von Hope `E10157445` (PIC 940543914).
- Sesión pausada porque el VPS Claude detectó un bug grande en la BD del VPS y están arreglándolo. **No se ha tocado código.** Detalle en memoria `project_session_20260429_consortium_directory.md`.

**Fases tras desbloquear:**
- F1 (3-4h): búsqueda + UI topbar + cards limpias + fix display_name
- F2 (1d): scoring nuevo + endpoint power
- F3 (3-4h, paralelo a F2): RGPD migration 095 + toggle UI + gating
- F4 (30min): drop scores viejos de DB tras 30d estables

---

## 2 · Pendientes sin bloqueante (cuando se quiera)

### TASK-003 — Réplica local de Postgres `erasmus-pg`
**Status:** EN CURSO · esperando respuesta VPS Claude
**Doc canónico:** `docs/handoffs/PARA_VPS.md` (2026-05-05)
**Fecha plan:** 2026-05-05

**Por qué:** unificar BD que será pública en Live. La BD pesa 6.9 GB (no los 150 GB que Oscar temía — esos eran disco total VPS). Viable replicar.

**Ámbito acordado parcialmente con VPS Claude:**
- Postgres 16 en Docker local (`infra/docker-compose.local.yml` pendiente).
- Excluir `directory.eacea_*` matviews del primer dump (origen no documentado, posible WIP).
- Aplicar antes del dump: migración 012 (fuzzy OID↔OID via identity_resolution, **aditiva** con matview v2 paralela), 013 (merge 288 colisiones), UNIQUE(pic), REINDEX SCHEMA directory.
- Vehículo de transporte: endpoint VPS auth (no B2). Pendiente que VPS Claude lo levante.

**Bloqueante actual:** respuesta de VPS Claude a Q-Local-1 (B2 vs endpoint) y a propuesta de matview v2 reversible.

### TASK-002 — Sync prod -> Laragon local (datos para test offline)
**Status:** LISTO_PARA_EMPEZAR
**Doc canónico:** `docs/LOCAL_SAMPLE.md`
**Script:** `scripts/sync-prod-mysql-to-local.sh`
**Fecha plan:** 2026-05-05

**Qué incluye:**
- Réplica de MySQL `eplus_tools` (288k entities + enrichment + ref_*) en Laragon vía túnel SSH ya montado.
- Excluye `users / auth_tokens / newsletter / ai_logs / llm_cache` (privacy + volumen).
- Verifica que Permacultura Cantabria (`E10151149`) y volumen ~288k entities estén tras el import.
- No incluye proyectos EU históricos (Erasmus+ 2014-2025) — esos viven en Postgres `erasmus-pg` (Directory API). Plan de sample de Postgres pendiente (§3 de LOCAL_SAMPLE.md).

**Qué falta para correr:**
1. Levantar túnel: `~/.claude/tunnel-mysql-prod.bat`
2. Crear `~/.claude/local-sync.env` con `CLAUDE_RO_PASS=...` (extraer de `~/.claude.json` -> `mcpServers.mysql-prod.env.MYSQL_PASS`)
3. Añadir `/c/laragon/bin/mysql/.../bin` al PATH
4. `bash scripts/sync-prod-mysql-to-local.sh`

**Decisión cerrada (2026-05-05):**
Oscar planteó si copiar 150 GB completos. Descartado: la BD que pesa 150 GB es la Postgres `erasmus-pg` (proyectos EU), no la MySQL `eplus_tools` (que pesa <500 MB). Para test offline basta con MySQL completo + Directory API on-demand para proyectos EU.

---

## 3 · Recientemente cerrado

| Fecha | Tarea | Commit/PR |
|---|---|---|
| 2026-04-29 | Hotfix migration 091: batch UPDATEs para no romper healthcheck Coolify (502 Bad Gateway en intake.eufundingschool.com) | `7cfe7cc` en main |

---

## Convenciones

- Una tarea = una sección con `###`
- Status: `APROBADO`, `EN CURSO`, `BLOQUEADO`, `PAUSADO`, `LISTO_PARA_EMPEZAR`
- Cada tarea apunta a su doc canónico en `docs/` cuando existe
- Si una tarea se hace en otro folder/repo (ej. WordPress, designer-projects), indicarlo y poner el path
