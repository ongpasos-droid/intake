/* ── Budget Model ─────────────────────────────────────────────── */
const pool = require('../../utils/db');
const uuid = require('../../utils/uuid');

/* ── Cost structure matching EACEA Excel ─────────────────────── */
const COST_TEMPLATE = [
  { category: 'A', subcategory: 'A1', line_item: 'Project Coordinator' },
  { category: 'A', subcategory: 'A1', line_item: 'Youth Trainer' },
  { category: 'A', subcategory: 'A1', line_item: 'Finance Manager' },
  { category: 'A', subcategory: 'A1', line_item: 'Communications Officer' },
  { category: 'A', subcategory: 'A1', line_item: 'Other' },
  { category: 'A', subcategory: 'A2', line_item: 'Natural persons under direct contract' },
  { category: 'A', subcategory: 'A3', line_item: 'Seconded persons' },
  { category: 'A', subcategory: 'A4', line_item: 'SME Owners without salary' },
  { category: 'A', subcategory: 'A5', line_item: 'Volunteers' },
  { category: 'B', subcategory: null, line_item: 'Subcontracting costs' },
  { category: 'C', subcategory: 'C1', line_item: 'Travel' },
  { category: 'C', subcategory: 'C1', line_item: 'Accommodation' },
  { category: 'C', subcategory: 'C1', line_item: 'Subsistence' },
  { category: 'C', subcategory: 'C2', line_item: 'Equipment' },
  { category: 'C', subcategory: 'C3', line_item: 'Consumables' },
  { category: 'C', subcategory: 'C3', line_item: 'Services for Meetings, Seminars' },
  { category: 'C', subcategory: 'C3', line_item: 'Services for communication/promotion/dissemination' },
  { category: 'C', subcategory: 'C3', line_item: 'Website' },
  { category: 'C', subcategory: 'C3', line_item: 'Artistic Fees' },
  { category: 'C', subcategory: 'C3', line_item: 'Other' },
  { category: 'D', subcategory: 'D1', line_item: 'Financial support to third parties' },
];

/* ── Budget CRUD ─────────────────────────────────────────────── */

async function createBudget({ userId, name, maxGrant, cofinPct, indirectPct }) {
  const id = uuid();
  await pool.query(
    `INSERT INTO budget_projects (id, user_id, name, max_grant, cofin_pct, indirect_pct)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, userId, name || 'Nuevo presupuesto', maxGrant || 0, cofinPct || 80, indirectPct || 7]
  );
  return { id };
}

async function listBudgets(userId) {
  const [rows] = await pool.query(
    `SELECT id, name, max_grant, cofin_pct, indirect_pct, status, created_at, updated_at
     FROM budget_projects WHERE user_id = ? ORDER BY updated_at DESC`, [userId]
  );
  return rows;
}

async function getBudget(id, userId) {
  const [rows] = await pool.query(
    'SELECT * FROM budget_projects WHERE id = ? AND user_id = ?', [id, userId]
  );
  return rows[0] || null;
}

async function updateBudget(id, data) {
  const fields = [];
  const params = [];
  for (const key of ['name', 'max_grant', 'cofin_pct', 'indirect_pct', 'status', 'project_id', 'program_id']) {
    if (data[key] !== undefined) { fields.push(`${key} = ?`); params.push(data[key]); }
  }
  if (!fields.length) return;
  params.push(id);
  await pool.query(`UPDATE budget_projects SET ${fields.join(', ')} WHERE id = ?`, params);
}

async function deleteBudget(id) {
  await pool.query('DELETE FROM budget_projects WHERE id = ?', [id]);
}

/* ── Beneficiaries ───────────────────────────────────────────── */

async function listBeneficiaries(budgetId) {
  const [rows] = await pool.query(
    'SELECT * FROM budget_beneficiaries WHERE budget_id = ? ORDER BY sort_order, number', [budgetId]
  );
  return rows;
}

async function addBeneficiary(budgetId, data) {
  const id = uuid();
  const [maxNum] = await pool.query('SELECT COALESCE(MAX(number),0)+1 AS n FROM budget_beneficiaries WHERE budget_id = ?', [budgetId]);
  const num = data.number || maxNum[0].n;
  await pool.query(
    `INSERT INTO budget_beneficiaries (id, budget_id, number, name, acronym, country, is_coordinator, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, budgetId, num, data.name || '', data.acronym || '', data.country || '', data.is_coordinator ? 1 : 0, data.sort_order || num]
  );

  // Auto-create cost lines for this beneficiary × all existing WPs
  const wps = await listWorkPackages(budgetId);
  for (const wp of wps) {
    await seedCostLines(budgetId, id, wp.id);
  }

  return { id, number: num };
}

