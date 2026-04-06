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
    const allowed = ['program_id','name','action_type','deadline','start_date_min','start_date_max',
      'duration_min_months','duration_max_months','eu_grant_max','cofin_pct','indirect_pct',
      'min_partners','notes','active'];
    const sets = [], params = [];
    for (const k of allowed) {
      if (k in data) { sets.push(`${k}=?`); params.push(data[k] ?? null); }
    }
    if (!sets.length) return id;
    params.push(id);
    await pool.query(`UPDATE intake_programs SET ${sets.join(', ')} WHERE id=?`, params);
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
    'SELECT * FROM ref_perdiem_rates ORDER BY zone ASC'
  );
  return rows;
}

async function upsertPerdiem(data, id) {
  const accom = Number(data.amount_accommodation) || 0;
  const subs  = Number(data.amount_subsistence)   || 0;
  const total = +(accom + subs).toFixed(2);
  if (id) {
    await pool.query(
      `UPDATE ref_perdiem_rates SET
        zone=?, amount_day=?, amount_accommodation=?, amount_subsistence=?
       WHERE id=?`,
      [data.zone, total, accom, subs, id]
    );
    return id;
  }
  const newId = uuid();
  await pool.query(
    `INSERT INTO ref_perdiem_rates (id, zone, amount_day, amount_accommodation, amount_subsistence, valid_from)
     VALUES (?,?,?,?,?,CURDATE())`,
    [newId, data.zone, total, accom, subs]
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
  // Auto-create zone rates for A, B, C, D
  const baseRate = Number(data.rate_day) || 0;
  const zoneMultipliers = { A: 1.0, B: 0.88, C: 0.77, D: 0.66 };
  for (const [zone, mult] of Object.entries(zoneMultipliers)) {
    await pool.query(
      'INSERT INTO ref_worker_zone_rates (id, category_id, zone, rate_day) VALUES (?,?,?,?)',
      [uuid(), newId, zone, +(baseRate * mult).toFixed(2)]
    );
  }
  return newId;
}

async function deleteWorkerCategory(id) {
  await pool.query('DELETE FROM ref_worker_categories WHERE id=?', [id]);
}

/* ══ ref_entities ═════════════════════════════════════════════════ */

async function listEntities(search) {
  if (search) {
    const like = `%${search}%`;
    const [rows] = await pool.query(
      'SELECT * FROM ref_entities WHERE name LIKE ? OR city LIKE ? OR pic_number LIKE ? ORDER BY name ASC',
      [like, like, like]
    );
    return rows;
  }
  const [rows] = await pool.query('SELECT * FROM ref_entities ORDER BY name ASC');
  return rows;
}

async function upsertEntity(data, id) {
  if (id) {
    await pool.query(
      `UPDATE ref_entities SET
        name=?, city=?, country_iso2=?, type=?,
        pic_number=?, website=?, notes=?, active=?
       WHERE id=?`,
      [data.name, data.city || null, data.country_iso2, data.type || 'ngo',
       data.pic_number || null, data.website || null, data.notes || null,
       data.active ?? 1, id]
    );
    return id;
  }
  const newId = uuid();
  await pool.query(
    `INSERT INTO ref_entities
      (id, name, city, country_iso2, type, pic_number, website, notes, active)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [newId, data.name, data.city || null, data.country_iso2, data.type || 'ngo',
     data.pic_number || null, data.website || null, data.notes || null,
     data.active ?? 1]
  );
  return newId;
}

async function deleteEntity(id) {
  await pool.query('DELETE FROM ref_entities WHERE id=?', [id]);
}

/* ══ Worker matrix (category × zone) ════════════════════════════ */

async function listWorkerMatrix() {
  const [rows] = await pool.query(`
    SELECT c.id, c.code, c.name_es, c.name_en, c.active,
           z.zone, z.rate_day, z.id AS zone_rate_id
    FROM ref_worker_categories c
    JOIN ref_worker_zone_rates z ON z.category_id = c.id
    ORDER BY c.code, z.zone
  `);
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

/* ══ ref_erasmus_regions + countries extended ═════════════════════ */

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

/* ══ call_eligibility (per-programme rules) ══════════════════════ */

async function getCallEligibility(programId) {
  const [rows] = await pool.query('SELECT * FROM call_eligibility WHERE program_id=?', [programId]);
  return rows[0] || null;
}

async function upsertCallEligibility(programId, data) {
  const existing = await getCallEligibility(programId);
  const countryTypes   = JSON.stringify(data.eligible_country_types || []);
  const entityTypes    = JSON.stringify(data.eligible_entity_types || []);
  const activityTypes  = JSON.stringify(data.activity_location_types || []);

  if (existing) {
    await pool.query(
      `UPDATE call_eligibility SET
        eligible_country_types=?, eligible_entity_types=?,
        min_partners=?, min_countries=?, max_coord_applications=?,
        activity_location_types=?, additional_rules=?,
        writing_style=?, ai_detection_rules=?
       WHERE program_id=?`,
      [countryTypes, entityTypes,
       data.min_partners || 1, data.min_countries || 1, data.max_coord_applications || null,
       activityTypes, data.additional_rules || null,
       data.writing_style || null, data.ai_detection_rules || null, programId]
    );
    return existing.id;
  }
  const id = uuid();
  await pool.query(
    `INSERT INTO call_eligibility (id, program_id, eligible_country_types, eligible_entity_types,
      min_partners, min_countries, max_coord_applications, activity_location_types, additional_rules,
      writing_style, ai_detection_rules)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [id, programId, countryTypes, entityTypes,
     data.min_partners || 1, data.min_countries || 1, data.max_coord_applications || null,
     activityTypes, data.additional_rules || null,
     data.writing_style || null, data.ai_detection_rules || null]
  );
  return id;
}

/* ══ Evaluator (eval rules per program/convocatoria) ═════════════ */

async function getEvalTree(programId) {
  const [sections] = await pool.query('SELECT * FROM eval_sections WHERE program_id=? ORDER BY sort_order', [programId]);
  const sectionIds = sections.map(s => s.id);
  let questions = [], criteria = [];
  if (sectionIds.length) {
    [questions] = await pool.query('SELECT * FROM eval_questions WHERE section_id IN (?) ORDER BY sort_order', [sectionIds]);
    const qIds = questions.map(q => q.id);
    if (qIds.length) {
      [criteria] = await pool.query('SELECT * FROM eval_criteria WHERE question_id IN (?) ORDER BY sort_order', [qIds]);
    }
  }
  const qMap = {};
  questions.forEach(q => { q.criteria = []; qMap[q.id] = q; });
  criteria.forEach(c => { if (qMap[c.question_id]) qMap[c.question_id].criteria.push(c); });
  const sMap = {};
  sections.forEach(s => { s.questions = []; sMap[s.id] = s; });
  questions.forEach(q => { if (sMap[q.section_id]) sMap[q.section_id].questions.push(q); });
  return sections;
}

async function upsertEvalSection(data, id) {
  if (id) {
    const sets = [];
    const params = [];
    if ('title' in data) { sets.push('title=?'); params.push(data.title); }
    if ('color' in data) { sets.push('color=?'); params.push(data.color); }
    if ('max_score' in data) { sets.push('max_score=?'); params.push(data.max_score ?? 0); }
    if ('eval_notes' in data) { sets.push('eval_notes=?'); params.push(data.eval_notes || null); }
    if ('form_ref' in data) { sets.push('form_ref=?'); params.push(data.form_ref || null); }
    if ('sort_order' in data) { sets.push('sort_order=?'); params.push(data.sort_order ?? 0); }
    if (!sets.length) return id;
    params.push(id);
    await pool.query(`UPDATE eval_sections SET ${sets.join(', ')} WHERE id=?`, params);
    return id;
  }
  const newId = uuid();
  await pool.query('INSERT INTO eval_sections (id, program_id, title, form_ref, color, max_score, sort_order) VALUES (?,?,?,?,?,?,?)',
    [newId, data.program_id, data.title, data.form_ref || null, data.color || '#3b82f6', data.max_score ?? 0, data.sort_order ?? 0]);
  return newId;
}

async function deleteEvalSection(id) { await pool.query('DELETE FROM eval_sections WHERE id=?', [id]); }

async function upsertEvalQuestion(data, id) {
  if (id) {
    // Partial update: only SET fields that are present in data
    const sets = [];
    const params = [];
    const fieldMap = {
      code: 'code', title: 'title', description: 'description',
      word_limit: 'word_limit', page_limit: 'page_limit',
      writing_guidance: 'writing_guidance', scoring_logic: 'scoring_logic',
      weight: 'weight', max_score: 'max_score', threshold: 'threshold',
      sort_order: 'sort_order'
    };
    for (const [key, col] of Object.entries(fieldMap)) {
      if (key in data) { sets.push(`${col}=?`); params.push(data[key] ?? null); }
    }
    if ('general_rules' in data) { sets.push('general_rules=?'); params.push(data.general_rules ? JSON.stringify(data.general_rules) : null); }
    if ('score_caps' in data) { sets.push('score_caps=?'); params.push(data.score_caps ? JSON.stringify(data.score_caps) : null); }
    // Also support legacy "prompt" → description
    if ('prompt' in data && !('description' in data)) { sets.push('description=?'); params.push(data.prompt || null); }
    if (!sets.length) return id;
    params.push(id);
    await pool.query(`UPDATE eval_questions SET ${sets.join(', ')} WHERE id=?`, params);
    return id;
  }
  const desc = data.description ?? data.prompt ?? null;
  const rules = data.general_rules ? JSON.stringify(data.general_rules) : null;
  const caps = data.score_caps ? JSON.stringify(data.score_caps) : null;
  const newId = uuid();
  await pool.query(
    `INSERT INTO eval_questions (id, section_id, code, title, description, word_limit, page_limit,
     writing_guidance, scoring_logic, weight, max_score, threshold, general_rules, score_caps, sort_order)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [newId, data.section_id, data.code, data.title, desc, data.word_limit || null, data.page_limit || null,
     data.writing_guidance || null, data.scoring_logic || 'sum', data.weight ?? 0,
     data.max_score ?? 0, data.threshold ?? 0, rules, caps, data.sort_order ?? 0]);
  return newId;
}

async function deleteEvalQuestion(id) { await pool.query('DELETE FROM eval_questions WHERE id=?', [id]); }

async function upsertEvalCriterion(data, id) {
  if (id) {
    const sets = [];
    const params = [];
    const fields = ['title', 'max_score', 'mandatory', 'meaning', 'structure', 'relations', 'rules', 'red_flags', 'sort_order'];
    for (const f of fields) {
      if (f in data) { sets.push(`${f}=?`); params.push(data[f] ?? null); }
    }
    if ('score_rubric' in data) { sets.push('score_rubric=?'); params.push(data.score_rubric ? JSON.stringify(data.score_rubric) : null); }
    if (!sets.length) return id;
    params.push(id);
    await pool.query(`UPDATE eval_criteria SET ${sets.join(', ')} WHERE id=?`, params);
    return id;
  }
  const rubric = data.score_rubric ? JSON.stringify(data.score_rubric) : null;
  const newId = uuid();
  await pool.query(
    `INSERT INTO eval_criteria (id, question_id, title, max_score, mandatory, meaning, structure,
     relations, rules, red_flags, score_rubric, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [newId, data.question_id, data.title, data.max_score ?? 1, data.mandatory ?? 0, data.meaning || null,
     data.structure || null, data.relations || null, data.rules || null, data.red_flags || null, rubric, data.sort_order ?? 0]);
  return newId;
}

async function deleteEvalCriterion(id) { await pool.query('DELETE FROM eval_criteria WHERE id=?', [id]); }

async function importEvalRules(programId, jsonData) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Clear existing rules for this program
    const [existingSections] = await conn.query('SELECT id FROM eval_sections WHERE program_id=?', [programId]);
    if (existingSections.length) {
      await conn.query('DELETE FROM eval_sections WHERE program_id=?', [programId]);
    }
    const COLORS = ['#3b82f6', '#f59e0b', '#22c55e', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#14b8a6'];
    const sections = jsonData.sections || [];
    for (let si = 0; si < sections.length; si++) {
      const sec = sections[si];
      const secId = uuid();
      await conn.query('INSERT INTO eval_sections (id, program_id, title, form_ref, color, max_score, eval_notes, sort_order) VALUES (?,?,?,?,?,?,?,?)',
        [secId, programId, sec.title, sec.formRef || null, COLORS[si % COLORS.length], sec.maxScore ?? 0, sec.evalNotes || null, si]);
      const questions = sec.questions || [];
      for (let qi = 0; qi < questions.length; qi++) {
        const q = questions[qi];
        const qId = uuid();
        await conn.query(
          `INSERT INTO eval_questions (id, section_id, code, title, description, word_limit, page_limit,
           writing_guidance, scoring_logic, weight, max_score, threshold, general_rules, score_caps, sort_order)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [qId, secId, q.code || `${si+1}.${qi+1}`, q.title, q.description || q.prompt || null,
           q.wordLimit || null, q.pageLimit || null, q.writingGuidance || null, q.scoringLogic || 'sum',
           q.weight ?? 0, q.maxScore ?? 0, q.threshold ?? 0,
           q.generalRules ? JSON.stringify(q.generalRules) : null,
           q.scoreCaps ? JSON.stringify(q.scoreCaps) : null, qi]);
        const criteria = q.miniPoints || q.criteria || [];
        for (let ci = 0; ci < criteria.length; ci++) {
          const c = criteria[ci];
          await conn.query(
            `INSERT INTO eval_criteria (id, question_id, title, max_score, mandatory, meaning, structure,
             relations, rules, red_flags, score_rubric, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
            [uuid(), qId, c.title, c.maxScore ?? 1, c.mandatory ? 1 : 0,
             c.meaning || null, c.structure || null, c.relations || null, c.rules || null,
             c.redFlags || null, c.scoreRubric ? JSON.stringify(c.scoreRubric) : null, ci]);
        }
      }
    }
    await conn.commit();
  } catch (e) { await conn.rollback(); throw e; }
  finally { conn.release(); }
}

module.exports = {
  listPrograms, upsertProgram, deleteProgram,
  listCountries, upsertCountry, deleteCountry,
  listPerdiem, upsertPerdiem, deletePerdiem,
  listWorkerCategories, upsertWorkerCategory, deleteWorkerCategory,
  listEntities, upsertEntity, deleteEntity,
  listEligibility, listRegions, getCallEligibility, upsertCallEligibility,
  listWorkerMatrix, upsertWorkerZoneRate,
  getEvalTree, upsertEvalSection, deleteEvalSection,
  upsertEvalQuestion, deleteEvalQuestion,
  upsertEvalCriterion, deleteEvalCriterion,
  importEvalRules
};
