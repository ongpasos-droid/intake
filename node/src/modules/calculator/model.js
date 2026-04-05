const db = require('../../utils/db');
const genUUID = require('../../utils/uuid');

// ============ PARTNER RATES ============

async function getPartnerRates(projectId) {
  const sql = `
    SELECT pr.id, pr.partner_id, pr.accommodation_rate, pr.subsistence_rate,
           p.name as partner_name
    FROM partner_rates pr
    JOIN partners p ON p.id = pr.partner_id
    WHERE p.project_id = ?
    ORDER BY p.name
  `;
  const [rows] = await db.execute(sql, [projectId, projectId]);
  return rows;
}

async function updatePartnerRate(id, { accommodation_rate, subsistence_rate }) {
  const sql = `
    UPDATE partner_rates
    SET accommodation_rate = ?, subsistence_rate = ?, updated_at = NOW()
    WHERE id = ?
  `;
  await db.execute(sql, [accommodation_rate, subsistence_rate, id]);

  // Return updated fields
  const [rows] = await db.execute(
    'SELECT id, accommodation_rate, subsistence_rate, updated_at FROM partner_rates WHERE id = ?',
    [id]
  );
  return rows[0];
}

// ============ WORKER RATES ============

async function getWorkerRates(projectId) {
  const sql = `
    SELECT wr.id, wr.partner_id, wr.category, wr.rate,
           p.name as partner_name
    FROM worker_rates wr
    JOIN partners p ON p.id = wr.partner_id
    WHERE p.project_id = ?
    ORDER BY p.name, wr.category
  `;
  const [rows] = await db.execute(sql, [projectId]);
  return rows;
}

async function updateWorkerRate(id, { rate }) {
  const sql = `
    UPDATE worker_rates
    SET rate = ?, updated_at = NOW()
    WHERE id = ?
  `;
  await db.execute(sql, [rate, id]);

  const [rows] = await db.execute(
    'SELECT id, rate, updated_at FROM worker_rates WHERE id = ?',
    [id]
  );
  return rows[0];
}

// ============ ROUTES ============

async function getRoutes(projectId) {
  const sql = `
    SELECT id, project_id, endpoint_a, endpoint_b, distance_km, eco_travel, custom_rate, distance_band
    FROM routes
    WHERE project_id = ?
    ORDER BY created_at
  `;
  const [rows] = await db.execute(sql, [projectId]);
  return rows;
}

async function createRoute(projectId, { endpoint_a, endpoint_b, distance_km, eco_travel, custom_rate, distance_band }) {
  const id = genUUID();
  const sql = `
    INSERT INTO routes (id, project_id, endpoint_a, endpoint_b, distance_km, eco_travel, custom_rate, distance_band, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
  `;
  await db.execute(sql, [id, projectId, endpoint_a, endpoint_b, distance_km, eco_travel || 0, custom_rate || null, distance_band || null]);

  const [rows] = await db.execute(
    'SELECT id, endpoint_a, endpoint_b, distance_km, eco_travel, custom_rate, distance_band, created_at, updated_at FROM routes WHERE id = ?',
    [id]
  );
  return rows[0];
}

async function updateRoute(id, { endpoint_a, endpoint_b, distance_km, eco_travel, custom_rate, distance_band }) {
  const updates = [];
  const params = [];

  if (endpoint_a !== undefined) {
    updates.push('endpoint_a = ?');
    params.push(endpoint_a);
  }
  if (endpoint_b !== undefined) {
    updates.push('endpoint_b = ?');
    params.push(endpoint_b);
  }
  if (distance_km !== undefined) {
    updates.push('distance_km = ?');
    params.push(distance_km);
  }
  if (eco_travel !== undefined) {
    updates.push('eco_travel = ?');
    params.push(eco_travel);
  }
  if (custom_rate !== undefined) {
    updates.push('custom_rate = ?');
    params.push(custom_rate);
  }
  if (distance_band !== undefined) {
    updates.push('distance_band = ?');
    params.push(distance_band);
  }

  if (updates.length === 0) return null;

  updates.push('updated_at = NOW()');
  params.push(id);

  const sql = `UPDATE routes SET ${updates.join(', ')} WHERE id = ?`;
  await db.execute(sql, params);

  const [rows] = await db.execute(
    'SELECT id, endpoint_a, endpoint_b, distance_km, eco_travel, custom_rate, distance_band, updated_at FROM routes WHERE id = ?',
    [id]
  );
  return rows[0];
}

