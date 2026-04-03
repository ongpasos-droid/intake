# CLAUDE.md — Instrucciones para agentes Claude Code

> Este archivo lo lee cualquier agente Claude Code antes de tocar nada.
> Define qué leer, en qué orden, qué no tocar nunca y cómo trabajar.
> Última actualización: 3 de abril de 2026

---

## Antes de hacer nada

Cuando abras una sesión de trabajo en el ecosistema E+ Tools:

1. **Lee este archivo completo.**
2. **Lee los documentos del Core** en este orden:
   - `SCHEMA.md` — modelo de datos (tablas, campos, relaciones)
   - `DESIGN.md` — sistema visual (colores, tipografía, componentes)
   - `UX.md` — comportamiento de la interfaz (wizards, autosave, navegación)
   - `API.md` — convenciones de endpoints y comunicación frontend↔Node
3. **Lee el README.md del módulo** en el que vas a trabajar si existe (`node/src/modules/{modulo}/README.md`).
4. **Pregunta al humano en qué paso estamos y qué tarea toca hoy.** No empieces a construir hasta que te lo confirme.

---

## Arquitectura: Monorepo

E+ Tools es un **monorepo** — un solo repositorio (`ongpasos-droid/eplus-tools`) que contiene todos los módulos de la plataforma.

### Por qué monorepo

- Un solo desarrollador (no necesita la complejidad de microservicios).
- Todos los módulos comparten la misma base de datos, el mismo auth y el mismo diseño visual.
- Un solo contenedor Docker, un solo deploy, un solo dominio.
- Los cambios transversales (auth, schema, diseño) se hacen en un solo lugar.

### Un solo proceso Node.js

Todos los módulos corren dentro de un único servidor Express. Las rutas se organizan por prefijo de módulo:

```
/v1/auth/*          → Autenticación (compartido)
/v1/intake/*        → Módulo Intake (M0)
/v1/calculator/*    → Módulo Calculator (M1)
/v1/planner/*       → Módulo Planner (M2)
/v1/developer/*     → Módulo Developer (M3)
/v1/evaluator/*     → Módulo Evaluator (M4)
/v1/partners/*      → Módulo Partners (M5)
```

### Un solo frontend SPA

El frontend es una SPA servida como archivos estáticos desde `public/`. La navegación entre módulos se hace por cambio de panel (JS), no por cambio de subdominio.

---

## La regla que nunca se rompe

> **Frontend pregunta. Node decide. MySQL recuerda.**

- Frontend (HTML/JS): solo vistas y formularios. Nunca lógica de negocio.
- Node.js (Express): API REST, auth, procesamiento. Nunca genera HTML.
- MySQL: datos centrales compartidos. Un solo schema, una sola BD (`eplus_tools`).

---

## Estructura del monorepo

```
eplus-tools/
├── server.js                    # Entry point — Express server
├── package.json                 # Dependencias compartidas
├── Dockerfile                   # Imagen Docker para Coolify
├── .env.example                 # Variables de entorno (template)
├── .gitignore
│
├── node/                        # Backend Node.js
│   └── src/
│       ├── middleware/           # Auth JWT, validación, rate limiting
│       │   ├── auth.js
│       │   └── validate.js
│       ├── utils/               # Helpers compartidos
│       │   ├── db.js            # Pool MySQL (mysql2/promise)
│       │   └── uuid.js          # Generador UUID v4
│       └── modules/             # Cada módulo es una carpeta
│           ├── auth/            # Auth Central (compartido)
│           │   ├── routes.js
│           │   ├── controller.js
│           │   └── model.js
│           ├── intake/          # M0 — Intake
│           │   ├── routes.js
│           │   ├── controller.js
│           │   └── model.js
│           ├── calculator/      # M1 — Calculator
│           ├── planner/         # M2 — Planner
│           ├── developer/       # M3 — Developer
│           ├── evaluator/       # M4 — Evaluator
│           └── partners/        # M5 — Partners
│
├── public/                      # Frontend SPA (archivos estáticos)
│   ├── index.html               # Shell principal + router JS
│   ├── css/                     # Estilos globales
│   ├── js/                      # Lógica frontend por módulo
│   │   ├── app.js               # Router SPA + estado global
│   │   ├── api.js               # Cliente HTTP para la API
│   │   ├── intake.js            # Vistas del módulo Intake
│   │   ├── calculator.js        # Vistas del módulo Calculator
│   │   └── ...
│   └── assets/                  # Imágenes, fuentes locales
│
├── migrations/                  # SQL de migración (en orden)
│   ├── 001_core_tables.sql
│   ├── 002_intake_tables.sql
│   └── ...
│
├── scripts/                     # Utilidades de desarrollo
│   └── migrate.js               # Ejecuta migraciones SQL en orden
│
└── docs/                        # Documentación del Core
    ├── CLAUDE.md                # Este archivo
    ├── SCHEMA.md                # Modelo de datos
    ├── DESIGN.md                # Sistema visual
    ├── UX.md                    # Comportamiento de la interfaz
    └── API.md                   # Convenciones de la API REST
```

