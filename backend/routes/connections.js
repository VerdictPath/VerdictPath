const express = require('express');
const router = express.Router();
const connectionsController = require('../controllers/connectionsController');
const { authenticateToken } = require('../middleware/auth');

router.get('/my-connections', authenticateToken, connectionsController.getMyConnections);
router.post('/update-lawfirm', authenticateToken, connectionsController.updateLawFirm);
router.post('/update-medical-provider', authenticateToken, connectionsController.updateMedicalProvider);
router.post('/disconnect-lawfirm', authenticateToken, connectionsController.disconnectLawFirm);
router.post('/disconnect-medical-provider', authenticateToken, connectionsController.disconnectMedicalProvider);

module.exports = router;