async function deleteRoute(id) {
  await db.execute('DELETE FROM routes WHERE id = ?', [id]);
}

// ============ EXTRA DESTINATIONS ============

async function getExtraDestinations(projectId) {
  const sql = `
    SELECT id, project_id, name, country, accommodation_rate, subsistence_rate
    FROM extra_destinations
    WHERE project_id = ?
    ORDER BY created_at
  `;
  const [rows] = await db.execute(sql, [projectId]);
  return rows;
}

async function createExtraDestination(projectId, { name, country, accommodation_rate, subsistence_rate }) {
  const id = genUUID();
  const sql = `
    INSERT INTO extra_destinations (id, project_id, name, country, accommodation_rate, subsistence_rate, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
  `;
  await db.execute(sql, [id, projectId, name, country, accommodation_rate, subsistence_rate]);

  const [rows] = await db.execute(
    'SELECT id, name, country, accommodation_rate, subsistence_rate, created_at, updated_at FROM extra_destinations WHERE id = ?',
    [id]
  );
  return rows[0];
}

async function updateExtraDestination(id, { name, country, accommodation_rate, subsistence_rate }) {
  const updates = [];
  const params = [];

  if (name !== undefined) {
    updates.push('name = ?');
    params.push(name);
  }
  if (country !== undefined) {
    updates.push('country = ?');
    params.push(country);
  }
  if (accommodation_rate !== undefined) {
    updates.push('accommodation_rate = ?');
    params.push(accommodation_rate);
  }
  if (subsistence_rate !== undefined) {
    updates.push('subsistence_rate = ?');
    params.push(subsistence_rate);
  }

  if (updates.length === 0) return null;

  updates.push('updated_at = NOW()');
  params.push(id);

  const sql = `UPDATE extra_destinations SET ${updates.join(', ')} WHERE id = ?`;
  await db.execute(sql, params);

  const [rows] = await db.execute(
    'SELECT id, name, country, accommodation_rate, subsistence_rate, updated_at FROM extra_destinations WHERE id = ?',
    [id]
  );
  return rows[0];
}

async function deleteExtraDestination(id) {
  await db.execute('DELETE FROM extra_destinations WHERE id = ?', [id]);
}

// ============ WORK PACKAGES ============

async function getWorkPackages(projectId) {
  const sql = `
    SELECT id, project_id, order_index, code, title, category, leader_id
    FROM work_packages
    WHERE project_id = ?
    ORDER BY order_index
  `;
  const [rows] = await db.execute(sql, [projectId]);
  return rows;
}

async function createWorkPackage(projectId, { title, category, leader_id }) {
  // Get next order_index
  const [maxOrder] = await db.execute(
    'SELECT MAX(order_index) as max_order FROM work_packages WHERE project_id = ?',
    [projectId]
  );
  const nextOrder = (maxOrder[0]?.max_order || 0) + 1;
  const code = 'WP' + nextOrder;

  const id = genUUID();
  const sql = `
    INSERT INTO work_packages (id, project_id, order_index, code, title, category, leader_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
  `;
  await db.execute(sql, [id, projectId, nextOrder, code, title, category, leader_id]);

  const [rows] = await db.execute(
    'SELECT id, order_index, code, title, category, leader_id, created_at, updated_at FROM work_packages WHERE id = ?',
    [id]
  );
  return rows[0];
}

async function updateWorkPackage(id, { title, category, leader_id, order_index }) {
  const updates = [];
  const params = [];

  if (title !== undefined) {
    updates.push('title = ?');
    params.push(title);
  }
  if (category !== undefined) {
    updates.push('category = ?');
    params.push(category);
  }
  if (leader_id !== undefined) {
    updates.push('leader_id = ?');
    params.push(leader_id);
  }
  if (order_index !== undefined) {
    updates.push('order_index = ?');
    params.push(order_index);
  }

  if (updates.length === 0) return null;

  updates.push('updated_at = NOW()');
  params.push(id);

  const sql = `UPDATE work_packages SET ${updates.join(', ')} WHERE id = ?`;
  await db.execute(sql, params);

  const [rows] = await db.execute(
    'SELECT id, code, title, category, leader_id, order_index, updated_at FROM work_packages WHERE id = ?',
    [id]
  );
  return rows[0];
}

