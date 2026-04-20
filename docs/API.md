# API.md — Convenciones de la API REST del ecosistema E+ Tools

> Fuente de verdad de cómo se comunican el frontend y Node.
> Cuando hay contradicción entre este archivo y cualquier módulo, este archivo tiene razón.
> Última actualización: 3 de abril de 2026

---

## Principio fundamental

> **Frontend pregunta. Node decide. MySQL recuerda.**

- El frontend nunca accede a MySQL directamente. Siempre pasa por la API de Node.
- Node nunca genera HTML. Solo responde JSON.
- La comunicación es siempre: Frontend → fetch() → Node → JSON response → Frontend renderiza.

---

## Base URL

Todos los módulos comparten un único servidor Express y un único dominio. Las rutas se organizan por prefijo de módulo:

```
https://intake.eufundingschool.com/v1/{modulo}/{recurso}
```

| Módulo | Prefijo de ruta |
|---|---|
| Auth Central | `/v1/auth/` |
| Intake (M0) | `/v1/intake/` |
| Calculator (M1) | `/v1/calculator/` |
| Planner (M2) | `/v1/planner/` |
| Developer (M3) | `/v1/developer/` |
| Evaluator (M4) | `/v1/evaluator/` |
| Partners (M5) | `/v1/partners-db/` |

**Nota sobre Partners:** el prefijo es `/v1/partners-db/` (no `/v1/partners/`) para no colisionar con el recurso `partners` que vive dentro de `projects` (ej. `/v1/intake/projects/{id}/partners`). El módulo Partners (M5) gestiona la base de datos global de organizaciones, no los socios de un proyecto.

**Regla de versionado:** todas las URLs empiezan con `/v1/`. Si en el futuro hay breaking changes, se crea `/v2/` manteniendo `/v1/` activo hasta migrar.

---

## Formato de URLs

### Convenciones

- **Recursos en plural, inglés, kebab-case** si son compuestos.
- **IDs en la URL**, nunca como query param para identificar un recurso.
- **Jerarquía anidada** cuando un recurso pertenece a otro, máximo 2 niveles de anidación.
- **Prefijo de módulo** siempre presente después de `/v1/`.

### Estructura

```
GET    /v1/{modulo}/{recurso}                      → Listar
GET    /v1/{modulo}/{recurso}/{id}                 → Obtener uno
POST   /v1/{modulo}/{recurso}                      → Crear
PATCH  /v1/{modulo}/{recurso}/{id}                 → Actualizar parcial (autosave)
PUT    /v1/{modulo}/{recurso}/{id}                 → Reemplazar completo
DELETE /v1/{modulo}/{recurso}/{id}                 → Eliminar
```

### Recursos anidados

Cuando un recurso pertenece a otro (ej: partners dentro de un project):

```
GET    /v1/intake/projects/{project_id}/partners
POST   /v1/intake/projects/{project_id}/partners
PATCH  /v1/intake/partners/{partner_id}
DELETE /v1/intake/partners/{partner_id}
```

**Regla:** la creación y el listado van anidados (para saber a quién pertenecen). La lectura, actualización y eliminación van planas (solo necesitan el ID del recurso).

### Recursos compartidos entre módulos

Algunos recursos (projects, partners) se crean en un módulo pero se leen desde otros. En esos casos, cada módulo accede a los datos a través de sus propias rutas, pero las queries van a las mismas tablas MySQL:

```
# Intake crea el proyecto
POST   /v1/intake/projects

# Calculator lee ese mismo proyecto para calcular presupuesto
GET    /v1/calculator/projects/{id}

# Ambos tocan la misma tabla `projects` en MySQL
```

### Ejemplos de endpoints reales

