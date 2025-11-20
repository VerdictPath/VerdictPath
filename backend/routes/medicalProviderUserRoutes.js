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
  '/users',
  requireAdmin,
  logMedicalActivity('user_created'),
  medicalProviderUserController.createUser
);

router.get(
  '/users',
  checkPermission('can_manage_users'),
  medicalProviderUserController.getAllUsers
);

router.get(
  '/users/:userId',
  checkPermission('can_manage_users'),
  medicalProviderUserController.getUserById
);

router.put(
  '/users/:userId',
  checkPermission('can_manage_users'),
  logMedicalActivity('user_updated'),
  medicalProviderUserController.updateUser
);

router.post(
  '/users/:userId/deactivate',
  requireAdmin,
  logMedicalActivity('user_deactivated'),
  medicalProviderUserController.deactivateUser
);

router.post(
  '/users/:userId/reactivate',
  requireAdmin,
  logMedicalActivity('user_reactivated'),
  medicalProviderUserController.reactivateUser
);

module.exports = router;
