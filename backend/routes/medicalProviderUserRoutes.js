const express = require('express');
const router = express.Router();
const medicalProviderUserController = require('../controllers/medicalProviderUserController');
const { 
  verifyMedicalProviderUser, 
  requireAdmin, 
  checkPermission 
} = require('../middleware/medicalProviderAuth');
const { logMedicalActivity } = require('../middleware/medicalProviderActivityLogger');

router.use(verifyMedicalProviderUser);

router.post(
  '/',
  requireAdmin,
  logMedicalActivity('user_created'),
  medicalProviderUserController.createUser
);

router.get(
  '/',
  medicalProviderUserController.getAllUsers
);

router.get(
  '/:userId',
  medicalProviderUserController.getUserById
);

router.put(
  '/:userId',
  requireAdmin,
  logMedicalActivity('user_updated'),
  medicalProviderUserController.updateUser
);

router.post(
  '/:userId/deactivate',
  requireAdmin,
  logMedicalActivity('user_deactivated'),
  medicalProviderUserController.deactivateUser
);

router.post(
  '/:userId/reactivate',
  requireAdmin,
  logMedicalActivity('user_reactivated'),
  medicalProviderUserController.reactivateUser
);

module.exports = router;
