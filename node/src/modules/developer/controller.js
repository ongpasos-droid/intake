const model = require('./model');

// GET /v1/developer/projects/:projectId/context
exports.getContext = async (req, res, next) => {
  try {
    const data = await model.getProjectContext(req.params.projectId, req.user.id);
    if (!data) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
    res.json({ ok: true, data });
  } catch (err) { next(err); }
};

// POST /v1/developer/projects/:projectId/instance
exports.getOrCreateInstance = async (req, res, next) => {
  try {
    const instance = await model.getOrCreateInstance(req.params.projectId, req.user.id);
    res.json({ ok: true, data: instance });
  } catch (err) { next(err); }
};

// GET /v1/developer/instances/:id
exports.getInstance = async (req, res, next) => {
  try {
    const instance = await model.getInstance(req.params.id, req.user.id);
    if (!instance) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Instance not found' } });
    res.json({ ok: true, data: instance });
  } catch (err) { next(err); }
};

// PATCH /v1/developer/instances/:id/status
exports.updateStatus = async (req, res, next) => {
  try {
    await model.updateInstanceStatus(req.params.id, req.user.id, req.body.status);
    res.json({ ok: true, data: { status: req.body.status } });
  } catch (err) { next(err); }
};

// GET /v1/developer/instances/:id/values
exports.getValues = async (req, res, next) => {
  try {
    const values = await model.getFieldValues(req.params.id);
    res.json({ ok: true, data: values });
  } catch (err) { next(err); }
};

// PUT /v1/developer/instances/:id/values
exports.saveValues = async (req, res, next) => {
  try {
    const { fields } = req.body;
    if (fields && fields.length) {
      await model.saveFieldValuesBulk(req.params.id, fields);
    }
    res.json({ ok: true, data: { saved: true } });
  } catch (err) { next(err); }
};

// PUT /v1/developer/instances/:id/field
exports.saveField = async (req, res, next) => {
  try {
    const { field_id, section_path, text, json } = req.body;
    await model.saveFieldValue(req.params.id, field_id, section_path, text, json);
    res.json({ ok: true, data: { saved: true } });
  } catch (err) { next(err); }
};

// GET /v1/developer/eval-criteria
exports.getEvalCriteria = async (req, res, next) => {
  try {
    const data = await model.getEvalCriteria(req.query.type || null);
    res.json({ ok: true, data });
  } catch (err) { next(err); }
};

// ============ PREP STUDIO ============

exports.getInterview = async (req, res, next) => {
  try {
    const data = await model.getInterviewAnswers(req.params.projectId);
    res.json({ ok: true, data });
  } catch (err) { next(err); }
};

exports.generateInterviewQuestions = async (req, res, next) => {
  try {
    const questions = await model.generateInterviewQuestions(req.params.projectId, req.user.id);
    res.json({ ok: true, data: questions });
  } catch (err) { next(err); }
};

exports.saveInterviewAnswer = async (req, res, next) => {
  try {
    await model.saveInterviewAnswer(req.params.projectId, req.user.id, req.params.key, req.body.answer);
    res.json({ ok: true, data: { saved: true } });
  } catch (err) { next(err); }
};

exports.getResearchDocs = async (req, res, next) => {
  try {
    const data = await model.getResearchDocs(req.params.projectId);
    res.json({ ok: true, data });
  } catch (err) { next(err); }
};

exports.uploadResearchDoc = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: { message: 'No file' } });
    const ext = req.file.originalname.split('.').pop().toLowerCase();
    const result = await model.addResearchDoc(req.params.projectId, {
      buffer: req.file.buffer, ext,
      title: req.body.title || req.file.originalname.replace(/\.[^.]+$/, ''),
    });
    res.json({ ok: true, data: result });
  } catch (err) { next(err); }
};

exports.deleteResearchDoc = async (req, res, next) => {
  try {
    await model.removeResearchDoc(req.params.projectId, req.params.docId);
    res.json({ ok: true, data: { deleted: true } });
  } catch (err) { next(err); }
};

