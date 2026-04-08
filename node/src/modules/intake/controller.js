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

/* ── GET /v1/intake/entities/search?q=... ──────────────────────── */
async function searchEntities(req, res, next) {
  try {
    const { q, country, type } = req.query;
    const results = await model.searchEntities({ q, country, type });
    res.json({ ok: true, data: results });
  } catch (err) {
    next(err);
  }
}

/* ── Parse Form Part B (DOCX upload) ─────────────────────────── */
async function parseFormB(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: { message: 'No file provided' } });

    const ext = req.file.originalname.toLowerCase().split('.').pop();
    if (ext !== 'docx') return res.status(400).json({ ok: false, error: { message: 'Only .docx files are supported' } });

    const { parseFormB: parse } = require('../../services/parse-form-b');
    const result = await parse(req.file.buffer);

    res.json({ ok: true, data: result });
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
  updateContext,
  searchEntities,
  parseFormB,
  // Tasks
  getTaskTemplates,
  listTasks,
  createTask,
  generateTasks,
  updateTask,
  deleteTask,
  deleteAllTasks,
};

/* ── Task Templates ──────────────────────────────────────────── */

const TASK_TEMPLATES = require('../../data/task-templates');

async function getTaskTemplates(req, res) {
  res.json({ ok: true, data: TASK_TEMPLATES });
}

/* ── Project Tasks ───────────────────────────────────────────── */

async function listTasks(req, res) {
  try {
    const tasks = await model.listTasks(req.params.projectId);
    res.json({ ok: true, data: tasks });
  } catch (e) { res.status(500).json({ ok: false, error: { message: e.message } }); }
}

async function createTask(req, res) {
  try {
    const result = await model.createTask({ project_id: req.params.projectId, ...req.body });
    res.json({ ok: true, data: result });
  } catch (e) { res.status(500).json({ ok: false, error: { message: e.message } }); }
}

async function generateTasks(req, res) {
  try {
    const { activities } = req.body;
    // activities = [{ wp_id, category, subtype }, ...]
    if (!activities || !Array.isArray(activities)) {
      return res.status(400).json({ ok: false, error: { message: 'activities array required' } });
    }

    const created = [];
    for (let i = 0; i < activities.length; i++) {
      const act = activities[i];
      // Find template
      const cat = TASK_TEMPLATES.find(c => c.category === act.category);
      if (!cat) continue;
      const sub = cat.subtypes.find(s => s.key === act.subtype);
      if (!sub) continue;

      const result = await model.createTask({
        project_id: req.params.projectId,
        wp_id: act.wp_id || null,
        category: act.category,
        subtype: act.subtype,
        title: sub.title,
        description: sub.description,
        sort_order: i,
      });
      created.push({ ...result, title: sub.title, category: act.category, subtype: act.subtype });
    }

    res.json({ ok: true, data: created });
  } catch (e) { res.status(500).json({ ok: false, error: { message: e.message } }); }
}

async function updateTask(req, res) {
  try {
    await model.updateTask(req.params.id, req.body);
    res.json({ ok: true, data: { updated: true } });
  } catch (e) { res.status(500).json({ ok: false, error: { message: e.message } }); }
}

async function deleteTask(req, res) {
  try {
    await model.deleteTask(req.params.id);
    res.json({ ok: true, data: null });
  } catch (e) { res.status(500).json({ ok: false, error: { message: e.message } }); }
}

async function deleteAllTasks(req, res) {
  try {
    await model.deleteAllTasks(req.params.projectId);
    res.json({ ok: true, data: null });
  } catch (e) { res.status(500).json({ ok: false, error: { message: e.message } }); }
}
