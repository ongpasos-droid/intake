/**
 * Dumps the current state of the "Small-scale Partnerships in Youth KA210-YOU SPORTS"
 * convocatoria from the local MySQL DB into a deterministic migration file.
 *
 * Output: migrations/075_seed_ka210_you_sports.js
 *
 * What gets seeded in prod:
 *   - intake_programs       (1 row)
 *   - call_eligibility      (1 row)
 *   - eval_sections         (N rows)
 *   - eval_questions        (N rows)
 *   - eval_criteria         (N rows)
 *
 * NOT included (physical files needed, handle separately):
 *   - call_documents / documents uploads
 *
 * Usage: node scripts/dump_sports_call_to_migration.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const PROGRAM_ID_SLUG = 'new_1775809563916';
const OUTPUT_PATH = path.join(__dirname, '..', 'migrations', '075_seed_ka210_you_sports.js');

function j(v) {
  return JSON.stringify(v, null, 2).replace(/\n/g, '\n  ');
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'eplus_tools',
    charset: 'utf8mb4'
  });

  const [[program]] = await conn.query(
    `SELECT * FROM intake_programs WHERE program_id = ?`, [PROGRAM_ID_SLUG]
  );
  if (!program) { console.error('Program not found'); process.exit(1); }
  const programUuid = program.id;
  console.log(`Dumping "${program.name}" (${programUuid})`);

  const [[eligibility]] = await conn.query(
    `SELECT * FROM call_eligibility WHERE program_id = ?`, [programUuid]
  );

  const [sections] = await conn.query(
    `SELECT * FROM eval_sections WHERE program_id = ? ORDER BY sort_order`, [programUuid]
  );
  const sectionIds = sections.map(s => s.id);

  const [questions] = sectionIds.length
    ? await conn.query(
        `SELECT * FROM eval_questions WHERE section_id IN (?) ORDER BY section_id, sort_order`,
        [sectionIds]
      )
    : [[]];
  const questionIds = questions.map(q => q.id);

  const [criteria] = questionIds.length
    ? await conn.query(
        `SELECT * FROM eval_criteria WHERE question_id IN (?) ORDER BY question_id, sort_order`,
        [questionIds]
      )
    : [[]];

  console.log(`  ${sections.length} sections, ${questions.length} questions, ${criteria.length} criteria`);

  // Normalize JSON columns: mysql2 returns them already parsed; keep as JS objects
  const normProgram = { ...program };
  // dates/decimals come as Date/Number — serialize cleanly
  if (normProgram.deadline instanceof Date) normProgram.deadline = normProgram.deadline.toISOString().slice(0,10);
  if (normProgram.start_date_min instanceof Date) normProgram.start_date_min = normProgram.start_date_min.toISOString().slice(0,10);
  if (normProgram.start_date_max instanceof Date) normProgram.start_date_max = normProgram.start_date_max.toISOString().slice(0,10);
  delete normProgram.created_at;

  const normEligibility = eligibility ? { ...eligibility } : null;
  if (normEligibility) delete normEligibility.updated_at;

  const normSections = sections.map(s => {
    const o = { ...s };
    delete o.created_at; delete o.updated_at;
    return o;
  });
  const normQuestions = questions.map(q => {
    const o = { ...q };
    delete o.created_at; delete o.updated_at;
    return o;
  });
  const normCriteria = criteria.map(c => {
    const o = { ...c };
    delete o.created_at; delete o.updated_at;
    return o;
  });

  const out = `/**
 * Seed: Small-scale Partnerships in Youth KA210-YOU SPORTS (30.000€ / 60.000€)
 *
 * Full convocatoria data dumped from local DB on ${new Date().toISOString().slice(0,10)}:
 *   - intake_programs row
 *   - call_eligibility row (incl. writing_style appendix)
 *   - eval_sections / eval_questions / eval_criteria tree (narrative briefs)
 *
 * Idempotent: scoped by program_id slug '${PROGRAM_ID_SLUG}'. Re-running wipes and
 * re-inserts all eval rows for this program only — never touches other calls.
 *
 * NOT seeded here (needs file uploads via admin): call_documents.
 */
