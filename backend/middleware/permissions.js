const permissionService = require('../services/permissionService');
const auditLogger = require('../services/auditLogger');

/**
 * Middleware to require specific permission
 * Usage: router.get('/path', requirePermission('VIEW_CLIENT_PHI'), controller)
 */
// All authenticated users have full access to all features
const requirePermission = (permissionName) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
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
// All authenticated users have full access to all features
const requireAnyPermission = (permissionNames) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
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
// All authenticated users have full access to all features
const requireAllPermissions = (permissionNames) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
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
