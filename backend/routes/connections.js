const express = require('express');
const router = express.Router();
const connectionsController = require('../controllers/connectionsController');
const { authenticateToken } = require('../middleware/auth');

router.get('/my-connections', authenticateToken, connectionsController.getMyConnections);
router.post('/update-lawfirm', authenticateToken, connectionsController.updateLawFirm);
router.post('/add-medical-provider', authenticateToken, connectionsController.addMedicalProvider);
router.post('/disconnect-lawfirm', authenticateToken, connectionsController.disconnectLawFirm);
router.post('/remove-medical-provider', authenticateToken, connectionsController.removeMedicalProvider);

module.exports = router;
