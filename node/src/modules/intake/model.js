/* ── Intake Model — Database queries for projects, partners, contexts ─── */

const db = require('../../utils/db');
const genUUID = require('../../utils/uuid');

/* ── INTAKE PROGRAMS ────────────────────────────────────────────────── */

/**
 * List all active intake programs
 */
async function findActivePrograms() {
  const sql = `
    SELECT id, program_id, name, action_type, deadline, start_date_min, start_date_max,
           duration_min_months, duration_max_months, eu_grant_max, cofin_pct, indirect_pct,
           min_partners, notes, created_at
    FROM intake_programs
    WHERE active = 1
    ORDER BY name ASC
  `;
  const [rows] = await db.execute(sql);
  return rows;
}

/* ── PROJECTS ──────────────────────────────────────────────────────── */

/**
 * Create a new project with auto-generated UUID
 * Also creates an empty intake_contexts row
 */
async function createProject(userId, projectData) {
  const id = genUUID();
  const contextId = genUUID();
  const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  const sql = `
    INSERT INTO projects (
      id, user_id, name, type, description, start_date, duration_months,
      deadline, eu_grant, cofin_pct, indirect_pct, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)
  `;

  const params = [
    id,
    userId,
    projectData.name,
    projectData.type || null,
    projectData.description || null,
    projectData.start_date || null,
    projectData.duration_months || null,
    projectData.deadline || null,
    projectData.eu_grant || 0,
    projectData.cofin_pct || 0,
    projectData.indirect_pct || 0,
    now,
    now
  ];

  await db.execute(sql, params);

  // Auto-create intake_contexts row
  const contextSql = `
    INSERT INTO intake_contexts (id, project_id, problem, target_groups, approach, created_at, updated_at)
    VALUES (?, ?, '', '', '', ?, ?)
  `;
  await db.execute(contextSql, [contextId, id, now, now]);

  return findProjectById(id, userId);
}

/**
 * Find single project by ID and verify ownership
 */
async function findProjectById(projectId, userId) {
  const sql = `
    SELECT id, user_id, name, type, description, start_date, duration_months,
           deadline, eu_grant, cofin_pct, indirect_pct, status, created_at, updated_at
    FROM projects
    WHERE id = ? AND user_id = ?
  `;
  const [rows] = await db.execute(sql, [projectId, userId]);
  return rows[0] || null;
}

/**
 * List all projects for a user (paginated)
 */
async function findProjectsByUserId(userId, page = 1, perPage = 20) {
  const offset = (page - 1) * perPage;
  const limit = Math.min(perPage, 100); // Max 100 per page

  const countSql = 'SELECT COUNT(*) as total FROM projects WHERE user_id = ?';
  const [countRows] = await db.execute(countSql, [userId]);
  const total = countRows[0].total;

  const sql = `
    SELECT id, user_id, name, type, description, start_date, duration_months,
           deadline, eu_grant, cofin_pct, indirect_pct, status, created_at, updated_at
    FROM projects
    WHERE user_id = ?
    ORDER BY updated_at DESC
    LIMIT ? OFFSET ?
  `;
  const [rows] = await db.execute(sql, [userId, String(limit), String(offset)]);

  return {
    data: rows,
    total,
    page,
    per_page: limit,
    total_pages: Math.ceil(total / limit)
  };
}

/**
 * Update specific fields of a project (autosave)
 * Returns only the updated fields + id + updated_at
 */
async function updateProjectFields(projectId, userId, updates) {
  // Verify ownership first
  const project = await findProjectById(projectId, userId);
  if (!project) return null;

  // Allowed fields for update
  const allowedFields = [
    'name', 'type', 'description', 'start_date', 'duration_months',
    'deadline', 'eu_grant', 'cofin_pct', 'indirect_pct', 'status'
  ];

  const fieldsToUpdate = {};
  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      fieldsToUpdate[key] = value;
    }
  }

  if (Object.keys(fieldsToUpdate).length === 0) {
    return { id: projectId, updated_at: project.updated_at };
  }

  const now = new Date().toISOString().split('T')[0];
  fieldsToUpdate.updated_at = now;

  // Build UPDATE clause dynamically
  const setClauses = Object.keys(fieldsToUpdate).map(k => `${k} = ?`);
  const params = Object.values(fieldsToUpdate);
  params.push(projectId);
  params.push(userId);

  const sql = `UPDATE projects SET ${setClauses.join(', ')} WHERE id = ? AND user_id = ?`;
  await db.execute(sql, params);

  // Return only updated fields + id + updated_at
  return { id: projectId, ...fieldsToUpdate };
}

