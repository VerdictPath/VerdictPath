const express = require('express');
const router = express.Router();
const consentController = require('../controllers/consentController');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

/**
 * Consent Management Routes
 * 
 * Patient/Client Routes:
 * - POST /api/consent/grant - Grant consent to law firm/provider
 * - POST /api/consent/revoke/:id - Revoke consent
 * - GET /api/consent/my-consents - View all consents
 * - GET /api/consent/:id - View specific consent details
 * 
 * Law Firm/Provider Routes:
 * - GET /api/consent/granted - View consents granted to me
 * - GET /api/consent/status/:patientId - Check if consent exists for patient
 */

// Patient/Client routes - require MANAGE_CONSENT permission
router.post('/grant',
  authenticateToken,
  requirePermission('MANAGE_CONSENT'),
  consentController.grantConsent
);

router.post('/revoke/:id',
  authenticateToken,
  requirePermission('MANAGE_CONSENT'),
  consentController.revokeConsent
);

router.get('/my-consents',
  authenticateToken,
  requirePermission('MANAGE_CONSENT'),
  consentController.getMyConsents
);

router.get('/:id',
  authenticateToken,
  requirePermission('MANAGE_CONSENT'),
  consentController.getConsentDetails
);

// Law firm/Provider routes - require VIEW_CLIENT_PHI or VIEW_PATIENT_PHI
router.get('/granted',
  authenticateToken,
  consentController.getGrantedConsents
);

router.get('/status/:patientId',
  authenticateToken,
  consentController.checkConsentStatus
);

module.exports = router;