async function deleteWorkPackage(id) {
  // Delete all activities in this WP (which cascades to details)
  await db.execute('DELETE FROM activities WHERE wp_id = ?', [id]);
  await db.execute('DELETE FROM work_packages WHERE id = ?', [id]);
}

// ============ ACTIVITIES ============

async function getActivities(wpId) {
  const sql = `
    SELECT id, wp_id, type, label, order_index
    FROM activities
    WHERE wp_id = ?
    ORDER BY order_index
  `;
  const [rows] = await db.execute(sql, [wpId]);
  return rows;
}

async function createActivity(wpId, { type, label }) {
  // Get WP to find project_id
  const [wpRows] = await db.execute('SELECT project_id FROM work_packages WHERE id = ?', [wpId]);
  if (!wpRows.length) throw new Error('WP not found');

  // Get next order_index
  const [maxOrder] = await db.execute(
    'SELECT MAX(order_index) as max_order FROM activities WHERE wp_id = ?',
    [wpId]
  );
  const nextOrder = (maxOrder[0]?.max_order || 0) + 1;

  const id = genUUID();
  const sql = `
    INSERT INTO activities (id, wp_id, type, label, order_index, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, NOW(), NOW())
  `;
  await db.execute(sql, [id, wpId, type, label, nextOrder]);

  const [rows] = await db.execute(
    'SELECT id, wp_id, type, label, order_index, created_at, updated_at FROM activities WHERE id = ?',
    [id]
  );
  return rows[0];
}

async function updateActivity(id, { type, label, order_index }) {
  const updates = [];
  const params = [];

  if (type !== undefined) {
    updates.push('type = ?');
    params.push(type);
  }
  if (label !== undefined) {
    updates.push('label = ?');
    params.push(label);
  }
  if (order_index !== undefined) {
    updates.push('order_index = ?');
    params.push(order_index);
  }

  if (updates.length === 0) return null;

  updates.push('updated_at = NOW()');
  params.push(id);

  const sql = `UPDATE activities SET ${updates.join(', ')} WHERE id = ?`;
  await db.execute(sql, params);

  const [rows] = await db.execute(
    'SELECT id, type, label, order_index, updated_at FROM activities WHERE id = ?',
    [id]
  );
  return rows[0];
}

async function deleteActivity(id) {
  // Get activity type to know which detail tables to clean
  const [actRows] = await db.execute('SELECT type FROM activities WHERE id = ?', [id]);
  if (!actRows.length) throw new Error('Activity not found');

  const type = actRows[0].type;

  // Delete detail records based on type
  switch (type) {
    case 'mgmt':
      await db.execute('DELETE FROM activity_management_partners WHERE activity_id = ?', [id]);
      await db.execute('DELETE FROM activity_management WHERE activity_id = ?', [id]);
      break;
    case 'meeting':
    case 'ltta':
      await db.execute('DELETE FROM activity_mobility_participants WHERE activity_id = ?', [id]);
      await db.execute('DELETE FROM activity_mobility WHERE activity_id = ?', [id]);
      break;
    case 'io':
      await db.execute('DELETE FROM activity_intellectual_outputs WHERE activity_id = ?', [id]);
      break;
    case 'me':
      await db.execute('DELETE FROM activity_multiplier_events WHERE activity_id = ?', [id]);
      break;
    case 'local_ws':
      await db.execute('DELETE FROM activity_local_workshops WHERE activity_id = ?', [id]);
      break;
    case 'campaign':
      await db.execute('DELETE FROM activity_campaigns WHERE activity_id = ?', [id]);
      break;
    case 'website':
    case 'artistic':
    case 'extraordinary':
    case 'equipment':
    case 'consumables':
    case 'other':
      await db.execute('DELETE FROM activity_generic_costs WHERE activity_id = ?', [id]);
      break;
  }

  // Delete activity itself
  await db.execute('DELETE FROM activities WHERE id = ?', [id]);
}

// ============ ACTIVITY DETAILS ============

