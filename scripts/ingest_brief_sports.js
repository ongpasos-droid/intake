/**
 * Full ingestion of the Small-scale Sports narrative brief:
 *  - Parses brief_smallscale_sports.md (13 standard questions + 5 WP questions + appendix)
 *  - Restructures Section 4 in DB: rename 4.1/4.2 + create 4.3
 *  - Maps brief WP1→DB 4.1, brief WP5→DB 4.3; DB 4.2 uses synthesized generic middle-WP criteria
 *  - Stores the APPENDIX as writing_style in call_eligibility
 *
 * Usage: node scripts/ingest_brief_sports.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const crypto = require('crypto');

const BRIEF_PATH = path.join(__dirname, '..', '.tmp', 'brief_smallscale_sports.md');
const PROGRAM_NAME_LIKE = '%Small-scale%SPORTS%';

// ═══════════════════════════════════════════════════════════════
// Parser for the brief markdown
// ═══════════════════════════════════════════════════════════════

function parseBrief(md) {
  // Extract appendix: from "# APÉNDICE" to EOF
  let appendix = '';
  const appendixMatch = md.match(/\n#\s+APÉNDICE[\s\S]*$/);
  if (appendixMatch) appendix = appendixMatch[0].replace(/^\n#\s+/, '').trim();

  // Remove appendix from md before question parsing
  const mdClean = appendixMatch ? md.slice(0, appendixMatch.index) : md;

  // Split by `## ` (question headers or section headers)
  const blocks = mdClean.split(/\n## /);
  const questions = [];

  for (const raw of blocks) {
    if (!raw.trim()) continue;
    if (raw.includes('### PARTE A')) {
      questions.push(parseQuestion('## ' + raw));
    }
  }
  return { questions, appendix };
}

function parseQuestion(block) {
  // First line: "## 1.1 Background and general objectives"
  const headerMatch = block.match(/^##\s+([\d.]+(?:\s+Work Package \d+)?)\s+—?\s*(.+?)\s*$/m);
  const firstLine = block.split('\n')[0].replace(/^##\s*/, '');
  let code, title;
  // Two forms: "1.1 Background..." or "4.1 Work Package 1 — Project management..."
  const m1 = firstLine.match(/^(\d+(?:\.\d+)+)\s+(.+?)$/);
  if (m1) {
    code = m1[1];
    title = m1[2].trim();
  } else {
    code = null;
    title = firstLine.trim();
  }

  const [parteARaw, parteBRaw] = block.split(/###\s*PARTE\s*B/i);
  if (!parteBRaw) return { code, title, parteA: {}, criteria: [] };

  const parteA = extractParteA(parteARaw);
  const criteria = extractCriteria(parteBRaw);

  return { code, title, parteA, criteria };
}

function extractParteA(text) {
  const out = {};
  // CONTEXTO DE LA PREGUNTA or CONTEXTO DEL WP
  const ctx = text.match(/\*\*2\.\s*CONTEXTO[^*]*\*\*\s*\n([\s\S]*?)(?=\n\*\*3\.)/i);
  if (ctx) out.general_context = ctx[1].trim();

  // APOYA EN
  const apoya = text.match(/\*\*APOYA EN:?\*\*\s*([\s\S]*?)(?=\n\*\*ALIMENTA A|\n\*\*4\.|\n$)/i);
  if (apoya) out.connects_from = apoya[1].trim();

  // ALIMENTA A
  const alim = text.match(/\*\*ALIMENTA A:?\*\*\s*([\s\S]*?)(?=\n\*\*4\.|\n$)/i);
  if (alim) out.connects_to = alim[1].trim();

  // REGLA GLOBAL
  const regla = text.match(/\*\*4\.\s*REGLA GLOBAL\*\*[^\n]*\n([\s\S]*?)(?=\n\*\*5\.)/i);
  if (regla) out.global_rule = regla[1].trim();

  return out;
}

