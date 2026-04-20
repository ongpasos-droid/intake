/* ── Admin Model — reference data tables ─────────────────────────── */
const pool = require('../../utils/db');
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

async function listWorkerMatrix() {
  const [rows] = await pool.query(`
    SELECT c.id, c.code, c.name_es, c.name_en, c.active,
           z.zone, z.rate_day, z.id AS zone_rate_id
    FROM ref_worker_categories c
    JOIN ref_worker_zone_rates z ON z.category_id = c.id
    ORDER BY c.code, z.zone
  `);
  // Group by category
  const map = {};
  rows.forEach(r => {
    if (!map[r.code]) map[r.code] = { id: r.id, code: r.code, name_es: r.name_es, name_en: r.name_en, active: r.active, zones: {} };
    map[r.code].zones[r.zone] = { rate_day: r.rate_day, id: r.zone_rate_id };
  });
  return Object.values(map);
}

async function upsertWorkerZoneRate(zoneRateId, rate_day) {
  await pool.query('UPDATE ref_worker_zone_rates SET rate_day=? WHERE id=?', [rate_day, zoneRateId]);
}

/* ══ ref_erasmus_regions + eligibility ═══════════════════════════ */

async function listEligibility({ type, region } = {}) {
  let sql = `
    SELECT c.id, c.iso2, c.name_es, c.name_en,
           c.eu_member, c.erasmus_eligible, c.perdiem_zone,
           c.participation_type, c.erasmus_region, c.active,
           r.name_es AS region_name_es
    FROM ref_countries c
    LEFT JOIN ref_erasmus_regions r ON r.id = c.erasmus_region
    WHERE 1=1`;
  const params = [];
  if (type)   { sql += ' AND c.participation_type = ?'; params.push(type); }
  if (region) { sql += ' AND c.erasmus_region = ?';     params.push(region); }
  sql += ' ORDER BY c.participation_type ASC, c.erasmus_region ASC, c.name_es ASC';
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function listRegions() {
  const [rows] = await pool.query('SELECT * FROM ref_erasmus_regions ORDER BY id ASC');
  return rows;
}

module.exports = {
  listPrograms, upsertProgram, deleteProgram,
  listCountries, upsertCountry, deleteCountry,
  listPerdiem, upsertPerdiem, deletePerdiem,
  listWorkerCategories, upsertWorkerCategory, deleteWorkerCategory,
  listEligibility, listRegions,
  listWorkerMatrix, upsertWorkerZoneRate
};