async function getActivityDetail(activityId) {
  const [actRows] = await db.execute(
    'SELECT id, type FROM activities WHERE id = ?',
    [activityId]
  );

  if (!actRows.length) throw new Error('Activity not found');

  const type = actRows[0].type;
  const detail = { activity_id: activityId, type };

  switch (type) {
    case 'mgmt': {
      const [mgmt] = await db.execute(
        'SELECT id, activity_id, rate_applicant, rate_partner FROM activity_management WHERE activity_id = ?',
        [activityId]
      );
      const [partners] = await db.execute(
        'SELECT activity_id, partner_id, active FROM activity_management_partners WHERE activity_id = ?',
        [activityId]
      );
      detail.management = mgmt[0] || null;
      detail.partners = partners;
      break;
    }
    case 'meeting':
    case 'ltta': {
      const [mob] = await db.execute(
        'SELECT id, activity_id, host_partner_id, host_active, pax_per_partner, duration_days, local_pax, local_transport, mat_cost_per_pax FROM activity_mobility WHERE activity_id = ?',
        [activityId]
      );
      const [participants] = await db.execute(
        'SELECT activity_id, partner_id, active FROM activity_mobility_participants WHERE activity_id = ?',
        [activityId]
      );
      detail.mobility = mob[0] || null;
      detail.participants = participants;
      break;
    }
    case 'io': {
      const [io] = await db.execute(
        'SELECT id, activity_id, partner_id, days, worker_category FROM activity_intellectual_outputs WHERE activity_id = ?',
        [activityId]
      );
      detail.intellectual_outputs = io;
      break;
    }
    case 'me': {
      const [me] = await db.execute(
        'SELECT id, activity_id, partner_id, active, local_pax, intl_pax, local_rate, intl_rate FROM activity_multiplier_events WHERE activity_id = ?',
        [activityId]
      );
      detail.multiplier_events = me;
      break;
    }
    case 'local_ws': {
      const [ws] = await db.execute(
        'SELECT id, activity_id, partner_id, active, participants, sessions, cost_per_pax FROM activity_local_workshops WHERE activity_id = ?',
        [activityId]
      );
      detail.local_workshops = ws;
      break;
    }
    case 'campaign': {
      const [camp] = await db.execute(
        'SELECT id, activity_id, partner_id, active, monthly_amount, months, cpm FROM activity_campaigns WHERE activity_id = ?',
        [activityId]
      );
      detail.campaigns = camp;
      break;
    }
    case 'website':
    case 'artistic':
    case 'extraordinary':
    case 'equipment':
    case 'consumables':
    case 'other': {
      const [generic] = await db.execute(
        'SELECT id, activity_id, partner_id, active, note, amount, project_pct, lifetime_pct FROM activity_generic_costs WHERE activity_id = ?',
        [activityId]
      );
      detail.generic_costs = generic;
      break;
    }
  }

  return detail;
}

