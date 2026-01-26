const consentService = require('../services/consentService');
const auditLogger = require('../services/auditLogger');

/**
 * Patient grants consent to a law firm or medical provider
 */
exports.grantConsent = async (req, res) => {
  try {
    const patientId = req.user.id;
    const {
      grantedToType, // 'lawfirm' or 'medical_provider'
      grantedToId,
      consentType = 'FULL_ACCESS', // FULL_ACCESS, MEDICAL_RECORDS_ONLY, BILLING_ONLY, CUSTOM
      expiresInDays = 365, // Default 1 year
      customDataTypes = null, // For CUSTOM consent
      consentMethod = 'electronic',
      signatureData = null
    } = req.body;
    
    if (!grantedToType || !grantedToId) {
      return res.status(400).json({ 
        message: 'grantedToType and grantedToId are required' 
      });
    }
    
    // Validate grantedToType
    if (!['lawfirm', 'medical_provider'].includes(grantedToType)) {
      return res.status(400).json({ 
        message: 'grantedToType must be either "lawfirm" or "medical_provider"' 
      });
    }
    
    // Calculate expiration date
    const expiresAt = expiresInDays 
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;
    
    // Grant consent
    const consent = await consentService.grantConsent({
      patientId,
      grantedToType,
      grantedToId,
      consentType,
      expiresAt,
      consentMethod,
      ipAddress: req.ip || req.connection.remoteAddress,
      signatureData,
      customDataTypes
    });
    
    // Log consent grant
    await auditLogger.log({
      actorId: patientId,
      actorType: 'client',
      action: 'CONSENT_GRANTED',
      entityType: 'ConsentRecord',
      entityId: consent.id,
      status: 'SUCCESS',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      metadata: {
        grantedToType,
        grantedToId,
        consentType,
        expiresAt
      }
    });
    
    res.json({
      message: 'Consent granted successfully',
      consent
    });
  } catch (error) {
    console.error('Error granting consent:', error);
    res.status(500).json({ message: 'Error granting consent', error: error.message });
  }
};

/**
 * Patient revokes consent
 */
exports.revokeConsent = async (req, res) => {
  try {
    const patientId = req.user.id;
    const { id: consentId } = req.params;
    const { reason } = req.body;
    
    // Get consent to verify ownership
    const consentDetails = await consentService.getConsentDetails(consentId);
    
    if (!consentDetails) {
      return res.status(404).json({ message: 'Consent not found' });
    }
    
    if (consentDetails.patient_id !== patientId) {
      return res.status(403).json({ message: 'You can only revoke your own consents' });
    }
    
    // Revoke consent
    const revokedConsent = await consentService.revokeConsent(consentId, reason);
    
    // Log consent revocation
    await auditLogger.log({
      actorId: patientId,
      actorType: 'client',
      action: 'CONSENT_REVOKED',
      entityType: 'ConsentRecord',
      entityId: consentId,
      status: 'SUCCESS',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      metadata: {
        grantedToType: consentDetails.granted_to_type,
        grantedToId: consentDetails.granted_to_id,
        reason
      }
    });
    
    res.json({
      message: 'Consent revoked successfully',
      consent: revokedConsent
    });
  } catch (error) {
    console.error('Error revoking consent:', error);
    res.status(500).json({ message: 'Error revoking consent', error: error.message });
  }
};

/**
 * Get all consents for the current patient
 */
exports.getMyConsents = async (req, res) => {
  try {
    const patientId = req.user.id;
    const { status } = req.query;
    
    const consents = await consentService.getPatientConsents(
      patientId,
      status || null
    );
    
    res.json({
      total: consents.length,
      consents
    });
  } catch (error) {
    console.error('Error getting patient consents:', error);
    res.status(500).json({ message: 'Error retrieving consents', error: error.message });
  }
};

/**
 * Get consent details
 */
exports.getConsentDetails = async (req, res) => {
  try {
    const patientId = req.user.id;
    const { id: consentId } = req.params;
    
    const consent = await consentService.getConsentDetails(consentId);
    
    if (!consent) {
      return res.status(404).json({ message: 'Consent not found' });
    }
    
    if (consent.patient_id !== patientId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    res.json({ consent });
  } catch (error) {
    console.error('Error getting consent details:', error);
    res.status(500).json({ message: 'Error retrieving consent', error: error.message });
  }
};

/**
 * Law firm or provider checks if they have consent for a patient
 */
exports.checkConsentStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.userType;
    const { patientId } = req.params;
    const { dataType } = req.query;
    
    let grantedToType, grantedToId;
    
    if (userType === 'lawfirm') {
      grantedToType = 'lawfirm';
      grantedToId = userId;
    } else if (userType === 'medical_provider') {
      grantedToType = 'medical_provider';
      grantedToId = userId;
    } else {
      return res.status(403).json({ message: 'Only law firms and medical providers can check consent status' });
    }
    
    const hasConsent = await consentService.checkConsent({
      patientId: parseInt(patientId),
      grantedToType,
      grantedToId,
      dataType: dataType || null
    });
    
    res.json({
      hasConsent,
      patientId,
      dataType: dataType || 'all',
      grantedToType,
      grantedToId
    });
  } catch (error) {
    console.error('Error checking consent status:', error);
    res.status(500).json({ message: 'Error checking consent', error: error.message });
  }
};

/**
 * Law firm or provider gets all consents granted to them
 */
exports.getGrantedConsents = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.userType;
    const { status } = req.query;
    
    let grantedToType, grantedToId;
    
    if (userType === 'lawfirm') {
      grantedToType = 'lawfirm';
      grantedToId = userId;
    } else if (userType === 'medical_provider') {
      grantedToType = 'medical_provider';
      grantedToId = userId;
    } else {
      return res.status(403).json({ message: 'Only law firms and medical providers can view granted consents' });
    }
    
    const consents = await consentService.getGrantedConsents(
      grantedToType,
      grantedToId,
      status || 'active'
    );
    
    res.json({
      total: consents.length,
      consents
    });
  } catch (error) {
    console.error('Error getting granted consents:', error);
    res.status(500).json({ message: 'Error retrieving consents', error: error.message });
  }
};

/**
 * Create auto-consent when client registers with firm code
 * (Called internally from authController)
 */
exports.autoGrantConsentToFirm = async (clientId, firmId) => {
  try {
    // Default: 1 year, full access
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    
    const consent = await consentService.grantConsent({
      patientId: clientId,
      grantedToType: 'lawfirm',
      grantedToId: firmId,
      consentType: 'FULL_ACCESS',
      expiresAt,
      consentMethod: 'automatic',
      signatureData: 'Auto-granted during registration with firm code'
    });
    
    // Log auto-consent
    await auditLogger.log({
      actorId: clientId,
      actorType: 'client',
      action: 'CONSENT_AUTO_GRANTED',
      entityType: 'ConsentRecord',
      entityId: consent.id,
      status: 'SUCCESS',
      metadata: {
        grantedToType: 'lawfirm',
        grantedToId: firmId,
        reason: 'Auto-granted during registration'
      }
    });
    
    return consent;
  } catch (error) {
    console.error('Error auto-granting consent:', error);
    throw error;
  }
};