'use strict';

const PROGRAM_SLUG = '${PROGRAM_ID_SLUG}';

const PROGRAM = ${JSON.stringify(normProgram, null, 2)};

const ELIGIBILITY = ${JSON.stringify(normEligibility, null, 2)};

const SECTIONS = ${JSON.stringify(normSections, null, 2)};

const QUESTIONS = ${JSON.stringify(normQuestions, null, 2)};

const CRITERIA = ${JSON.stringify(normCriteria, null, 2)};

function cols(obj) {
  return Object.keys(obj);
}

function placeholders(obj) {
  return Object.keys(obj).map(() => '?').join(', ');
}

function values(obj) {
  return Object.values(obj).map(v => {
    if (v === undefined) return null;
    if (v && typeof v === 'object' && !(v instanceof Date)) return JSON.stringify(v);
    return v;
  });
}

function updateAssignments(obj) {
  return Object.keys(obj).map(k => \`\\\`\${k}\\\`=VALUES(\\\`\${k}\\\`)\`).join(', ');
}

module.exports = async function(db) {
  // Skip if the program already has an eval tree — do not overwrite manual admin edits.
  const [existingProg] = await db.query(
    \`SELECT id FROM intake_programs WHERE program_id = ?\`, [PROGRAM_SLUG]
  );
  if (existingProg.length) {
    const [[secs]] = await db.query(
      \`SELECT COUNT(*) AS n FROM eval_sections WHERE program_id = ?\`, [existingProg[0].id]
    );
    if (secs.n > 0) {
      console.log('  ⊘ KA210-YOU Sports already seeded, skipping');
      return;
    }
  }

  // 1) Insert program (preserve original UUID so cross-table refs stay stable)
  await db.query(
    \`INSERT INTO intake_programs (\${cols(PROGRAM).map(c => \`\\\`\${c}\\\`\`).join(',')}) VALUES (\${placeholders(PROGRAM)})
     ON DUPLICATE KEY UPDATE \${updateAssignments(PROGRAM)}\`,
    values(PROGRAM)
  );

  const [[prog]] = await db.query(
    \`SELECT id FROM intake_programs WHERE program_id = ?\`, [PROGRAM_SLUG]
  );
  const programUuid = prog.id;

  // 2) Insert eligibility (UNIQUE on program_id)
  if (ELIGIBILITY) {
    const elig = { ...ELIGIBILITY, program_id: programUuid };
    await db.query(
      \`INSERT INTO call_eligibility (\${cols(elig).map(c => \`\\\`\${c}\\\`\`).join(',')}) VALUES (\${placeholders(elig)})
       ON DUPLICATE KEY UPDATE \${updateAssignments(elig)}\`,
      values(elig)
    );
  }

  // 3) Insert sections (fresh — we already verified none exist)
  for (const s of SECTIONS) {
    const row = { ...s, program_id: programUuid };
    await db.query(
      \`INSERT INTO eval_sections (\${cols(row).map(c => \`\\\`\${c}\\\`\`).join(',')}) VALUES (\${placeholders(row)})\`,
      values(row)
    );
  }

  // 4) Insert questions
  for (const q of QUESTIONS) {
    await db.query(
      \`INSERT INTO eval_questions (\${cols(q).map(c => \`\\\`\${c}\\\`\`).join(',')}) VALUES (\${placeholders(q)})\`,
      values(q)
    );
  }

  // 5) Insert criteria
  for (const c of CRITERIA) {
    await db.query(
      \`INSERT INTO eval_criteria (\${cols(c).map(c2 => \`\\\`\${c2}\\\`\`).join(',')}) VALUES (\${placeholders(c)})\`,
      values(c)
    );
  }

  console.log(\`  ✓ Seeded KA210-YOU Sports: \${SECTIONS.length} sections, \${QUESTIONS.length} questions, \${CRITERIA.length} criteria\`);
};
`;

  fs.writeFileSync(OUTPUT_PATH, out, 'utf8');
  console.log(`Wrote ${OUTPUT_PATH} (${out.length} bytes)`);
  await conn.end();
}

main().catch(e => { console.error(e); process.exit(1); });