exports.getGapAnalysis = async (req, res, next) => {
  try {
    const data = await model.getGapAnalysis(req.params.projectId, req.user.id);
    res.json({ ok: true, data });
  } catch (err) { next(err); }
};

// ============ PREP STUDIO v2: 5-TAB ENDPOINTS ============

// GET /v1/developer/projects/:projectId/prep/consorcio
exports.getPrepConsorcio = async (req, res, next) => {
  try {
    const data = await model.getPrepConsorcio(req.params.projectId, req.user.id);
    res.json({ ok: true, data });
  } catch (err) { next(err); }
};

// PUT /v1/developer/projects/:projectId/partners/:partnerId/link-org
exports.linkPartnerOrg = async (req, res, next) => {
  try {
    await model.linkPartnerOrg(req.params.projectId, req.params.partnerId, req.body.organization_id);
    res.json({ ok: true, data: { linked: true } });
  } catch (err) { next(err); }
};

// POST /v1/developer/projects/:projectId/prep/consorcio/:partnerId/generate-variant
exports.generatePifVariant = async (req, res, next) => {
  try {
    const { category, category_label } = req.body;
    const result = await model.generatePifVariant(req.params.projectId, req.params.partnerId, category, category_label, req.user.id);
    res.json({ ok: true, data: result });
  } catch (err) { next(err); }
};

// PUT /v1/developer/projects/:projectId/prep/consorcio/:partnerId/select-variant
exports.selectPifVariant = async (req, res, next) => {
  try {
    await model.selectPifVariant(req.params.projectId, req.params.partnerId, req.body.variant_id);
    res.json({ ok: true, data: { selected: true } });
  } catch (err) { next(err); }
};

// PUT /v1/developer/projects/:projectId/prep/consorcio/:partnerId/custom-text
exports.savePartnerCustomText = async (req, res, next) => {
  try {
    await model.savePartnerCustomText(req.params.projectId, req.params.partnerId, req.body.custom_text);
    res.json({ ok: true });
  } catch (err) { next(err); }
};

// PUT /v1/developer/projects/:projectId/prep/consorcio/:partnerId/toggle-eu-project
exports.toggleEuProject = async (req, res, next) => {
  try {
    await model.toggleEuProject(req.params.projectId, req.params.partnerId, req.body.eu_project_id, req.body.selected);
    res.json({ ok: true });
  } catch (err) { next(err); }
};

// PUT /v1/developer/projects/:projectId/prep/consorcio/:partnerId/staff-skills
exports.saveStaffCustomSkills = async (req, res, next) => {
  try {
    await model.saveStaffCustomSkills(req.params.projectId, req.params.partnerId, req.body.staff_id, req.body.custom_skills);
    res.json({ ok: true });
  } catch (err) { next(err); }
};

// PUT /v1/developer/projects/:projectId/prep/consorcio/:partnerId/toggle-staff
exports.toggleStaffSelected = async (req, res, next) => {
  try {
    await model.toggleStaffSelected(req.params.projectId, req.params.partnerId, req.body.staff_id, req.body.selected);
    res.json({ ok: true });
  } catch (err) { next(err); }
};

// PUT /v1/developer/projects/:projectId/prep/consorcio/:partnerId/staff-role
exports.setStaffProjectRole = async (req, res, next) => {
  try {
    await model.setStaffProjectRole(req.params.projectId, req.params.partnerId, req.body.staff_id, req.body.project_role);
    res.json({ ok: true });
  } catch (err) { next(err); }
};

// POST /v1/developer/projects/:projectId/prep/consorcio/:partnerId/extra-staff
exports.addExtraStaff = async (req, res, next) => {
  try {
    const result = await model.addExtraStaff(req.params.projectId, req.params.partnerId);
    res.json({ ok: true, data: result });
  } catch (err) { next(err); }
};

