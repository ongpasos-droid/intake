const model = require('./model');
const db = require('../../utils/db');

// Helper: verify project ownership
async function verifyProjectOwnership(projectId, userId) {
  const sql = `
    SELECT p.id
    FROM projects p
    WHERE p.id = ? AND p.user_id = ?
  `;
  const [rows] = await db.execute(sql, [projectId, userId]);
  return rows.length > 0;
}

// Helper: verify partner-rate belongs to user's project
async function verifyPartnerRateOwnership(partnerRateId, userId) {
  const sql = `
    SELECT pr.id
    FROM partner_rates pr
    JOIN partners p ON p.id = pr.partner_id
    JOIN project_partners pp ON pp.partner_id = p.id
    JOIN projects proj ON proj.id = pp.project_id
    WHERE pr.id = ? AND proj.user_id = ?
  `;
  const [rows] = await db.execute(sql, [partnerRateId, userId]);
  return rows.length > 0;
}

// Helper: verify worker-rate belongs to user's project
async function verifyWorkerRateOwnership(workerRateId, userId) {
  const sql = `
    SELECT wr.id
    FROM worker_rates wr
    JOIN partners p ON p.id = wr.partner_id
    JOIN project_partners pp ON pp.partner_id = p.id
    JOIN projects proj ON proj.id = pp.project_id
    WHERE wr.id = ? AND proj.user_id = ?
  `;
  const [rows] = await db.execute(sql, [workerRateId, userId]);
  return rows.length > 0;
}

// Helper: verify route belongs to user's project
async function verifyRouteOwnership(routeId, userId) {
  const sql = `
    SELECT r.id
    FROM routes r
    JOIN projects p ON p.id = r.project_id
    WHERE r.id = ? AND p.user_id = ?
  `;
  const [rows] = await db.execute(sql, [routeId, userId]);
  return rows.length > 0;
}

// Helper: verify extra-destination belongs to user's project
async function verifyExtraDestinationOwnership(destId, userId) {
  const sql = `
    SELECT ed.id
    FROM extra_destinations ed
    JOIN projects p ON p.id = ed.project_id
    WHERE ed.id = ? AND p.user_id = ?
  `;
  const [rows] = await db.execute(sql, [destId, userId]);
  return rows.length > 0;
}

// Helper: verify work-package belongs to user's project
async function verifyWorkPackageOwnership(wpId, userId) {
  const sql = `
    SELECT wp.id
    FROM work_packages wp
    JOIN projects p ON p.id = wp.project_id
    WHERE wp.id = ? AND p.user_id = ?
  `;
  const [rows] = await db.execute(sql, [wpId, userId]);
  return rows.length > 0;
}

// Helper: verify activity belongs to user's project (through WP)
async function verifyActivityOwnership(activityId, userId) {
  const sql = `
    SELECT a.id
    FROM activities a
    JOIN work_packages wp ON wp.id = a.wp_id
    JOIN projects p ON p.id = wp.project_id
    WHERE a.id = ? AND p.user_id = ?
  `;
  const [rows] = await db.execute(sql, [activityId, userId]);
  return rows.length > 0;
}

// ============ PARTNER RATES ============

exports.getPartnerRates = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    const isOwner = await verifyProjectOwnership(projectId, userId);
    if (!isOwner) {
      return res.status(403).json({
        ok: false,
        error: { code: 'FORBIDDEN', message: 'Project not found or no access' }
      });
    }

    const data = await model.getPartnerRates(projectId);
    res.json({ ok: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get partner rates' }
    });
  }
};

exports.updatePartnerRate = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { accommodation_rate, subsistence_rate } = req.body;

    const isOwner = await verifyPartnerRateOwnership(id, userId);
    if (!isOwner) {
      return res.status(403).json({
        ok: false,
        error: { code: 'FORBIDDEN', message: 'Partner rate not found or no access' }
      });
    }

    const data = await model.updatePartnerRate(id, { accommodation_rate, subsistence_rate });
    res.json({ ok: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update partner rate' }
    });
  }
};

// ============ WORKER RATES ============

exports.getWorkerRates = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    const isOwner = await verifyProjectOwnership(projectId, userId);
    if (!isOwner) {
      return res.status(403).json({
        ok: false,
        error: { code: 'FORBIDDEN', message: 'Project not found or no access' }
      });
    }

    const data = await model.getWorkerRates(projectId);
    res.json({ ok: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get worker rates' }
    });
  }
};

exports.updateWorkerRate = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { rate } = req.body;

    const isOwner = await verifyWorkerRateOwnership(id, userId);
    if (!isOwner) {
      return res.status(403).json({
        ok: false,
        error: { code: 'FORBIDDEN', message: 'Worker rate not found or no access' }
      });
    }

    const data = await model.updateWorkerRate(id, { rate });
    res.json({ ok: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update worker rate' }
    });
  }
};

