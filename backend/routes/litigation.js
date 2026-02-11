const express = require('express');
const router = express.Router();
const litigationController = require('../controllers/litigationController');
const { authenticateToken } = require('../middleware/auth');
const { rewardLimiter } = require('../middleware/rateLimiter');

router.use(authenticateToken);

// Individual user routes
router.get('/progress', litigationController.getUserProgress);

// SECURITY: Rate limit coin-awarding actions to prevent farming
router.post('/substage/complete', rewardLimiter, litigationController.completeSubstage);
router.post('/substage/revert', litigationController.revertSubstage);
router.post('/stage/complete', rewardLimiter, litigationController.completeStage);
router.post('/stage/revert', litigationController.revertStage);
router.post('/video/progress', litigationController.updateVideoProgress);

// Law firm routes - get/update client's litigation progress
router.get('/client/:clientId/progress', litigationController.getClientProgress);
router.post('/client/:clientId/substage/complete', litigationController.completeSubstageForClient);
router.post('/client/:clientId/substage/revert', litigationController.revertSubstageForClient);

// Medical provider routes - get/update patient's litigation progress
router.get('/patient/:patientId/progress', litigationController.getPatientProgress);
router.post('/patient/:patientId/substage/complete', litigationController.completeSubstageForClient);
router.post('/patient/:patientId/substage/revert', litigationController.revertSubstageForClient);

module.exports = router;
