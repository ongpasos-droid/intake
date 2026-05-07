/**
 * Loads the full context needed to render the EACEA Form Part B for a project.
 * Source-of-truth: live tables (work_packages, activities, deliverables, milestones,
 * partners, etc.) + form_field_values (Writer narrative texts).
 */
'use strict';

const db = require('../../utils/db');

async function loadFormBContext(projectId, userId) {
  const [[project]] = await db.execute(
    `SELECT id, name, full_name, type, description, proposal_lang,
            national_agency, start_date, duration_months, deadline,
            eu_grant, cofin_pct, indirect_pct
       FROM projects
      WHERE id = ? AND user_id = ?`,
    [projectId, userId]
  );
  if (!project) { const e = new Error('Project not found'); e.status = 404; throw e; }

  const [programRows] = await db.execute(
    `SELECT name, action_type, eu_grant_max, deadline, deadline_time,
            duration_min_months, duration_max_months, min_partners
       FROM intake_programs WHERE action_type = ? LIMIT 1`,
    [project.type]
  );
  const program = programRows[0] || null;

  const [partners] = await db.execute(
    `SELECT id, name, legal_name, country, role, order_index, organization_id
       FROM partners WHERE project_id = ? ORDER BY role DESC, order_index`,
    [projectId]
  );

  const partnerIds = partners.map(p => p.id);
  const orgIds = partners.map(p => p.organization_id).filter(Boolean);

  const [wps] = await db.execute(
    `SELECT id, code, title, summary, objectives, leader_id,
            duration_from_month, duration_to_month, order_index
       FROM work_packages WHERE project_id = ? ORDER BY order_index`,
    [projectId]
  );
  const wpIds = wps.map(w => w.id);

  const [activities] = wpIds.length ? await db.execute(
    `SELECT a.id, a.wp_id, a.type, a.subtype, a.label, a.description,
            a.online, a.gantt_start_month, a.gantt_end_month, a.order_index,
            a.date_start, a.date_end
       FROM activities a
      WHERE a.wp_id IN (${wpIds.map(() => '?').join(',')})
      ORDER BY a.wp_id, a.order_index`,
    wpIds
  ) : [[]];

  const [tasks] = await db.execute(
    `SELECT t.id, t.work_package_id, t.code, t.title, t.description, t.sort_order
       FROM wp_tasks t
      WHERE t.project_id = ?
      ORDER BY t.work_package_id, t.sort_order`,
    [projectId]
  );

  const [deliverables] = await db.execute(
    `SELECT id, work_package_id, code, title, description, type, dissemination_level,
            due_month, sort_order, lead_partner_id, rationale
       FROM deliverables WHERE project_id = ?
      ORDER BY work_package_id, sort_order, code`,
    [projectId]
  );

  const [milestones] = await db.execute(
    `SELECT id, work_package_id, code, title, description, due_month,
            verification, sort_order, lead_partner_id, deliverable_id
       FROM milestones WHERE project_id = ?
      ORDER BY work_package_id, sort_order, code`,
    [projectId]
  );

  const [contextRows] = await db.execute(
    `SELECT problem, target_groups, approach
       FROM intake_contexts WHERE project_id = ? LIMIT 1`,
    [projectId]
  );
  const context = contextRows[0] || null;

  const [risks] = await db.execute(
    `SELECT id, wp_id, risk_no, description, mitigation, likelihood, impact, sort_order
       FROM project_risks WHERE project_id = ? ORDER BY sort_order, created_at`,
    [projectId]
  );

  const [fieldValues] = await db.execute(
    `SELECT fv.field_id, fv.value_text
       FROM form_field_values fv
       JOIN form_instances fi ON fi.id = fv.instance_id
      WHERE fi.project_id = ?`,
    [projectId]
  );
  const writer = {};
  for (const r of fieldValues) writer[r.field_id] = r.value_text || '';

  let keyStaff = [];
  let selectedStaff = [];
  let euProjects = [];
  if (orgIds.length) {
    const [s] = await db.execute(
      `SELECT ks.id, ks.organization_id, ks.name AS full_name, ks.role, ks.skills_summary AS bio,
              p.id AS partner_id, p.name AS partner_name, p.country
         FROM org_key_staff ks
         JOIN partners p ON p.organization_id = ks.organization_id
        WHERE p.project_id = ? AND ks.organization_id IN (${orgIds.map(() => '?').join(',')})
        ORDER BY p.order_index, ks.name`,
      [projectId, ...orgIds]
    );
    keyStaff = s;

    // Staff explicitly selected for this project (Writer → Consortium tab),
    // with project-specific role and refined skills.
    const [pps] = await db.execute(
      `SELECT pps.id, pps.staff_id, pps.partner_id, pps.project_role,
              pps.custom_skills,
              ks.name AS full_name, ks.role AS directory_role,
              ks.skills_summary AS directory_bio,
              p.name AS partner_name, p.legal_name AS partner_legal_name, p.country
         FROM project_partner_staff pps
         JOIN org_key_staff ks ON ks.id = pps.staff_id
         JOIN partners p       ON p.id  = pps.partner_id
        WHERE pps.project_id = ? AND pps.selected = 1
        ORDER BY p.order_index, ks.name`,
      [projectId]
    );
    selectedStaff = pps;

    const [e] = await db.execute(
      `SELECT ep.id, ep.organization_id, ep.title,
              ep.project_id_or_contract AS reference_no,
              ep.programme, ep.role, ep.year, ep.beneficiary_name,
              p.name AS partner_name
         FROM org_eu_projects ep
         JOIN partners p ON p.organization_id = ep.organization_id
        WHERE p.project_id = ? AND ep.organization_id IN (${orgIds.map(() => '?').join(',')})
        ORDER BY p.order_index, ep.year DESC`,
      [projectId, ...orgIds]
    );
    euProjects = e;
  }

  // Build per-WP buckets for convenience.
  const wpById = {};
  for (const w of wps) {
    wpById[w.id] = {
      ...w,
      activities: [],
      tasks: [],
      deliverables: [],
      milestones: [],
      writerText: writer[`s4_2_wp_${w.id}`] || '',
    };
  }
  for (const a of activities) if (wpById[a.wp_id]) wpById[a.wp_id].activities.push(a);
  for (const t of tasks)      if (wpById[t.work_package_id]) wpById[t.work_package_id].tasks.push(t);
  for (const d of deliverables) if (wpById[d.work_package_id]) wpById[d.work_package_id].deliverables.push(d);
  for (const m of milestones)  if (wpById[m.work_package_id]) wpById[m.work_package_id].milestones.push(m);

  const partnerById = {};
  for (const p of partners) partnerById[p.id] = p;

  return {
    project,
    program,
    partners,
    partnerById,
    wps: wps.map(w => wpById[w.id]),
    activities,
    deliverables,
    milestones,
    context,
    writer,
    keyStaff,
    selectedStaff,
    euProjects,
    risks,
  };
}

module.exports = { loadFormBContext };
