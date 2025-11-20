const activityLogger = require('../services/activityLogger');

/**
 * Get activity logs for a law firm
 */
exports.getActivityLogs = async (req, res) => {
  try {
    const lawFirmId = req.user.id;
    const {
      userId,
      actionCategory,
      action,
      startDate,
      endDate,
      limit = 100,
      offset = 0
    } = req.query;

    // Permission check handled by requirePermission middleware

    const logs = await activityLogger.getLogs(lawFirmId, {
      userId: userId ? parseInt(userId) : null,
      actionCategory,
      action,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({ logs, total: logs.length });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ message: 'Error fetching activity logs', error: error.message });
  }
};

/**
 * Get activity statistics for a law firm
 */
exports.getActivityStatistics = async (req, res) => {
  try {
    const lawFirmId = req.user.id;
    const { startDate, endDate } = req.query;

    // Permission check handled by requirePermission middleware

    const statistics = await activityLogger.getStatistics(lawFirmId, {
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null
    });

    res.json({ statistics });
  } catch (error) {
    console.error('Error fetching activity statistics:', error);
    res.status(500).json({ message: 'Error fetching statistics', error: error.message });
  }
};

/**
 * Get most active users
 */
exports.getMostActiveUsers = async (req, res) => {
  try {
    const lawFirmId = req.user.id;
    const { startDate, endDate, limit = 10 } = req.query;

    // Permission check handled by requirePermission middleware

    const users = await activityLogger.getMostActiveUsers(lawFirmId, {
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      limit: parseInt(limit)
    });

    res.json({ users });
  } catch (error) {
    console.error('Error fetching most active users:', error);
    res.status(500).json({ message: 'Error fetching user activity', error: error.message });
  }
};

/**
 * Get failed activities
 */
exports.getFailedActivities = async (req, res) => {
  try {
    const lawFirmId = req.user.id;
    const { limit = 50 } = req.query;

    // Permission check handled by requirePermission middleware

    const activities = await activityLogger.getFailedActivities(lawFirmId, {
      limit: parseInt(limit)
    });

    res.json({ activities });
  } catch (error) {
    console.error('Error fetching failed activities:', error);
    res.json({ message: 'Error fetching failed activities', error: error.message });
  }
};

/**
 * Get activity summary (combines statistics, top users, and recent activities)
 * For frontend dashboard consumption
 */
exports.getActivitySummary = async (req, res) => {
  try {
    const lawFirmId = req.user.id;
    const { startDate, endDate } = req.query;

    // Permission check handled by requirePermission middleware

    const options = {
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null
    };

    // Get all data in parallel
    const [statistics, topUsers, recentLogs] = await Promise.all([
      activityLogger.getStatistics(lawFirmId, options),
      activityLogger.getMostActiveUsers(lawFirmId, { ...options, limit: 10 }),
      activityLogger.getLogs(lawFirmId, { ...options, limit: 20, offset: 0 })
    ]);

    // Calculate total activities
    const totalActivities = statistics.reduce((sum, cat) => sum + parseInt(cat.count), 0);

    // Format response for frontend
    const summary = {
      totalActivities,
      activitiesByCategory: statistics.map(stat => ({
        _id: stat.action_category,  // Keep _id for frontend compatibility
        count: parseInt(stat.count),
        uniqueUsers: parseInt(stat.unique_users)
      })),
      topUsers: topUsers.map(user => ({
        _id: user.user_id,  // Keep _id for frontend compatibility
        userId: user.user_id,
        userName: user.user_name,
        userEmail: user.user_email,
        count: parseInt(user.activity_count),
        lastActivity: user.last_activity
      })),
      recentActivities: recentLogs.map(log => ({
        _id: log.id,  // Keep _id for frontend compatibility
        id: log.id,
        userName: log.user_name,
        userEmail: log.user_email,
        action: log.action,
        actionCategory: log.action_category,
        targetName: log.target_name,
        timestamp: log.timestamp,
        status: log.status
      }))
    };

    res.json({ summary });
  } catch (error) {
    console.error('Error fetching activity summary:', error);
    res.status(500).json({ message: 'Error fetching activity summary', error: error.message });
  }
};
