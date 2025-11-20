# Law Firm Authentication Middleware - Usage Examples

This middleware provides comprehensive authentication and permission checking for law firm users.

## Middleware Functions

### 1. `verifyLawFirmUser`
Verifies JWT token, loads user data, and checks account status.

**Features:**
- Validates JWT token
- Loads full user and law firm details
- Checks user and firm active status
- Updates last activity timestamp
- Attaches user data to `req.user` and `req.lawFirmId`

### 2. `requirePermission(permissionKey)`
Checks if user has specific permission. Admins automatically pass all checks.

**Available Permissions:**
- `canManageUsers` - Create, update, deactivate users
- `canManageClients` - Manage client accounts
- `canViewAllClients` - View all firm's clients
- `canSendNotifications` - Send notifications to clients
- `canManageDisbursements` - Manage settlement disbursements
- `canViewAnalytics` - View analytics and activity logs
- `canManageSettings` - Manage firm settings

### 3. `requireAdmin`
Restricts access to admin users only.

### 4. `requireRole(...roles)`
Restricts access to specific roles (admin, attorney, staff).

### 5. Convenience Wrappers
- `verifyAndRequirePermission(permissionKey)` - Verify + Permission check
- `verifyAndRequireAdmin` - Verify + Admin check
- `verifyAndRequireRole(...roles)` - Verify + Role check

## Usage Examples

### Example 1: Basic Law Firm User Authentication
```javascript
const { verifyLawFirmUser } = require('../middleware/lawFirmAuth');

router.get('/profile', verifyLawFirmUser, async (req, res) => {
  // req.user contains full user data
  // req.lawFirmId contains law firm ID
  res.json({
    user: {
      name: `${req.user.firstName} ${req.user.lastName}`,
      email: req.user.email,
      role: req.user.lawFirmUserRole,
      permissions: req.user.permissions
    }
  });
});
```

### Example 2: Permission-Based Access Control
```javascript
const { verifyLawFirmUser, requirePermission } = require('../middleware/lawFirmAuth');

// Only users with canManageClients permission can access this route
router.post('/clients', 
  verifyLawFirmUser,
  requirePermission('canManageClients'),
  async (req, res) => {
    // Create client logic
  }
);

// Only users with canViewAnalytics permission
router.get('/analytics',
  verifyLawFirmUser,
  requirePermission('canViewAnalytics'),
  async (req, res) => {
    // Analytics logic
  }
);
```

### Example 3: Admin-Only Routes
```javascript
const { verifyLawFirmUser, requireAdmin } = require('../middleware/lawFirmAuth');

// Only admin users can access
router.post('/settings/subscription',
  verifyLawFirmUser,
  requireAdmin,
  async (req, res) => {
    // Subscription management logic
  }
);
```

### Example 4: Role-Based Access
```javascript
const { verifyLawFirmUser, requireRole } = require('../middleware/lawFirmAuth');

// Only admins and attorneys can access
router.get('/cases/:id/details',
  verifyLawFirmUser,
  requireRole('admin', 'attorney'),
  async (req, res) => {
    // Case details logic
  }
);
```

### Example 5: Using Convenience Wrappers
```javascript
const { 
  verifyAndRequirePermission,
  verifyAndRequireAdmin,
  verifyAndRequireRole 
} = require('../middleware/lawFirmAuth');

// Compact syntax - verify and check permission in one line
router.delete('/users/:id', 
  ...verifyAndRequirePermission('canManageUsers'),
  async (req, res) => {
    // Delete user logic
  }
);

// Admin-only route
router.post('/firm/settings',
  ...verifyAndRequireAdmin,
  async (req, res) => {
    // Settings logic
  }
);

// Role-based route
router.get('/billing',
  ...verifyAndRequireRole('admin', 'attorney'),
  async (req, res) => {
    // Billing logic
  }
);
```

### Example 6: Accessing User Data in Controllers
```javascript
router.get('/my-tasks', verifyLawFirmUser, async (req, res) => {
  const lawFirmId = req.lawFirmId; // Law firm ID
  const userId = req.user.lawFirmUserId; // User ID
  const userEmail = req.user.email;
  const userName = `${req.user.firstName} ${req.user.lastName}`;
  const role = req.user.lawFirmUserRole; // admin, attorney, or staff
  const permissions = req.user.permissions; // Object with all permissions

  // Use in queries
  const tasks = await db.query(
    'SELECT * FROM tasks WHERE law_firm_id = $1 AND assigned_to = $2',
    [lawFirmId, userId]
  );

  res.json({ tasks });
});
```

### Example 7: Multiple Permission Checks
```javascript
// Custom middleware for complex permission logic
const requireMultiplePermissions = (...permissionKeys) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Admins always pass
    if (req.user.lawFirmUserRole === 'admin') {
      return next();
    }

    // Check all permissions
    const hasAll = permissionKeys.every(key => req.user.permissions[key]);
    
    if (!hasAll) {
      return res.status(403).json({ 
        message: 'Insufficient permissions',
        requiredPermissions: permissionKeys 
      });
    }

    next();
  };
};

// Usage: Require BOTH permissions
router.post('/advanced-action',
  verifyLawFirmUser,
  requireMultiplePermissions('canManageClients', 'canSendNotifications'),
  async (req, res) => {
    // Action logic
  }
);
```

## Activity Logging

Failed permission/role/admin checks are automatically logged as failed activities when `enable_activity_tracking` is enabled:

```javascript
// Automatically logs when permission denied:
{
  action: 'permission_denied',
  actionCategory: 'security',
  metadata: {
    requiredPermission: 'canManageUsers',
    route: '/api/lawfirm/users'
  },
  status: 'failed'
}
```

## Migration from Old Pattern

### Before (inline permission checks):
```javascript
router.post('/users', authenticateToken, isLawFirm, async (req, res) => {
  // Manual permission check
  const result = await db.query(
    'SELECT can_manage_users FROM law_firm_users WHERE id = $1',
    [req.user.lawFirmUserId]
  );
  
  if (!result.rows[0].can_manage_users) {
    return res.status(403).json({ message: 'Permission denied' });
  }
  
  // Logic here
});
```

### After (using new middleware):
```javascript
router.post('/users', 
  ...verifyAndRequirePermission('canManageUsers'),
  async (req, res) => {
    // Logic here - permission already checked!
  }
);
```

## Best Practices

1. **Always use verifyLawFirmUser first** - It loads user data and validates the token
2. **Chain middleware** - Use multiple middleware functions for complex checks
3. **Leverage convenience wrappers** - Use spread operator `...verifyAndRequirePermission()`
4. **Admin shortcuts** - Admins automatically pass all permission checks
5. **Activity logging** - Failed checks are automatically logged for security auditing

## Error Responses

All middleware functions return consistent error responses:

```javascript
// No token
{ success: false, message: 'No authentication token provided' }

// Invalid token
{ success: false, message: 'Invalid or expired token' }

// Wrong user type
{ success: false, message: 'Invalid user type - law firm user credentials required' }

// Inactive user
{ success: false, message: 'User account is suspended. Please contact your administrator.' }

// Inactive firm
{ success: false, message: 'Law firm account is not active' }

// No permission
{ success: false, message: 'Insufficient permissions', requiredPermission: 'canManageUsers' }

// Not admin
{ success: false, message: 'Admin access required' }

// Wrong role
{ success: false, message: 'Insufficient role privileges', requiredRoles: ['admin', 'attorney'] }
```