// PUT /v1/developer/projects/:projectId/prep/consorcio/:partnerId/extra-staff/:staffId
exports.updateExtraStaff = async (req, res, next) => {
  try {
    await model.updateExtraStaff(req.params.projectId, req.params.partnerId, req.params.staffId, req.body.field, req.body.value);
    res.json({ ok: true });
  } catch (err) { next(err); }
};

// DELETE /v1/developer/projects/:projectId/prep/consorcio/:partnerId/extra-staff/:staffId
exports.removeExtraStaff = async (req, res, next) => {
  try {
    await model.removeExtraStaff(req.params.projectId, req.params.partnerId, req.params.staffId);
    res.json({ ok: true });
  } catch (err) { next(err); }
};

// GET /v1/developer/projects/:projectId/prep/presupuesto
exports.getPrepPresupuesto = async (req, res, next) => {
  try {
    const data = await model.getPrepPresupuesto(req.params.projectId);
    res.json({ ok: true, data });
  } catch (err) { next(err); }
};

// GET /v1/developer/projects/:projectId/prep/relevancia
exports.getPrepRelevancia = async (req, res, next) => {
  try {
    const data = await model.getPrepRelevancia(req.params.projectId);
    res.json({ ok: true, data });
  } catch (err) { next(err); }
};

// PUT /v1/developer/projects/:projectId/prep/relevancia/context
exports.updatePrepRelevanciaContext = async (req, res, next) => {
  try {
    const { problem, target_groups, approach } = req.body;
    await model.updatePrepRelevanciaContext(req.params.projectId, problem, target_groups, approach);
    res.json({ ok: true, data: { saved: true } });
  } catch (err) { next(err); }
};

// POST /v1/developer/projects/:projectId/prep/relevancia/generate-draft
exports.generateRelevanciaFieldDraft = async (req, res, next) => {
  try {
    const { field_key } = req.body;
    if (!['problem', 'target_groups', 'approach'].includes(field_key)) {
      return res.status(400).json({ ok: false, error: { code: 'BAD_REQUEST', message: 'Invalid field_key: ' + field_key } });
    }
    const data = await model.generateRelevanciaFieldDraft(req.params.projectId, req.user.id, field_key);
    res.json({ ok: true, data });
  } catch (err) {
    console.error('[generateRelevanciaFieldDraft] ERROR:', err?.message || err, err?.stack);
    next(err);
  }
};

// POST /v1/developer/projects/:projectId/prep/relevancia/chat
exports.chatRelevanciaField = async (req, res, next) => {
  try {
    const { field_key, message } = req.body;
    if (!['problem', 'target_groups', 'approach'].includes(field_key)) {
      return res.status(400).json({ ok: false, error: { code: 'BAD_REQUEST', message: 'Invalid field_key: ' + field_key } });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ ok: false, error: { code: 'BAD_REQUEST', message: 'Message required' } });
    }
    const data = await model.chatRelevanciaField(req.params.projectId, req.user.id, field_key, message.trim());
    res.json({ ok: true, data });
  } catch (err) {
    console.error('[chatRelevanciaField] ERROR:', err?.message || err, err?.stack);
    next(err);
  }
};

// GET /v1/developer/projects/:projectId/prep/actividades
exports.getPrepActividades = async (req, res, next) => {
  try {
    const data = await model.getPrepActividades(req.params.projectId);
    res.json({ ok: true, data });
  } catch (err) { next(err); }
};

// PUT /v1/developer/wp/:wpId/summary
exports.updateWpSummary = async (req, res, next) => {
  try {
    await model.updateWpSummary(req.params.wpId, req.body.summary || '');
    res.json({ ok: true, data: { saved: true } });
  } catch (err) { next(err); }
};

// PUT /v1/developer/activity/:activityId/description
exports.updateActivityDescription = async (req, res, next) => {
  try {
    await model.updateActivityDescription(req.params.activityId, req.body.description || '');
    res.json({ ok: true, data: { saved: true } });
  } catch (err) { next(err); }
};

