const express = require('express');
const router = express.Router();
const connectionsController = require('../controllers/connectionsController');
const { authenticateToken } = require('../middleware/auth');

router.get('/my-connections', authenticateToken, connectionsController.getMyConnections);
router.post('/update-lawfirm', authenticateToken, connectionsController.updateLawFirm);
router.post('/add-medical-provider', authenticateToken, connectionsController.addMedicalProvider);
router.post('/disconnect-lawfirm', authenticateToken, connectionsController.disconnectLawFirm);
router.post('/remove-medical-provider', authenticateToken, connectionsController.removeMedicalProvider);

// Medical Provider - Law Firm Connections
router.get('/law-firms', authenticateToken, connectionsController.getMedicalProviderLawFirms);
router.post('/add-law-firm', authenticateToken, connectionsController.addLawFirmConnection);
router.post('/remove-law-firm', authenticateToken, connectionsController.removeLawFirmConnection);

// Law Firm - Medical Provider Connections
router.get('/medical-providers', authenticateToken, connectionsController.getLawFirmMedicalProviders);
router.post('/add-medical-provider-lawfirm', authenticateToken, connectionsController.addMedicalProviderConnection);
router.post('/remove-medical-provider-lawfirm', authenticateToken, connectionsController.removeMedicalProviderConnection);

// Connection Requests
router.get('/requests', authenticateToken, connectionsController.getConnectionRequests);
router.post('/requests/:requestId/accept', authenticateToken, connectionsController.acceptConnectionRequest);
router.post('/requests/:requestId/decline', authenticateToken, connectionsController.declineConnectionRequest);
router.post('/requests/:requestId/cancel', authenticateToken, connectionsController.cancelConnectionRequest);

module.exports = router;