```
# Auth (compartido, sin prefijo de módulo)
POST   /v1/auth/register
POST   /v1/auth/login
POST   /v1/auth/refresh
GET    /v1/auth/me

# Intake (M0)
GET    /v1/intake/programs                           → Convocatorias disponibles
GET    /v1/intake/projects                           → Proyectos del usuario
GET    /v1/intake/projects/{id}                      → Un proyecto
POST   /v1/intake/projects                           → Crear proyecto
PATCH  /v1/intake/projects/{id}                      → Actualizar campo(s)
DELETE /v1/intake/projects/{id}                      → Eliminar proyecto
GET    /v1/intake/projects/{id}/partners             → Socios del proyecto
POST   /v1/intake/projects/{id}/partners             → Añadir socio
PATCH  /v1/intake/partners/{id}                      → Editar socio
DELETE /v1/intake/partners/{id}                      → Eliminar socio
GET    /v1/intake/projects/{id}/context              → Contexto del proyecto
PATCH  /v1/intake/contexts/{id}                      → Actualizar contexto

# Calculator (M1)
GET    /v1/calculator/projects/{id}/partner-rates    → Tarifas del proyecto
PATCH  /v1/calculator/partner-rates/{id}             → Actualizar tarifa
GET    /v1/calculator/projects/{id}/worker-rates     → Tarifas de personal
PATCH  /v1/calculator/worker-rates/{id}              → Actualizar tarifa
GET    /v1/calculator/projects/{id}/routes           → Rutas de viaje
POST   /v1/calculator/projects/{id}/routes           → Crear ruta
PATCH  /v1/calculator/routes/{id}                    → Editar ruta
DELETE /v1/calculator/routes/{id}                    → Eliminar ruta
GET    /v1/calculator/projects/{id}/work-packages    → WPs del proyecto
POST   /v1/calculator/projects/{id}/work-packages    → Crear WP
PATCH  /v1/calculator/work-packages/{id}             → Editar WP
DELETE /v1/calculator/work-packages/{id}             → Eliminar WP
GET    /v1/calculator/work-packages/{id}/activities  → Actividades del WP
POST   /v1/calculator/work-packages/{id}/activities  → Crear actividad
PATCH  /v1/calculator/activities/{id}                → Editar actividad
DELETE /v1/calculator/activities/{id}                → Eliminar actividad

# Partners DB (M5)
GET    /v1/partners-db/organizations                 → Buscar organizaciones
GET    /v1/partners-db/organizations/{id}            → Detalle organización
POST   /v1/partners-db/organizations                 → Crear organización
PATCH  /v1/partners-db/organizations/{id}            → Editar organización
```

---

## Cómo se registran las rutas en server.js

Cada módulo exporta un router Express. Se montan en server.js con su prefijo:

```javascript
// Auth (sin prefijo de módulo)
app.use('/v1/auth', require('./node/src/modules/auth/routes'));

// Módulos
app.use('/v1/intake', require('./node/src/modules/intake/routes'));
app.use('/v1/calculator', require('./node/src/modules/calculator/routes'));
app.use('/v1/planner', require('./node/src/modules/planner/routes'));
app.use('/v1/developer', require('./node/src/modules/developer/routes'));
app.use('/v1/evaluator', require('./node/src/modules/evaluator/routes'));
app.use('/v1/partners-db', require('./node/src/modules/partners/routes'));
```

---

## Formato de respuesta JSON

Todas las respuestas siguen exactamente uno de estos dos formatos: **éxito** o **error**. No hay excepciones.

### Respuesta exitosa

```json
{
  "ok": true,
  "data": { ... }
}
```

- `ok`: siempre `true` en respuestas 2xx.
- `data`: el payload. Puede ser un objeto, un array, o `null` (para DELETE).

### Respuesta exitosa con lista

```json
{
  "ok": true,
  "data": [ ... ],
  "meta": {
    "total": 42,
    "page": 1,
    "per_page": 20
  }
}
```

- `meta`: solo presente en listados paginados.

### Respuesta de error

```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "El campo 'name' es obligatorio",
    "details": [
      {
        "field": "name",
        "message": "Este campo es obligatorio"
      }
    ]
  }
}
```

- `ok`: siempre `false` en respuestas 4xx/5xx.
- `error.code`: código máquina en UPPER_SNAKE_CASE.
- `error.message`: mensaje legible para el desarrollador (no para el usuario final).
- `error.details`: array opcional con errores por campo (para validación de formularios).

