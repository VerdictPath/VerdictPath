const express = require('express');
const router = express.Router();
const lawfirmController = require('../controllers/lawfirmController');
const { authenticateToken, isLawFirm } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const { requireConsent } = require('../middleware/consent');

// HIPAA Phase 2: All routes now enforce RBAC permissions and patient consent

// Dashboard - requires VIEW_CLIENT_PHI permission (no consent needed, lists clients)
router.get('/dashboard',
  authenticateToken,
  isLawFirm,
  requirePermission('VIEW_CLIENT_PHI'),
  lawfirmController.getDashboard
);

// Client details - requires VIEW_CLIENT_PHI permission AND patient consent
router.get('/client/:clientId',
  authenticateToken,
  isLawFirm,
  requirePermission('VIEW_CLIENT_PHI'),
  requireConsent({ patientIdParam: 'clientId', dataType: 'medical_records' }),
  lawfirmController.getClientDetails
);

// Update litigation - requires EDIT_LITIGATION permission AND patient consent
router.put('/client/:clientId/litigation',
  authenticateToken,
  isLawFirm,
  requirePermission('EDIT_LITIGATION'),
  requireConsent({ patientIdParam: 'clientId', dataType: 'litigation' }),
  lawfirmController.updateLitigationStage
);

// Litigation history - requires VIEW_LITIGATION permission AND patient consent
router.get('/client/:clientId/litigation/history',
  authenticateToken,
  isLawFirm,
  requirePermission('VIEW_LITIGATION'),
  requireConsent({ patientIdParam: 'clientId', dataType: 'litigation' }),
  lawfirmController.getLitigationHistory
);

// Client documents - requires VIEW_CLIENT_PHI permission AND patient consent
router.get('/client/:clientId/documents',
  authenticateToken,
  isLawFirm,
  requirePermission('VIEW_CLIENT_PHI'),
  lawfirmController.getClientDocuments
);

// Document notifications - requires VIEW_CLIENT_PHI permission
router.get('/notifications/documents',
  authenticateToken,
  isLawFirm,
  requirePermission('VIEW_CLIENT_PHI'),
  lawfirmController.getDocumentNotifications
);

// Mark notification as read - requires VIEW_CLIENT_PHI permission
router.patch('/notifications/:notificationId/read',
  authenticateToken,
  isLawFirm,
  requirePermission('VIEW_CLIENT_PHI'),
  lawfirmController.markNotificationAsRead
);

// Unread notification count - requires VIEW_CLIENT_PHI permission
router.get('/notifications/unread-count',
  authenticateToken,
  isLawFirm,
  requirePermission('VIEW_CLIENT_PHI'),
  lawfirmController.getUnreadNotificationCount
);

// Get all client documents (Medical Hub aggregated view)
router.get('/documents/all',
  authenticateToken,
  isLawFirm,
  requirePermission('VIEW_CLIENT_PHI'),
  lawfirmController.getAllClientDocuments
);

// HIPAA Forms Management
router.get('/forms',
  authenticateToken,
  isLawFirm,
  requirePermission('VIEW_CLIENT_PHI'),
  lawfirmController.getAllLawFirmForms
);

router.get('/client/:clientId/forms',
  authenticateToken,
  isLawFirm,
  requirePermission('VIEW_CLIENT_PHI'),
  lawfirmController.getClientForms
);

router.post('/client/:clientId/forms',
  authenticateToken,
  isLawFirm,
  requirePermission('VIEW_CLIENT_PHI'),
  lawfirmController.createClientForm
);

module.exports = router;
