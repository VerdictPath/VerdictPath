const permissionService = require('../services/permissionService');
const auditLogger = require('../services/auditLogger');

/**
 * Middleware to require specific permission
 * Usage: router.get('/path', requirePermission('VIEW_CLIENT_PHI'), controller)
 */
const requirePermission = (permissionName) => {
  return async (req, res, next) => {
    try {
      // Get user from authenticated request
      const userId = req.user?.id;
      const userType = req.user?.userType;
      
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      // Check if user has the required permission
      const hasPermission = await permissionService.checkPermission(userId, permissionName);
      
      if (!hasPermission) {
        // Log permission denial
        await auditLogger.log({
          actorId: userId,
          actorType: userType,
          action: 'PERMISSION_DENIED',
          entityType: 'Permission',
          entityId: null,
          status: 'FAILURE',
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('user-agent'),
          metadata: {
            requiredPermission: permissionName,
            path: req.path,
            method: req.method
          }
        });
        
        return res.status(403).json({ 
          message: 'Insufficient permissions',
          required: permissionName
        });
      }
      
      // Check if this is a sensitive permission (enhanced logging)
      const isSensitive = await permissionService.isSensitivePermission(permissionName);
      
      if (isSensitive) {
        // Log access to sensitive permission
        await auditLogger.log({
          actorId: userId,
          actorType: userType,
          action: 'SENSITIVE_PERMISSION_USED',
          entityType: 'Permission',
          entityId: null,
          status: 'SUCCESS',
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('user-agent'),
          metadata: {
            permission: permissionName,
            path: req.path,
            method: req.method
          }
        });
      }
      
      // Attach permission info to request for later use
      req.permission = {
        name: permissionName,
        isSensitive
      };
      
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ message: 'Error checking permissions' });
    }
  };
};

/**
 * Middleware to require ANY of the specified permissions
 * Usage: router.get('/path', requireAnyPermission(['PERM1', 'PERM2']), controller)
 */
const requireAnyPermission = (permissionNames) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const userType = req.user?.userType;
      
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const hasPermission = await permissionService.checkAnyPermission(userId, permissionNames);
      
      if (!hasPermission) {
        await auditLogger.log({
          actorId: userId,
          actorType: userType,
          action: 'PERMISSION_DENIED',
          entityType: 'Permission',
          entityId: null,
          status: 'FAILURE',
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('user-agent'),
          metadata: {
            requiredPermissions: permissionNames,
            path: req.path,
            method: req.method
          }
        });
        
        return res.status(403).json({ 
          message: 'Insufficient permissions',
          requiredAny: permissionNames
        });
      }
      
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ message: 'Error checking permissions' });
    }
  };
};

/**
 * Middleware to require ALL of the specified permissions
 * Usage: router.get('/path', requireAllPermissions(['PERM1', 'PERM2']), controller)
 */
const requireAllPermissions = (permissionNames) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      const userType = req.user?.userType;
      
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const hasPermissions = await permissionService.checkAllPermissions(userId, permissionNames);
      
      if (!hasPermissions) {
        await auditLogger.log({
          actorId: userId,
          actorType: userType,
          action: 'PERMISSION_DENIED',
          entityType: 'Permission',
          entityId: null,
          status: 'FAILURE',
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('user-agent'),
          metadata: {
            requiredPermissions: permissionNames,
            path: req.path,
            method: req.method
          }
        });
        
        return res.status(403).json({ 
          message: 'Insufficient permissions',
          requiredAll: permissionNames
        });
      }
      
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ message: 'Error checking permissions' });
    }
  };
};

/**
 * Middleware to attach user's permissions to request object
 * Useful for conditional rendering or complex permission logic
 */
const attachPermissions = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    
    if (userId) {
      req.userPermissions = await permissionService.getUserPermissions(userId);
      req.userRoles = await permissionService.getUserRoles(userId);
    }
    
    next();
  } catch (error) {
    console.error('Error attaching permissions:', error);
    next(); // Continue even if this fails
  }
};

module.exports = {
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  attachPermissions
};