---

## Los módulos del ecosistema

| ID  | Módulo     | Nombre público | Qué hace |
|-----|------------|----------------|----------|
| M0  | intake     | Intake         | Crear proyectos nuevos: programa, datos, consorcio, contexto |
| M1  | calculator | Calculator     | Presupuesto: tarifas, rutas, WPs, actividades, cálculo |
| M2  | planner    | Planner        | Planificación temporal: fases, asignación, Gantt |
| M3  | developer  | Developer      | Redactor de la propuesta narrativa |
| M4  | evaluator  | Evaluator      | Auto-evaluación contra criterios de la convocatoria |
| M5  | partners   | Partners       | Base de datos de entidades/organizaciones (PIF) |

Todos comparten: auth (JWT), base de datos (`eplus_tools`), diseño visual (DESIGN.md) y dominio (`intake.eufundingschool.com` — se renombrará a `app.eufundingschool.com` cuando estén todos activos).

---

## Nomenclatura obligatoria

- **Tablas y campos:** inglés, snake_case (ver SCHEMA.md)
- **Entidades canónicas:** project, partner, work_package, activity, route, partner_rate, worker_rate, extra_destination, user
- **IDs:** CHAR(36) con UUID v4, generado en Node (nunca en MySQL)
- **Importes:** DECIMAL(12,2), siempre en euros
- **Porcentajes:** INT (80, no 0.8), excepto campos que necesitan decimales → DECIMAL(5,2)
- **Fechas:** DATE en formato ISO (YYYY-MM-DD)
- **Booleanos:** TINYINT(1) — 0 = false, 1 = true
- **Convenciones de commit:** prefijos feat/ fix/ data/ docs/ auth/ infra/
- **Nombres de archivo:** kebab-case para archivos de código, UPPER_CASE.md para docs del Core
- **Carpetas de módulo:** minúsculas, sin prefijo (`intake/`, no `mod-intake/`)

---

## Lo que nunca se hace

Estas son decisiones cerradas. No se discuten, no se cambian, no se proponen alternativas:

1. **Nunca empezar una herramienta sin auth central funcionando.**
2. **Nunca poner lógica de negocio en el frontend.**
3. **Nunca generar HTML desde Node.**
4. **Nunca acceder a MySQL desde el frontend directamente** — siempre a través de la API Node.
5. **Nunca editar el SCHEMA del Core directamente.** Los cambios se proponen en migración.
6. **Nunca crear tablas que ya existen en el Core** desde un módulo.
7. **Nunca crear sistemas de login separados por módulo.** Auth es uno solo, JWT compartido.
8. **Nunca diseñar el boilerplate sin tener antes una app real construida.**
9. **Nunca hardcodear credenciales, tokens o secrets** — siempre en .env.
10. **Nunca usar `origin: '*'` en CORS** en producción.
11. **Nunca exponer stack traces en respuestas de error** al cliente.
12. **Nunca construir lo que ya existe** (Moodle, LearnDash, sistema de pagos, comunidad).
13. **Nunca crear repos o contenedores separados por módulo.** Todo va en el monorepo.
14. **Si hay dudas, parar y preguntar.** Nunca tomar decisiones ambiguas sin confirmar con el humano.

---

## Cómo trabajar con el código

### Crear un endpoint nuevo

1. Verificar en SCHEMA.md que la tabla existe y los campos son correctos.
2. Verificar en API.md que la convención de URL es correcta.
3. Crear o editar archivos en `node/src/modules/{modulo}/` — routes.js, controller.js, model.js.
4. Registrar las rutas en `server.js` si es un módulo nuevo.
5. Formato de respuesta: siempre `{ "ok": true, "data": ... }` o `{ "ok": false, "error": ... }`.
6. Añadir el endpoint a la documentación local del módulo.

### Crear una vista frontend

1. Leer DESIGN.md para colores, tipografía y componentes.
2. Leer UX.md para comportamiento (wizard, autosave, errores).
3. El frontend llama a la API Node (fetch), recibe JSON, renderiza HTML dinámicamente.
4. Nunca poner lógica de negocio en la vista.
5. Usar las clases de Tailwind definidas en DESIGN.md.