// POST /v1/developer/projects/:projectId/prep/wp/:wpId/generate-summary
exports.generateWpSummaryDraft = async (req, res, next) => {
  try {
    const data = await model.generateWpSummaryDraft(req.params.projectId, req.params.wpId);
    res.json({ ok: true, data });
  } catch (err) { next(err); }
};

// POST /v1/developer/projects/:projectId/prep/wp/:wpId/improve-summary
exports.improveWpSummary = async (req, res, next) => {
  try {
    const { message } = req.body || {};
    if (!message || !message.trim()) return res.status(400).json({ ok: false, error: { code: 'BAD_REQUEST', message: 'message required' } });
    const data = await model.improveWpSummary(req.params.projectId, req.params.wpId, message.trim());
    res.json({ ok: true, data });
  } catch (err) {
    console.error('[improveWpSummary] ERROR:', err?.message || err, err?.stack);
    next(err);
  }
};

// POST /v1/developer/projects/:projectId/prep/activity/:activityId/generate-description
exports.generateActivityDescriptionDraft = async (req, res, next) => {
  try {
    const data = await model.generateActivityDescriptionDraft(req.params.projectId, req.params.activityId);
    res.json({ ok: true, data });
  } catch (err) { next(err); }
};

// POST /v1/developer/projects/:projectId/prep/activity/:activityId/improve-description
exports.improveActivityDescription = async (req, res, next) => {
  try {
    const { message } = req.body || {};
    if (!message || !message.trim()) return res.status(400).json({ ok: false, error: { code: 'BAD_REQUEST', message: 'message required' } });
    const data = await model.improveActivityDescription(req.params.projectId, req.params.activityId, message.trim());
    res.json({ ok: true, data });
  } catch (err) {
    console.error('[improveActivityDescription] ERROR:', err?.message || err, err?.stack);
    next(err);
  }
};

// POST /v1/developer/instances/:id/generate
exports.generateDraft = async (req, res, next) => {
  try {
    const { sections } = req.body;
    const instance = await model.getInstance(req.params.id, req.user.id);
    if (!instance) return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND' } });

    // Load enriched project context (PIFs, budget, activities, interviews)
    const projectContext = await model.buildEnrichedContext(instance.project_id, req.user.id);
    const ctx = await model.getProjectContext(instance.project_id, req.user.id);
    const programId = instance.program_id || null;

    const results = {};
    for (const sectionId of (sections || [])) {
      console.log(`[Writer] Generating ${sectionId} with RAG + full context...`);
      const coordName = ctx?.partners?.[0]?.name || 'the lead organisation';
      const text = await model.generateSection(instance.id, sectionId, projectContext, programId, coordName);
      await model.saveFieldValue(instance.id, sectionId, '', text, null);
      results[sectionId] = text;
      console.log(`[Writer] ${sectionId} done (${text.split(/\s+/).length} words, first 50 chars: "${text.substring(0, 50)}")`);
    }

    await model.updateInstanceStatus(instance.id, req.user.id, 'in_progress');
    res.json({ ok: true, data: results });
  } catch (err) { next(err); }
};

// POST /v1/developer/instances/:id/evaluate
exports.evaluateField = async (req, res, next) => {
  try {
    const { text, section_title } = req.body;
    const instance = await model.getInstance(req.params.id, req.user.id);
    const programId = instance?.program_id || null;
    const result = await model.evaluateSection(text, section_title, null, programId);
    res.json({ ok: true, data: result });
  } catch (err) { next(err); }
};

// POST /v1/developer/instances/:id/improve
exports.improveField = async (req, res, next) => {
  try {
    const { text, action, section_title } = req.body;
    const instance = await model.getInstance(req.params.id, req.user.id);
    const programId = instance?.program_id || null;

    // Load enriched project context for improvement
    let projectContext = '';
    if (instance?.project_id) {
      projectContext = await model.buildEnrichedContext(instance.project_id, req.user.id);
    }

    const improved = await model.improveSection(text, action, section_title, projectContext, programId);
    res.json({ ok: true, data: { text: improved } });
  } catch (err) { next(err); }
};
