# ORS Entities Ingestion — Spec técnico completo

**Objetivo:** construir una base de datos propia de todas las entidades registradas en el Erasmus+ Organisation Registration System (ORS), ingestando datos directamente de su API pública, sin intermediarios.

**Ejecutor:** Claude VPS (rama `dev-vps`) — puede correr 24/7 sin bloquear el trabajo local.

---

## 1. API ORS (ya investigada — NO re-descubrir)

**Base URL:**
```
https://webgate.ec.europa.eu/eac-eescp-backend/
```

**Endpoints confirmados (sin autenticación):**

| Método | Path | Body | Uso |
|---|---|---|---|
| POST | `ext-api/organisation-registration/simpleSearch` | `{"filter":"<texto>"}` | Búsqueda simple, global |
| POST | `ext-api/organisation-registration/advancedSearch` | modelo 12-campos | Búsqueda con filtros |
| GET | `configuration/countries` | — | Taxonomía países |
| GET | `actuator/health` | — | Health check |

**Headers obligatorios:**
```
Content-Type: application/json
Accept: application/json, text/plain, */*
X-Lang-Param: en
Origin: https://webgate.ec.europa.eu
Referer: https://webgate.ec.europa.eu/erasmus-esc/index/organisations/search-for-an-organisation
```

**Body advancedSearch (12 campos, todos string, vacío = ignorar):**
```json
{
  "legalName": "",
  "businessName": "",
  "country": "20000883",
  "city": "",
  "website": "",
  "pic": "",
  "organisationId": "",
  "registrationNumber": "",
  "vatNumber": "",
  "erasmusCharterForHigherEducationCode": "",
  "status": ""
}
```

**Response (array de objetos, hasta 200 elementos):**
```json
[
  {
    "legalName": " Vidrala S.A.  ",
    "businessName": "Vidrala ",
    "validityType": "42284356",
    "country": "20000883",
    "city": "Llodio  ",
    "website": "http://www.vidrala.com ",
    "goTolink": "https://webgate.ec.europa.eu/organisation-registration/register/screen/home/organisation/organisationData/10175142",
    "websiteShow": "www.vidrala.com ",
    "registration": "TOMO 257 LIBRO 183 FOLIO 129",
    "organisationId": "E10175142",
    "pic": "986226549",
    "vat": "ES A01004324 "
  }
]
```

**⚠️ Importante:**
- Todos los campos string pueden venir con **espacios extra** (leading/trailing). Hacer `.trim()` SIEMPRE antes de guardar.
- Cualquier campo puede ser `null`.
- **Hard cap 200 resultados por query.** Si devuelve exactamente 200, asumir que hay más no visibles.

**`validityType` (enum):**
| ID | Significado |
|---|---|
| `42284353` | NA Certified (validada por Agencia Nacional) |
| `42284356` | Waiting for NA Certification (pendiente) |
| (por identificar) | Invalidated (ver muestras reales) |

**`country`:** es un **taxonomy ID** numérico, no ISO code. Taxonomía completa en `GET /configuration/countries`. Ejemplo mapeo:
- ES → 20000883
- PT → 20000990
- (resto → cachear primera ejecución)

---

## 2. Schema de BD (migración 024)

Archivo: `migrations/024_create_entities_table.sql`

