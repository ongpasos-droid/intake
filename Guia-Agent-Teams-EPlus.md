# Guía: Equipos de Agentes IA para E+ Tools

> Documento de referencia — Abril 2026
> Cubre teoría, patrones de arquitectura y diseño práctico para el proyecto E+ Tools

---

## 1. El concepto: qué es un equipo de agentes

Un equipo de agentes es un grupo de instancias de IA que trabajan coordinadas en una tarea compleja. En lugar de un solo agente que lo hace todo (y se pierde en el contexto), divides el trabajo entre agentes especializados que se comunican entre sí o reportan a un coordinador.

La idea fundamental es la misma que en un equipo humano: un arquitecto no debería estar depurando CSS, y un tester no debería estar diseñando la base de datos.

---

## 2. Los tres modelos de equipo

### 2.1 Subagentes (Hub-and-Spoke)

```
         ┌──────────────┐
         │ Agente Principal │
         └──────┬───────┘
       ┌────────┼────────┐
       ▼        ▼        ▼
   [Revisor] [Tester] [Investigador]
       │        │        │
       └────────┼────────┘
            resultados
```

El agente principal delega tareas puntuales a subagentes. Cada subagente tiene su propia ventana de contexto, trabaja en aislamiento, y solo devuelve el resultado final. Los subagentes no hablan entre sí.

**Cuándo usarlo:** Tareas donde solo importa el resultado final — revisiones de código, investigación, validación. Es el modelo más barato en tokens.

**Disponible hoy:** Sí. Se configuran en `.claude/agents/` como archivos markdown.

### 2.2 Agent Teams (Coordinación entre pares)

```
      Team Lead (sesión principal)
      ├── Lista de tareas (compartida)
      ├── Buzón de mensajes
      └── Compañeros de equipo
          ├── Teammate 1 ──┐
          ├── Teammate 2 ──┼── Se comunican entre sí
          └── Teammate 3 ──┘
```

Cada teammate es una instancia completa de Claude con su propio contexto. Pueden enviarse mensajes, coordinarse a través de una lista de tareas compartida, y el lead supervisa el progreso. Es como un equipo Scrum donde cada miembro trabaja en paralelo.

**Cuándo usarlo:** Cuando los agentes necesitan discutir, debatir hipótesis, o trabajar en capas diferentes que se afectan mutuamente (frontend + backend + tests).

**Disponible hoy:** Sí, en modo experimental. Se activa con:
```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

### 2.3 Sesiones paralelas manuales (Git worktrees)

```
Sesión 1 → worktree A → feature/auth
Sesión 2 → worktree B → feature/calculator
Sesión 3 → worktree C → feature/tests

Tú coordinas vía git merge
```

Múltiples sesiones de Claude Code independientes, cada una en su rama. Tú haces de project manager humano.

**Cuándo usarlo:** Desarrollo largo en paralelo donde quieres control total.

### Comparación rápida

| Aspecto | Subagentes | Agent Teams | Sesiones manuales |
|---------|-----------|-------------|-------------------|
| Comunicación | Solo reportan al líder | Bidireccional | Manual (git) |
| Coste en tokens | Bajo | Alto | Muy alto |
| Complejidad setup | Baja | Media | Alta |
| Control humano | Alto | Medio | Total |
| Mejor para | Tareas focalizadas | Trabajo complejo coordinado | Desarrollo paralelo largo |

---

## 3. Las herramientas disponibles hoy

### 3.1 Claude Code CLI + Subagentes

Es lo que ya usas. Claude Code puede delegar automáticamente a subagentes definidos en `.claude/agents/`. Cada subagente tiene su propio prompt de sistema, herramientas restringidas, y puede usar un modelo diferente (Haiku para tareas simples, Opus para las complejas).

### 3.2 Cowork Mode

Tu entorno actual. Combina Claude Code con acceso a archivos, terminal, y navegador. No es multi-agente per se, pero es la base desde donde lanzarías equipos.

### 3.3 Claude Agent SDK

Librería programática (Python y TypeScript) que trae las capacidades de Claude Code a tu propio código. Permite crear agentes personalizados que corren como servicios backend o tareas programadas. Ideal si quieres automatización sin supervisión.

### 3.4 MCP Servers

Model Context Protocol — permite conectar agentes a herramientas externas (GitHub, Slack, bases de datos, etc.). Ya tienes varios configurados. Puedes crear MCP servers personalizados para exponer la API de E+ Tools como herramientas que los agentes puedan llamar directamente.

### 3.5 Scheduled Tasks

Tareas programadas que ejecutan agentes en horarios definidos. Útil para revisiones automáticas, tests nocturnos, o mantenimiento.

---

## 4. Diseño práctico: equipo de agentes para E+ Tools

Aquí está mi propuesta de equipo adaptado a tu monorepo y tu forma de trabajar.

### 4.1 Arquitectura del equipo

```
                     ┌─────────────────┐
                     │   TÚ (humano)   │
                     │  Decisiones +   │
                     │  dirección      │
                     └────────┬────────┘
                              │
                     ┌────────▼────────┐
                     │  Lead Agent     │
                     │  (Cowork/CLI)   │
                     │  Opus 4.6       │
                     └────────┬────────┘
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
    ┌─────────────┐  ┌──────────────┐  ┌─────────────┐
    │  Backend    │  │  Frontend    │  │  Reviewer   │
    │  Agent      │  │  Agent       │  │  Agent      │
    │  Sonnet 4.6 │  │  Sonnet 4.6  │  │  Haiku 4.5  │
    └─────────────┘  └──────────────┘  └─────────────┘
    node/src/        public/           Revisa todo
    migrations/      css/ js/          antes del push
