const express = require('express');
const router = express.Router();
const litigationController = require('../controllers/litigationController');
const { authenticateToken } = require('../middleware/auth');
const { rewardLimiter } = require('../middleware/rateLimiter');

// All litigation routes require authentication
router.use(authenticateToken);

// Individual user routes
router.get('/progress', litigationController.getUserProgress);

// SECURITY: Rate limit coin-awarding actions to prevent farming
router.post('/substage/complete', rewardLimiter, litigationController.completeSubstage);
router.post('/substage/revert', litigationController.revertSubstage);
router.post('/stage/complete', rewardLimiter, litigationController.completeStage);
router.post('/stage/revert', litigationController.revertStage);
router.post('/video/progress', litigationController.updateVideoProgress);

// Law firm routes - get client's litigation progress
router.get('/client/:clientId/progress', litigationController.getClientProgress);

module.exports = router;
