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

    // Check if user has permission to view analytics
    if (req.user.lawFirmUserId) {
      const permCheck = await require('../config/db').query(
        'SELECT can_view_analytics FROM law_firm_users WHERE id = $1',
        [req.user.lawFirmUserId]
      );
      
      if (permCheck.rows.length === 0 || !permCheck.rows[0].can_view_analytics) {
        return res.status(403).json({ message: 'You do not have permission to view activity logs' });
      }
    }

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

    // Check if user has permission to view analytics
    if (req.user.lawFirmUserId) {
      const permCheck = await require('../config/db').query(
        'SELECT can_view_analytics FROM law_firm_users WHERE id = $1',
        [req.user.lawFirmUserId]
      );
      
      if (permCheck.rows.length === 0 || !permCheck.rows[0].can_view_analytics) {
        return res.status(403).json({ message: 'You do not have permission to view statistics' });
      }
    }

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

    // Check if user has permission to view analytics
    if (req.user.lawFirmUserId) {
      const permCheck = await require('../config/db').query(
        'SELECT can_view_analytics FROM law_firm_users WHERE id = $1',
        [req.user.lawFirmUserId]
      );
      
      if (permCheck.rows.length === 0 || !permCheck.rows[0].can_view_analytics) {
        return res.status(403).json({ message: 'You do not have permission to view user activity' });
      }
    }

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

    // Check if user has permission to view analytics
    if (req.user.lawFirmUserId) {
      const permCheck = await require('../config/db').query(
        'SELECT can_view_analytics FROM law_firm_users WHERE id = $1',
        [req.user.lawFirmUserId]
      );
      
      if (permCheck.rows.length === 0 || !permCheck.rows[0].can_view_analytics) {
        return res.status(403).json({ message: 'You do not have permission to view failed activities' });
      }
    }

    const activities = await activityLogger.getFailedActivities(lawFirmId, {
      limit: parseInt(limit)
    });

    res.json({ activities });
  } catch (error) {
    console.error('Error fetching failed activities:', error);
    res.status(500).json({ message: 'Error fetching failed activities', error: error.message });
  }
};
