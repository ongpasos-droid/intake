/* ── Organizations Model ──────────────────────────────────────── */
const pool = require('../../utils/db');
const uuid = require('../../utils/uuid');

/* ── Scalar fields for INSERT / UPDATE ───────────────────────── */
const ORG_FIELDS = [
  'organization_name','legal_name_national','legal_name_latin','acronym',
  'org_type','national_id','pic','foundation_date','country','region','city',
  'address','post_code','po_box','cedex','website','email','telephone1',
  'telephone2','fax','is_public_body','is_non_profit','description',
  'activities_experience','has_eu_projects',
  'staff_size','annual_projects','has_training_facilities','has_digital_infrastructure',
  'expertise_areas','erasmus_roles',
  'legal_rep_title','legal_rep_gender','legal_rep_first_name','legal_rep_family_name',
  'legal_rep_department','legal_rep_position','legal_rep_email','legal_rep_telephone1',
  'legal_rep_telephone2','legal_rep_same_address','legal_rep_address','legal_rep_country',
  'legal_rep_region','legal_rep_city','legal_rep_post_code','legal_rep_po_box','legal_rep_cedex',
  'cp_title','cp_gender','cp_first_name','cp_family_name','cp_department','cp_position',
  'cp_email','cp_telephone1','cp_telephone2','cp_same_address','cp_address','cp_country',
  'cp_region','cp_city','cp_post_code','cp_po_box','cp_cedex',
  'is_public'
];

function pick(data, fields) {
  const out = {};
  for (const f of fields) if (data[f] !== undefined) out[f] = data[f];
  return out;
}

/* ══ Organization CRUD ══════════════════════════════════════════ */

async function getOrgById(id) {
  const [[org]] = await pool.query('SELECT * FROM organizations WHERE id=?', [id]);
  if (!org) return null;
  const [accreditations]      = await pool.query('SELECT * FROM org_accreditations WHERE organization_id=? ORDER BY created_at', [id]);
  const [euProjects]          = await pool.query('SELECT * FROM org_eu_projects WHERE organization_id=? ORDER BY year DESC', [id]);
  const [keyStaff]            = await pool.query('SELECT * FROM org_key_staff WHERE organization_id=? ORDER BY created_at', [id]);
  const [stakeholders]        = await pool.query('SELECT * FROM org_stakeholders WHERE organization_id=? ORDER BY created_at', [id]);
  const [associatedPartners]  = await pool.query('SELECT * FROM org_associated_partners WHERE organization_id=? ORDER BY created_at', [id]);
  return { ...org, accreditations, eu_projects: euProjects, key_staff: keyStaff, stakeholders, associated_partners: associatedPartners };
}

async function getOrgByUserId(userId) {
  const [[row]] = await pool.query('SELECT organization_id FROM users WHERE id=?', [userId]);
  if (!row || !row.organization_id) return null;
  return getOrgById(row.organization_id);
}

async function upsertOrg(data, id) {
  const vals = pick(data, ORG_FIELDS);
  if (id) {
    const sets = Object.keys(vals).map(k => `${k}=?`).join(', ');
    if (sets) await pool.query(`UPDATE organizations SET ${sets} WHERE id=?`, [...Object.values(vals), id]);
    return id;
  }
  const newId = uuid();
  const cols = ['id', ...Object.keys(vals)];
  const phs  = cols.map(() => '?').join(',');
  await pool.query(`INSERT INTO organizations (${cols.join(',')}) VALUES (${phs})`, [newId, ...Object.values(vals)]);
  return newId;
}

async function linkUserToOrg(userId, orgId) {
  await pool.query('UPDATE users SET organization_id=? WHERE id=?', [orgId, userId]);
}

async function deleteOrg(id) {
  await pool.query('DELETE FROM organizations WHERE id=?', [id]);
}

/* ── Directory listing ───────────────────────────────────────── */
async function listOrgs({ q, country, org_type, page = 1, limit = 20 } = {}) {
  let where = 'WHERE active=1 AND is_public=1';
  const params = [];
  if (q) { where += ' AND (organization_name LIKE ? OR city LIKE ? OR pic LIKE ?)'; params.push(`%${q}%`,`%${q}%`,`%${q}%`); }
  if (country) { where += ' AND country=?'; params.push(country); }
  if (org_type) { where += ' AND org_type=?'; params.push(org_type); }

  const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM organizations ${where}`, params);
  const offset = (page - 1) * limit;
  const [rows] = await pool.query(
    `SELECT id, organization_name, acronym, org_type, country, city, pic, email, website, is_non_profit, is_public_body, expertise_areas
     FROM organizations ${where}
     ORDER BY organization_name ASC LIMIT ? OFFSET ?`,
    [...params, Number(limit), offset]
  );
  return { rows, meta: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) } };
}

/* ══ Child tables — generic CRUD ════════════════════════════════ */

const CHILD_TABLES = {
  accreditations:      { table: 'org_accreditations',      fields: ['accreditation_type','accreditation_reference'] },
  'eu-projects':       { table: 'org_eu_projects',         fields: ['programme','year','project_id_or_contract','role','beneficiary_name','title'] },
  'key-staff':         { table: 'org_key_staff',           fields: ['name','role','skills_summary'] },
  stakeholders:        { table: 'org_stakeholders',        fields: ['related_org_id','entity_name','relationship_type','description'] },
  'associated-partners':{ table: 'org_associated_partners', fields: ['full_name','address','street_number','country','region','post_code','city','org_type','contact_person','email','phone','website','relation_to_project'] },
};

async function listChildren(type, orgId) {
  const cfg = CHILD_TABLES[type];
  if (!cfg) throw new Error('Unknown child type');
  const [rows] = await pool.query(`SELECT * FROM ${cfg.table} WHERE organization_id=? ORDER BY created_at`, [orgId]);
  return rows;
}

async function upsertChild(type, orgId, data, id) {
  const cfg = CHILD_TABLES[type];
  if (!cfg) throw new Error('Unknown child type');
  const vals = pick(data, cfg.fields);
  if (id) {
    const sets = Object.keys(vals).map(k => `${k}=?`).join(', ');
    if (sets) await pool.query(`UPDATE ${cfg.table} SET ${sets} WHERE id=? AND organization_id=?`, [...Object.values(vals), id, orgId]);
    return id;
  }
  const newId = uuid();
  const cols = ['id','organization_id', ...Object.keys(vals)];
  const phs  = cols.map(() => '?').join(',');
  await pool.query(`INSERT INTO ${cfg.table} (${cols.join(',')}) VALUES (${phs})`, [newId, orgId, ...Object.values(vals)]);
  return newId;
}

async function deleteChild(type, id, orgId) {
  const cfg = CHILD_TABLES[type];
  if (!cfg) throw new Error('Unknown child type');
  await pool.query(`DELETE FROM ${cfg.table} WHERE id=? AND organization_id=?`, [id, orgId]);
}

/* ── Ownership check ─────────────────────────────────────────── */
async function isOrgOwner(userId, orgId) {
  const [[row]] = await pool.query('SELECT organization_id FROM users WHERE id=?', [userId]);
  return row && row.organization_id === orgId;
}

module.exports = {
  getOrgById, getOrgByUserId, upsertOrg, linkUserToOrg, deleteOrg,
  listOrgs, listChildren, upsertChild, deleteChild, isOrgOwner
};
