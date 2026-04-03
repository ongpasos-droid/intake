/* ── Admin Model — reference data tables ─────────────────────────── */
const { pool } = require('../../utils/db');
const uuid = require('../../utils/uuid');

/* ══ intake_programs ═════════════════════════════════════════════ */

async function listPrograms() {
  const [rows] = await pool.query(
    'SELECT * FROM intake_programs ORDER BY active DESC, deadline ASC'
  );
  return rows;
}

async function upsertProgram(data, id) {
  if (id) {
    await pool.query(
      `UPDATE intake_programs SET
        program_id=?, name=?, action_type=?, deadline=?,
        start_date_min=?, start_date_max=?,
        duration_min_months=?, duration_max_months=?,
        eu_grant_max=?, cofin_pct=?, indirect_pct=?,
        min_partners=?, notes=?, active=?
       WHERE id=?`,
      [data.program_id, data.name, data.action_type, data.deadline || null,
       data.start_date_min || null, data.start_date_max || null,
       data.duration_min_months || null, data.duration_max_months || null,
       data.eu_grant_max || null, data.cofin_pct || null, data.indirect_pct || null,
       data.min_partners || 2, data.notes || null, data.active ?? 1, id]
    );
    return id;
  }
  const newId = uuid();
  await pool.query(
    `INSERT INTO intake_programs
      (id, program_id, name, action_type, deadline,
       start_date_min, start_date_max,
       duration_min_months, duration_max_months,
       eu_grant_max, cofin_pct, indirect_pct,
       min_partners, notes, active)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [newId, data.program_id, data.name, data.action_type, data.deadline || null,
     data.start_date_min || null, data.start_date_max || null,
     data.duration_min_months || null, data.duration_max_months || null,
     data.eu_grant_max || null, data.cofin_pct || null, data.indirect_pct || null,
     data.min_partners || 2, data.notes || null, data.active ?? 1]
  );
  return newId;
}

async function deleteProgram(id) {
  await pool.query('DELETE FROM intake_programs WHERE id=?', [id]);
}

/* ══ ref_countries ════════════════════════════════════════════════ */

async function listCountries() {
  const [rows] = await pool.query(
    'SELECT * FROM ref_countries ORDER BY name_es ASC'
  );
  return rows;
}

async function upsertCountry(data, id) {
  if (id) {
    await pool.query(
      `UPDATE ref_countries SET
        iso2=?, name_es=?, name_en=?, eu_member=?,
        erasmus_eligible=?, perdiem_zone=?, notes=?, active=?
       WHERE id=?`,
      [data.iso2, data.name_es, data.name_en, data.eu_member ?? 0,
       data.erasmus_eligible ?? 1, data.perdiem_zone || 'A',
       data.notes || null, data.active ?? 1, id]
    );
    return id;
  }
  const newId = uuid();
  await pool.query(
    `INSERT INTO ref_countries
      (id, iso2, name_es, name_en, eu_member, erasmus_eligible, perdiem_zone, notes, active)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [newId, data.iso2, data.name_es, data.name_en, data.eu_member ?? 0,
     data.erasmus_eligible ?? 1, data.perdiem_zone || 'A',
     data.notes || null, data.active ?? 1]
  );
  return newId;
}

async function deleteCountry(id) {
  await pool.query('DELETE FROM ref_countries WHERE id=?', [id]);
}

/* ══ ref_perdiem_rates ════════════════════════════════════════════ */

async function listPerdiem() {
  const [rows] = await pool.query(
    'SELECT * FROM ref_perdiem_rates ORDER BY zone ASC, valid_from DESC'
  );
  return rows;
}

async function upsertPerdiem(data, id) {
  if (id) {
    await pool.query(
      `UPDATE ref_perdiem_rates SET
        zone=?, amount_day=?, valid_from=?, valid_to=?, notes=?
       WHERE id=?`,
      [data.zone, data.amount_day, data.valid_from,
       data.valid_to || null, data.notes || null, id]
    );
    return id;
  }
  const newId = uuid();
  await pool.query(
    `INSERT INTO ref_perdiem_rates (id, zone, amount_day, valid_from, valid_to, notes)
     VALUES (?,?,?,?,?,?)`,
    [newId, data.zone, data.amount_day, data.valid_from,
     data.valid_to || null, data.notes || null]
  );
  return newId;
}

async function deletePerdiem(id) {
  await pool.query('DELETE FROM ref_perdiem_rates WHERE id=?', [id]);
}

/* ══ ref_worker_categories ════════════════════════════════════════ */

async function listWorkerCategories() {
  const [rows] = await pool.query(
    'SELECT * FROM ref_worker_categories ORDER BY rate_day DESC'
  );
  return rows;
}

async function upsertWorkerCategory(data, id) {
  if (id) {
    await pool.query(
      `UPDATE ref_worker_categories SET
        code=?, name_es=?, name_en=?, rate_day=?, notes=?, active=?
       WHERE id=?`,
      [data.code, data.name_es, data.name_en, data.rate_day,
       data.notes || null, data.active ?? 1, id]
    );
    return id;
  }
  const newId = uuid();
  await pool.query(
    `INSERT INTO ref_worker_categories (id, code, name_es, name_en, rate_day, notes, active)
     VALUES (?,?,?,?,?,?,?)`,
    [newId, data.code, data.name_es, data.name_en, data.rate_day,
     data.notes || null, data.active ?? 1]
  );
  return newId;
}

async function deleteWorkerCategory(id) {
  await pool.query('DELETE FROM ref_worker_categories WHERE id=?', [id]);
}

module.exports = {
  listPrograms, upsertProgram, deleteProgram,
  listCountries, upsertCountry, deleteCountry,
  listPerdiem, upsertPerdiem, deletePerdiem,
  listWorkerCategories, upsertWorkerCategory, deleteWorkerCategory
};
