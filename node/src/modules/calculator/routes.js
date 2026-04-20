const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../middleware/auth');
const controller = require('./controller');

// ============ REFERENCE DATA (from Data E+) ============
router.get('/ref/staff-rates', requireAuth, controller.getRefStaffRates);

// ============ PARTNER RATES ============
router.get('/projects/:projectId/partner-rates', requireAuth, controller.getPartnerRates);
router.patch('/partner-rates/:id', requireAuth, controller.updatePartnerRate);

// ============ WORKER RATES ============
router.get('/projects/:projectId/worker-rates', requireAuth, controller.getWorkerRates);
router.patch('/worker-rates/:id', requireAuth, controller.updateWorkerRate);

// ============ ROUTES ============
router.get('/projects/:projectId/routes', requireAuth, controller.getRoutes);
router.post('/projects/:projectId/routes', requireAuth, controller.createRoute);
router.patch('/routes/:id', requireAuth, controller.updateRoute);
router.delete('/routes/:id', requireAuth, controller.deleteRoute);

// ============ EXTRA DESTINATIONS ============
router.get('/projects/:projectId/extra-destinations', requireAuth, controller.getExtraDestinations);
router.post('/projects/:projectId/extra-destinations', requireAuth, controller.createExtraDestination);
router.patch('/extra-destinations/:id', requireAuth, controller.updateExtraDestination);
router.delete('/extra-destinations/:id', requireAuth, controller.deleteExtraDestination);

// ============ WORK PACKAGES ============
router.get('/projects/:projectId/work-packages', requireAuth, controller.getWorkPackages);
router.post('/projects/:projectId/work-packages', requireAuth, controller.createWorkPackage);
router.patch('/work-packages/:id', requireAuth, controller.updateWorkPackage);
router.delete('/work-packages/:id', requireAuth, controller.deleteWorkPackage);

// ============ ACTIVITIES ============
router.get('/work-packages/:wpId/activities', requireAuth, controller.getActivities);
router.post('/work-packages/:wpId/activities', requireAuth, controller.createActivity);
router.patch('/activities/:id', requireAuth, controller.updateActivity);
router.delete('/activities/:id', requireAuth, controller.deleteActivity);

// ============ ACTIVITY DETAIL ============
router.get('/activities/:id/detail', requireAuth, controller.getActivityDetail);
router.post('/activities/:id/detail', requireAuth, controller.createActivityDetail);
router.patch('/activities/:id/detail', requireAuth, controller.updateActivityDetail);

// ============ BUDGET SUMMARY ============
router.get('/projects/:projectId/budget-summary', requireAuth, controller.getBudgetSummary);

// ============ BULK STATE (autosave) ============
router.put('/projects/:projectId/state', requireAuth, controller.saveFullState);
router.get('/projects/:projectId/state', requireAuth, controller.loadFullState);

module.exports = router;
