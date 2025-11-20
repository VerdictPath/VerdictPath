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

// Get activity statistics (requires analytics permission)
router.get('/statistics',
  requirePermission('canViewAnalytics'),
  activityLogController.getActivityStatistics
);

// Get activity summary for dashboard (requires analytics permission)
router.get('/summary',
  requirePermission('canViewAnalytics'),
  activityLogController.getActivitySummary
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

// Get user activity timeline (requires analytics permission)
router.get('/user/:userId/timeline',
  requirePermission('canViewAnalytics'),
  activityLogController.getUserActivityTimeline
);

module.exports = router;