async function createActivityDetail(activityId, data) {
  const [actRows] = await db.execute(
    'SELECT type FROM activities WHERE id = ?',
    [activityId]
  );

  if (!actRows.length) throw new Error('Activity not found');

  const type = actRows[0].type;

  switch (type) {
    case 'mgmt': {
      const { rate_applicant, rate_partner } = data;
      const id = genUUID();
      await db.execute(
        'INSERT INTO activity_management (id, activity_id, rate_applicant, rate_partner, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
        [id, activityId, rate_applicant, rate_partner]
      );
      const [rows] = await db.execute(
        'SELECT id, rate_applicant, rate_partner FROM activity_management WHERE id = ?',
        [id]
      );
      return rows[0];
    }
    case 'meeting':
    case 'ltta': {
      const { host_partner_id, host_active, pax_per_partner, duration_days, local_pax, local_transport, mat_cost_per_pax } = data;
      const id = genUUID();
      await db.execute(
        'INSERT INTO activity_mobility (id, activity_id, host_partner_id, host_active, pax_per_partner, duration_days, local_pax, local_transport, mat_cost_per_pax, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
        [id, activityId, host_partner_id, host_active || 0, pax_per_partner, duration_days, local_pax || 0, local_transport || 0, mat_cost_per_pax || null]
      );
      const [rows] = await db.execute(
        'SELECT id, host_partner_id, host_active, pax_per_partner, duration_days, local_pax, local_transport, mat_cost_per_pax FROM activity_mobility WHERE id = ?',
        [id]
      );
      return rows[0];
    }
    case 'io': {
      const { partner_id, days, worker_category } = data;
      const id = genUUID();
      await db.execute(
        'INSERT INTO activity_intellectual_outputs (id, activity_id, partner_id, days, worker_category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
        [id, activityId, partner_id, days, worker_category]
      );
      const [rows] = await db.execute(
        'SELECT id, partner_id, days, worker_category FROM activity_intellectual_outputs WHERE id = ?',
        [id]
      );
      return rows[0];
    }
    case 'me': {
      const { partner_id, active, local_pax, intl_pax, local_rate, intl_rate } = data;
      const id = genUUID();
      await db.execute(
        'INSERT INTO activity_multiplier_events (id, activity_id, partner_id, active, local_pax, intl_pax, local_rate, intl_rate, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
        [id, activityId, partner_id, active || 0, local_pax, intl_pax, local_rate, intl_rate]
      );
      const [rows] = await db.execute(
        'SELECT id, partner_id, active, local_pax, intl_pax, local_rate, intl_rate FROM activity_multiplier_events WHERE id = ?',
        [id]
      );
      return rows[0];
    }
    case 'local_ws': {
      const { partner_id, active, participants, sessions, cost_per_pax } = data;
      const id = genUUID();
      await db.execute(
        'INSERT INTO activity_local_workshops (id, activity_id, partner_id, active, participants, sessions, cost_per_pax, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
        [id, activityId, partner_id, active || 0, participants, sessions, cost_per_pax]
      );
      const [rows] = await db.execute(
        'SELECT id, partner_id, active, participants, sessions, cost_per_pax FROM activity_local_workshops WHERE id = ?',
        [id]
      );
      return rows[0];
    }
    case 'campaign': {
      const { partner_id, active, monthly_amount, months, cpm } = data;
      const id = genUUID();
      await db.execute(
        'INSERT INTO activity_campaigns (id, activity_id, partner_id, active, monthly_amount, months, cpm, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
        [id, activityId, partner_id, active || 0, monthly_amount, months, cpm]
      );
      const [rows] = await db.execute(
        'SELECT id, partner_id, active, monthly_amount, months, cpm FROM activity_campaigns WHERE id = ?',
        [id]
      );
      return rows[0];
    }
    case 'website':
    case 'artistic':
    case 'extraordinary':
    case 'equipment':
    case 'consumables':
    case 'other': {
      const { partner_id, active, note, amount, project_pct, lifetime_pct } = data;
      const id = genUUID();
      await db.execute(
        'INSERT INTO activity_generic_costs (id, activity_id, partner_id, active, note, amount, project_pct, lifetime_pct, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
        [id, activityId, partner_id, active || 0, note, amount, project_pct || null, lifetime_pct || null]
      );
      const [rows] = await db.execute(
        'SELECT id, partner_id, active, note, amount, project_pct, lifetime_pct FROM activity_generic_costs WHERE id = ?',
        [id]
      );
      return rows[0];
    }
  }
}