### Añadir un módulo nuevo

1. Crear carpeta `node/src/modules/{nombre}/` con routes.js, controller.js, model.js.
2. Registrar las rutas en `server.js`: `app.use('/v1/{nombre}', require('./node/src/modules/{nombre}/routes'))`.
3. Crear las migraciones SQL necesarias en `migrations/`.
4. Crear la vista frontend en `public/js/{nombre}.js`.
5. Añadir la entrada en la navegación sidebar (ver UX.md).
6. Documentar en README.md del módulo.

### Modificar una tabla existente

1. Crear migración SQL en `migrations/` con número secuencial (`NNN_descripcion.sql`).
2. Probar la migración en desarrollo.
3. Cuando esté validada, actualizar SCHEMA.md del Core.

### Crear una tabla nueva

1. Seguir las reglas de SCHEMA.md: snake_case, inglés, FKs con CASCADE.
2. Los campos compartidos (project_id, partner_id, activity_id) usan CHAR(36) y referencian tablas del Core.
3. Crear migración en `migrations/`.
4. Documentar la tabla completa en SCHEMA.md.

---

## Infraestructura

### Repositorio

- **GitHub:** `ongpasos-droid/eplus-tools`
- **Branch principal:** `main`
- **Auto-deploy:** push a main → webhook GitHub → Coolify → rebuild contenedor

### Servidor (VPS)

- **Coolify** gestiona el contenedor Docker.
- **Contenedor:** Node.js 20 Alpine, puerto 3000 (mapeado a 3006 en el host).
- **Dominio actual:** `https://intake.eufundingschool.com`
- **SSL:** Let's Encrypt, auto-renovación.
- **MySQL:** contenedor separado (wordpress-eufunding-db-1), red Docker compartida `coolify`.
- **BD:** `eplus_tools` en MySQL 8.0.

### Variables de entorno (en Coolify)

```
DB_HOST=wordpress-eufunding-db-1
DB_PORT=3306
DB_USER=root
DB_PASS=(en Coolify)
DB_NAME=eplus_tools
JWT_SECRET=(en Coolify)
PORT=3000
CORS_ORIGIN=https://intake.eufundingschool.com
```

---

## Los dos entornos de trabajo

### Cowork-Claude (con humano presente)

- El humano está al volante. Toma decisiones, revisa, itera.
- Para construcción activa y decisiones de diseño.
- **Puede:** tomar decisiones menores, proponer alternativas, hacer preguntas.
- **Workflow:** escribir código → push automático a GitHub → Coolify redeploy → revisar en URL.

### VPS-Claude (sin humano presente)

- Trabaja solo en el servidor. Sin supervisión.
- **Solo ejecuta tareas donde todas las decisiones ya están tomadas.**
- **Nunca toma decisiones ambiguas.** Si algo no está claro, para y lo registra.
- **Puede:** ejecutar deploys, correr tests, generar migraciones predefinidas.
- **No puede:** cambiar arquitectura, crear tablas nuevas, modificar el Core.

### Handoff entre entornos

Al terminar cada sesión, el agente actualiza el archivo de estado con:
- Qué se hizo en esta sesión.
- Qué falta por hacer.
- Qué decisiones quedan pendientes para el humano.

---

## Orden de lectura rápida

Si tienes prisa y no puedes leer todo, este es el orden de prioridad:

1. **Este archivo (CLAUDE.md)** — las reglas del juego
2. **SCHEMA.md** — sin esto no puedes tocar la BD
3. **API.md** — sin esto no puedes crear endpoints
4. **DESIGN.md** — sin esto no puedes crear vistas
5. **UX.md** — sin esto no puedes diseñar flujos

---

## Checklist antes de hacer commit

- [ ] ¿El código sigue la regla Frontend pregunta / Node decide / MySQL recuerda?
- [ ] ¿Los nombres de tabla y campo siguen la nomenclatura del SCHEMA.md?
- [ ] ¿Los endpoints siguen las convenciones de API.md (prefijo de módulo)?
- [ ] ¿Las vistas usan los componentes y colores de DESIGN.md?
- [ ] ¿Los formularios siguen los patrones de UX.md (wizard, autosave, validación)?
- [ ] ¿Las credenciales están en .env y no en el código?
- [ ] ¿El commit tiene prefijo correcto (feat/ fix/ data/ docs/ auth/ infra/)?
- [ ] ¿El código nuevo está en la carpeta de módulo correcta (`node/src/modules/{modulo}/`)?
- [ ] ¿Se ha registrado el módulo en server.js si es nuevo?

---

*Actualiza este documento cada vez que se añada una regla, un módulo o un flujo de trabajo.*
