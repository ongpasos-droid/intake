const router = require('express').Router();
const { requireAuth } = require('../../middleware/auth');
const ctrl = require('./controller');

// Project context (read from intake data)
router.get('/projects/:projectId/context', requireAuth, ctrl.getContext);

// Form instance
router.post('/projects/:projectId/instance', requireAuth, ctrl.getOrCreateInstance);
router.get('/instances/:id', requireAuth, ctrl.getInstance);
router.patch('/instances/:id/status', requireAuth, ctrl.updateStatus);

// Field values
router.get('/instances/:id/values', requireAuth, ctrl.getValues);
router.put('/instances/:id/values', requireAuth, ctrl.saveValues);
router.put('/instances/:id/field', requireAuth, ctrl.saveField);

// AI generation & evaluation
router.post('/instances/:id/generate', requireAuth, ctrl.generateDraft);
router.post('/instances/:id/evaluate', requireAuth, ctrl.evaluateField);
router.post('/instances/:id/improve', requireAuth, ctrl.improveField);

// Eval criteria (read-only)
router.get('/eval-criteria', requireAuth, ctrl.getEvalCriteria);

// Prep Studio: Interview
router.get('/projects/:projectId/interview', requireAuth, ctrl.getInterview);
router.post('/projects/:projectId/interview/generate', requireAuth, ctrl.generateInterviewQuestions);
router.put('/projects/:projectId/interview/:key', requireAuth, ctrl.saveInterviewAnswer);

// Prep Studio: Research docs upload
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 30 * 1024 * 1024 } });
router.get('/projects/:projectId/research-docs', requireAuth, ctrl.getResearchDocs);
router.post('/projects/:projectId/research-docs', requireAuth, upload.single('file'), ctrl.uploadResearchDoc);
router.delete('/projects/:projectId/research-docs/:docId', requireAuth, ctrl.deleteResearchDoc);

// Prep Studio: Gap analysis
router.get('/projects/:projectId/gap-analysis', requireAuth, ctrl.getGapAnalysis);

// Prep Studio v2: 5-tab context
router.get('/projects/:projectId/prep/consorcio', requireAuth, ctrl.getPrepConsorcio);
router.put('/projects/:projectId/partners/:partnerId/link-org', requireAuth, ctrl.linkPartnerOrg);
router.post('/projects/:projectId/prep/consorcio/:partnerId/generate-variant', requireAuth, ctrl.generatePifVariant);
router.put('/projects/:projectId/prep/consorcio/:partnerId/select-variant', requireAuth, ctrl.selectPifVariant);
router.put('/projects/:projectId/prep/consorcio/:partnerId/custom-text', requireAuth, ctrl.savePartnerCustomText);
router.put('/projects/:projectId/prep/consorcio/:partnerId/toggle-eu-project', requireAuth, ctrl.toggleEuProject);
router.put('/projects/:projectId/prep/consorcio/:partnerId/staff-skills', requireAuth, ctrl.saveStaffCustomSkills);
router.put('/projects/:projectId/prep/consorcio/:partnerId/toggle-staff', requireAuth, ctrl.toggleStaffSelected);
router.put('/projects/:projectId/prep/consorcio/:partnerId/staff-role', requireAuth, ctrl.setStaffProjectRole);
router.post('/projects/:projectId/prep/consorcio/:partnerId/extra-staff', requireAuth, ctrl.addExtraStaff);
router.put('/projects/:projectId/prep/consorcio/:partnerId/extra-staff/:staffId', requireAuth, ctrl.updateExtraStaff);
router.delete('/projects/:projectId/prep/consorcio/:partnerId/extra-staff/:staffId', requireAuth, ctrl.removeExtraStaff);
router.get('/projects/:projectId/prep/presupuesto', requireAuth, ctrl.getPrepPresupuesto);
router.get('/projects/:projectId/prep/relevancia', requireAuth, ctrl.getPrepRelevancia);
router.put('/projects/:projectId/prep/relevancia/context', requireAuth, ctrl.updatePrepRelevanciaContext);
router.post('/projects/:projectId/prep/relevancia/generate-draft', requireAuth, ctrl.generateRelevanciaFieldDraft);
router.post('/projects/:projectId/prep/relevancia/chat', requireAuth, ctrl.chatRelevanciaField);
router.get('/projects/:projectId/prep/actividades', requireAuth, ctrl.getPrepActividades);
router.put('/wp/:wpId/summary', requireAuth, ctrl.updateWpSummary);
router.put('/activity/:activityId/description', requireAuth, ctrl.updateActivityDescription);
router.post('/projects/:projectId/prep/wp/:wpId/generate-summary', requireAuth, ctrl.generateWpSummaryDraft);
router.post('/projects/:projectId/prep/wp/:wpId/improve-summary', requireAuth, ctrl.improveWpSummary);
router.post('/projects/:projectId/prep/activity/:activityId/generate-description', requireAuth, ctrl.generateActivityDescriptionDraft);
router.post('/projects/:projectId/prep/activity/:activityId/improve-description', requireAuth, ctrl.improveActivityDescription);

module.exports = router;
