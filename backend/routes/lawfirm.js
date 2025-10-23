const express = require('express');
const router = express.Router();
const lawfirmController = require('../controllers/lawfirmController');
const { authenticateToken, isLawFirm } = require('../middleware/auth');

router.get('/dashboard', authenticateToken, isLawFirm, lawfirmController.getDashboard);
router.get('/client/:clientId', authenticateToken, isLawFirm, lawfirmController.getClientDetails);
router.put('/client/:clientId/litigation', authenticateToken, isLawFirm, lawfirmController.updateLitigationStage);
router.get('/client/:clientId/litigation/history', authenticateToken, isLawFirm, lawfirmController.getLitigationHistory);

module.exports = router;
