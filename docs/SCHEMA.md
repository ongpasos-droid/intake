# SCHEMA.md — Modelo de datos del ecosistema E+ Tools

> Fuente de verdad de la base de datos.
> Cuando hay contradicción entre este archivo y cualquier módulo, este archivo tiene razón.
> Última actualización: 3 de abril de 2026
> Nota: en monorepo, todas las tablas viven en la misma BD `eplus_tools`. Las migraciones van en `/migrations/` (raíz del repo).

---

## Reglas generales

- **Motor:** MySQL 8+
- **Charset:** utf8mb4 / collation utf8mb4_unicode_ci
- **IDs:** CHAR(36) con UUID v4 generado en Node (no en MySQL)
- **Importes:** DECIMAL(12,2) — siempre en euros
- **Porcentajes:** INT (80, no 0.8) salvo `indirect_pct` y campos que requieren decimales → DECIMAL(5,2)
- **Fechas:** DATE en formato ISO (YYYY-MM-DD)
- **Timestamps:** DATETIME con valor por defecto NOW()
- **Booleanos:** TINYINT(1) — 0 = false, 1 = true
- **Nombres de tabla:** inglés, snake_case, plural
- **Nombres de campo:** inglés, snake_case, singular
- **No duplicar datos:** referenciar por id con FOREIGN KEY
- **ON DELETE CASCADE:** en todas las FK que dependen de un padre

---

## Índice de tablas

| #  | Tabla                              | Módulo      | Descripción                                    |
|----|------------------------------------|-------------|------------------------------------------------|
| 1  | `users`                            | Auth        | Usuarios de la plataforma                      |
| 2  | `projects`                         | Core        | Proyecto Erasmus+ principal                    |
| 3  | `partners`                         | Core        | Organizaciones del consorcio                   |
| 4  | `partner_rates`                    | Calculator  | Tarifas perdiem por socio                      |
| 5  | `worker_rates`                     | Calculator  | Tarifas de personal por categoría              |
| 6  | `routes`                           | Calculator  | Rutas de viaje entre endpoints                 |
| 7  | `extra_destinations`               | Calculator  | Destinos adicionales fuera del consorcio       |
| 8  | `work_packages`                    | Core        | Paquetes de trabajo (WP)                       |
| 9  | `activities`                       | Core        | Actividades dentro de un WP                    |
| 10 | `activity_mobility`                | Calculator  | Config de movilidades (meeting, ltta)          |
| 11 | `activity_mobility_participants`   | Calculator  | Socios que participan en movilidad             |
| 12 | `activity_management`              | Calculator  | Config de gestión y coordinación               |
| 13 | `activity_management_partners`     | Calculator  | Socios activos en actividades de gestión       |
| 14 | `activity_intellectual_outputs`    | Calculator  | Config de Resultados Intelectuales por socio   |
| 15 | `activity_multiplier_events`       | Calculator  | Config de Multiplier Events por socio          |
| 16 | `activity_local_workshops`         | Calculator  | Config de talleres locales por socio           |
| 17 | `activity_campaigns`               | Calculator  | Config de campañas de difusión por socio       |
| 18 | `activity_generic_costs`           | Calculator  | Costes genéricos (web, equipment, artistic...) |
| 19 | `intake_programs`                  | Intake      | Convocatorias Erasmus+ disponibles             |
| 20 | `intake_contexts`                  | Intake      | Campos de contexto para IA                     |

---

## Diagrama de relaciones

```
users
 └──< projects
       ├──< partners
       │     ├──< partner_rates
       │     └──< worker_rates
       ├──< routes
       ├──< extra_destinations
       └──< work_packages
             └──< activities
                   ├──< activity_mobility
                   │     └──< activity_mobility_participants
                   ├──< activity_management
                   │     └──< activity_management_partners
                   ├──< activity_intellectual_outputs
                   ├──< activity_multiplier_events
                   ├──< activity_local_workshops
                   ├──< activity_campaigns
                   └──< activity_generic_costs

intake_programs (tabla de referencia, sin FK a projects)

intake_contexts
 └── project_id → projects.id
```

Lectura: `A ──< B` significa "un A tiene muchos B" (1:N).

---

## 1. users

Usuarios de la plataforma. Gestionada exclusivamente por Auth Central.
Ningún módulo escribe en esta tabla directamente — solo lee vía API.

