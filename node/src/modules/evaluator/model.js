/* ── Evaluator Model ──────────────────────────────────────────── */
const pool = require('../../utils/db');
const uuid = require('../../utils/uuid');

/* ── Programs with form templates ────────────────────────────── */

async function listAvailablePrograms() {
  const [rows] = await pool.query(`
    SELECT ip.id, ip.name, ip.action_type, ip.deadline, ip.eu_grant_max,
           ip.duration_min_months, ip.duration_max_months, ip.active,
           ft.id   AS template_id,
           ft.name AS template_name,
           ft.slug AS template_slug
    FROM intake_programs ip
    JOIN form_templates ft ON ip.form_template_id = ft.id
    WHERE ip.form_template_id IS NOT NULL
      AND ft.active = 1
    ORDER BY ip.deadline DESC
  `);
  return rows;
}

/* ── Form instances (user-scoped) ────────────────────────────── */

async function createUserFormInstance({ userId, programId, templateId, title }) {
  const id = uuid();
  await pool.query(
    `INSERT INTO form_instances (id, user_id, template_id, program_id, title)
     VALUES (?, ?, ?, ?, ?)`,
    [id, userId, templateId, programId, title || null]
  );
  return { id };
}

async function listUserFormInstances(userId) {
  const [rows] = await pool.query(`
    SELECT fi.id, fi.title, fi.status, fi.created_at, fi.updated_at,
           ft.name AS template_name,
           ip.name AS program_name, ip.action_type
    FROM form_instances fi
    JOIN form_templates ft ON fi.template_id = ft.id
    JOIN intake_programs ip ON fi.program_id = ip.id
    WHERE fi.user_id = ?
    ORDER BY fi.updated_at DESC
  `, [userId]);
  return rows;
}

async function getUserFormInstance(id, userId) {
  const [rows] = await pool.query(`
    SELECT fi.*, ft.name AS template_name, ft.template_json,
           ip.name AS program_name, ip.action_type
    FROM form_instances fi
    JOIN form_templates ft ON fi.template_id = ft.id
    JOIN intake_programs ip ON fi.program_id = ip.id
    WHERE fi.id = ? AND fi.user_id = ?
  `, [id, userId]);
  if (!rows.length) return null;
  const inst = rows[0];
  if (typeof inst.template_json === 'string') {
    try { inst.template_json = JSON.parse(inst.template_json); } catch (_) {}
  }
  return inst;
}

async function getFormValues(instanceId) {
  const [rows] = await pool.query(
    'SELECT field_id, section_path, value_text, value_json FROM form_field_values WHERE instance_id = ?',
    [instanceId]
  );
  const values = {};
  for (const r of rows) {
    const key = r.section_path ? `${r.section_path}.${r.field_id}` : r.field_id;
    values[key] = r.value_json
      ? (typeof r.value_json === 'string' ? JSON.parse(r.value_json) : r.value_json)
      : r.value_text;
  }
  return values;
}

async function saveFormValues(instanceId, values) {
  if (!values || typeof values !== 'object') return;

  for (const [fullKey, val] of Object.entries(values)) {
    const lastDot = fullKey.lastIndexOf('.');
    let sectionPath = null, fieldId = fullKey;
    if (lastDot > 0) {
      sectionPath = fullKey.substring(0, lastDot);
      fieldId = fullKey.substring(lastDot + 1);
    }

    const isJson = typeof val === 'object' && val !== null;
    const id = uuid();

    await pool.query(
      `INSERT INTO form_field_values (id, instance_id, field_id, section_path, value_text, value_json)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         value_text = VALUES(value_text),
         value_json = VALUES(value_json),
         updated_at = CURRENT_TIMESTAMP`,
      [id, instanceId, fieldId, sectionPath, isJson ? null : (val ?? ''), isJson ? JSON.stringify(val) : null]
    );
  }

  await pool.query(
    "UPDATE form_instances SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [instanceId]
  );
}

/* ── AI Parse Jobs ───────────────────────────────────────────── */

async function createParseJob({ instanceId, userId, documentPath }) {
  const id = uuid();
  await pool.query(
    `INSERT INTO ai_parse_jobs (id, instance_id, user_id, document_path, status, progress_json)
     VALUES (?, ?, ?, ?, 'pending', ?)`,
    [id, instanceId, userId, documentPath || null, JSON.stringify({ total: 0, done: 0, sections_done: [], current: null })]
  );
  return { id };
}

async function getParseJob(jobId) {
  const [rows] = await pool.query('SELECT * FROM ai_parse_jobs WHERE id = ?', [jobId]);
  if (!rows.length) return null;
  const job = rows[0];
  if (typeof job.progress_json === 'string') {
    try { job.progress_json = JSON.parse(job.progress_json); } catch (_) {}
  }
  return job;
}

async function updateParseJob(jobId, data) {
  const fields = [];
  const params = [];
  if (data.status !== undefined) { fields.push('status = ?'); params.push(data.status); }
  if (data.progress_json !== undefined) { fields.push('progress_json = ?'); params.push(JSON.stringify(data.progress_json)); }
  if (data.error_message !== undefined) { fields.push('error_message = ?'); params.push(data.error_message); }
  if (!fields.length) return;
  params.push(jobId);
  await pool.query(`UPDATE ai_parse_jobs SET ${fields.join(', ')} WHERE id = ?`, params);
}

async function deleteUserFormInstance(id, userId) {
  // Cascade delete is assumed via FK; if not, child rows (form_field_values, ai_parse_jobs)
  // should be cleaned up here. Verifying ownership first.
  const [res] = await pool.query(
    `DELETE FROM form_instances WHERE id = ? AND user_id = ?`,
    [id, userId]
  );
  return res.affectedRows > 0;
}

module.exports = {
  listAvailablePrograms,
  createUserFormInstance,
  listUserFormInstances,
  getUserFormInstance,
  getFormValues,
  saveFormValues,
  createParseJob,
  getParseJob,
  updateParseJob,
  deleteUserFormInstance,
};
