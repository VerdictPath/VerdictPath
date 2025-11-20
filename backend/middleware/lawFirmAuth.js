const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET } = require('./auth');
const activityLogger = require('../services/activityLogger');

/**
 * Verify law firm user token and load user data
 * Use this for routes that specifically require law firm user authentication
 */
exports.verifyLawFirmUser = async (req, res, next) => {
  try {
    // Support both Authorization header and cookie-based authentication
    // Check for Bearer token in header, then signed cookies, then regular cookies
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1] || req.signedCookies?.token || req.cookies?.token;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No authentication token provided',
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if it's a law firm user
    if (decoded.userType !== 'lawfirm' || !decoded.isLawFirmUser) {
      return res.status(403).json({
        success: false,
        message: 'Invalid user type - law firm user credentials required',
      });
    }

    // SECURITY FIX: Bootstrap scenario validation
    // If this is a bootstrap token (lawFirmUserId === -1), verify no users exist
    if (decoded.lawFirmUserId === -1) {
      const userCount = await db.query(
        'SELECT COUNT(*) as count FROM law_firm_users WHERE law_firm_id = $1',
        [decoded.id]
      );
      
      if (parseInt(userCount.rows[0].count) > 0) {
        console.error(`⚠️  SECURITY: Bootstrap token used but ${userCount.rows[0].count} users exist for law firm ${decoded.id}`);
        return res.status(403).json({
          success: false,
          message: 'Bootstrap scenario no longer valid. Users already exist. Please login with your user credentials.',
        });
      }
    }

    // Fetch user details with law firm info
    const result = await db.query(
      `SELECT lfu.id, lfu.law_firm_id, lfu.first_name, lfu.last_name, lfu.email, 
              lfu.role, lfu.status, lfu.user_code,
              lfu.can_manage_users, lfu.can_manage_clients, lfu.can_view_all_clients,
              lfu.can_send_notifications, lfu.can_manage_disbursements, 
              lfu.can_view_analytics, lfu.can_manage_settings,
              lf.firm_code, lf.firm_name, lf.is_active as firm_is_active,
              lf.subscription_tier, lf.enable_activity_tracking
       FROM law_firm_users lfu
       JOIN law_firms lf ON lfu.law_firm_id = lf.id
       WHERE lfu.id = $1`,
      [decoded.lawFirmUserId]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    const user = result.rows[0];

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: `User account is ${user.status}. Please contact your administrator.`,
      });
    }

    // Check if law firm is active
    if (!user.firm_is_active) {
      return res.status(403).json({
        success: false,
        message: 'Law firm account is not active',
      });
    }

    // Attach user and law firm info to request
    req.user = {
      id: user.law_firm_id,
      lawFirmUserId: user.id,
      email: user.email,
      userType: 'lawfirm',
      firmCode: user.firm_code,
      lawFirmUserRole: user.role,
      isLawFirmUser: true,
      firstName: user.first_name,
      lastName: user.last_name,
      userCode: user.user_code,
      subscriptionTier: user.subscription_tier,
      enableActivityTracking: user.enable_activity_tracking,
      permissions: {
        canManageUsers: user.can_manage_users,
        canManageClients: user.can_manage_clients,
        canViewAllClients: user.can_view_all_clients,
        canSendNotifications: user.can_send_notifications,
        canManageDisbursements: user.can_manage_disbursements,
        canViewAnalytics: user.can_view_analytics,
        canManageSettings: user.can_manage_settings
      }
    };
    
    req.lawFirmId = user.law_firm_id;
    
    // Update last activity
    await db.query(
      'UPDATE law_firm_users SET last_activity = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );
    
    next();
  } catch (error) {
    console.error('[LawFirmAuth] Verification error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};

/**
 * Check if user has specific permission
 * Use after verifyLawFirmUser to enforce granular permissions
 * 
 * @param {string} permissionKey - Permission to check (e.g., 'canManageUsers')
 */
exports.requirePermission = (permissionKey) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Admins have all permissions
    if (req.user.lawFirmUserRole === 'admin') {
      return next();
    }

    // Check specific permission
    if (!req.user.permissions || !req.user.permissions[permissionKey]) {
      // Log failed permission check as activity
      if (req.user.enableActivityTracking) {
        activityLogger.log({
          lawFirmId: req.user.id,
          userId: req.user.lawFirmUserId,
          userEmail: req.user.email,
          userName: `${req.user.firstName} ${req.user.lastName}`,
          action: 'permission_denied',
          actionCategory: 'security',
          metadata: { 
            requiredPermission: permissionKey,
            route: req.path 
          },
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('user-agent'),
          status: 'failed'
        }).catch(err => console.error('Activity log error:', err));
      }

      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        requiredPermission: permissionKey,
      });
    }

    next();
  };
};

/**
 * Require admin role
 * Use after verifyLawFirmUser to restrict access to admins only
 */
exports.requireAdmin = (req, res, next) => {
  if (!req.user || req.user.lawFirmUserRole !== 'admin') {
    // Log failed admin check as activity
    if (req.user && req.user.enableActivityTracking) {
      activityLogger.log({
        lawFirmId: req.user.id,
        userId: req.user.lawFirmUserId,
        userEmail: req.user.email,
        userName: `${req.user.firstName} ${req.user.lastName}`,
        action: 'admin_access_denied',
        actionCategory: 'security',
        metadata: { route: req.path },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        status: 'failed'
      }).catch(err => console.error('Activity log error:', err));
    }

    return res.status(403).json({
      success: false,
      message: 'Admin access required',
    });
  }
  next();
};

/**
 * Require any of the specified roles
 * Use after verifyLawFirmUser to restrict access to specific roles
 * 
 * @param {...string} roles - Allowed roles (e.g., 'admin', 'attorney', 'staff')
 */
exports.requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.lawFirmUserRole)) {
      // Log failed role check as activity
      if (req.user && req.user.enableActivityTracking) {
        activityLogger.log({
          lawFirmId: req.user.id,
          userId: req.user.lawFirmUserId,
          userEmail: req.user.email,
          userName: `${req.user.firstName} ${req.user.lastName}`,
          action: 'role_access_denied',
          actionCategory: 'security',
          metadata: { 
            requiredRoles: roles,
            userRole: req.user.lawFirmUserRole,
            route: req.path 
          },
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('user-agent'),
          status: 'failed'
        }).catch(err => console.error('Activity log error:', err));
      }

      return res.status(403).json({
        success: false,
        message: 'Insufficient role privileges',
        requiredRoles: roles,
      });
    }
    next();
  };
};

/**
 * Combined middleware: Verify law firm user AND require specific permission
 * Convenience wrapper for common use case
 * 
 * @param {string} permissionKey - Permission to check
 */
exports.verifyAndRequirePermission = (permissionKey) => {
  return [
    exports.verifyLawFirmUser,
    exports.requirePermission(permissionKey)
  ];
};

/**
 * Combined middleware: Verify law firm user AND require admin
 * Convenience wrapper for admin-only routes
 */
exports.verifyAndRequireAdmin = [
  exports.verifyLawFirmUser,
  exports.requireAdmin
];

/**
 * Combined middleware: Verify law firm user AND require specific role(s)
 * Convenience wrapper for role-based routes
 * 
 * @param {...string} roles - Allowed roles
 */
exports.verifyAndRequireRole = (...roles) => {
  return [
    exports.verifyLawFirmUser,
    exports.requireRole(...roles)
  ];
};
