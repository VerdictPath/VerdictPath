const consentService = require('../services/consentService');
const auditLogger = require('../services/auditLogger');

/**
 * Middleware to require patient consent for PHI access
 * Usage: router.get('/clients/:clientId', auth, requireConsent(), controller)
 */
const requireConsent = (options = {}) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const userType = req.user?.userType;
      
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      // Determine patient ID from request
      const patientId = options.patientIdParam 
        ? req.params[options.patientIdParam] || req.body[options.patientIdParam]
        : req.params.clientId || req.params.patientId || req.body.clientId || req.body.patientId;
      
      if (!patientId) {
        return res.status(400).json({ message: 'Patient/Client ID required' });
      }
      
      // If user is accessing their own data, no consent check needed
      if (parseInt(patientId) === parseInt(userId)) {
        return next();
      }
      
      // Determine granted_to_type and granted_to_id based on user type
      let grantedToType, grantedToId;
      
      if (userType === 'lawfirm') {
        grantedToType = 'lawfirm';
        grantedToId = userId;
      } else if (userType === 'medical_provider') {
        grantedToType = 'medical_provider';
        grantedToId = userId;
      } else {
        // If not law firm or provider, deny access
        await auditLogger.log({
          actorId: userId,
          actorType: userType,
          action: 'CONSENT_CHECK_FAILED',
          targetUserId: parseInt(patientId),
          status: 'FAILURE',
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('user-agent'),
          metadata: {
            reason: 'Invalid user type for consent check',
            path: req.path
          }
        });
        
        return res.status(403).json({ message: 'Access denied' });
      }
      
      // Determine data type from options or request
      const dataType = options.dataType || req.body.dataType || null;
      
      // Check if valid consent exists
      const hasConsent = await consentService.checkConsent({
        patientId: parseInt(patientId),
        grantedToType,
        grantedToId,
        dataType
      });
      
      if (!hasConsent) {
        // Log consent denial
        await auditLogger.log({
          actorId: userId,
          actorType: userType,
          action: 'CONSENT_DENIED',
          entityType: 'ConsentRecord',
          targetUserId: parseInt(patientId),
          status: 'FAILURE',
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('user-agent'),
          metadata: {
            patientId,
            grantedToType,
            grantedToId,
            dataType,
            path: req.path,
            method: req.method
          }
        });
        
        return res.status(403).json({ 
          message: 'No valid consent found for accessing this patient data',
          requiresConsent: true,
          patientId,
          dataType
        });
      }
      
      // Log consent-based PHI access
      await auditLogger.logPhiAccess({
        userId,
        userType,
        action: 'PHI_ACCESS_WITH_CONSENT',
        patientId: parseInt(patientId),
        recordType: dataType || 'PHI',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        success: true,
        metadata: {
          consentVerified: true,
          grantedToType,
          grantedToId
        }
      });
      
      // Attach consent info to request
      req.consent = {
        verified: true,
        patientId: parseInt(patientId),
        grantedToType,
        grantedToId,
        dataType
      };
      
      next();
    } catch (error) {
      console.error('Consent check error:', error);
      res.status(500).json({ message: 'Error checking consent' });
    }
  };
};

/**
 * Middleware to check if consent exists (doesn't block, just attaches info)
 * Useful for optional consent checks or informational purposes
 */
const checkConsent = (options = {}) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const userType = req.user?.userType;
      
      const patientId = options.patientIdParam 
        ? req.params[options.patientIdParam] || req.body[options.patientIdParam]
        : req.params.clientId || req.params.patientId;
      
      if (!patientId || parseInt(patientId) === parseInt(userId)) {
        req.consent = { verified: true, selfAccess: true };
        return next();
      }
      
      let grantedToType, grantedToId;
      
      if (userType === 'lawfirm') {
        grantedToType = 'lawfirm';
        grantedToId = userId;
      } else if (userType === 'medical_provider') {
        grantedToType = 'medical_provider';
        grantedToId = userId;
      } else {
        req.consent = { verified: false };
        return next();
      }
      
      const dataType = options.dataType || null;
      
      const hasConsent = await consentService.checkConsent({
        patientId: parseInt(patientId),
        grantedToType,
        grantedToId,
        dataType
      });
      
      req.consent = {
        verified: hasConsent,
        patientId: parseInt(patientId),
        grantedToType,
        grantedToId,
        dataType
      };
      
      next();
    } catch (error) {
      console.error('Consent check error:', error);
      req.consent = { verified: false, error: true };
      next();
    }
  };
};

/**
 * Middleware to attach patient's consent records to request
 * Useful for displaying consent status to users
 */
const attachConsents = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const userType = req.user?.userType;
    
    if (!userId) {
      return next();
    }
    
    if (userType === 'client') {
      // For clients, attach their granted consents
      req.consents = await consentService.getPatientConsents(userId, 'active');
    } else if (userType === 'lawfirm') {
      // For law firms, attach consents granted to them
      req.consents = await consentService.getGrantedConsents('lawfirm', userId, 'active');
    } else if (userType === 'medical_provider') {
      // For providers, attach consents granted to them
      req.consents = await consentService.getGrantedConsents('medical_provider', userId, 'active');
    }
    
    next();
  } catch (error) {
    console.error('Error attaching consents:', error);
    next(); // Continue even if this fails
  }
};

module.exports = {
  requireConsent,
  checkConsent,
  attachConsents
};
