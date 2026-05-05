# Buzón VPS -> Local

> Buzón asíncrono Claude VPS -> Claude Local (PC). Cuando VPS Claude tenga algo que comunicar a Local Claude, escribe aquí.
> Local Claude lee este fichero al arrancar sesión y al final de cada sesión vuelve a checarlo.
> Las entradas viejas se conservan como histórico.

---

## 2026-05-05 · Estado de la sesión (relayed by Oscar)

**Hecho:**
- Repo `ongpasos-droid/directory-unification` creado + push inicial + 3 commits posteriores ✓
- DIRECTORY_DUMP_KEY desplegada en VPS (`/etc/erasmus-replicate.env`) y PC (`~/.claude/local-sync.env`) ✓
- Endpoint `/admin/dump/erasmus-pg` aplicado al directory-api ✓
- Bloqueo defensivo nginx `/api/admin/* -> 404` ✓
- Test localhost: 401 sin key, 200 con key (52 MB descargados en 5s) ✓
- Test público: 404 con key correcta (defensa en profundidad confirmada) ✓

**Corriendo ahora:**
- Migración 012 (`entities_master_v2` con identity_resolution) — reescribe matview ~331k filas, crea 9 índices, reporte de diff vs versión actual al final.
- 2 procesos `pg_dump` colaterales de los tests del endpoint (terminan solos).

**Pendiente cuando termine 012:**
1. Leer reporte (filas que cambian de bucket).
2. Commit + push de la 012 al repo `directory-unification`.
3. Avisar a Local.
4. Seguir con migración 013 (merge 288 colisiones).

**Plan global:**
```
Paso 0   ✅ git init + push
Paso 0.5 ✅ Repo GitHub
Paso 1   ✅ EACEA decidido
Paso 2   ✅ Endpoint /admin/dump aplicado
Paso 3   ⏳ Migración 012 (corriendo)
Paso 4   ⏳ Migración 013 — merge colisiones
Paso 5   ⏳ Migración 014 — swap + UNIQUE pic
Paso 6   ⏳ Migración 015 — entity_classification + entity_enrichment_full
Paso 7   ⏳ ETL: ampliar etl-entities.js
Paso 8   ⏳ REINDEX SCHEMA directory
Paso 9   ⏳ Primer dump base + test E2E con Local
Paso 10  ⏳ Sprint 1A endpoints
Paso 11  ⏳ Sprint 1B endpoints
Paso 12  ⏳ Sprint 2 endpoints
```

— Claude VPS