```sql
CREATE TABLE IF NOT EXISTS entities (
  oid               VARCHAR(15)   PRIMARY KEY,
  pic               VARCHAR(15)   NULL,
  legal_name        VARCHAR(500)  NOT NULL,
  business_name     VARCHAR(500)  NULL,
  country_code      CHAR(2)       NULL,        -- ISO desde taxonomy
  country_tax_id    VARCHAR(15)   NULL,        -- crudo del API
  city              VARCHAR(200)  NULL,
  website           VARCHAR(500)  NULL,
  website_show      VARCHAR(500)  NULL,
  vat               VARCHAR(50)   NULL,
  registration_no   VARCHAR(200)  NULL,
  validity_type     VARCHAR(15)   NULL,        -- ID crudo
  validity_label    VARCHAR(30)   NULL,        -- 'certified'|'waiting'|'invalidated'
  go_to_link        VARCHAR(500)  NULL,
  source            VARCHAR(30)   DEFAULT 'ors_api',
  first_seen_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  last_seen_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  raw_json          JSON          NULL,         -- respuesta original para auditar

  INDEX idx_pic (pic),
  INDEX idx_country (country_code),
  INDEX idx_city (city),
  INDEX idx_legal_name (legal_name(191)),
  INDEX idx_vat (vat),
  INDEX idx_validity (validity_label),
  FULLTEXT idx_search (legal_name, business_name, city)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

Archivo: `migrations/025_create_ors_crawl_state.sql`

```sql
CREATE TABLE IF NOT EXISTS ors_crawl_state (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  country_tax_id    VARCHAR(15)  NOT NULL,
  prefix            VARCHAR(10)  NOT NULL,       -- 'a', 'ab', 'abc'...
  status            ENUM('pending','in_progress','done','capped','error') DEFAULT 'pending',
  result_count      INT          NULL,
  error_message     TEXT         NULL,
  started_at        TIMESTAMP    NULL,
  finished_at       TIMESTAMP    NULL,
  created_at        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,

  UNIQUE KEY uq_country_prefix (country_tax_id, prefix),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS ors_crawl_log (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  country_tax_id VARCHAR(15),
  prefix         VARCHAR(10),
  http_status    INT,
  result_count   INT,
  duration_ms    INT,
  error          TEXT,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 3. Estructura de módulos a crear

```
node/src/modules/entities/
├── ors_client.js         → wrapper HTTP (fetch, retry, rate-limit)
├── ors_crawler.js        → algoritmo deepening + checkpoint
├── entities_service.js   → lookup en BD, consulta en vivo a ORS si no existe
└── entities_controller.js → endpoints REST

scripts/
├── crawl_ors.js          → entry point: node scripts/crawl_ors.js [--country=ES]
└── ors_priority_countries.json  → orden de crawl
```

---

## 4. Algoritmo deepening (pseudo-código)

```javascript
async function crawlCountry(countryTaxId) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const queue = [...alphabet]; // prefijos iniciales de 1 letra

  while (queue.length > 0) {
    const prefix = queue.shift();

    // Skip si ya está done (resume)
    if (await isPrefixDone(countryTaxId, prefix)) continue;

    await markInProgress(countryTaxId, prefix);

    const results = await ors.advancedSearch({
      country: countryTaxId,
      legalName: prefix
    });

    // Upsert todas las entidades (dedup por OID en INSERT ... ON DUPLICATE KEY UPDATE)
    for (const r of results) await upsertEntity(r);

    if (results.length === 200) {
      // Cap alcanzado → añadir extensiones a la cola
      for (const letter of alphabet) queue.push(prefix + letter);
      await markCapped(countryTaxId, prefix);
    } else {
      await markDone(countryTaxId, prefix, results.length);
    }

    await sleep(1000); // rate limit 1 req/seg
  }
}
```

**Dedup por OID:**
```sql
INSERT INTO entities (oid, pic, legal_name, ...) VALUES (...)
ON DUPLICATE KEY UPDATE
  legal_name = VALUES(legal_name),
  pic = VALUES(pic),
  ...,
  last_seen_at = NOW();
```

---

## 5. Cliente HTTP (`ors_client.js`)

Responsabilidades:
- Rate limit: **1 req/seg** (no más agresivo, somos respetuosos con el servidor EU)
- Retry con backoff exponencial: 2s, 4s, 8s (máx 3 intentos) en 5xx, 429, timeout
- User-Agent identificable: `Mozilla/5.0 (compatible; EufundingSchoolBot/1.0; +https://intake.eufundingschool.com)`
- Log estructurado a `ors_crawl_log`
- Método `advancedSearch(filters)` devuelve `{results, cappedAtLimit, durationMs}`

---

## 6. Prioridad de países (`ors_priority_countries.json`)

Orden recomendado (primero los más usados por Oscar):

```json
[
  {"iso": "ES", "reason": "base country"},
  {"iso": "IT", "reason": "latin, frequent partner"},
  {"iso": "PT", "reason": "latin, frequent partner"},
  {"iso": "FR", "reason": "frequent coordinator"},
  {"iso": "DE", "reason": "frequent coordinator"},
  {"iso": "NL", "reason": "frequent coordinator"},
  {"iso": "BE", "reason": "Brussels hub, EACEA"},
  {"iso": "GR", "reason": "KA2 common partner"},
  {"iso": "PL", "reason": "KA2 common partner"},
  {"iso": "RO", "reason": "KA2 common partner"},
  {"iso": "BG", "reason": "KA2 common partner"},
  {"iso": "IE", "reason": "EU"},
  {"iso": "AT", "reason": "EU"},
  {"iso": "CZ", "reason": "EU"},
  {"iso": "HR", "reason": "EU"},
  {"iso": "HU", "reason": "EU"},
  {"iso": "SE", "reason": "EU"},
  {"iso": "FI", "reason": "EU"},
  {"iso": "DK", "reason": "EU"},
  {"iso": "SK", "reason": "EU"},
  {"iso": "SI", "reason": "EU"},
  {"iso": "LT", "reason": "EU"},
  {"iso": "LV", "reason": "EU"},
  {"iso": "EE", "reason": "EU"},
  {"iso": "CY", "reason": "EU"},
  {"iso": "MT", "reason": "EU"},
  {"iso": "LU", "reason": "EU"},
  {"iso": "IS", "reason": "EEA"},
  {"iso": "NO", "reason": "EEA"},
  {"iso": "LI", "reason": "EEA"},
  {"iso": "TR", "reason": "partner country"},
  {"iso": "RS", "reason": "partner country"},
  {"iso": "AL", "reason": "partner country"},
  {"iso": "MK", "reason": "partner country"},
  {"iso": "BA", "reason": "partner country"},
  {"iso": "ME", "reason": "partner country"},
  {"iso": "MD", "reason": "partner country"},
  {"iso": "UA", "reason": "partner country"}
]
```

Resolver ISO → taxonomy ID en primera ejecución usando `GET /configuration/countries`.

---

## 7. Ejecución y monitoreo

**Lanzamiento (VPS):**
```bash
# Una vez instalado pm2:
pm2 start scripts/crawl_ors.js --name ors-crawl -- --country=ES
pm2 logs ors-crawl
pm2 status
```

**Monitoreo diario (lo que Claude VPS debe reportar si se le pregunta):**
```sql
-- Progreso global
SELECT
  country_tax_id,
  COUNT(*) AS total_prefixes,
  SUM(status='done') AS done,
  SUM(status='capped') AS capped,
  SUM(status='error') AS errors,
  SUM(status='pending') AS pending
FROM ors_crawl_state
GROUP BY country_tax_id;

-- Entidades por país
SELECT country_code, COUNT(*) FROM entities GROUP BY country_code ORDER BY 2 DESC;

-- Ritmo de ingesta últimas 24h
SELECT COUNT(*) FROM entities WHERE first_seen_at > NOW() - INTERVAL 1 DAY;
```

**Criterio de "país completo":** `ors_crawl_state` para ese país no tiene ningún prefix en `status='capped'` pendiente de desarrollar hijos.

---

## 8. Endpoints de la app (más adelante, fuera del crawl)

```
GET  /api/entities/search?q=<texto>&country=<ISO>&limit=20
GET  /api/entities/:oid
POST /api/entities/lookup-live  → consulta ORS al vuelo y cachea
```

La UI (módulo Organization) buscará aquí al añadir partners.

---

## 9. Reglas estrictas para Claude VPS

1. **Trabajar SIEMPRE en `dev-vps`**, nunca en `main` ni en `dev-local`.
2. **NUNCA push a `main`** — esperar a que Oscar diga MERGE.
3. Migraciones **idempotentes**: `CREATE TABLE IF NOT EXISTS`, `INSERT IGNORE`, etc. (ver CLAUDE.md del repo).
4. **NO usar `CREATE INDEX IF NOT EXISTS`** (no existe en MySQL). Crear índices dentro del `CREATE TABLE` o con bloques condicionales vía `information_schema`.
5. **Rate limit estricto 1 req/seg**. No subir jamás sin consultar con Oscar.
6. **Commits atómicos** con mensajes descriptivos (ej: `feat/entities: migración 024 tabla entities + 025 crawl state`).
7. **Reportar progreso** cuando Oscar pregunte, con números concretos (entidades ingestadas, países completados, % de cobertura estimado).
8. Si el crawl se cae, **reanudar desde checkpoint** (`ors_crawl_state` con status pending/in_progress).

---

## 10. Orden de ejecución sugerido

1. ✅ Crear migraciones 024 + 025
2. ✅ Ejecutar migraciones (`node scripts/migrate.js`)
3. ✅ `ors_client.js` con tests manuales (curl-equivalent) contra España (`country=20000883`, `legalName="vidrala"`) para confirmar paridad con el curl del spec
4. ✅ `ors_crawler.js` con dry-run: primeros 3 prefijos de España, ver logs
5. ✅ Lanzar crawl España completo con pm2, dejar toda la noche
6. ✅ Al día siguiente, reportar resultados a Oscar; si OK, continuar Italia
7. ✅ Endpoints REST + UI → fase separada después de tener ≥5 países completos

---

## 11. Dudas abiertas (resolver al implementar)

- **¿Cuántas entidades reales hay por país?** Sin referencia oficial. Spain probablemente 30k-60k.
- **¿Qué porcentaje de prefijos de 1 letra saturan el cap?** Medir en primer país y extrapolar.
- **Tercer `validityType` (Invalidated):** identificar ID real en primera muestra.
- **¿VAT siempre viene?** Muestreo: calcular % de entidades con `vat != null`.
