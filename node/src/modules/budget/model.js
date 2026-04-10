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

  // If linked to a project, include instructions data (call info + worker rates)
  let instructions = null;
  if (budget.project_id) {
    const [[proj]] = await pool.query('SELECT name, type, eu_grant, cofin_pct, indirect_pct FROM projects WHERE id = ?', [budget.project_id]);
    // Get programme/call info (projects.type = intake_programs.action_type)
    const [ctxRows] = await pool.query(
      `SELECT ip.action_type, ip.name AS call_name FROM intake_programs ip
       JOIN projects p ON p.type = ip.action_type
       WHERE p.id = ? LIMIT 1`,
      [budget.project_id]
    );
    // Get worker rates grouped by partner
    const [wrRows] = await pool.query(
      `SELECT p.name AS partner_name, p.country, wr.category, wr.rate
       FROM worker_rates wr
       JOIN partners p ON p.id = wr.partner_id
       WHERE p.project_id = ?
       ORDER BY p.order_index, wr.category`,
      [budget.project_id]
    );
    instructions = {
      acronym: proj?.name || '',
      call_type: ctxRows[0]?.action_type || '',
      call_name: ctxRows[0]?.call_name || '',
      max_grant: proj?.eu_grant || budget.max_grant,
      cofin_pct: proj?.cofin_pct || budget.cofin_pct,
      indirect_pct: proj?.indirect_pct || budget.indirect_pct,
      worker_rates: wrRows,
    };
  }

  return { budget, beneficiaries, workPackages, costMap, instructions };
}

async function getBudgetById(id) {
  const [rows] = await pool.query('SELECT * FROM budget_projects WHERE id = ?', [id]);
  return rows[0] || null;
}

/* ── Create budget pre-populated from intake ───────────────── */