// ============ ROUTES ============

exports.getRoutes = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    const isOwner = await verifyProjectOwnership(projectId, userId);
    if (!isOwner) {
      return res.status(403).json({
        ok: false,
        error: { code: 'FORBIDDEN', message: 'Project not found or no access' }
      });
    }

    const data = await model.getRoutes(projectId);
    res.json({ ok: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get routes' }
    });
  }
};

exports.createRoute = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;
    const { endpoint_a, endpoint_b, distance_km, eco_travel, custom_rate, distance_band } = req.body;

    const isOwner = await verifyProjectOwnership(projectId, userId);
    if (!isOwner) {
      return res.status(403).json({
        ok: false,
        error: { code: 'FORBIDDEN', message: 'Project not found or no access' }
      });
    }

    const data = await model.createRoute(projectId, {
      endpoint_a,
      endpoint_b,
      distance_km,
      eco_travel,
      custom_rate,
      distance_band
    });

    res.status(201).json({ ok: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create route' }
    });
  }
};

exports.updateRoute = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { endpoint_a, endpoint_b, distance_km, eco_travel, custom_rate, distance_band } = req.body;

    const isOwner = await verifyRouteOwnership(id, userId);
    if (!isOwner) {
      return res.status(403).json({
        ok: false,
        error: { code: 'FORBIDDEN', message: 'Route not found or no access' }
      });
    }

    const data = await model.updateRoute(id, {
      endpoint_a,
      endpoint_b,
      distance_km,
      eco_travel,
      custom_rate,
      distance_band
    });

    res.json({ ok: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update route' }
    });
  }
};

exports.deleteRoute = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const isOwner = await verifyRouteOwnership(id, userId);
    if (!isOwner) {
      return res.status(403).json({
        ok: false,
        error: { code: 'FORBIDDEN', message: 'Route not found or no access' }
      });
    }

    await model.deleteRoute(id);
    res.json({ ok: true, data: { id } });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete route' }
    });
  }
};

// ============ EXTRA DESTINATIONS ============

exports.getExtraDestinations = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    const isOwner = await verifyProjectOwnership(projectId, userId);
    if (!isOwner) {
      return res.status(403).json({
        ok: false,
        error: { code: 'FORBIDDEN', message: 'Project not found or no access' }
      });
    }

    const data = await model.getExtraDestinations(projectId);
    res.json({ ok: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get extra destinations' }
    });
  }
};

exports.createExtraDestination = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;
    const { name, country, accommodation_rate, subsistence_rate } = req.body;

    const isOwner = await verifyProjectOwnership(projectId, userId);
    if (!isOwner) {
      return res.status(403).json({
        ok: false,
        error: { code: 'FORBIDDEN', message: 'Project not found or no access' }
      });
    }

    const data = await model.createExtraDestination(projectId, {
      name,
      country,
      accommodation_rate,
      subsistence_rate
    });

    res.status(201).json({ ok: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create extra destination' }
    });
  }
};

exports.updateExtraDestination = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { name, country, accommodation_rate, subsistence_rate } = req.body;

    const isOwner = await verifyExtraDestinationOwnership(id, userId);
    if (!isOwner) {
      return res.status(403).json({
        ok: false,
        error: { code: 'FORBIDDEN', message: 'Extra destination not found or no access' }
      });
    }

    const data = await model.updateExtraDestination(id, {
      name,
      country,
      accommodation_rate,
      subsistence_rate
    });

    res.json({ ok: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update extra destination' }
    });
  }
};

exports.deleteExtraDestination = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const isOwner = await verifyExtraDestinationOwnership(id, userId);
    if (!isOwner) {
      return res.status(403).json({
        ok: false,
        error: { code: 'FORBIDDEN', message: 'Extra destination not found or no access' }
      });
    }

    await model.deleteExtraDestination(id);
    res.json({ ok: true, data: { id } });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete extra destination' }
    });
  }
};

// ============ WORK PACKAGES ============

exports.getWorkPackages = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    const isOwner = await verifyProjectOwnership(projectId, userId);
    if (!isOwner) {
      return res.status(403).json({
        ok: false,
        error: { code: 'FORBIDDEN', message: 'Project not found or no access' }
      });
    }

    const data = await model.getWorkPackages(projectId);
    res.json({ ok: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get work packages' }
    });
  }
};

