const express = require('express');
const router = express.Router();
const medicalProviderUserController = require('../controllers/medicalProviderUserController');
const { 
  verifyMedicalProviderUser, 
  requireAdmin, 
  checkPermission 
} = require('../middleware/medicalProviderAuth');
const { logMedicalActivity } = require('../middleware/medicalProviderActivityLogger');

// Note: Login is handled by /api/auth/login/medicalprovider-user

// All routes require authentication
router.use(verifyMedicalProviderUser);

// Admin only routes
router.post(
  '/create',
  requireAdmin,
  logMedicalActivity('user_created'),
  medicalProviderUserController.createUser
);

router.patch(
  '/:userId/deactivate',
  requireAdmin,
  logMedicalActivity('user_deactivated'),
  medicalProviderUserController.deactivateUser
);

router.patch(
  '/:userId/reactivate',
  requireAdmin,
  logMedicalActivity('user_reactivated'),
  medicalProviderUserController.reactivateUser
);

// Routes requiring permission
router.get(
  '/all',
  checkPermission('can_manage_users'),
  medicalProviderUserController.getAllUsers
);

router.get(
  '/:userId',
  checkPermission('can_manage_users'),
  medicalProviderUserController.getUserById
);

router.patch(
  '/:userId',
  checkPermission('can_manage_users'),
  logMedicalActivity('user_updated'),
  medicalProviderUserController.updateUser
);

module.exports = router;
