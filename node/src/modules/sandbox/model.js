/* ── Sandbox Model — DB queries for demo projects ───────────────────── */

const db = require('../../utils/db');
const genUUID = require('../../utils/uuid');

/**
 * Program used for the sandbox demo: Small-scale Partnerships Sports (KA210-YOU).
 * action_type matches what the rest of the tool uses to resolve the call.
 */
const SANDBOX_ACTION_TYPE = 'ERASMUS-SPORT-2026-SSCP';

/**
 * Resolve the Sports program row. Returns the full intake_programs row or null.
 */
async function findSportsProgram() {
  const sql = `
    SELECT id, program_id, name, action_type, deadline, start_date_min, start_date_max,
           duration_min_months, duration_max_months, eu_grant_max, cofin_pct, indirect_pct
    FROM intake_programs
    WHERE action_type = ? AND active = 1
    LIMIT 1
  `;
  const [rows] = await db.execute(sql, [SANDBOX_ACTION_TYPE]);
  return rows[0] || null;
}

/**
 * Find the existing sandbox project of a user, if any. Max 1 per user.
 */
async function findSandboxProject(userId) {
  const sql = `
    SELECT id, user_id, name, full_name, type, description, proposal_lang, national_agency,
           start_date, duration_months, deadline, eu_grant, cofin_pct, indirect_pct,
           status, is_sandbox, calc_state, created_at, updated_at
    FROM projects
    WHERE user_id = ? AND is_sandbox = 1
    ORDER BY updated_at DESC
    LIMIT 1
  `;
  const [rows] = await db.execute(sql, [userId]);
  return rows[0] || null;
}

/**
 * Find a project by id restricted to the owning user (keeps security model).
 */
async function findProjectById(projectId, userId) {
  const sql = `
    SELECT id, user_id, name, type, status, is_sandbox, created_at, updated_at
    FROM projects
    WHERE id = ? AND user_id = ?
  `;
  const [rows] = await db.execute(sql, [projectId, userId]);
  return rows[0] || null;
}

/**
 * Create a fresh sandbox project for a user using the Sports program defaults.
 * Also creates the empty intake_contexts row (like intake module does).
 */
async function createSandboxProject(userId) {
  const program = await findSportsProgram();
  if (!program) {
    const err = new Error('Sandbox program not found (Sports KA210-YOU). Admin must load it first.');
    err.code = 'SANDBOX_PROGRAM_MISSING';
    throw err;
  }

  const id = genUUID();
  const contextId = genUUID();
  const now = new Date().toISOString().split('T')[0];

  const insertSql = `
    INSERT INTO projects (
      id, user_id, name, type, description, proposal_lang, national_agency,
      start_date, duration_months, deadline, eu_grant, cofin_pct, indirect_pct,
      status, is_sandbox, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 1, ?, ?)
  `;
  const params = [
    id,
    userId,
    'Demo — Small-scale Sports',
    program.action_type,
    'Proyecto de demostración (sandbox). Cuando acabes de explorar, púlsa "Graduar" para convertirlo en un proyecto real.',
    'es',
    null,
    program.start_date_min || null,
    program.duration_min_months || 24,
    program.deadline || null,
    0,
    program.cofin_pct || 80,
    program.indirect_pct || 7,
    now,
    now,
  ];
  await db.execute(insertSql, params);

  const ctxSql = `
    INSERT INTO intake_contexts (id, project_id, problem, target_groups, approach, created_at, updated_at)
    VALUES (?, ?, '', '', '', ?, ?)
  `;
  await db.execute(ctxSql, [contextId, id, now, now]);

  return findSandboxProject(userId);
}

/**
 * Flip is_sandbox to 0. Caller must have already verified ownership.
 */
async function graduateProject(projectId) {
  const sql = `UPDATE projects SET is_sandbox = 0, updated_at = NOW() WHERE id = ?`;
  await db.execute(sql, [projectId]);
}

module.exports = {
  findSportsProgram,
  findSandboxProject,
  findProjectById,
  createSandboxProject,
  graduateProject,
};