```

### 4.2 Definición de subagentes

Estos archivos irían en `.claude/agents/` dentro del repo:

**Backend Agent** (`backend-dev.md`):
```markdown
---
name: Backend Developer
model: sonnet
tools: [read, write, edit, bash]
description: Develops Node.js API endpoints, models, controllers,
  and SQL migrations for the E+ Tools monorepo
---

You are a backend developer for E+ Tools.
Read CLAUDE.md, SCHEMA.md and API.md before any work.
You work in node/src/modules/ and migrations/.
Rule: Frontend pregunta, Node decide, MySQL recuerda.
Never put business logic in the frontend.
Always follow the naming conventions in SCHEMA.md.
```

**Frontend Agent** (`frontend-dev.md`):
```markdown
---
name: Frontend Developer
model: sonnet
tools: [read, write, edit, bash]
description: Builds SPA views, forms, and UI components
  for E+ Tools using vanilla JS and Tailwind CSS
---

You are a frontend developer for E+ Tools.
Read CLAUDE.md, DESIGN.md and UX.md before any work.
You work in public/js/, public/css/, and public/index.html.
Never put business logic in the frontend.
Always call the Node API via fetch.
Follow the component library in DESIGN.md.
```

**Code Reviewer** (`code-reviewer.md`):
```markdown
---
name: Code Reviewer
model: haiku
tools: [read, bash, grep]
description: Reviews code changes for bugs, security issues,
  naming convention violations, and adherence to CLAUDE.md rules
---

You review code for E+ Tools.
Check every change against:
1. Naming conventions (SCHEMA.md)
2. API conventions (API.md)
3. The "never" list in CLAUDE.md
4. No hardcoded credentials
5. No business logic in frontend
6. Proper error handling
Report issues clearly with file and line number.
```

### 4.3 Flujo de trabajo con el equipo

```
1. TÚ defines la tarea → "Crear endpoint de WPs para Calculator"

2. LEAD (Cowork) lee CLAUDE.md + SCHEMA.md, planifica:
   - Backend: crear model, controller, routes
   - Frontend: crear vista de WPs
   - Reviewer: validar antes del push

3. LEAD delega al Backend Agent → crea los archivos en node/src/modules/calculator/

4. LEAD delega al Frontend Agent → crea public/js/calculator-wps.js

5. LEAD delega al Reviewer → revisa todos los cambios

6. Si el reviewer aprueba → commit + push automático

7. TÚ revisas en https://intake.eufundingschool.com
```

### 4.4 Para más adelante: Agent SDK en tu VPS

Cuando el equipo esté maduro, podrías crear agentes que corran directamente en tu VPS como servicios Node.js:

```javascript
// Ejemplo conceptual con Claude Agent SDK (TypeScript)
import { Agent } from '@anthropic-ai/agent-sdk';

const nightlyReviewer = new Agent({
  model: 'claude-haiku-4-5-20251001',
  systemPrompt: 'Review all changes pushed today...',
  tools: ['bash', 'read'],
});

// Ejecutar cada noche a las 2am
cron.schedule('0 2 * * *', async () => {
  const result = await nightlyReviewer.run(
    'Review git log from the last 24h and report issues'
  );
  // Enviar resultado por email o Slack
});
```

---

## 5. Limitaciones actuales (abril 2026)

Cosas que debes saber antes de lanzarte:

**Subagentes** no pueden crear sub-subagentes (solo un nivel de profundidad). Los resultados tienen que caber en el contexto del agente principal.

**Agent Teams** es experimental: no soporta resume/rewind con teammates activos, los teammates a veces no marcan tareas como completadas, y cada teammate es una instancia completa de Claude (coste alto en tokens). Solo un equipo por sesión.

**En general:** los agentes no pueden escribir en el mismo archivo simultáneamente sin conflictos — hay que asignar archivos diferentes a cada uno. Los teammates no heredan el historial del lead, así que hay que pasarles contexto explícito en el prompt de creación.

---

## 6. Recomendaciones para empezar

### Fase 1: Subagentes (empieza aquí)

Crea los tres subagentes del punto 4.2 en tu repo. Usa el modelo Hub-and-Spoke. Es lo más fácil de configurar y lo más barato. Para tu situación actual (un solo desarrollador, monorepo), cubre el 80% de las necesidades.

### Fase 2: Tareas programadas

Añade un reviewer automático nocturno que revise los cambios del día y genere un informe. Usa `/schedule` o el Agent SDK.

### Fase 3: Agent Teams (cuando los necesites)

Activa el modo experimental cuando tengas una tarea grande que requiera coordinación real entre agentes — por ejemplo, construir un módulo completo desde cero (backend + frontend + tests + docs en paralelo).

### Fase 4: Agent SDK en VPS

Cuando quieras agentes que corran sin supervisión en producción — monitorización, tests de integración automáticos, alertas.

---

## 7. Estructura de archivos propuesta

```
eplus-tools/
├── .claude/
│   ├── agents/
│   │   ├── backend-dev.md       ← Subagente backend
│   │   ├── frontend-dev.md      ← Subagente frontend
│   │   └── code-reviewer.md     ← Subagente reviewer
│   ├── hooks/                   ← Validaciones automáticas
│   │   └── pre-push-review.sh
│   └── settings.json            ← Configuración de Claude Code
├── CLAUDE.md                    ← Ya existe, lo leen todos
├── docs/
│   ├── SCHEMA.md
│   ├── API.md
│   ├── DESIGN.md
│   └── UX.md
└── ...
```

---

*Este documento es una guía viva. Actualízalo conforme evolucione tu equipo de agentes.*