async function updateBeneficiary(id, data) {
  const fields = [];
  const params = [];
  for (const key of ['name', 'acronym', 'country', 'is_coordinator', 'sort_order']) {
    if (data[key] !== undefined) { fields.push(`${key} = ?`); params.push(data[key]); }
  }
  if (!fields.length) return;
  params.push(id);
  await pool.query(`UPDATE budget_beneficiaries SET ${fields.join(', ')} WHERE id = ?`, params);
}

async function deleteBeneficiary(id) {
  await pool.query('DELETE FROM budget_beneficiaries WHERE id = ?', [id]);
}

/* ── Work Packages ───────────────────────────────────────────── */

async function listWorkPackages(budgetId) {
  const [rows] = await pool.query(
    'SELECT * FROM budget_work_packages WHERE budget_id = ? ORDER BY sort_order, number', [budgetId]
  );
  return rows;
}

async function addWorkPackage(budgetId, data) {
  const id = uuid();
  const [maxNum] = await pool.query('SELECT COALESCE(MAX(number),0)+1 AS n FROM budget_work_packages WHERE budget_id = ?', [budgetId]);
  const num = data.number || maxNum[0].n;
  await pool.query(
    `INSERT INTO budget_work_packages (id, budget_id, number, label, sort_order)
     VALUES (?, ?, ?, ?, ?)`,
    [id, budgetId, num, data.label || '', data.sort_order || num]
  );

  // Auto-create cost lines for all existing beneficiaries × this WP
  const bens = await listBeneficiaries(budgetId);
  for (const ben of bens) {
    await seedCostLines(budgetId, ben.id, id);
  }

  return { id, number: num };
}

async function updateWorkPackage(id, data) {
  const fields = [];
  const params = [];
  for (const key of ['label', 'sort_order']) {
    if (data[key] !== undefined) { fields.push(`${key} = ?`); params.push(data[key]); }
  }
  if (!fields.length) return;
  params.push(id);
  await pool.query(`UPDATE budget_work_packages SET ${fields.join(', ')} WHERE id = ?`, params);
}

async function deleteWorkPackage(id) {
  await pool.query('DELETE FROM budget_work_packages WHERE id = ?', [id]);
}

/* ── Cost lines ──────────────────────────────────────────────── */

async function seedCostLines(budgetId, beneficiaryId, wpId) {
  for (const tmpl of COST_TEMPLATE) {
    const id = uuid();
    await pool.query(
      `INSERT INTO budget_costs (id, budget_id, beneficiary_id, wp_id, category, subcategory, line_item, units, cost_per_unit, total_cost)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0)`,
      [id, budgetId, beneficiaryId, wpId, tmpl.category, tmpl.subcategory, tmpl.line_item]
    );
  }
}

async function getCostLines(budgetId, beneficiaryId, wpId) {
  let sql = 'SELECT * FROM budget_costs WHERE budget_id = ?';
  const params = [budgetId];
  if (beneficiaryId) { sql += ' AND beneficiary_id = ?'; params.push(beneficiaryId); }
  if (wpId) { sql += ' AND wp_id = ?'; params.push(wpId); }
  sql += ' ORDER BY FIELD(category,"A","B","C","D"), subcategory, line_item';
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function updateCostLine(id, data) {
  const units = data.units ?? 0;
  const costPerUnit = data.cost_per_unit ?? 0;
  const totalCost = units * costPerUnit;
  await pool.query(
    `UPDATE budget_costs SET units = ?, cost_per_unit = ?, total_cost = ?, notes = ? WHERE id = ?`,
    [units, costPerUnit, totalCost, data.notes || null, id]
  );
  return { total_cost: totalCost };
}

/* ── Summary: full budget tree ───────────────────────────────── */

async function getFullBudget(budgetId) {
  const budget = await getBudgetById(budgetId);
  if (!budget) return null;

  const beneficiaries = await listBeneficiaries(budgetId);
  const workPackages = await listWorkPackages(budgetId);
  const [allCosts] = await pool.query(
    'SELECT * FROM budget_costs WHERE budget_id = ? ORDER BY FIELD(category,"A","B","C","D"), subcategory, line_item',
    [budgetId]
  );

  // Group costs by beneficiary × WP
  const costMap = {};
  for (const c of allCosts) {
    const key = `${c.beneficiary_id}|${c.wp_id}`;
    if (!costMap[key]) costMap[key] = [];
    costMap[key].push(c);
  }

  return { budget, beneficiaries, workPackages, costMap };
}

async function getBudgetById(id) {
  const [rows] = await pool.query('SELECT * FROM budget_projects WHERE id = ?', [id]);
  return rows[0] || null;
}

module.exports = {
  COST_TEMPLATE,
  createBudget, listBudgets, getBudget, updateBudget, deleteBudget,
  listBeneficiaries, addBeneficiary, updateBeneficiary, deleteBeneficiary,
  listWorkPackages, addWorkPackage, updateWorkPackage, deleteWorkPackage,
  seedCostLines, getCostLines, updateCostLine,
  getFullBudget,
};