async function updateActivityDetail(activityId, detailId, data) {
  const [actRows] = await db.execute(
    'SELECT type FROM activities WHERE id = ?',
    [activityId]
  );

  if (!actRows.length) throw new Error('Activity not found');

  const type = actRows[0].type;

  switch (type) {
    case 'mgmt': {
      const { rate_applicant, rate_partner } = data;
      const updates = [];
      const params = [];
      if (rate_applicant !== undefined) {
        updates.push('rate_applicant = ?');
        params.push(rate_applicant);
      }
      if (rate_partner !== undefined) {
        updates.push('rate_partner = ?');
        params.push(rate_partner);
      }
      if (updates.length === 0) return null;
      updates.push('updated_at = NOW()');
      params.push(detailId);
      const sql = `UPDATE activity_management SET ${updates.join(', ')} WHERE id = ?`;
      await db.execute(sql, params);
      const [rows] = await db.execute(
        'SELECT id, rate_applicant, rate_partner, updated_at FROM activity_management WHERE id = ?',
        [detailId]
      );
      return rows[0];
    }
    case 'meeting':
    case 'ltta': {
      const { host_partner_id, host_active, pax_per_partner, duration_days, local_pax, local_transport, mat_cost_per_pax } = data;
      const updates = [];
      const params = [];
      if (host_partner_id !== undefined) {
        updates.push('host_partner_id = ?');
        params.push(host_partner_id);
      }
      if (host_active !== undefined) {
        updates.push('host_active = ?');
        params.push(host_active);
      }
      if (pax_per_partner !== undefined) {
        updates.push('pax_per_partner = ?');
        params.push(pax_per_partner);
      }
      if (duration_days !== undefined) {
        updates.push('duration_days = ?');
        params.push(duration_days);
      }
      if (local_pax !== undefined) {
        updates.push('local_pax = ?');
        params.push(local_pax);
      }
      if (local_transport !== undefined) {
        updates.push('local_transport = ?');
        params.push(local_transport);
      }
      if (mat_cost_per_pax !== undefined) {
        updates.push('mat_cost_per_pax = ?');
        params.push(mat_cost_per_pax);
      }
      if (updates.length === 0) return null;
      updates.push('updated_at = NOW()');
      params.push(detailId);
      const sql = `UPDATE activity_mobility SET ${updates.join(', ')} WHERE id = ?`;
      await db.execute(sql, params);
      const [rows] = await db.execute(
        'SELECT id, host_partner_id, host_active, pax_per_partner, duration_days, local_pax, local_transport, mat_cost_per_pax, updated_at FROM activity_mobility WHERE id = ?',
        [detailId]
      );
      return rows[0];
    }
    case 'io': {
      const { days, worker_category } = data;
      const updates = [];
      const params = [];
      if (days !== undefined) {
        updates.push('days = ?');
        params.push(days);
      }
      if (worker_category !== undefined) {
        updates.push('worker_category = ?');
        params.push(worker_category);
      }
      if (updates.length === 0) return null;
      updates.push('updated_at = NOW()');
      params.push(detailId);
      const sql = `UPDATE activity_intellectual_outputs SET ${updates.join(', ')} WHERE id = ?`;
      await db.execute(sql, params);
      const [rows] = await db.execute(
        'SELECT id, days, worker_category, updated_at FROM activity_intellectual_outputs WHERE id = ?',
        [detailId]
      );
      return rows[0];
    }
    case 'me': {
      const { local_pax, intl_pax, local_rate, intl_rate, active } = data;
      const updates = [];
      const params = [];
      if (local_pax !== undefined) {
        updates.push('local_pax = ?');
        params.push(local_pax);
      }
      if (intl_pax !== undefined) {
        updates.push('intl_pax = ?');
        params.push(intl_pax);
      }
      if (local_rate !== undefined) {
        updates.push('local_rate = ?');
        params.push(local_rate);
      }
      if (intl_rate !== undefined) {
        updates.push('intl_rate = ?');
        params.push(intl_rate);
      }
      if (active !== undefined) {
        updates.push('active = ?');
        params.push(active);
      }
      if (updates.length === 0) return null;
      updates.push('updated_at = NOW()');
      params.push(detailId);
      const sql = `UPDATE activity_multiplier_events SET ${updates.join(', ')} WHERE id = ?`;
      await db.execute(sql, params);
      const [rows] = await db.execute(
        'SELECT id, local_pax, intl_pax, local_rate, intl_rate, active, updated_at FROM activity_multiplier_events WHERE id = ?',
        [detailId]
      );
      return rows[0];
    }
    case 'local_ws': {
      const { participants, sessions, cost_per_pax, active } = data;
      const updates = [];
      const params = [];
      if (participants !== undefined) {
        updates.push('participants = ?');
        params.push(participants);
      }
      if (sessions !== undefined) {
        updates.push('sessions = ?');
        params.push(sessions);
      }
      if (cost_per_pax !== undefined) {
        updates.push('cost_per_pax = ?');
        params.push(cost_per_pax);
      }
      if (active !== undefined) {
        updates.push('active = ?');
        params.push(active);
      }
      if (updates.length === 0) return null;
      updates.push('updated_at = NOW()');
      params.push(detailId);
      const sql = `UPDATE activity_local_workshops SET ${updates.join(', ')} WHERE id = ?`;
      await db.execute(sql, params);
      const [rows] = await db.execute(
        'SELECT id, participants, sessions, cost_per_pax, active, updated_at FROM activity_local_workshops WHERE id = ?',
        [detailId]
      );
      return rows[0];
    }
    case 'campaign': {
      const { monthly_amount, months, cpm, active } = data;
      const updates = [];
      const params = [];
      if (monthly_amount !== undefined) {
        updates.push('monthly_amount = ?');
        params.push(monthly_amount);
      }
      if (months !== undefined) {
        updates.push('months = ?');
        params.push(months);
      }
      if (cpm !== undefined) {
        updates.push('cpm = ?');
        params.push(cpm);
      }
      if (active !== undefined) {
        updates.push('active = ?');
        params.push(active);
      }
      if (updates.length === 0) return null;
      updates.push('updated_at = NOW()');
      params.push(detailId);
      const sql = `UPDATE activity_campaigns SET ${updates.join(', ')} WHERE id = ?`;
      await db.execute(sql, params);
      const [rows] = await db.execute(
        'SELECT id, monthly_amount, months, cpm, active, updated_at FROM activity_campaigns WHERE id = ?',
        [detailId]
      );
      return rows[0];
    }
    case 'website':
    case 'artistic':
    case 'extraordinary':
    case 'equipment':
    case 'consumables':
    case 'other': {
      const { note, amount, project_pct, lifetime_pct, active } = data;
      const updates = [];
      const params = [];
      if (note !== undefined) {
        updates.push('note = ?');
        params.push(note);
      }
      if (amount !== undefined) {
        updates.push('amount = ?');
        params.push(amount);
      }
      if (project_pct !== undefined) {
        updates.push('project_pct = ?');
        params.push(project_pct);
      }
      if (lifetime_pct !== undefined) {
        updates.push('lifetime_pct = ?');
        params.push(lifetime_pct);
      }
      if (active !== undefined) {
        updates.push('active = ?');
        params.push(active);
      }
      if (updates.length === 0) return null;
      updates.push('updated_at = NOW()');
      params.push(detailId);
      const sql = `UPDATE activity_generic_costs SET ${updates.join(', ')} WHERE id = ?`;
      await db.execute(sql, params);
      const [rows] = await db.execute(
        'SELECT id, note, amount, project_pct, lifetime_pct, active, updated_at FROM activity_generic_costs WHERE id = ?',
        [detailId]
      );
      return rows[0];
    }
  }
}