function extractCriteria(text) {
  // Split by "#### CRITERIO N"
  const parts = text.split(/####\s*CRITERIO\s+\d+/i);
  const criteria = [];
  // parts[0] is text before first CRITERIO — skip
  for (let i = 1; i < parts.length; i++) {
    const p = parts[i];
    const c = {};
    const title = p.match(/\*\*Título:\*\*\s*(.+?)\s*$/m);
    const prio = p.match(/\*\*Prioridad:\*\*\s*(alta|media|baja)/i);
    const mand = p.match(/\*\*Obligatorio:\*\*\s*(sí|si|no)/i);
    const intent = p.match(/\*\*INTENCIÓN\*\*\s*\n([\s\S]*?)(?=\n\*\*ELEMENTOS\*\*)/i);
    const elements = p.match(/\*\*ELEMENTOS\*\*\s*\n([\s\S]*?)(?=\n\*\*EJEMPLOS\*\*)/i);
    const weak = p.match(/\*\*▸?\s*DÉBIL:?\*\*\s*(?:"([^"]+)"|(.+?))(?=\n\n|\n\*\*▸)/i) ||
                 p.match(/\*\*▸\s*DÉBIL:?\*\*\s*([\s\S]*?)(?=\n\s*\*\*▸\s*FUERTE)/i);
    const strong = p.match(/\*\*▸?\s*FUERTE:?\*\*\s*(?:"([^"]+)"|(.+?))(?=\n\n|\n\*\*EVITAR)/i) ||
                   p.match(/\*\*▸\s*FUERTE:?\*\*\s*([\s\S]*?)(?=\n\*\*EVITAR)/i);
    const avoid = p.match(/\*\*EVITAR\*\*\s*\n([\s\S]*?)(?=\n---|\n####|$)/i);

    c.title = title ? title[1].trim() : '';
    c.priority = prio ? prio[1].toLowerCase() : 'media';
    c.mandatory = mand ? (/s[íi]/i.test(mand[1]) ? 1 : 0) : 0;
    c.intent = intent ? intent[1].trim() : null;
    c.elements = elements ? elements[1].trim() : null;
    c.example_weak = weak ? (weak[1] || weak[2] || '').trim().replace(/^"|"$/g, '') : null;
    c.example_strong = strong ? (strong[1] || strong[2] || '').trim().replace(/^"|"$/g, '') : null;
    c.avoid = avoid ? avoid[1].trim() : null;
    criteria.push(c);
  }
  return criteria;
}

// ═══════════════════════════════════════════════════════════════
// Synthesized criteria for 4.2 — Core Work Packages (generic, project-agnostic)
// ═══════════════════════════════════════════════════════════════

const CORE_WPS_42 = {
  parteA: {
    general_context: 'Esta pregunta evalúa los WPs intermedios (entre WP1 Management y el WP final de Dissemination & Sustainability) — el eje de contenido del proyecto. Un proyecto Small-scale Sports tiene entre 3 y 8 WPs en total, de los cuales 1 a 6 son "core" (ejecución, capacity building, piloto, I+D, intercambios, o lo que el proyecto necesite). El contenido varía por proyecto, pero la ESTRUCTURA es universal: tasks coherentes con el objetivo del WP, deliverables 1:1 con tasks, milestones como resultados completados, y arquitectura trazable. El evaluador no juzga aquí si el contenido es bueno (eso se ve en 2.1.1) — juzga si los WPs están bien construidos.',
    connects_from: 'Se apoya en 2.1.1 (metodología define el enfoque que los WPs ejecutan), 2.1.2 (QA/monitoring), 2.1.3 (equipo asignado a tasks), 2.2.1 (qué partner lidera cada WP), y 4.1 (infraestructura de coordinación definida en WP1).',
    connects_to: 'Alimenta 4.3 (el WP final de dissemination cierra la cadena de resultados producidos aquí) y 3.1/3.2/3.3 (los resultados de estos WPs son lo que se mide como impact y se disemina).',
    global_rule: 'Small-scale logic: cada WP intermedio con 4-6 tasks (no 8+ forzadas), 3-5 deliverables, 2-4 milestones. Total del proyecto: 3-8 WPs. Contenido proporcional a 30-60k€ y 6-24 meses. Los criterios de esta pregunta aplican a CADA WP intermedio por igual.'
  },
  criteria: [
    {
      title: 'Task set matches WP objective',
      priority: 'alta',
      mandatory: 1,
      intent: 'Las tasks de un WP core deben cubrir lo esencial para lograr el objetivo del WP, sin inflar artificialmente ni dejar huecos. En Small-scale, 4-6 tasks bien diseñadas superan a 8 tasks genéricas. El evaluador verifica que cada task tiene función clara y verbo accionable.',
      elements: 'Entre 4 y 6 tasks por WP. Cada task con título corto + descripción de 3-5 líneas con verbo accionable (desarrollar, pilotar, documentar, evaluar, adaptar, monitorear). Responsables claros (un lead por task, soportes opcionales). Meses de inicio y fin explícitos. Las tasks deben operacionalizar el WP — no repetir coordinación o dissemination (que van en 4.1 y 4.3).',
      example_weak: 'T2.1: Implementation. T2.2: Activities. T2.3: Monitoring. T2.4: Reports. (tasks genéricas, sin verbo ni contenido específico, intercambiables entre WPs)',
      example_strong: 'T2.1 — Development of the methodology (M1-M3): Partner B drafts the pedagogical framework based on needs analysis in 1.2; validated by partners in month 3. T2.2 — Adaptation to each national context (M3-M5): each implementing partner adapts the framework to local language, legal constraints, and cultural specifics. T2.3 — Delivery of the pilot (M5-M10): 4 implementing partners run the piloted activity with their target groups, with weekly internal coordination calls. T2.4 — Feedback collection and adjustment (M8-M11): structured feedback from participants and staff, consolidated into version 2 of the methodology.',
      avoid: '- Tasks genéricas sin verbo ("Implementation", "Activities").\n- Más de 8 tasks en un WP intermedio (señal de sobredimensión).\n- Tasks que duplican lo que ya está en WP1 (coordinación) o el WP final (dissemination).\n- Tasks sin responsable claro o sin meses.'
    },
    {
      title: 'Deliverables as concrete outputs mapped 1:1 to tasks',
      priority: 'alta',
      mandatory: 1,
      intent: 'Cada deliverable debe salir de una task concreta del WP y ser tangible. El evaluador debe leer los deliverables y reconocer su task de origen. Cada deliverable incluye formato, idioma, extensión aproximada y nivel de diseminación.',
      elements: '3-5 deliverables por WP, cada uno con: código (Dx.y), título, formato (PDF, video, web tool, dataset), idioma (EN; puede haber traducciones nacionales), extensión aproximada (páginas/minutos/tamaño), dissemination level (PU público / SEN sensible), mes de entrega, y task de origen explícita. Los deliverables tangibles son preferibles a "reports" genéricos.',
      example_weak: 'D2.1: Report on activities. D2.2: Project documents. D2.3: Final output. (sin formato, sin idioma, sin task de origen, sin nivel de diseminación)',
      example_strong: 'D2.1 — Pedagogical methodology framework v1 (PDF, EN, ~25 pp, PU), M3 — from T2.1. D2.2 — Nationally adapted versions of the framework (PDF, IT/ES/PL, ~25 pp each, PU), M5 — from T2.2. D2.3 — Pilot implementation report (PDF, EN, ~15 pp, SEN), M11 — from T2.3. D2.4 — Methodology framework v2 (revised post-pilot) (PDF, EN, ~30 pp, PU), M12 — from T2.4.',
      avoid: '- Deliverables genéricos ("reports", "documents", "materials").\n- Omitir formato, idioma, extensión o dissemination level.\n- Deliverables sin task de origen trazable.\n- Más deliverables que tasks sin justificación.'
    },
    {
      title: 'Milestones as completed results, not activities',
      priority: 'media',
      mandatory: 1,
      intent: 'Los milestones son puntos de control que confirman que un paso clave se ha completado — no son actividades. "Workshop held" NO es un milestone válido. "Methodology framework validated by partners" sí lo es. Cada milestone con método de verificación concreto.',
      elements: '2-4 milestones por WP, cada uno en formato "X achieved/completed/established/validated". Cada uno con: mes de proyecto (Mx), lead beneficiary, método de verificación (firma, acta, aprobación, dataset entregado). Los milestones cierran deliverables clave, no todos los deliverables necesitan milestone.',
      example_weak: 'MS1: Methodology workshop. MS2: Pilot launch. MS3: Final review. (milestones como actividades, sin verificación, sin fecha concreta)',
      example_strong: 'MS2.1 — Methodology framework v1 validated by all partners (M3). Lead: Partner B. Verification: signed validation form from each partner. MS2.2 — Pilot phase completed in all 3 countries (M11). Lead: implementing partners. Verification: attendance lists + pilot reports filed in shared drive. MS2.3 — Methodology framework v2 released (M12). Lead: Partner B. Verification: v2 document published in project website.',
      avoid: '- Milestones como actividades ("workshop held", "meeting organised").\n- Sin método de verificación.\n- Sin mes de proyecto.\n- Milestones idénticos a deliverables (duplicación).'
    },
    {
      title: 'Internal coherence of WP architecture',
      priority: 'media',
      mandatory: 0,
      intent: 'El evaluador lee cada WP como un sistema, no como tres tablas paralelas. Cada task debe producir al menos un deliverable, y los deliverables clave deben estar confirmados por milestones. Si la cadena se rompe en algún punto, el WP pierde credibilidad.',
      elements: 'Trazabilidad completa task → deliverable → milestone. Responsables consistentes entre los tres (un deliverable no puede tener responsable distinto a su task de origen). Fechas coherentes (un milestone no puede estar antes de su deliverable). Cobertura: todas las tasks producen algo, no hay deliverables huérfanos, los milestones cierran hitos reales. Sin contradicciones con 2.1.1 (metodología) o 2.1.2 (M&E).',
      example_weak: 'T2.1 produce nada. D2.5 aparece sin task de origen. MS2.2 tiene fecha anterior a D2.2 del que depende. (sistema roto)',
      example_strong: 'Cadena completa: T2.1 → D2.1 (methodology v1, M3) → MS2.1 (validation, M3). T2.3 → D2.3 (pilot report, M11) → MS2.2 (pilot completed, M11). T2.4 → D2.4 (methodology v2, M12) → MS2.3 (v2 released, M12). Ningún deliverable huérfano, responsables coherentes, fechas progresivas.',
      avoid: '- Deliverables sin task de origen visible.\n- Milestones con fechas incoherentes respecto a sus deliverables.\n- Responsables distintos entre task/deliverable/milestone del mismo hilo.\n- Ambigüedad sobre qué task produce qué deliverable.'
    }
  ]
};

// ═══════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════

async function main() {
  const md = fs.readFileSync(BRIEF_PATH, 'utf8');
  const { questions, appendix } = parseBrief(md);
  console.log(`Parsed ${questions.length} question blocks from brief`);

  // Build map by code for brief questions
  const briefByCode = {};
  for (const q of questions) if (q.code) briefByCode[q.code] = q;
  console.log('Brief codes:', Object.keys(briefByCode).join(', '));

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'eplus_tools',
    charset: 'utf8mb4'
  });

  // Find program
  const [progs] = await conn.query(
    `SELECT id, name FROM intake_programs WHERE name LIKE ?`,
    [PROGRAM_NAME_LIKE]
  );
  if (!progs.length) { console.error('Program not found'); process.exit(1); }
  const programId = progs[0].id;
  console.log(`Program: ${progs[0].name} (${programId})`);

  // Section 4 id
  const [sec4Row] = await conn.query(
    `SELECT id FROM eval_sections WHERE program_id=? AND form_ref='sec_4'`, [programId]
  );
  const section4Id = sec4Row[0].id;

  // ─── Restructure section 4: rename 4.1, rename 4.2, create 4.3 ─────
  await conn.query(
    `UPDATE eval_questions SET title=? WHERE section_id=? AND code='4.1'`,
    ['Work Package 1 — Project Management', section4Id]
  );
  await conn.query(
    `UPDATE eval_questions SET title=? WHERE section_id=? AND code='4.2'`,
    ['Core Work Packages — Execution & Activities', section4Id]
  );

  // Create 4.3 if missing
  const [existing43] = await conn.query(
    `SELECT id FROM eval_questions WHERE section_id=? AND code='4.3'`, [section4Id]
  );
  let q43Id;
  if (existing43.length) {
    q43Id = existing43[0].id;
    await conn.query(
      `UPDATE eval_questions SET title=? WHERE id=?`,
      ['Final Work Package — Dissemination & Sustainability', q43Id]
    );
  } else {
    q43Id = crypto.randomUUID();
    await conn.query(
      `INSERT INTO eval_questions (id, section_id, code, title, max_score, threshold, sort_order, scoring_logic, weight)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [q43Id, section4Id, '4.3', 'Final Work Package — Dissemination & Sustainability', 0, 0, 2, 'sum', 0]
    );
  }
  console.log('Section 4 restructured');

  // ─── Fetch all questions for this program ──────────────────────────
  const [dbQs] = await conn.query(
    `SELECT eq.id, eq.code FROM eval_questions eq
     JOIN eval_sections es ON eq.section_id=es.id
     WHERE es.program_id=?`, [programId]
  );
  const dbByCode = {};
  dbQs.forEach(q => { dbByCode[q.code] = q.id; });

  // ─── Mapping: DB code → source of truth ────────────────────────────
  // 1.1-3.3: direct from brief (same codes)
  // 4.1: brief "4.1 Work Package 1 — Project management and coordination"
  // 4.2: synthesized (CORE_WPS_42)
  // 4.3: brief "4.5 Work Package 5 — Dissemination and sustainability"

  const STANDARD_CODES = ['1.1','1.2','1.3','2.1.1','2.1.2','2.1.3','2.1.4','2.1.5','2.2.1','2.2.2','3.1','3.2','3.3'];

  let updated = 0, inserted = 0, deleted = 0;

  async function ingestInto(dbCode, parteA, criteria) {
    const qId = dbByCode[dbCode];
    if (!qId) { console.warn(`  ⚠ DB question ${dbCode} not found`); return; }

    await conn.query(
      `UPDATE eval_questions
         SET general_context=?, connects_from=?, connects_to=?, global_rule=?
       WHERE id=?`,
      [parteA.general_context || null, parteA.connects_from || null,
       parteA.connects_to || null, parteA.global_rule || null, qId]
    );
    updated++;

    const [old] = await conn.query(`SELECT COUNT(*) n FROM eval_criteria WHERE question_id=?`, [qId]);
    if (old[0].n > 0) {
      await conn.query(`DELETE FROM eval_criteria WHERE question_id=?`, [qId]);
      deleted += old[0].n;
    }

    for (let i = 0; i < criteria.length; i++) {
      const c = criteria[i];
      await conn.query(
        `INSERT INTO eval_criteria (id, question_id, title, max_score, mandatory, priority,
         intent, elements, example_weak, example_strong, avoid, sort_order)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [crypto.randomUUID(), qId, c.title, 1, c.mandatory ? 1 : 0, c.priority || 'media',
         c.intent, c.elements, c.example_weak, c.example_strong, c.avoid, i]
      );
      inserted++;
    }
    console.log(`  ✓ ${dbCode} (${criteria.length} criteria)`);
  }

  // Standard questions
  for (const code of STANDARD_CODES) {
    const brief = briefByCode[code];
    if (!brief) { console.warn(`  ⚠ brief missing ${code}`); continue; }
    await ingestInto(code, brief.parteA, brief.criteria);
  }

  // 4.1 ← brief 4.1 (WP1 Management)
  if (briefByCode['4.1']) await ingestInto('4.1', briefByCode['4.1'].parteA, briefByCode['4.1'].criteria);

  // 4.2 ← synthesized generic middle-WP criteria
  await ingestInto('4.2', CORE_WPS_42.parteA, CORE_WPS_42.criteria);

  // 4.3 ← brief 4.5 (WP5 Dissemination & Sustainability)
  if (briefByCode['4.5']) await ingestInto('4.3', briefByCode['4.5'].parteA, briefByCode['4.5'].criteria);

  // ─── Store appendix as writing_style at call level ─────────────────
  if (appendix) {
    const appendixText = '## APÉNDICE — NOTAS GLOBALES DE USO\n\n' + appendix.split('\n').slice(1).join('\n').trim();
    await conn.query(
      `UPDATE call_eligibility SET writing_style=? WHERE program_id=?`,
      [appendixText, programId]
    );
    console.log(`\nAppendix stored as writing_style (${appendixText.length} chars)`);
  }

  console.log(`\n─── Done ──────────────────────────────`);
  console.log(`Questions updated:   ${updated}`);
  console.log(`Old criteria deleted: ${deleted}`);
  console.log(`New criteria inserted: ${inserted}`);

  await conn.end();
}

main().catch(e => { console.error(e); process.exit(1); });