async function createFromIntake(userId, projectId) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Get project data
    const [[proj]] = await conn.query('SELECT * FROM projects WHERE id = ?', [projectId]);
    if (!proj) throw new Error('Proyecto no encontrado');

    // 2. Check if budget already exists for this project
    const [[existing]] = await conn.query('SELECT id FROM budget_projects WHERE project_id = ?', [projectId]);
    if (existing) throw new Error('Este proyecto ya tiene un presupuesto');

    // 3. Create budget with project data
    const budgetId = uuid();
    await conn.query(
      `INSERT INTO budget_projects (id, user_id, project_id, name, max_grant, cofin_pct, indirect_pct)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [budgetId, userId, projectId, proj.name || 'Presupuesto', proj.eu_grant || 0, proj.cofin_pct || 80, proj.indirect_pct || 7]
    );

    // 4. Get partners → create beneficiaries
    const [partners] = await conn.query(
      'SELECT * FROM partners WHERE project_id = ? ORDER BY order_index', [projectId]
    );
    const partnerToBen = {}; // partner.id → beneficiary.id
    for (let i = 0; i < partners.length; i++) {
      const p = partners[i];
      const benId = uuid();
      await conn.query(
        `INSERT INTO budget_beneficiaries (id, budget_id, number, name, acronym, country, is_coordinator, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [benId, budgetId, i + 1, p.name, p.legal_name || '', p.country, p.role === 'applicant' ? 1 : 0, i]
      );
      partnerToBen[p.id] = benId;
    }

    // 5. Get WPs → create budget WPs
    const [wps] = await conn.query(
      'SELECT * FROM work_packages WHERE project_id = ? ORDER BY order_index', [projectId]
    );
    const wpToBudgetWp = {}; // wp.id → budget_wp.id
    for (let i = 0; i < wps.length; i++) {
      const wp = wps[i];
      const bwpId = uuid();
      await conn.query(
        `INSERT INTO budget_work_packages (id, budget_id, number, label, sort_order)
         VALUES (?, ?, ?, ?, ?)`,
        [bwpId, budgetId, i + 1, `${wp.code} — ${wp.title}`, i]
      );
      wpToBudgetWp[wp.id] = bwpId;
    }

    // 6. Seed cost lines for every beneficiary × WP
    for (const benId of Object.values(partnerToBen)) {
      for (const bwpId of Object.values(wpToBudgetWp)) {
        for (const tmpl of COST_TEMPLATE) {
          await conn.query(
            `INSERT INTO budget_costs (id, budget_id, beneficiary_id, wp_id, category, subcategory, line_item, units, cost_per_unit, total_cost)
             VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0)`,
            [uuid(), budgetId, benId, bwpId, tmpl.category, tmpl.subcategory, tmpl.line_item]
          );
        }
      }
    }

    // 7. Load reference data: routes, per diem rates, worker rates
    const [routes] = await conn.query('SELECT * FROM routes WHERE project_id = ?', [projectId]);
    const [perdiemRows] = await conn.query(
      'SELECT pr.partner_id, pr.accommodation_rate, pr.subsistence_rate FROM partner_rates pr JOIN partners p ON p.id = pr.partner_id WHERE p.project_id = ?',
      [projectId]
    );
    const perdiem = {}; // partner_id → { accommodation, subsistence }
    for (const r of perdiemRows) perdiem[r.partner_id] = { accom: Number(r.accommodation_rate), subs: Number(r.subsistence_rate) };

    const [workerRows] = await conn.query(
      `SELECT wr.id, wr.partner_id, wr.category, wr.rate
       FROM worker_rates wr
       JOIN partners p ON p.id = wr.partner_id
       WHERE p.project_id = ?
       ORDER BY p.order_index, FIELD(wr.category, 'Manager', 'Trainer/Researcher/Youth worker', 'Technician', 'Administrative')`,
      [projectId]
    );
    // The frontend Calculator assigns sequential IDs (wrCounter) starting at 1:
    // Partner 0: IDs 1,2,3,4 (Manager, Trainer, Tech, Admin)
    // Partner 1: IDs 5,6,7,8 etc.
    // Map counter → actual worker_rate row
    const workerRateByCounter = {};
    for (let i = 0; i < workerRows.length; i++) {
      workerRateByCounter[i + 1] = workerRows[i];
    }
    // Also map partner_id → [worker_rates]
    const workerByPartner = {};
    for (const w of workerRows) {
      if (!workerByPartner[w.partner_id]) workerByPartner[w.partner_id] = [];
      workerByPartner[w.partner_id].push(w);
    }

    // Helper: get route cost between two partners
    function getRouteCost(fromId, toId) {
      if (fromId === toId) return 0;
      const r = routes.find(r =>
        (r.endpoint_a === fromId && r.endpoint_b === toId) ||
        (r.endpoint_b === fromId && r.endpoint_a === toId)
      );
      return r ? Number(r.custom_rate || 0) : 0;
    }

    // Helper: get host partner per diem (accommodation + subsistence)
    function getHostPerdiem(hostPartnerId) {
      const pd = perdiem[hostPartnerId];
      return pd ? pd.accom + pd.subs : 0;
    }

    // 8. Pre-fill cost lines from intake activities
    for (const wp of wps) {
      const bwpId = wpToBudgetWp[wp.id];
      const [activities] = await conn.query(
        'SELECT * FROM activities WHERE wp_id = ? ORDER BY order_index', [wp.id]
      );

      for (const act of activities) {
        switch (act.type) {

          case 'management': {
            const [mgmt] = await conn.query('SELECT * FROM activity_management WHERE activity_id = ?', [act.id]);
            const [mgmtParts] = await conn.query('SELECT * FROM activity_management_partners WHERE activity_id = ? AND active = 1', [act.id]);
            if (mgmt[0]) {
              for (const mp of mgmtParts) {
                const benId = partnerToBen[mp.partner_id];
                if (!benId) continue;
                const partner = partners.find(p => p.id === mp.partner_id);
                const rate = partner?.role === 'applicant' ? Number(mgmt[0].rate_applicant) : Number(mgmt[0].rate_partner);
                await addToCostLine(conn, budgetId, benId, bwpId, 'A', 'A1', 'Project Coordinator', 1, rate);
              }
            }
            break;
          }

          case 'meeting':
          case 'ltta': {
            const [mob] = await conn.query('SELECT * FROM activity_mobility WHERE activity_id = ?', [act.id]);
            const [mobParts] = await conn.query('SELECT * FROM activity_mobility_participants WHERE activity_id = ? AND active = 1', [act.id]);
            if (!mob[0]) break;
            const hostId = mob[0].host_partner_id;
            const pax = Number(mob[0].pax_per_partner) || 0;
            const days = Number(mob[0].duration_days) || 0;
            const isOnline = act.online === 1;

            // ALL partners participate (guests from DB + host always included)
            const activePartnerIds = new Set(mobParts.map(mp => mp.partner_id));
            if (hostId && partnerToBen[hostId]) activePartnerIds.add(hostId);

            for (const partnerId of activePartnerIds) {
              const benId = partnerToBen[partnerId];
              if (!benId) continue;
              const isHost = partnerId === hostId;

              if (!isOnline && !isHost) {
                const routeCost = getRouteCost(partnerId, hostId);
                if (routeCost > 0) {
                  await addToCostLine(conn, budgetId, benId, bwpId, 'C', 'C1', 'Travel', pax, routeCost);
                }
              }
              if (!isOnline) {
                // ALL partners (including host) pay per diem of their own country
                const pd = perdiem[partnerId] || { accom: 0, subs: 0 };
                if (pd.accom > 0) await addToCostLine(conn, budgetId, benId, bwpId, 'C', 'C1', 'Accommodation', pax * days, pd.accom);
                if (pd.subs > 0) await addToCostLine(conn, budgetId, benId, bwpId, 'C', 'C1', 'Subsistence', pax * days, pd.subs);
              }
            }
            break;
          }

          case 'io': {
            const [ios] = await conn.query('SELECT * FROM activity_intellectual_outputs WHERE activity_id = ?', [act.id]);
            for (const io of ios) {
              const benId = partnerToBen[io.partner_id];
              if (!benId) continue;
              const days = Number(io.days) || 0;
              // Use average worker rate for the partner (matches Calculator behavior)
              const partnerRates = workerByPartner[io.partner_id] || [];
              const avgRate = partnerRates.length > 0
                ? Math.round(partnerRates.reduce((s, w) => s + Number(w.rate), 0) / partnerRates.length)
                : 0;
              // Map category for budget line item
              const wr = workerRateByCounter[io.worker_category];
              const lineItem = wr ? mapWorkerToLineItem(wr.category) : 'Other';
              await addToCostLine(conn, budgetId, benId, bwpId, 'A', 'A1', lineItem, days, avgRate);
            }
            break;
          }

          case 'me': {
            const [mes] = await conn.query('SELECT * FROM activity_multiplier_events WHERE activity_id = ? AND active = 1', [act.id]);
            for (const me of mes) {
              const benId = partnerToBen[me.partner_id];
              if (!benId) continue;
              const localTotal = (me.local_pax || 0) * Number(me.local_rate || 0);
              const intlTotal = (me.intl_pax || 0) * Number(me.intl_rate || 0);
              // Store as single lump in the cost line
              await addToCostLine(conn, budgetId, benId, bwpId, 'C', 'C3', 'Services for communication/promotion/dissemination', 1, localTotal + intlTotal);
            }
            break;
          }

          case 'campaign': {
            const [camps] = await conn.query('SELECT * FROM activity_campaigns WHERE activity_id = ? AND active = 1', [act.id]);
            for (const c of camps) {
              const benId = partnerToBen[c.partner_id];
              if (!benId) continue;
              await addToCostLine(conn, budgetId, benId, bwpId, 'C', 'C3', 'Services for communication/promotion/dissemination', c.months || 0, Number(c.monthly_amount || 0));
            }
            break;
          }

          case 'local_ws': {
            const [wss] = await conn.query('SELECT * FROM activity_local_workshops WHERE activity_id = ? AND active = 1', [act.id]);
            for (const ws of wss) {
              const benId = partnerToBen[ws.partner_id];
              if (!benId) continue;
              const units = (ws.participants || 0) * (ws.sessions || 0);
              await addToCostLine(conn, budgetId, benId, bwpId, 'C', 'C3', 'Services for Meetings, Seminars', units, Number(ws.cost_per_pax || 0));
            }
            break;
          }

          case 'website': {
            const [gcosts] = await conn.query('SELECT * FROM activity_generic_costs WHERE activity_id = ? AND active = 1', [act.id]);
            for (const gc of gcosts) {
              const benId = partnerToBen[gc.partner_id];
              if (!benId) continue;
              await addToCostLine(conn, budgetId, benId, bwpId, 'C', 'C3', 'Website', 1, Number(gc.amount || 0));
            }
            break;
          }

          case 'generic_costs': {
            const [gcosts] = await conn.query('SELECT * FROM activity_generic_costs WHERE activity_id = ? AND active = 1', [act.id]);
            for (const gc of gcosts) {
              const benId = partnerToBen[gc.partner_id];
              if (!benId) continue;
              const mapping = mapGenericCost(act.subtype);
              await addToCostLine(conn, budgetId, benId, bwpId, mapping.category, mapping.subcategory, mapping.line_item, 1, Number(gc.amount || 0));
            }
            break;
          }
        }
      }
    }

    await conn.commit();
    return { id: budgetId };
  } catch (e) { await conn.rollback(); throw e; }
  finally { conn.release(); }
}

