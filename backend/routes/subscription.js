const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const subscriptionController = require('../controllers/subscriptionController');

router.get('/lawfirm/current', authMiddleware, subscriptionController.getLawFirmSubscription);
router.put('/lawfirm/update', authMiddleware, subscriptionController.updateLawFirmSubscription);

router.get('/medicalprovider/current', authMiddleware, subscriptionController.getMedicalProviderSubscription);
router.put('/medicalprovider/update', authMiddleware, subscriptionController.updateMedicalProviderSubscription);

module.exports = router;
