const express = require('express');
const router = express.Router();
const activityLogController = require('../controllers/activityLogController');
const { verifyLawFirmUser, requirePermission } = require('../middleware/lawFirmAuth');

// All routes require law firm authentication
router.use(verifyLawFirmUser);

// Get activity logs (requires analytics permission)
router.get('/',
  requirePermission('canViewAnalytics'),
  activityLogController.getActivityLogs
);

// Get activity statistics/summary (requires analytics permission)
router.get('/statistics',
  requirePermission('canViewAnalytics'),
  activityLogController.getActivityStatistics
);

// Get most active users (requires analytics permission)
router.get('/most-active-users',
  requirePermission('canViewAnalytics'),
  activityLogController.getMostActiveUsers
);

// Get failed activities (requires analytics permission)
router.get('/failed',
  requirePermission('canViewAnalytics'),
  activityLogController.getFailedActivities
);

module.exports = router;