---

## Códigos de error estándar

| Código HTTP | error.code | Cuándo |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Datos del body no pasan validación |
| 400 | `BAD_REQUEST` | Request malformado (JSON inválido, params incorrectos) |
| 401 | `UNAUTHORIZED` | Token ausente o expirado |
| 403 | `FORBIDDEN` | Token válido pero sin permiso para esta acción |
| 404 | `NOT_FOUND` | Recurso no existe |
| 409 | `CONFLICT` | Conflicto de datos (ej: email ya registrado) |
| 422 | `UNPROCESSABLE` | Datos válidos pero lógica de negocio los rechaza |
| 429 | `RATE_LIMITED` | Demasiadas peticiones |
| 500 | `INTERNAL_ERROR` | Error del servidor (nunca exponer stack traces) |

**Regla:** el frontend nunca muestra `error.message` al usuario final. El frontend traduce `error.code` y `error.details` a mensajes en español para la UI.

---

## Autenticación

### JWT (JSON Web Token)

Toda la autenticación se gestiona desde el módulo Auth. Los tokens se emiten al hacer login y se envían en cada request.

### Flujo de autenticación

```
1. Usuario hace login
   POST /v1/auth/login
   Body: { "email": "...", "password": "..." }
   Response: { "ok": true, "data": { "access_token": "...", "refresh_token": "..." } }

2. El frontend almacena los tokens en cookie httpOnly (nunca en localStorage)

3. En cada request a cualquier endpoint:
   Header: Authorization: Bearer {access_token}

4. Si el access_token expira (401):
   POST /v1/auth/refresh
   Body: { "refresh_token": "..." }
   Response: nuevo access_token

5. Si el refresh_token también expira:
   Redirigir al login
```

### Estructura del JWT

```json
{
  "sub": "uuid-del-usuario",
  "email": "user@example.com",
  "name": "Nombre del usuario",
  "role": "user",
  "subscription": "premium",
  "iat": 1712000000,
  "exp": 1712003600
}
```

- **access_token:** expira en 1 hora.
- **refresh_token:** expira en 30 días.
- **Firmado con:** HS256 y el JWT_SECRET compartido (en .env).

### Headers obligatorios en cada request

```
Authorization: Bearer {access_token}
Content-Type: application/json
Accept: application/json
```

---

## Validación

### Dónde se valida

- **Node valida todo.** Cada endpoint valida los datos del body antes de tocar la BD.
- **El frontend puede validar en cliente** para UX (feedback inmediato), pero la validación real es siempre en Node.
- **Nunca confiar en datos del cliente.** Validar tipos, rangos, formatos y permisos en el servidor.

### Reglas de validación comunes

| Campo | Validación |
|---|---|
| `id` (UUID) | CHAR(36), formato UUID v4 |
| `email` | Formato email válido, max 255 chars |
| `name` / `label` | String, trim, min 1, max según SCHEMA |
| Importes (`DECIMAL`) | Número >= 0, max 2 decimales |
| Porcentajes (`INT`) | Entero entre 0 y 100 |
| Fechas (`DATE`) | Formato ISO YYYY-MM-DD |
| Booleanos | 0 o 1 (TINYINT), no true/false |
| `order_index` | Entero >= 1 |
| Enums | Uno de los valores permitidos en SCHEMA |

---

## Paginación

### Cuándo paginar

- **Siempre** en endpoints de listado que puedan devolver más de 50 registros.
- **Nunca** en endpoints donde el máximo es pequeño y conocido (ej: partners de un proyecto, máximo ~10).

### Formato

Request:
```
GET /v1/intake/projects?page=2&per_page=20
```

Response:
```json
{
  "ok": true,
  "data": [ ... ],
  "meta": {
    "total": 42,
    "page": 2,
    "per_page": 20,
    "total_pages": 3
  }
}
```

