const auditLogger = require('../services/auditLogger');

/**
 * HIPAA Audit Middleware
 * Automatically logs all requests to endpoints that access PHI
 */

/**
 * Middleware to log PHI access
 * Attach this to routes that access medical records, billing, or other PHI
 */
const logPhiAccess = (action, entityType) => {
  return async (req, res, next) => {
    // Store original send function
    const originalSend = res.send;
    
    // Override send to log after response
    res.send = function(data) {
      // Determine if request was successful
      const success = res.statusCode >= 200 && res.statusCode < 300;
      
      // Log the PHI access
      auditLogger.logPhiAccess({
        userId: req.user?.id || 0,
        userType: req.user?.userType || 'unknown',
        action: action,
        patientId: req.params.clientId || req.params.userId || req.params.patientId,
        recordType: entityType,
        recordId: req.params.id || req.params.recordId,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        success: success
      }).catch(err => {
      });
      
      // Call original send
      originalSend.call(this, data);
    };
    
    next();
  };
};

/**
 * Middleware to log authentication events
 */
const logAuthEvent = async (req, res, next) => {
  const originalJson = res.json;
  
  res.json = async function(data) {
    const success = res.statusCode >= 200 && res.statusCode < 300;
    const action = req.path.includes('login') ? 'LOGIN' : 
                   req.path.includes('register') ? 'ACCOUNT_CREATED' :
                   req.path.includes('logout') ? 'LOGOUT' : 'AUTH_EVENT';
    
    await auditLogger.logAuth({
      userId: data.user?.id || null,
      email: req.body.email,
      action: action,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      success: success,
      failureReason: success ? null : data.message
    }).catch(err => {
    });
    
    originalJson.call(this, data);
  };
  
  next();
};

/**
 * Middleware to log failed authentication attempts
 */
const logFailedAuth = async (req, res, next) => {
  await auditLogger.logAuth({
    userId: null,
    email: req.body.email,
    action: 'LOGIN_FAILED',
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    success: false,
    failureReason: 'Invalid credentials'
  });
  
  next();
};

/**
 * Generic audit logging middleware
 * Logs any action with custom parameters
 */
const logAction = (action, getEntityInfo) => {
  return async (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      const success = res.statusCode >= 200 && res.statusCode < 300;
      const entityInfo = getEntityInfo ? getEntityInfo(req, res) : {};
      
      auditLogger.log({
        actorId: req.user?.id || 0,
        actorType: req.user?.userType || 'system',
        action: action,
        entityType: entityInfo.type || null,
        entityId: entityInfo.id || null,
        targetUserId: entityInfo.targetUserId || null,
        status: success ? 'SUCCESS' : 'FAILURE',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        metadata: {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          ...entityInfo.metadata
        }
      }).catch(err => {
      });
      
      originalSend.call(this, data);
    };
    
    next();
  };
};

module.exports = {
  logPhiAccess,
  logAuthEvent,
  logFailedAuth,
  logAction
};