exports.createWorkPackage = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;
    const { title, category, leader_id } = req.body;

    const isOwner = await verifyProjectOwnership(projectId, userId);
    if (!isOwner) {
      return res.status(403).json({
        ok: false,
        error: { code: 'FORBIDDEN', message: 'Project not found or no access' }
      });
    }

    const data = await model.createWorkPackage(projectId, {
      title,
      category,
      leader_id
    });

    res.status(201).json({ ok: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create work package' }
    });
  }
};

exports.updateWorkPackage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { title, category, leader_id, order_index } = req.body;

    const isOwner = await verifyWorkPackageOwnership(id, userId);
    if (!isOwner) {
      return res.status(403).json({
        ok: false,
        error: { code: 'FORBIDDEN', message: 'Work package not found or no access' }
      });
    }

    const data = await model.updateWorkPackage(id, {
      title,
      category,
      leader_id,
      order_index
    });

    res.json({ ok: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update work package' }
    });
  }
};

exports.deleteWorkPackage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const isOwner = await verifyWorkPackageOwnership(id, userId);
    if (!isOwner) {
      return res.status(403).json({
        ok: false,
        error: { code: 'FORBIDDEN', message: 'Work package not found or no access' }
      });
    }

    await model.deleteWorkPackage(id);
    res.json({ ok: true, data: { id } });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete work package' }
    });
  }
};

// ============ ACTIVITIES ============

exports.getActivities = async (req, res) => {
  try {
    const { wpId } = req.params;
    const userId = req.user.id;

    const isOwner = await verifyWorkPackageOwnership(wpId, userId);
    if (!isOwner) {
      return res.status(403).json({
        ok: false,
        error: { code: 'FORBIDDEN', message: 'Work package not found or no access' }
      });
    }

    const data = await model.getActivities(wpId);
    res.json({ ok: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get activities' }
    });
  }
};

exports.createActivity = async (req, res) => {
  try {
    const { wpId } = req.params;
    const userId = req.user.id;
    const { type, label } = req.body;

    const isOwner = await verifyWorkPackageOwnership(wpId, userId);
    if (!isOwner) {
      return res.status(403).json({
        ok: false,
        error: { code: 'FORBIDDEN', message: 'Work package not found or no access' }
      });
    }

    const data = await model.createActivity(wpId, { type, label });
    res.status(201).json({ ok: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create activity' }
    });
  }
};

exports.updateActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { type, label, order_index } = req.body;

    const isOwner = await verifyActivityOwnership(id, userId);
    if (!isOwner) {
      return res.status(403).json({
        ok: false,
        error: { code: 'FORBIDDEN', message: 'Activity not found or no access' }
      });
    }

    const data = await model.updateActivity(id, { type, label, order_index });
    res.json({ ok: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update activity' }
    });
  }
};

exports.deleteActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const isOwner = await verifyActivityOwnership(id, userId);
    if (!isOwner) {
      return res.status(403).json({
        ok: false,
        error: { code: 'FORBIDDEN', message: 'Activity not found or no access' }
      });
    }

    await model.deleteActivity(id);
    res.json({ ok: true, data: { id } });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete activity' }
    });
  }
};

// ============ ACTIVITY DETAIL ============

exports.getActivityDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const isOwner = await verifyActivityOwnership(id, userId);
    if (!isOwner) {
      return res.status(403).json({
        ok: false,
        error: { code: 'FORBIDDEN', message: 'Activity not found or no access' }
      });
    }

    const data = await model.getActivityDetail(id);
    res.json({ ok: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get activity detail' }
    });
  }
};

exports.createActivityDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const data = req.body;

    const isOwner = await verifyActivityOwnership(id, userId);
    if (!isOwner) {
      return res.status(403).json({
        ok: false,
        error: { code: 'FORBIDDEN', message: 'Activity not found or no access' }
      });
    }

    const result = await model.createActivityDetail(id, data);
    res.status(201).json({ ok: true, data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create activity detail' }
    });
  }
};

exports.updateActivityDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { detail_id } = req.body;
    const data = req.body;

    const isOwner = await verifyActivityOwnership(id, userId);
    if (!isOwner) {
      return res.status(403).json({
        ok: false,
        error: { code: 'FORBIDDEN', message: 'Activity not found or no access' }
      });
    }

    const result = await model.updateActivityDetail(id, detail_id, data);
    res.json({ ok: true, data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update activity detail' }
    });
  }
};

// ============ BUDGET SUMMARY ============

exports.getBudgetSummary = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    const isOwner = await verifyProjectOwnership(projectId, userId);
    if (!isOwner) {
      return res.status(403).json({
        ok: false,
        error: { code: 'FORBIDDEN', message: 'Project not found or no access' }
      });
    }

    const data = await model.getBudgetSummary(projectId);
    res.json({ ok: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to calculate budget summary' }
    });
  }
};