```sql
CREATE TABLE users (
  id                  CHAR(36) NOT NULL PRIMARY KEY,
  email               VARCHAR(255) NOT NULL UNIQUE,
  password_hash       VARCHAR(255) NOT NULL,
  name                VARCHAR(150) NOT NULL,
  role                ENUM('admin','user','writer') NOT NULL DEFAULT 'user',
  subscription        ENUM('free','premium') NOT NULL DEFAULT 'free',
  email_verified      TINYINT(1) NOT NULL DEFAULT 0,
  created_at          DATETIME NOT NULL DEFAULT NOW(),
  updated_at          DATETIME NOT NULL DEFAULT NOW() ON UPDATE NOW()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

| Campo            | Tipo           | Descripción                                              |
|------------------|----------------|----------------------------------------------------------|
| `id`             | CHAR(36)       | UUID v4, generado en Node                                |
| `email`          | VARCHAR(255)   | Email del usuario, sirve como login. Único.               |
| `password_hash`  | VARCHAR(255)   | Hash bcrypt de la contraseña. Nunca texto plano.          |
| `name`           | VARCHAR(150)   | Nombre completo del usuario                              |
| `role`           | ENUM           | `admin` = administrador, `user` = usuario normal, `writer` = redactor profesional |
| `subscription`   | ENUM           | `free` = acceso básico, `premium` = acceso completo       |
| `email_verified` | TINYINT(1)     | 0 = no verificado, 1 = verificado                        |
| `created_at`     | DATETIME       | Fecha de registro                                        |
| `updated_at`     | DATETIME       | Última modificación                                      |

**Índices:**
```sql
-- El UNIQUE en email ya crea un índice
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_subscription ON users(subscription);
```

---

## 2. projects

Registro principal de un proyecto Erasmus+. Un usuario puede tener varios proyectos.
Un proyecto solo tiene un propietario (`user_id`).

```sql
CREATE TABLE projects (
  id                  CHAR(36) NOT NULL PRIMARY KEY,
  user_id             CHAR(36) NOT NULL,
  name                VARCHAR(100) NOT NULL,
  type                VARCHAR(60) NOT NULL,
  description         TEXT,
  start_date          DATE NOT NULL,
  duration_months     INT NOT NULL,
  deadline            DATE,
  eu_grant            DECIMAL(12,2) NOT NULL,
  cofin_pct           INT NOT NULL,
  indirect_pct        DECIMAL(5,2) NOT NULL,
  status              ENUM('draft','submitted','approved','rejected') NOT NULL DEFAULT 'draft',
  created_at          DATETIME NOT NULL DEFAULT NOW(),
  updated_at          DATETIME NOT NULL DEFAULT NOW() ON UPDATE NOW(),

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

| Campo             | Tipo          | Descripción                                              |
|-------------------|---------------|----------------------------------------------------------|
| `id`              | CHAR(36)      | UUID v4                                                  |
| `user_id`         | CHAR(36)      | FK → users.id — propietario del proyecto                 |
| `name`            | VARCHAR(100)  | Acrónimo del proyecto (ej. FOCUS)                        |
| `type`            | VARCHAR(60)   | Tipo de acción Erasmus+ (ej. KA3-Youth, KA220-VET)       |
| `description`     | TEXT          | Descripción breve del proyecto                           |
| `start_date`      | DATE          | Fecha de inicio prevista                                 |
| `duration_months` | INT           | Duración en meses                                        |
| `deadline`        | DATE          | Fecha límite de presentación de la solicitud             |
| `eu_grant`        | DECIMAL(12,2) | Subvención UE máxima solicitada (euros)                  |
| `cofin_pct`       | INT           | Porcentaje de cofinanciación UE (80 = 80%)               |
| `indirect_pct`    | DECIMAL(5,2)  | Porcentaje de costes indirectos (7 = 7%)                 |
| `status`          | ENUM          | Estado del proyecto en su ciclo de vida                  |
| `created_at`      | DATETIME      | Fecha de creación del registro                           |
| `updated_at`      | DATETIME      | Última modificación                                      |

**Índices:**
```sql
CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_type ON projects(type);
```

---

## 3. partners

Organizaciones del consorcio. Cada proyecto tiene al menos 2 socios.
El socio con `order_index = 1` es siempre el applicant (coordinador).

```sql
CREATE TABLE partners (
  id                  CHAR(36) NOT NULL PRIMARY KEY,
  project_id          CHAR(36) NOT NULL,
  name                VARCHAR(100) NOT NULL,
  legal_name          VARCHAR(200),
  city                VARCHAR(100),
  country             VARCHAR(100) NOT NULL,
  role                ENUM('applicant','partner') NOT NULL,
  order_index         INT NOT NULL,

  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

| Campo          | Tipo          | Descripción                                              |
|----------------|---------------|----------------------------------------------------------|
| `id`           | CHAR(36)      | UUID v4                                                  |
| `project_id`   | CHAR(36)      | FK → projects.id                                         |
| `name`         | VARCHAR(100)  | Acrónimo de la organización (ej. PERMA)                  |
| `legal_name`   | VARCHAR(200)  | Nombre legal completo                                    |
| `city`         | VARCHAR(100)  | Ciudad                                                   |
| `country`      | VARCHAR(100)  | País (en español: España, Francia, Italia...)            |
| `role`         | ENUM          | `applicant` = coordinador, `partner` = socio             |
| `order_index`  | INT           | Orden en el consorcio. 1 = coordinador.                  |

**Índices:**
```sql
CREATE INDEX idx_partners_project ON partners(project_id);
CREATE INDEX idx_partners_role ON partners(role);
```

---

## 4. partner_rates

Tarifas perdiem por socio, basadas en el grupo de coste Erasmus+ del país.
Cada socio tiene exactamente un registro de tarifas.

```sql
CREATE TABLE partner_rates (
  id                  CHAR(36) NOT NULL PRIMARY KEY,
  partner_id          CHAR(36) NOT NULL,
  accommodation_rate  DECIMAL(8,2) NOT NULL,
  subsistence_rate    DECIMAL(8,2) NOT NULL,

  FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

| Campo               | Tipo         | Descripción                                              |
|---------------------|--------------|----------------------------------------------------------|
| `id`                | CHAR(36)     | UUID v4                                                  |
| `partner_id`        | CHAR(36)     | FK → partners.id                                         |
| `accommodation_rate`| DECIMAL(8,2) | Tarifa diaria de alojamiento (€)                         |
| `subsistence_rate`  | DECIMAL(8,2) | Tarifa diaria de manutención (€)                         |

**Valores de referencia por grupo de coste:**

| Grupo | Alojamiento | Manutención | Ejemplo de países          |
|-------|-------------|-------------|----------------------------|
| A     | 125 €       | 55 €        | Dinamarca, Noruega, Suecia |
| B     | 115 €       | 45 €        | Francia, Italia, Alemania  |
| C     | 105 €       | 40 €        | España, Portugal, Grecia   |
| D     | 95 €        | 35 €        | Bulgaria, Rumanía          |

**Índices:**
```sql
CREATE UNIQUE INDEX idx_partner_rates_partner ON partner_rates(partner_id);
```

---

## 5. worker_rates

Tarifas diarias de personal por socio y categoría profesional.
Cada socio tiene 4 registros (uno por categoría).

```sql
CREATE TABLE worker_rates (
  id                  CHAR(36) NOT NULL PRIMARY KEY,
  partner_id          CHAR(36) NOT NULL,
  category            VARCHAR(60) NOT NULL,
  rate                DECIMAL(8,2) NOT NULL,

  FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

| Campo       | Tipo         | Descripción                                              |
|-------------|--------------|----------------------------------------------------------|
| `id`        | CHAR(36)     | UUID v4                                                  |
| `partner_id`| CHAR(36)     | FK → partners.id                                         |
| `category`  | VARCHAR(60)  | Categoría profesional (ver tabla abajo)                  |
| `rate`      | DECIMAL(8,2) | Tarifa diaria en euros                                   |

**Categorías estándar Erasmus+:**

| Categoría                          | Descripción                           |
|------------------------------------|---------------------------------------|
| `Manager`                          | Gestión y dirección del proyecto      |
| `Trainer/Researcher/Youth worker`  | Formación, investigación, trabajo juvenil |
| `Technician`                       | Soporte técnico y desarrollo          |
| `Administrative`                   | Apoyo administrativo                  |

**Índices:**
```sql
CREATE INDEX idx_worker_rates_partner ON worker_rates(partner_id);
```

---

## 6. routes

Rutas de viaje entre dos endpoints (ciudades de socios o destinos extra).
Usadas por el Calculator para calcular costes de viaje.

```sql
CREATE TABLE routes (
  id                  CHAR(36) NOT NULL PRIMARY KEY,
  project_id          CHAR(36) NOT NULL,
  endpoint_a          VARCHAR(60) NOT NULL,
  endpoint_b          VARCHAR(60) NOT NULL,
  distance_km         INT,
  eco_travel          TINYINT(1) NOT NULL DEFAULT 0,
  custom_rate         DECIMAL(8,2),
  distance_band       VARCHAR(20),

  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

| Campo           | Tipo         | Descripción                                              |
|-----------------|--------------|----------------------------------------------------------|
| `id`            | CHAR(36)     | UUID v4                                                  |
| `project_id`    | CHAR(36)     | FK → projects.id                                         |
| `endpoint_a`    | VARCHAR(60)  | Ciudad/socio de origen                                   |
| `endpoint_b`    | VARCHAR(60)  | Ciudad/socio de destino                                  |
| `distance_km`   | INT          | Distancia en kilómetros                                  |
| `eco_travel`    | TINYINT(1)   | 1 = viaje ecológico (tren, bus), 0 = avión               |
| `custom_rate`   | DECIMAL(8,2) | Tarifa personalizada si aplica                           |
| `distance_band` | VARCHAR(20)  | Banda de distancia CE (10-99, 100-499, 500-1999, etc.)   |

**Bandas de distancia Erasmus+ (viaje estándar):**

| Banda (km)     | Tarifa estándar | Tarifa eco-travel |
|----------------|-----------------|-------------------|
| 10 – 99        | 23 €            | —                 |
| 100 – 499      | 180 €           | 210 €             |
| 500 – 1.999    | 275 €           | 320 €             |
| 2.000 – 2.999  | 360 €           | 410 €             |
| 3.000 – 3.999  | 530 €           | 610 €             |
| 4.000 – 7.999  | 820 €           | —                 |
| ≥ 8.000        | 1.500 €         | —                 |

**Índices:**
```sql
CREATE INDEX idx_routes_project ON routes(project_id);
```

---

## 7. extra_destinations

Destinos de viaje que no son ciudades de socios del consorcio.
Por ejemplo: Bruselas para una reunión con la Comisión.

```sql
CREATE TABLE extra_destinations (
  id                  CHAR(36) NOT NULL PRIMARY KEY,
  project_id          CHAR(36) NOT NULL,
  name                VARCHAR(100) NOT NULL,
  country             VARCHAR(100),
  accommodation_rate  DECIMAL(8,2) NOT NULL,
  subsistence_rate    DECIMAL(8,2) NOT NULL,

  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

| Campo               | Tipo         | Descripción                                |
|---------------------|--------------|--------------------------------------------|
| `id`                | CHAR(36)     | UUID v4                                    |
| `project_id`        | CHAR(36)     | FK → projects.id                           |
| `name`              | VARCHAR(100) | Nombre del destino (ej. Bruselas)          |
| `country`           | VARCHAR(100) | País del destino                           |
| `accommodation_rate`| DECIMAL(8,2) | Tarifa de alojamiento aplicable (€)        |
| `subsistence_rate`  | DECIMAL(8,2) | Tarifa de manutención aplicable (€)        |

**Índices:**
```sql
CREATE INDEX idx_extra_dest_project ON extra_destinations(project_id);
```

---

## 8. work_packages

Paquetes de trabajo del proyecto. WP1 es siempre gestión y coordinación.
Cada WP tiene un socio líder y contiene una o más actividades.

```sql
CREATE TABLE work_packages (
  id                  CHAR(36) NOT NULL PRIMARY KEY,
  project_id          CHAR(36) NOT NULL,
  order_index         INT NOT NULL,
  code                VARCHAR(10) NOT NULL,
  title               VARCHAR(200) NOT NULL,
  category            VARCHAR(60),
  leader_id           CHAR(36),

  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (leader_id) REFERENCES partners(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

| Campo        | Tipo          | Descripción                                              |
|--------------|---------------|----------------------------------------------------------|
| `id`         | CHAR(36)      | UUID v4                                                  |
| `project_id` | CHAR(36)     | FK → projects.id                                         |
| `order_index`| INT           | Orden del WP (1, 2, 3...)                                |
| `code`       | VARCHAR(10)   | Código corto (WP1, WP2...)                               |
| `title`      | VARCHAR(200)  | Título descriptivo del WP                                |
| `category`   | VARCHAR(60)   | Categoría taxonómica (opcional)                          |
| `leader_id`  | CHAR(36)      | FK → partners.id — socio que lidera este WP              |

**Índices:**
```sql
CREATE INDEX idx_wp_project ON work_packages(project_id);
CREATE INDEX idx_wp_leader ON work_packages(leader_id);
```

---

## 9. activities

Actividades dentro de un Work Package. El campo `type` determina qué
tabla de detalle tiene datos asociados (ver sección "Tablas de detalle").

```sql
CREATE TABLE activities (
  id                  CHAR(36) NOT NULL PRIMARY KEY,
  wp_id               CHAR(36) NOT NULL,
  type                VARCHAR(20) NOT NULL,
  label               VARCHAR(200) NOT NULL,
  order_index         INT NOT NULL,

  FOREIGN KEY (wp_id) REFERENCES work_packages(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

| Campo        | Tipo          | Descripción                                              |
|--------------|---------------|----------------------------------------------------------|
| `id`         | CHAR(36)      | UUID v4                                                  |
| `wp_id`      | CHAR(36)      | FK → work_packages.id                                    |
| `type`       | VARCHAR(20)   | Tipo de actividad (ver tabla abajo)                      |
| `label`      | VARCHAR(200)  | Nombre descriptivo de la actividad                       |
| `order_index`| INT           | Orden dentro del WP                                      |

**Tipos de actividad y tabla de detalle asociada:**

| type            | Nombre en español          | Tabla de detalle                  |
|-----------------|----------------------------|-----------------------------------|
| `mgmt`          | Gestión y coordinación     | `activity_management`             |
| `meeting`       | Reunión transnacional      | `activity_mobility`               |
| `ltta`          | Movilidad larga duración   | `activity_mobility`               |
| `io`            | Resultado Intelectual      | `activity_intellectual_outputs`   |
| `me`            | Multiplier Event           | `activity_multiplier_events`      |
| `local_ws`      | Taller local               | `activity_local_workshops`        |
| `campaign`      | Campaña de difusión        | `activity_campaigns`              |
| `website`       | Web / Plataforma digital   | `activity_generic_costs`          |
| `artistic`      | Artistic Fees              | `activity_generic_costs`          |
| `extraordinary` | Gastos extraordinarios     | `activity_generic_costs`          |
| `equipment`     | Equipamiento               | `activity_generic_costs`          |
| `consumables`   | Consumibles                | `activity_generic_costs`          |
| `other`         | Otros costes               | `activity_generic_costs`          |

**Índices:**
```sql
CREATE INDEX idx_activities_wp ON activities(wp_id);
CREATE INDEX idx_activities_type ON activities(type);
```

---

## 10. activity_mobility

Configuración de actividades de movilidad (reuniones transnacionales y LTTA).
Aplica cuando `activities.type` = `meeting` o `ltta`.

```sql
CREATE TABLE activity_mobility (
  id                  CHAR(36) NOT NULL PRIMARY KEY,
  activity_id         CHAR(36) NOT NULL,
  host_partner_id     CHAR(36) NOT NULL,
  host_active         TINYINT(1) NOT NULL DEFAULT 1,
  pax_per_partner     INT NOT NULL,
  duration_days       INT NOT NULL,
  local_pax           INT NOT NULL DEFAULT 0,
  local_transport     DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  mat_cost_per_pax    DECIMAL(8,2) NOT NULL DEFAULT 0.00,

  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  FOREIGN KEY (host_partner_id) REFERENCES partners(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

| Campo              | Tipo         | Descripción                                              |
|--------------------|--------------|----------------------------------------------------------|
| `id`               | CHAR(36)     | UUID v4                                                  |
| `activity_id`      | CHAR(36)     | FK → activities.id                                       |
| `host_partner_id`  | CHAR(36)     | FK → partners.id — socio anfitrión                       |
| `host_active`      | TINYINT(1)   | 1 = el host participa como asistente, 0 = solo organiza  |
| `pax_per_partner`  | INT          | Participantes que envía cada socio                       |
| `duration_days`    | INT          | Duración en días                                         |
| `local_pax`        | INT          | Participantes locales (no viajan)                        |
| `local_transport`  | DECIMAL(8,2) | Coste de transporte local (€)                            |
| `mat_cost_per_pax` | DECIMAL(8,2) | Coste de materiales por participante (€)                 |

**Índices:**
```sql
CREATE UNIQUE INDEX idx_act_mob_activity ON activity_mobility(activity_id);
CREATE INDEX idx_act_mob_host ON activity_mobility(host_partner_id);
```

---

## 11. activity_mobility_participants

Qué socios participan en cada actividad de movilidad.
Tabla de relación N:M entre activities y partners.

```sql
CREATE TABLE activity_mobility_participants (
  activity_id         CHAR(36) NOT NULL,
  partner_id          CHAR(36) NOT NULL,
  active              TINYINT(1) NOT NULL DEFAULT 1,

  PRIMARY KEY (activity_id, partner_id),
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

| Campo        | Tipo      | Descripción                                              |
|--------------|-----------|----------------------------------------------------------|
| `activity_id`| CHAR(36) | FK → activities.id                                       |
| `partner_id` | CHAR(36) | FK → partners.id                                         |
| `active`     | TINYINT(1)| 1 = participa, 0 = no participa                         |

---

## 12. activity_management

Configuración de actividades de gestión y coordinación.
Aplica cuando `activities.type` = `mgmt`.

```sql
CREATE TABLE activity_management (
  id                  CHAR(36) NOT NULL PRIMARY KEY,
  activity_id         CHAR(36) NOT NULL,
  rate_applicant      DECIMAL(8,2) NOT NULL,
  rate_partner        DECIMAL(8,2) NOT NULL,

  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

| Campo            | Tipo         | Descripción                                              |
|------------------|--------------|----------------------------------------------------------|
| `id`             | CHAR(36)     | UUID v4                                                  |
| `activity_id`    | CHAR(36)     | FK → activities.id                                       |
| `rate_applicant` | DECIMAL(8,2) | Tarifa mensual del coordinador (€)                       |
| `rate_partner`   | DECIMAL(8,2) | Tarifa mensual de cada socio (€)                         |

**Índices:**
```sql
CREATE UNIQUE INDEX idx_act_mgmt_activity ON activity_management(activity_id);
```

---

## 13. activity_management_partners

Socios activos/inactivos en actividades de gestión.
Tabla de relación N:M entre activities y partners.

```sql
CREATE TABLE activity_management_partners (
  activity_id         CHAR(36) NOT NULL,
  partner_id          CHAR(36) NOT NULL,
  active              TINYINT(1) NOT NULL DEFAULT 1,

  PRIMARY KEY (activity_id, partner_id),
  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 14. activity_intellectual_outputs

Configuración de Resultados Intelectuales (IO) desglosada por socio.
Cada registro indica cuántos días trabaja un socio y con qué categoría.

```sql
CREATE TABLE activity_intellectual_outputs (
  id                  CHAR(36) NOT NULL PRIMARY KEY,
  activity_id         CHAR(36) NOT NULL,
  partner_id          CHAR(36) NOT NULL,
  days                INT NOT NULL,
  worker_category     VARCHAR(60),

  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

| Campo            | Tipo        | Descripción                                              |
|------------------|-------------|----------------------------------------------------------|
| `id`             | CHAR(36)    | UUID v4                                                  |
| `activity_id`    | CHAR(36)    | FK → activities.id                                       |
| `partner_id`     | CHAR(36)    | FK → partners.id                                         |
| `days`           | INT         | Días de trabajo asignados                                |
| `worker_category`| VARCHAR(60) | Categoría profesional (Manager, Trainer, etc.)           |

**Índices:**
```sql
CREATE INDEX idx_act_io_activity ON activity_intellectual_outputs(activity_id);
CREATE INDEX idx_act_io_partner ON activity_intellectual_outputs(partner_id);
```

---

## 15. activity_multiplier_events

Configuración de Multiplier Events desglosada por socio.

```sql
CREATE TABLE activity_multiplier_events (
  id                  CHAR(36) NOT NULL PRIMARY KEY,
  activity_id         CHAR(36) NOT NULL,
  partner_id          CHAR(36) NOT NULL,
  active              TINYINT(1) NOT NULL DEFAULT 1,
  local_pax           INT NOT NULL DEFAULT 0,
  intl_pax            INT NOT NULL DEFAULT 0,
  local_rate          DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  intl_rate           DECIMAL(8,2) NOT NULL DEFAULT 0.00,

  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

| Campo        | Tipo         | Descripción                                              |
|--------------|--------------|----------------------------------------------------------|
| `id`         | CHAR(36)     | UUID v4                                                  |
| `activity_id`| CHAR(36)    | FK → activities.id                                       |
| `partner_id` | CHAR(36)    | FK → partners.id                                         |
| `active`     | TINYINT(1)   | 1 = este socio organiza un ME, 0 = no                    |
| `local_pax`  | INT          | Participantes locales                                    |
| `intl_pax`   | INT          | Participantes internacionales                            |
| `local_rate` | DECIMAL(8,2) | Tarifa por participante local (€)                        |
| `intl_rate`  | DECIMAL(8,2) | Tarifa por participante internacional (€)                |

**Índices:**
```sql
CREATE INDEX idx_act_me_activity ON activity_multiplier_events(activity_id);
CREATE INDEX idx_act_me_partner ON activity_multiplier_events(partner_id);
```

---

## 16. activity_local_workshops

Configuración de talleres locales desglosada por socio.

```sql
CREATE TABLE activity_local_workshops (
  id                  CHAR(36) NOT NULL PRIMARY KEY,
  activity_id         CHAR(36) NOT NULL,
  partner_id          CHAR(36) NOT NULL,
  active              TINYINT(1) NOT NULL DEFAULT 1,
  participants        INT NOT NULL DEFAULT 0,
  sessions            INT NOT NULL DEFAULT 0,
  cost_per_pax        DECIMAL(8,2) NOT NULL DEFAULT 0.00,

  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

| Campo          | Tipo         | Descripción                                              |
|----------------|--------------|----------------------------------------------------------|
| `id`           | CHAR(36)     | UUID v4                                                  |
| `activity_id`  | CHAR(36)     | FK → activities.id                                       |
| `partner_id`   | CHAR(36)     | FK → partners.id                                         |
| `active`       | TINYINT(1)   | 1 = organiza talleres, 0 = no                            |
| `participants` | INT          | Número de participantes por sesión                       |
| `sessions`     | INT          | Número de sesiones                                       |
| `cost_per_pax` | DECIMAL(8,2) | Coste por participante (€)                               |

**Índices:**
```sql
CREATE INDEX idx_act_lw_activity ON activity_local_workshops(activity_id);
CREATE INDEX idx_act_lw_partner ON activity_local_workshops(partner_id);
```

---

## 17. activity_campaigns

Configuración de campañas de difusión desglosada por socio.

```sql
CREATE TABLE activity_campaigns (
  id                  CHAR(36) NOT NULL PRIMARY KEY,
  activity_id         CHAR(36) NOT NULL,
  partner_id          CHAR(36) NOT NULL,
  active              TINYINT(1) NOT NULL DEFAULT 1,
  monthly_amount      DECIMAL(8,2) NOT NULL DEFAULT 0.00,
  months              INT NOT NULL DEFAULT 0,
  cpm                 DECIMAL(8,2) NOT NULL DEFAULT 0.00,

  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

| Campo            | Tipo         | Descripción                                              |
|------------------|--------------|----------------------------------------------------------|
| `id`             | CHAR(36)     | UUID v4                                                  |
| `activity_id`    | CHAR(36)     | FK → activities.id                                       |
| `partner_id`     | CHAR(36)     | FK → partners.id                                         |
| `active`         | TINYINT(1)   | 1 = participa en la campaña, 0 = no                      |
| `monthly_amount` | DECIMAL(8,2) | Presupuesto mensual de la campaña (€)                    |
| `months`         | INT          | Duración de la campaña en meses                          |
| `cpm`            | DECIMAL(8,2) | Coste por mil impresiones (CPM) estimado                 |

**Índices:**
```sql
CREATE INDEX idx_act_camp_activity ON activity_campaigns(activity_id);
CREATE INDEX idx_act_camp_partner ON activity_campaigns(partner_id);
```

---

## 18. activity_generic_costs

Costes genéricos por socio. Usada por tipos: `website`, `artistic`,
`extraordinary`, `equipment`, `consumables`, `other`.

```sql
CREATE TABLE activity_generic_costs (
  id                  CHAR(36) NOT NULL PRIMARY KEY,
  activity_id         CHAR(36) NOT NULL,
  partner_id          CHAR(36) NOT NULL,
  active              TINYINT(1) NOT NULL DEFAULT 1,
  note                TEXT,
  amount              DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  project_pct         DECIMAL(5,2),
  lifetime_pct        DECIMAL(5,2),

  FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
  FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

| Campo         | Tipo          | Descripción                                              |
|---------------|---------------|----------------------------------------------------------|
| `id`          | CHAR(36)      | UUID v4                                                  |
| `activity_id` | CHAR(36)     | FK → activities.id                                       |
| `partner_id`  | CHAR(36)     | FK → partners.id                                         |
| `active`      | TINYINT(1)    | 1 = activo, 0 = no                                       |
| `note`        | TEXT          | Descripción/justificación del coste                      |
| `amount`      | DECIMAL(12,2) | Importe total del coste (€)                              |
| `project_pct` | DECIMAL(5,2)  | % de uso del recurso dedicado al proyecto                |
| `lifetime_pct`| DECIMAL(5,2)  | % de vida útil del recurso durante el proyecto           |

**Índices:**
```sql
CREATE INDEX idx_act_gc_activity ON activity_generic_costs(activity_id);
CREATE INDEX idx_act_gc_partner ON activity_generic_costs(partner_id);
```

---

## 19. intake_programs

Tabla de referencia con las convocatorias Erasmus+ disponibles en el sistema.
No tiene FK a projects — es datos maestros que el Intake lee.

```sql
CREATE TABLE intake_programs (
  id                  CHAR(36) NOT NULL PRIMARY KEY,
  program_id          VARCHAR(60) NOT NULL UNIQUE,
  name                VARCHAR(200) NOT NULL,
  action_type         VARCHAR(60) NOT NULL,
  deadline            DATE,
  start_date_min      DATE,
  start_date_max      DATE,
  duration_min_months INT,
  duration_max_months INT,
  eu_grant_max        DECIMAL(12,2),
  cofin_pct           INT,
  indirect_pct        DECIMAL(5,2),
  min_partners        INT NOT NULL DEFAULT 2,
  notes               TEXT,
  active              TINYINT(1) NOT NULL DEFAULT 1,
  created_at          DATETIME NOT NULL DEFAULT NOW()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

| Campo              | Tipo          | Descripción                                              |
|--------------------|---------------|----------------------------------------------------------|
| `id`               | CHAR(36)      | UUID v4                                                  |
| `program_id`       | VARCHAR(60)   | Identificador único legible (ej. `ka3_youth_together_2026`) |
| `name`             | VARCHAR(200)  | Nombre completo de la convocatoria                       |
| `action_type`      | VARCHAR(60)   | Tipo de acción Erasmus+ (ej. KA3-Youth)                  |
| `deadline`         | DATE          | Fecha límite de presentación                             |
| `start_date_min`   | DATE          | Fecha de inicio más temprana permitida                   |
| `start_date_max`   | DATE          | Fecha de inicio más tardía permitida                     |
| `duration_min_months` | INT        | Duración mínima en meses                                 |
| `duration_max_months` | INT        | Duración máxima en meses                                 |
| `eu_grant_max`     | DECIMAL(12,2) | Subvención UE máxima (€)                                 |
| `cofin_pct`        | INT           | Porcentaje de cofinanciación UE                          |
| `indirect_pct`     | DECIMAL(5,2)  | Porcentaje de costes indirectos                          |
| `min_partners`     | INT           | Mínimo de socios requerido                               |
| `notes`            | TEXT          | Notas adicionales de la convocatoria                     |
| `active`           | TINYINT(1)    | 1 = visible en el sistema, 0 = archivada                 |

**Dato inicial (KA3 Youth Together 2026):**
```sql
INSERT INTO intake_programs (id, program_id, name, action_type, deadline,
  start_date_min, start_date_max, duration_min_months, duration_max_months,
  eu_grant_max, cofin_pct, indirect_pct, min_partners, active)
VALUES (
  UUID(), 'ka3_youth_together_2026', 'KA3 Youth Together — European Youth Together 2026',
  'KA3-Youth', '2026-03-15', '2026-09-01', '2027-03-01',
  12, 24, 500000.00, 80, 7.00, 2, 1
);
```

---

## 20. intake_contexts

Campos de texto largo que el usuario rellena en el paso "Contexto" del Intake.
Son los inputs que consumirá la IA en módulos posteriores (Developer, Evaluator).

```sql
CREATE TABLE intake_contexts (
  id                  CHAR(36) NOT NULL PRIMARY KEY,
  project_id          CHAR(36) NOT NULL,
  problem             TEXT,
  target_groups       TEXT,
  approach            TEXT,
  created_at          DATETIME NOT NULL DEFAULT NOW(),
  updated_at          DATETIME NOT NULL DEFAULT NOW() ON UPDATE NOW(),

  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

| Campo           | Tipo     | Descripción                                              |
|-----------------|----------|----------------------------------------------------------|
| `id`            | CHAR(36) | UUID v4                                                  |
| `project_id`    | CHAR(36) | FK → projects.id — un registro por proyecto              |
| `problem`       | TEXT     | Problema o necesidad identificada (200-500 palabras)     |
| `target_groups` | TEXT     | Grupos destinatarios directos e indirectos (150-400 palabras) |
| `approach`      | TEXT     | Enfoque y propuesta de valor transnacional (200-500 palabras) |
| `created_at`    | DATETIME | Fecha de creación                                        |
| `updated_at`    | DATETIME | Última modificación                                      |

**Índices:**
```sql
CREATE UNIQUE INDEX idx_intake_ctx_project ON intake_contexts(project_id);
```

---

## Cómo añadir tablas nuevas desde un módulo

Cuando un módulo necesita tablas propias (ej. Planner necesita `timeline_phases`):

1. **El módulo define su migración** en su propio repo (`mod-planner/migrations/001_create_tables.sql`)
2. **Usa la nomenclatura canónica** de este documento: snake_case, inglés, FKs con CASCADE
3. **Los campos compartidos** (project_id, partner_id, activity_id) usan CHAR(36) y referencian las tablas de este schema
4. **Cuando la migración está probada**, se añade la tabla a este SCHEMA.md con su documentación completa
5. **El Core siempre tiene la última versión** — si hay contradicción entre el módulo y el Core, el Core manda

**Regla:** ningún módulo crea tablas que ya existen en el Core. Si necesita un campo nuevo en una tabla existente, se propone como cambio al schema y se añade aquí primero.

---

## Script completo de creación

Para crear toda la BD desde cero, ejecutar las sentencias SQL de las secciones 1-20 en orden.
El orden importa por las foreign keys:

```
1.  users
2.  projects                    (FK → users)
3.  partners                    (FK → projects)
4.  partner_rates               (FK → partners)
5.  worker_rates                (FK → partners)
6.  routes                      (FK → projects)
7.  extra_destinations          (FK → projects)
8.  work_packages               (FK → projects, partners)
9.  activities                  (FK → work_packages)
10. activity_mobility           (FK → activities, partners)
11. activity_mobility_participants (FK → activities, partners)
12. activity_management         (FK → activities)
13. activity_management_partners (FK → activities, partners)
14. activity_intellectual_outputs (FK → activities, partners)
15. activity_multiplier_events  (FK → activities, partners)
16. activity_local_workshops    (FK → activities, partners)
17. activity_campaigns          (FK → activities, partners)
18. activity_generic_costs      (FK → activities, partners)
19. intake_programs             (sin FK — datos de referencia)
20. intake_contexts             (FK → projects)
```

---

*Actualiza este documento cada vez que se añada, modifique o elimine una tabla.*