/** Accumulate into an existing cost line — adds total_cost directly */
async function addToCostLine(conn, budgetId, benId, wpId, category, subcategory, lineItem, addUnits, addCostPerUnit) {
  const [rows] = await conn.query(
    `SELECT id, units, cost_per_unit, total_cost FROM budget_costs
     WHERE budget_id = ? AND beneficiary_id = ? AND wp_id = ? AND category = ? AND line_item = ?`,
    [budgetId, benId, wpId, category, lineItem]
  );
  if (rows[0]) {
    const existingTotal = Number(rows[0].total_cost) || 0;
    const addTotal = Number(addUnits) * Number(addCostPerUnit);
    const newTotal = existingTotal + addTotal;
    const newUnits = Number(rows[0].units) + Number(addUnits);
    // Recalculate average cost_per_unit from accumulated total
    const avgRate = newUnits > 0 ? newTotal / newUnits : 0;
    await conn.query(
      'UPDATE budget_costs SET units = ?, cost_per_unit = ?, total_cost = ? WHERE id = ?',
      [newUnits, Math.round(avgRate * 100) / 100, Math.round(newTotal * 100) / 100, rows[0].id]
    );
  }
}

function mapWorkerToLineItem(workerCategory) {
  if (!workerCategory) return 'Other';
  const lc = workerCategory.toLowerCase();
  if (lc.includes('manager')) return 'Project Coordinator';
  if (lc.includes('trainer') || lc.includes('youth') || lc.includes('researcher')) return 'Youth Trainer';
  if (lc.includes('tech')) return 'Finance Manager';
  if (lc.includes('admin')) return 'Communications Officer';
  return 'Other';
}

function mapGenericCost(subtype) {
  if (!subtype) return { category: 'C', subcategory: 'C3', line_item: 'Other' };
  const lc = subtype.toLowerCase();
  if (lc.includes('equipment')) return { category: 'C', subcategory: 'C2', line_item: 'Equipment' };
  if (lc.includes('consumable')) return { category: 'C', subcategory: 'C3', line_item: 'Consumables' };
  if (lc.includes('website')) return { category: 'C', subcategory: 'C3', line_item: 'Website' };
  if (lc.includes('artistic')) return { category: 'C', subcategory: 'C3', line_item: 'Artistic Fees' };
  if (lc.includes('subcontract')) return { category: 'B', subcategory: null, line_item: 'Subcontracting costs' };
  return { category: 'C', subcategory: 'C3', line_item: 'Other' };
}

module.exports = {
  COST_TEMPLATE,
  createBudget, listBudgets, getBudget, updateBudget, deleteBudget,
  listBeneficiaries, addBeneficiary, updateBeneficiary, deleteBeneficiary,
  listWorkPackages, addWorkPackage, updateWorkPackage, deleteWorkPackage,
  seedCostLines, getCostLines, updateCostLine,
  getFullBudget, createFromIntake,
};