- **per_page por defecto:** 20.
- **per_page máximo:** 100.
- Si no se envía `page`, se asume `page=1`.

---

## Filtrado y ordenación

### Filtrado

Por query params con el nombre del campo:

```
GET /v1/intake/projects?status=draft&type=KA3-Youth
```

### Ordenación

```
GET /v1/intake/projects?sort=created_at&order=desc
```

- `sort`: nombre del campo.
- `order`: `asc` o `desc` (por defecto `desc` para fechas, `asc` para nombres).

---

## Autosave (PATCH parcial)

El autosave del frontend (ver UX.md) usa PATCH para enviar solo los campos que cambiaron:

### Request

```
PATCH /v1/intake/projects/uuid-del-proyecto
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "FOCUS v2"
}
```

### Response

```json
{
  "ok": true,
  "data": {
    "id": "uuid-del-proyecto",
    "name": "FOCUS v2",
    "updated_at": "2026-04-02T14:30:00.000Z"
  }
}
```

**Regla:** PATCH devuelve solo los campos actualizados + `id` + `updated_at`. No devuelve el objeto completo (ahorra ancho de banda en autosave frecuente).

---

## Operaciones en lote (bulk)

Para listas dinámicas (reordenar socios, actividades), se usa un endpoint de bulk:

### Reordenar

```
PATCH /v1/intake/projects/{id}/partners/reorder
Content-Type: application/json

{
  "order": [
    { "id": "uuid-socio-1", "order_index": 1 },
    { "id": "uuid-socio-2", "order_index": 2 },
    { "id": "uuid-socio-3", "order_index": 3 }
  ]
}
```

Response: `{ "ok": true, "data": null }`

---

## Rate limiting

### Límites por defecto

| Tipo de endpoint | Límite |
|---|---|
| Login / Register | 5 requests por minuto por IP |
| API general (con auth) | 120 requests por minuto por usuario |
| Autosave (PATCH) | 60 requests por minuto por usuario |

### Response cuando se excede

```
HTTP 429 Too Many Requests

{
  "ok": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Try again in 45 seconds."
  }
}
```

Header adicional: `Retry-After: 45`

---

## CORS

Un solo origen permitido (el dominio de la aplicación):

```javascript
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://intake.eufundingschool.com',
  credentials: true
}));
```

**Regla:** nunca usar `origin: '*'` en producción. En desarrollo local se puede usar `localhost:PORT`.

---

## Seguridad en endpoints

### Headers de seguridad (Helmet.js)

```javascript
const helmet = require('helmet');
app.use(helmet());
```

### Protección contra ataques comunes

- **SQL Injection:** usar prepared statements / parameterized queries. Nunca concatenar strings en SQL.
- **XSS:** Node no genera HTML, pero sanitizar cualquier dato que se almacene como TEXT.
- **Body parsing:** limitar tamaño del body a 1 MB (`express.json({ limit: '1mb' })`).

---

## Logging

### Qué se loguea

- Cada request: método, URL, status code, duración en ms.
- Errores 5xx: stack trace completo (solo en logs del servidor, nunca en la respuesta).
- Eventos de auth: login exitoso, login fallido, refresh, logout.

### Formato de log

```
[2026-04-03T14:30:00.000Z] POST /v1/auth/login 200 45ms
[2026-04-03T14:30:01.000Z] PATCH /v1/intake/projects/abc-123 200 12ms
[2026-04-03T14:30:02.000Z] GET /v1/calculator/projects/xyz-999 404 3ms
```

---

## Entornos

| Entorno | Base URL | BD | Notas |
|---|---|---|---|
| Producción | `intake.eufundingschool.com` | MySQL producción (Coolify) | Solo deploys desde main |
| Desarrollo | `localhost:3000` | MySQL local o de test | Para desarrollo local |

- Las variables de entorno (`DB_HOST`, `JWT_SECRET`, `PORT`, etc.) se gestionan desde Coolify, nunca hardcodeadas.

---

*Actualiza este documento cada vez que se añada una convención, un endpoint compartido o una regla de la API.*
