const express = require('express');
const router = express.Router();
const activityLogController = require('../controllers/activityLogController');
const { authenticateToken, isLawFirm } = require('../middleware/auth');

// All routes require law firm authentication
router.use(authenticateToken);
router.use(isLawFirm);

// Get activity logs
router.get('/', activityLogController.getActivityLogs);

// Get activity statistics
router.get('/statistics', activityLogController.getActivityStatistics);

// Get most active users
router.get('/most-active-users', activityLogController.getMostActiveUsers);

// Get failed activities
router.get('/failed', activityLogController.getFailedActivities);

module.exports = router;
