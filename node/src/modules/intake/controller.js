/* ── Intake Controller — Business logic for intake endpoints ───────── */

const model = require('./model');

/* ── GET /v1/intake/programs ─────────────────────────────────────── */
async function listPrograms(req, res, next) {
  try {
    const programs = await model.findActivePrograms();
    res.json({
      ok: true,
      data: programs
    });
  } catch (err) {
    next(err);
  }
}

/* ── GET /v1/intake/projects ─────────────────────────────────────── */
async function listProjects(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const perPage = Math.min(parseInt(req.query.per_page) || 20, 100);

    const result = await model.findProjectsByUserId(req.user.id, page, perPage);

    res.json({
      ok: true,
      data: result.data,
      meta: {
        total: result.total,
        page: result.page,
        per_page: result.per_page,
        total_pages: result.total_pages
      }
    });
  } catch (err) {
    next(err);
  }
}

/* ── GET /v1/intake/projects/:id ─────────────────────────────────── */
async function getProject(req, res, next) {
  try {
    const project = await model.findProjectById(req.params.id, req.user.id);
    if (!project) {
      return res.status(404).json({
        ok: false,
        error: { code: 'NOT_FOUND', message: 'Project not found' }
      });
    }
    res.json({
      ok: true,
      data: project
    });
  } catch (err) {
    next(err);
  }
}

/* ── POST /v1/intake/projects ────────────────────────────────────── */
async function createProject(req, res, next) {
  try {
    const { name, type, description, start_date, duration_months, deadline, eu_grant, cofin_pct, indirect_pct } = req.body;

    if (!name) {
      return res.status(400).json({
        ok: false,
        error: { code: 'VALIDATION_ERROR', message: 'Project name is required' }
      });
    }

    const projectData = {
      name,
      type,
      description,
      start_date,
      duration_months,
      deadline,
      eu_grant: eu_grant || 0,
      cofin_pct: cofin_pct || 0,
      indirect_pct: indirect_pct || 0
    };

    const project = await model.createProject(req.user.id, projectData);

    res.status(201).json({
      ok: true,
      data: project
    });
  } catch (err) {
    next(err);
  }
}

/* ── PATCH /v1/intake/projects/:id ───────────────────────────────── */
async function updateProject(req, res, next) {
  try {
    const result = await model.updateProjectFields(req.params.id, req.user.id, req.body);
    if (!result) {
      return res.status(404).json({
        ok: false,
        error: { code: 'NOT_FOUND', message: 'Project not found' }
      });
    }
    res.json({
      ok: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

/* ── DELETE /v1/intake/projects/:id ──────────────────────────────── */
async function deleteProject(req, res, next) {
  try {
    const deleted = await model.deleteProject(req.params.id, req.user.id);
    if (!deleted) {
      return res.status(404).json({
        ok: false,
        error: { code: 'NOT_FOUND', message: 'Project not found' }
      });
    }
    res.json({
      ok: true,
      data: { message: 'Project deleted' }
    });
  } catch (err) {
    next(err);
  }
}

/* ── GET /v1/intake/projects/:projectId/partners ─────────────────── */
async function listPartners(req, res, next) {
  try {
    const partners = await model.findPartnersByProjectId(req.params.projectId, req.user.id);
    if (partners === null) {
      return res.status(404).json({
        ok: false,
        error: { code: 'NOT_FOUND', message: 'Project not found' }
      });
    }
    res.json({
      ok: true,
      data: partners
    });
  } catch (err) {
    next(err);
  }
}

/* ── POST /v1/intake/projects/:projectId/partners ────────────────── */
async function createPartner(req, res, next) {
  try {
    const { name, legal_name, city, country } = req.body;

    if (!name) {
      return res.status(400).json({
        ok: false,
        error: { code: 'VALIDATION_ERROR', message: 'Partner name is required' }
      });
    }

    const partner = await model.createPartner(req.params.projectId, req.user.id, {
      name,
      legal_name,
      city,
      country
    });

    if (!partner) {
      return res.status(404).json({
        ok: false,
        error: { code: 'NOT_FOUND', message: 'Project not found' }
      });
    }

    res.status(201).json({
      ok: true,
      data: partner
    });
  } catch (err) {
    next(err);
  }
}

/* ── PATCH /v1/intake/partners/:id ───────────────────────────────── */
async function updatePartner(req, res, next) {
  try {
    const result = await model.updatePartner(req.params.id, req.user.id, req.body);
    if (!result) {
      return res.status(404).json({
        ok: false,
        error: { code: 'NOT_FOUND', message: 'Partner not found or access denied' }
      });
    }
    res.json({
      ok: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

/* ── DELETE /v1/intake/partners/:id ──────────────────────────────── */
async function deletePartner(req, res, next) {
  try {
    const deleted = await model.deletePartner(req.params.id, req.user.id);
    if (!deleted) {
      return res.status(404).json({
        ok: false,
        error: { code: 'NOT_FOUND', message: 'Partner not found or access denied' }
      });
    }
    res.json({
      ok: true,
      data: { message: 'Partner deleted' }
    });
  } catch (err) {
    next(err);
  }
}

/* ── PATCH /v1/intake/projects/:projectId/partners/reorder ───────── */
async function reorderPartners(req, res, next) {
  try {
    const { order } = req.body;

    if (!Array.isArray(order) || order.length === 0) {
      return res.status(400).json({
        ok: false,
        error: { code: 'VALIDATION_ERROR', message: 'order array is required' }
      });
    }

    const success = await model.reorderPartners(req.params.projectId, req.user.id, order);
    if (!success) {
      return res.status(404).json({
        ok: false,
        error: { code: 'NOT_FOUND', message: 'Project or partner not found' }
      });
    }

    res.json({
      ok: true,
      data: { message: 'Partners reordered' }
    });
  } catch (err) {
    next(err);
  }
}

/* ── GET /v1/intake/projects/:projectId/context ──────────────────── */
async function listContexts(req, res, next) {
  try {
    const contexts = await model.findContextsByProjectId(req.params.projectId, req.user.id);
    if (contexts === null) {
      return res.status(404).json({
        ok: false,
        error: { code: 'NOT_FOUND', message: 'Project not found' }
      });
    }
    res.json({
      ok: true,
      data: contexts
    });
  } catch (err) {
    next(err);
  }
}

/* ── PATCH /v1/intake/contexts/:id ───────────────────────────────── */
async function updateContext(req, res, next) {
  try {
    const result = await model.updateContextFields(req.params.id, req.user.id, req.body);
    if (!result) {
      return res.status(404).json({
        ok: false,
        error: { code: 'NOT_FOUND', message: 'Context not found or access denied' }
      });
    }
    res.json({
      ok: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listPrograms,
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  listPartners,
  createPartner,
  updatePartner,
  deletePartner,
  reorderPartners,
  listContexts,
  updateContext
};
