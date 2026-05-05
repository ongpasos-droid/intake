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

**Pre-requisito BLOQUEANTE (Oscar):**
Integrar BBDD externa de proyectos EU verificados. Tablas previstas:
- `eu_projects` (project_id PK, programme, year, title, budget, dates)
- `eu_project_partners` (project_id, oid FK→entities.oid, role, contribution_eur)

**Cuando arrancar el desarrollo:**
Cuando Oscar diga *"BBDD EU lista"* y existan las tablas con datos en local. Plan completo y respuestas a Q1-Q7 ya cerradas en `docs/DIRECTORY_REFACTOR_PLAN.md` §1.

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

> *(vacío por ahora — añadir aquí lo que se quiera priorizar)*

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