/**
 * Delete a project (owner check required)
 */
async function deleteProject(projectId, userId) {
  const project = await findProjectById(projectId, userId);
  if (!project) return false;

  // Delete all related data first
  await db.execute('DELETE FROM intake_contexts WHERE project_id = ?', [projectId]);
  await db.execute('DELETE FROM partners WHERE project_id = ?', [projectId]);
  await db.execute('DELETE FROM projects WHERE id = ? AND user_id = ?', [projectId, userId]);

  return true;
}

/* ── PARTNERS ──────────────────────────────────────────────────────── */

/**
 * List all partners for a project
 */
async function findPartnersByProjectId(projectId, userId) {
  // Verify project ownership
  const project = await findProjectById(projectId, userId);
  if (!project) return null;

  const sql = `
    SELECT id, project_id, name, legal_name, city, country, role, order_index, created_at, updated_at
    FROM partners
    WHERE project_id = ?
    ORDER BY order_index ASC
  `;
  const [rows] = await db.execute(sql, [projectId]);
  return rows;
}

/**
 * Create a new partner for a project
 * Auto-set order_index and role (first = applicant, rest = partner)
 */
async function createPartner(projectId, userId, partnerData) {
  // Verify project ownership
  const project = await findProjectById(projectId, userId);
  if (!project) return null;

  const id = genUUID();
  const now = new Date().toISOString().split('T')[0];

  // Get max order_index
  const [maxRows] = await db.execute(
    'SELECT MAX(order_index) as max_idx FROM partners WHERE project_id = ?',
    [projectId]
  );
  const nextIndex = (maxRows[0]?.max_idx || 0) + 1;

  // First partner is always applicant, rest are partners
  const role = nextIndex === 1 ? 'applicant' : 'partner';

  const sql = `
    INSERT INTO partners (id, project_id, name, legal_name, city, country, role, order_index, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    id,
    projectId,
    partnerData.name || '',
    partnerData.legal_name || '',
    partnerData.city || '',
    partnerData.country || '',
    role,
    nextIndex,
    now,
    now
  ];

  await db.execute(sql, params);

  return findPartnerById(id);
}

/**
 * Find a single partner by ID
 */
async function findPartnerById(partnerId) {
  const sql = `
    SELECT id, project_id, name, legal_name, city, country, role, order_index, created_at, updated_at
    FROM partners
    WHERE id = ?
  `;
  const [rows] = await db.execute(sql, [partnerId]);
  return rows[0] || null;
}

/**
 * Update a partner (ownership check via project_id)
 */
async function updatePartner(partnerId, userId, updates) {
  const partner = await findPartnerById(partnerId);
  if (!partner) return null;

  // Verify ownership through project
  const project = await findProjectById(partner.project_id, userId);
  if (!project) return null;

  const allowedFields = ['name', 'legal_name', 'city', 'country'];
  const fieldsToUpdate = {};

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      fieldsToUpdate[key] = value;
    }
  }

  if (Object.keys(fieldsToUpdate).length === 0) {
    return partner;
  }

  const now = new Date().toISOString().split('T')[0];
  fieldsToUpdate.updated_at = now;

  const setClauses = Object.keys(fieldsToUpdate).map(k => `${k} = ?`);
  const params = Object.values(fieldsToUpdate);
  params.push(partnerId);

  const sql = `UPDATE partners SET ${setClauses.join(', ')} WHERE id = ?`;
  await db.execute(sql, params);

  return { id: partnerId, ...fieldsToUpdate };
}

/**
 * Delete a partner (ownership check via project_id)
 */
async function deletePartner(partnerId, userId) {
  const partner = await findPartnerById(partnerId);
  if (!partner) return false;

  // Verify ownership
  const project = await findProjectById(partner.project_id, userId);
  if (!project) return false;

  await db.execute('DELETE FROM partners WHERE id = ?', [partnerId]);

  // Reorder remaining partners
  await reorderPartnersAfterDelete(partner.project_id);

  return true;
}

/**
 * Reorder partners after deletion to ensure continuous order_index
 */
async function reorderPartnersAfterDelete(projectId) {
  const [partners] = await db.execute(
    'SELECT id FROM partners WHERE project_id = ? ORDER BY order_index ASC',
    [projectId]
  );

  for (let i = 0; i < partners.length; i++) {
    await db.execute(
      'UPDATE partners SET order_index = ? WHERE id = ?',
      [i + 1, partners[i].id]
    );
  }
}

/**
 * Bulk reorder partners
 * Input: [{ id, order_index }, ...]
 */
async function reorderPartners(projectId, userId, orderUpdates) {
  // Verify project ownership
  const project = await findProjectById(projectId, userId);
  if (!project) return false;

  // Update each partner's order_index
  for (const update of orderUpdates) {
    const [result] = await db.execute(
      'UPDATE partners SET order_index = ? WHERE id = ? AND project_id = ?',
      [update.order_index, update.id, projectId]
    );
    if (result.affectedRows === 0) return false;
  }

  return true;
}

/* ── INTAKE CONTEXTS ────────────────────────────────────────────────── */

/**
 * Get intake contexts for a project
 */
async function findContextsByProjectId(projectId, userId) {
  // Verify project ownership
  const project = await findProjectById(projectId, userId);
  if (!project) return null;

  const sql = `
    SELECT id, project_id, problem, target_groups, approach, created_at, updated_at
    FROM intake_contexts
    WHERE project_id = ?
  `;
  const [rows] = await db.execute(sql, [projectId]);
  return rows;
}

/**
 * Find a single context by ID
 */
async function findContextById(contextId) {
  const sql = `
    SELECT id, project_id, problem, target_groups, approach, created_at, updated_at
    FROM intake_contexts
    WHERE id = ?
  `;
  const [rows] = await db.execute(sql, [contextId]);
  return rows[0] || null;
}

/**
 * Update context fields (autosave)
 */
async function updateContextFields(contextId, userId, updates) {
  const context = await findContextById(contextId);
  if (!context) return null;

  // Verify ownership through project
  const project = await findProjectById(context.project_id, userId);
  if (!project) return null;

  const allowedFields = ['problem', 'target_groups', 'approach'];
  const fieldsToUpdate = {};

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      fieldsToUpdate[key] = value;
    }
  }

  if (Object.keys(fieldsToUpdate).length === 0) {
    return { id: contextId, updated_at: context.updated_at };
  }

  const now = new Date().toISOString().split('T')[0];
  fieldsToUpdate.updated_at = now;

  const setClauses = Object.keys(fieldsToUpdate).map(k => `${k} = ?`);
  const params = Object.values(fieldsToUpdate);
  params.push(contextId);

  const sql = `UPDATE intake_contexts SET ${setClauses.join(', ')} WHERE id = ?`;
  await db.execute(sql, params);

  return { id: contextId, ...fieldsToUpdate };
}

/* ── ENTITY SEARCH ─────────────────────────────────────────────── */

async function searchEntities({ q, country, type } = {}) {
  let sql = `
    SELECT DISTINCT e.id, e.name, e.city, e.country_iso2, e.type, e.pic_number,
           c.name_es AS country_name
    FROM ref_entities e
    LEFT JOIN ref_countries c ON c.iso2 = e.country_iso2
    WHERE e.active = 1`;
  const params = [];
  if (q) {
    const like = `%${q}%`;
    sql += ' AND (e.name LIKE ? OR e.city LIKE ? OR e.pic_number LIKE ?)';
    params.push(like, like, like);
  }
  if (country) {
    sql += ' AND e.country_iso2 = ?';
    params.push(country);
  }
  if (type) {
    sql += ' AND e.type = ?';
    params.push(type);
  }
  sql += ' ORDER BY e.name ASC LIMIT 50';
  const [rows] = await db.query(sql, params);
  return rows;
}

module.exports = {
  findActivePrograms,
  createProject,
  findProjectById,
  findProjectsByUserId,
  updateProjectFields,
  deleteProject,
  findPartnersByProjectId,
  createPartner,
  findPartnerById,
  updatePartner,
  deletePartner,
  reorderPartners,
  findContextsByProjectId,
  findContextById,
  updateContextFields,
  searchEntities
};
