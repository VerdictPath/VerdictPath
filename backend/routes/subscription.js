const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const subscriptionController = require('../controllers/subscriptionController');

router.get('/lawfirm/current', authenticateToken, subscriptionController.getLawFirmSubscription);
router.put('/lawfirm/update', authenticateToken, subscriptionController.updateLawFirmSubscription);

router.get('/medicalprovider/current', authenticateToken, subscriptionController.getMedicalProviderSubscription);
router.put('/medicalprovider/update', authenticateToken, subscriptionController.updateMedicalProviderSubscription);

router.get('/individual/current', authenticateToken, subscriptionController.getIndividualSubscription);
router.put('/individual/update', authenticateToken, subscriptionController.updateIndividualSubscription);

module.exports = router;
