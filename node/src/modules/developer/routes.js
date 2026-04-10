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
router.get('/projects/:projectId/prep/presupuesto', requireAuth, ctrl.getPrepPresupuesto);
router.get('/projects/:projectId/prep/relevancia', requireAuth, ctrl.getPrepRelevancia);
router.put('/projects/:projectId/prep/relevancia/context', requireAuth, ctrl.updatePrepRelevanciaContext);
router.get('/projects/:projectId/prep/actividades', requireAuth, ctrl.getPrepActividades);
router.put('/wp/:wpId/summary', requireAuth, ctrl.updateWpSummary);
router.put('/activity/:activityId/description', requireAuth, ctrl.updateActivityDescription);

module.exports = router;