// ============ BUDGET SUMMARY ============

function getTravelBandRate(distanceKm, ecoTravel) {
  const km = parseInt(distanceKm);

  if (km >= 10 && km <= 99) return 23;
  if (km >= 100 && km <= 499) return ecoTravel ? 210 : 180;
  if (km >= 500 && km <= 1999) return ecoTravel ? 320 : 275;
  if (km >= 2000 && km <= 2999) return ecoTravel ? 410 : 360;
  if (km >= 3000 && km <= 3999) return ecoTravel ? 610 : 530;
  if (km >= 4000 && km <= 7999) return 820;
  if (km >= 8000) return 1500;

  return 0;
}

async function getBudgetSummary(projectId) {
  // Get all WPs
  const [wps] = await db.execute(
    'SELECT id, code, title FROM work_packages WHERE project_id = ? ORDER BY order_index',
    [projectId]
  );

  const budgetByWp = {};
  const costCategories = {
    travel: 0,
    accommodation: 0,
    subsistence: 0,
    management: 0,
    intellectual_outputs: 0,
    multiplier_events: 0,
    local_workshops: 0,
    campaigns: 0,
    generic: 0
  };

  for (const wp of wps) {
    budgetByWp[wp.id] = {
      code: wp.code,
      title: wp.title,
      total: 0,
      breakdown: {}
    };

    // Get activities in this WP
    const [acts] = await db.execute(
      'SELECT id, type FROM activities WHERE wp_id = ?',
      [wp.id]
    );

    for (const act of acts) {
      let actCost = 0;

      switch (act.type) {
        case 'meeting':
        case 'ltta': {
          // Travel + mobility per diem
          const [mob] = await db.execute(
            'SELECT pax_per_partner, duration_days FROM activity_mobility WHERE activity_id = ?',
            [act.id]
          );

          if (mob.length > 0) {
            const m = mob[0];
            const paxPerPartner = m.pax_per_partner || 0;
            const days = m.duration_days || 0;

            // Get all routes used in this activity (simplified: count all routes in project)
            const [routes] = await db.execute(
              'SELECT distance_km, eco_travel FROM routes WHERE project_id = ?',
              [projectId]
            );

            let travelCost = 0;
            for (const route of routes) {
              const rate = getTravelBandRate(route.distance_km, route.eco_travel);
              travelCost += rate * paxPerPartner * 2; // Return trip
            }
            costCategories.travel += travelCost;
            actCost += travelCost;

            // Per diem (accommodation + subsistence) per partner
            const [partners] = await db.execute(
              'SELECT partner_id FROM activity_mobility_participants WHERE activity_id = ? AND active = 1',
              [act.id]
            );

            for (const p of partners) {
              const [pr] = await db.execute(
                'SELECT accommodation_rate, subsistence_rate FROM partner_rates WHERE partner_id = ?',
                [p.partner_id]
              );
              if (pr.length > 0) {
                const perDiem = (pr[0].accommodation_rate || 0) + (pr[0].subsistence_rate || 0);
                const cost = perDiem * days * paxPerPartner;
                costCategories.accommodation += (pr[0].accommodation_rate || 0) * days * paxPerPartner;
                costCategories.subsistence += (pr[0].subsistence_rate || 0) * days * paxPerPartner;
                actCost += cost;
              }
            }
          }
          break;
        }

        case 'mgmt': {
          // Management costs
          const [mgmt] = await db.execute(
            'SELECT rate_applicant, rate_partner FROM activity_management WHERE activity_id = ?',
            [act.id]
          );

          if (mgmt.length > 0) {
            const cost = (mgmt[0].rate_applicant || 0) + (mgmt[0].rate_partner || 0);
            costCategories.management += cost;
            actCost += cost;
          }
          break;
        }

        case 'io': {
          // IO costs: days × worker_rate
          const [ios] = await db.execute(
            'SELECT partner_id, days, worker_category FROM activity_intellectual_outputs WHERE activity_id = ?',
            [act.id]
          );

          for (const io of ios) {
            const [wr] = await db.execute(
              'SELECT rate FROM worker_rates WHERE partner_id = ? AND category = ?',
              [io.partner_id, io.worker_category]
            );
            if (wr.length > 0) {
              const cost = (wr[0].rate || 0) * (io.days || 0);
              costCategories.intellectual_outputs += cost;
              actCost += cost;
            }
          }
          break;
        }

        case 'me': {
          // Multiplier events
          const [mes] = await db.execute(
            'SELECT local_pax, intl_pax, local_rate, intl_rate FROM activity_multiplier_events WHERE activity_id = ? AND active = 1',
            [act.id]
          );

          for (const me of mes) {
            const cost = (me.local_pax || 0) * (me.local_rate || 0) + (me.intl_pax || 0) * (me.intl_rate || 0);
            costCategories.multiplier_events += cost;
            actCost += cost;
          }
          break;
        }

        case 'local_ws': {
          // Local workshops
          const [wss] = await db.execute(
            'SELECT participants, sessions, cost_per_pax FROM activity_local_workshops WHERE activity_id = ? AND active = 1',
            [act.id]
          );

          for (const ws of wss) {
            const cost = (ws.participants || 0) * (ws.sessions || 0) * (ws.cost_per_pax || 0);
            costCategories.local_workshops += cost;
            actCost += cost;
          }
          break;
        }

        case 'campaign': {
          // Campaigns
          const [camps] = await db.execute(
            'SELECT monthly_amount, months FROM activity_campaigns WHERE activity_id = ? AND active = 1',
            [act.id]
          );

          for (const camp of camps) {
            const cost = (camp.monthly_amount || 0) * (camp.months || 0);
            costCategories.campaigns += cost;
            actCost += cost;
          }
          break;
        }

        case 'website':
        case 'artistic':
        case 'extraordinary':
        case 'equipment':
        case 'consumables':
        case 'other': {
          // Generic costs
          const [generics] = await db.execute(
            'SELECT amount FROM activity_generic_costs WHERE activity_id = ? AND active = 1',
            [act.id]
          );

          for (const gen of generics) {
            const cost = gen.amount || 0;
            costCategories.generic += cost;
            actCost += cost;
          }
          break;
        }
      }

      budgetByWp[wp.id].total += actCost;
    }
  }

  const totalBudget = Object.values(costCategories).reduce((a, b) => a + b, 0);

  return {
    total_budget: totalBudget,
    by_cost_category: costCategories,
    by_work_package: Object.values(budgetByWp)
  };
}

module.exports = {
  getPartnerRates,
  updatePartnerRate,
  getWorkerRates,
  updateWorkerRate,
  getRoutes,
  createRoute,
  updateRoute,
  deleteRoute,
  getExtraDestinations,
  createExtraDestination,
  updateExtraDestination,
  deleteExtraDestination,
  getWorkPackages,
  createWorkPackage,
  updateWorkPackage,
  deleteWorkPackage,
  getActivities,
  createActivity,
  updateActivity,
  deleteActivity,
  getActivityDetail,
  createActivityDetail,
  updateActivityDetail,
  getBudgetSummary
};
