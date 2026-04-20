# E+ Tools — Reglas para Claude Code

## Protocolo de ramas

Este repo tiene dos Claudes trabajando en paralelo, cada uno en su rama:

| Claude | Rama | Cuándo trabaja |
|---|---|---|
| Claude Local (PC) | `dev-local` | Día, sesiones presenciales |
| Claude VPS (Bot Telegram) | `dev-vps` | Noche, sesiones asíncronas |

**`main` es solo para deploy.** Ningún Claude pushea directo a `main`.

### Reglas absolutas
1. **NUNCA** push directo a `main` — solo merge cuando Oscar lo indique
2. **NUNCA** hacer force push en ninguna rama
3. **NUNCA** hacer rebase de ramas compartidas
4. **NUNCA** push a la rama del otro Claude
5. **SIEMPRE** hacer pull/fetch antes de empezar a trabajar

### Proceso MERGE (cuando Oscar dice "MERGE")
1. Commit cambios locales pendientes en `dev-local`
2. `git fetch origin`
3. `git checkout main && git pull origin main`
4. `git merge origin/dev-local` (y/o `git merge origin/dev-vps` si Oscar lo indica)
5. Resolver conflictos (mantener cambios de ambos lados)
6. `git push origin main`
7. Sincronizar rama: `git checkout dev-local && git merge origin/main && git push origin dev-local`
- Coolify despliega automáticamente cada push a `main`

### Resolución de conflictos
- **Técnicos** (imports, config, estructura) → la mejor lógica gana.
- **Funcionales** (dos implementaciones del mismo feature) → la mejor solución gana.
- **Negocio** (flujo de usuario, decisiones de producto) → siempre preguntar a Oscar.

## Desarrollo local

Oscar trabaja en local con Laragon antes de hacer push:
- **MySQL:** Laragon (`/c/laragon`), MySQL 8.4, user `root`, sin password
- **BD:** `eplus_tools`
- **Servidor:** `node server.js` → `http://localhost:3000`
- **Usuario:** `oscarargumosa@gmail.com` con `role=admin`
- Tras cambios en código, reiniciar servidor para que Oscar pruebe
- Solo push cuando Oscar lo pida o diga MERGE

## Migraciones

- Las migraciones se ejecutan automáticamente al desplegar (Dockerfile CMD)
- **SIEMPRE** escribir migraciones idempotentes:
  - Tablas: `CREATE TABLE IF NOT EXISTS`
  - Inserts: `INSERT IGNORE` o `ON DUPLICATE KEY UPDATE`
  - Columnas: comprobar con `information_schema.COLUMNS` antes de `ALTER TABLE ADD COLUMN`
  - **NUNCA** usar `CREATE INDEX IF NOT EXISTS` (no existe en MySQL)
  - **NUNCA** usar `ADD COLUMN IF NOT EXISTS` (no existe en MySQL 8.x)

## Stack técnico
- **Backend:** Node.js + Express, MySQL (mysql2), JWT auth
- **Frontend:** Vanilla JS (SPA), Tailwind CDN, Material Symbols
- **Deploy:** Coolify desde `main` → `intake.eufundingschool.com`
- **BD producción:** `eplus_tools` en MySQL del contenedor `wordpress-eufunding-db-1`

## Estructura del proyecto
```
server.js                     → Entry point Express
node/src/modules/             → Módulos backend (auth, intake, calculator, admin)
node/src/middleware/           → Auth middleware (JWT)
node/src/utils/               → DB connection, UUID helper
public/                       → SPA frontend
public/js/                    → api.js, auth.js, app.js, intake.js, admin.js
public/css/                   → main.css
migrations/                   → SQL migrations (auto-ejecutadas al deploy)
scripts/migrate.js            → Runner de migraciones (tolerante a duplicados)
```
