const express = require('express');
const router = express.Router();
const litigationController = require('../controllers/litigationController');
const { authenticateToken } = require('../middleware/auth');

// All litigation routes require authentication
router.use(authenticateToken);

// Individual user routes
router.get('/progress', litigationController.getUserProgress);
router.post('/substage/complete', litigationController.completeSubstage);
router.post('/stage/complete', litigationController.completeStage);
router.post('/video/progress', litigationController.updateVideoProgress);

// Law firm routes - get client's litigation progress
router.get('/client/:clientId/progress', litigationController.getClientProgress);

module.exports = router;
