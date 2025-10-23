const express = require('express');
const router = express.Router();
const medicalproviderController = require('../controllers/medicalproviderController');
const { authenticateToken, isMedicalProvider } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const { requireConsent } = require('../middleware/consent');

// HIPAA Phase 2: All routes enforce RBAC permissions and patient consent

// Dashboard - requires VIEW_CLIENT_PHI permission (lists patients)
router.get('/dashboard',
  authenticateToken,
  isMedicalProvider,
  requirePermission('VIEW_CLIENT_PHI'),
  medicalproviderController.getDashboard
);

// Patient details - requires VIEW_CLIENT_PHI permission AND patient consent
router.get('/patient/:patientId',
  authenticateToken,
  isMedicalProvider,
  requirePermission('VIEW_CLIENT_PHI'),
  requireConsent({ patientIdParam: 'patientId', dataType: 'medical_records' }),
  medicalproviderController.getPatientDetails
);

module.exports = router;
