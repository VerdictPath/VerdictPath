const express = require('express');
const router = express.Router();
const medicalActivityController = require('../controllers/medicalProviderActivityController');
const { 
  verifyMedicalProviderUser, 
  checkPermission,
  requireAdmin 
} = require('../middleware/medicalProviderAuth');

// All routes require authentication
router.use(verifyMedicalProviderUser);

// Activity logs (requires analytics permission)
router.get(
  '/logs',
  checkPermission('can_view_analytics'),
  medicalActivityController.getActivityLogs
);

router.get(
  '/summary',
  checkPermission('can_view_analytics'),
  medicalActivityController.getActivitySummary
);

router.get(
  '/statistics',
  checkPermission('can_view_analytics'),
  medicalActivityController.getActivityStatistics
);

router.get(
  '/user/:userId/timeline',
  checkPermission('can_view_analytics'),
  medicalActivityController.getUserActivityTimeline
);

// HIPAA compliance reports (admin only)
router.get(
  '/hipaa-report',
  requireAdmin,
  medicalActivityController.getHIPAAComplianceReport
);

router.get(
  '/patient/:patientId/audit',
  checkPermission('can_view_medical_records'),
  medicalActivityController.getPatientAccessAudit
);

module.exports = router;
