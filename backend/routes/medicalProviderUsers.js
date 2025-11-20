const express = require('express');
const router = express.Router();
const medicalProviderUserController = require('../controllers/medicalProviderUserController');
const medicalProviderActivityController = require('../controllers/medicalProviderActivityController');
const { 
  verifyMedicalProviderUser, 
  checkPermission, 
  requireAdmin 
} = require('../middleware/medicalProviderAuth');
const { logActivityMiddleware } = require('../middleware/medicalProviderActivityLogger');

// All routes require medical provider user authentication
router.use(verifyMedicalProviderUser);

// User Management Routes (requires can_manage_users permission)
router.post(
  '/',
  checkPermission('can_manage_users'),
  logActivityMiddleware('user_created', 'user'),
  medicalProviderUserController.createUser
);

router.get(
  '/',
  logActivityMiddleware('user_list_viewed', 'user'),
  medicalProviderUserController.getAllUsers
);

router.get(
  '/:userId',
  logActivityMiddleware('user_profile_viewed', 'user'),
  medicalProviderUserController.getUserById
);

router.put(
  '/:userId',
  checkPermission('can_manage_users'),
  medicalProviderUserController.updateUser
);

router.post(
  '/:userId/deactivate',
  requireAdmin,
  medicalProviderUserController.deactivateUser
);

router.post(
  '/:userId/reactivate',
  requireAdmin,
  medicalProviderUserController.reactivateUser
);

// Activity Log Routes (requires can_view_analytics permission)
router.get(
  '/activity/summary',
  checkPermission('can_view_analytics'),
  medicalProviderActivityController.getActivitySummary
);

router.get(
  '/activity/logs',
  checkPermission('can_view_analytics'),
  medicalProviderActivityController.getActivityLogs
);

router.get(
  '/activity/user/:userId/timeline',
  checkPermission('can_view_analytics'),
  medicalProviderActivityController.getUserActivityTimeline
);

router.get(
  '/activity/statistics',
  checkPermission('can_view_analytics'),
  medicalProviderActivityController.getActivityStatistics
);

// HIPAA Compliance Routes
router.get(
  '/activity/hipaa-report',
  requireAdmin,
  medicalProviderActivityController.getHIPAAComplianceReport
);

router.get(
  '/activity/patient/:patientId/audit',
  checkPermission('can_view_medical_records'),
  medicalProviderActivityController.getPatientAccessAudit
);

module.exports = router;
