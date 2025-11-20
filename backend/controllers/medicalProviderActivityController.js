const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Get activity summary
exports.getActivitySummary = async (req, res) => {
  try {
    const medicalProviderId = req.medicalProviderId;
    const { startDate, endDate, action, category } = req.query;

    // Build filters
    let filters = ['medical_provider_id = $1'];
    const params = [medicalProviderId];
    let paramIndex = 2;

    if (startDate) {
      filters.push(`timestamp >= $${paramIndex++}`);
      params.push(new Date(startDate));
    }

    if (endDate) {
      filters.push(`timestamp <= $${paramIndex++}`);
      params.push(new Date(endDate));
    }

    if (action) {
      filters.push(`action = $${paramIndex++}`);
      params.push(action);
    }

    if (category) {
      filters.push(`action_category = $${paramIndex++}`);
      params.push(category);
    }

    const whereClause = filters.join(' AND ');

    // Get total count
    const totalResult = await pool.query(
      `SELECT COUNT(*) as total FROM medical_provider_activity_logs WHERE ${whereClause}`,
      params
    );

    // Get activity by category
    const categoryResult = await pool.query(`
      SELECT 
        action_category,
        COUNT(*) as count,
        COUNT(DISTINCT user_id) as unique_users
      FROM medical_provider_activity_logs
      WHERE ${whereClause}
      GROUP BY action_category
      ORDER BY count DESC
    `, params);

    // Get top users
    const topUsersResult = await pool.query(`
      SELECT 
        user_id,
        user_name,
        user_email,
        COUNT(*) as count
      FROM medical_provider_activity_logs
      WHERE ${whereClause} AND user_id IS NOT NULL
      GROUP BY user_id, user_name, user_email
      ORDER BY count DESC
      LIMIT 10
    `, params);

    // Get recent activities
    const recentResult = await pool.query(`
      SELECT 
        id,
        action,
        action_category,
        user_name,
        user_email,
        target_type,
        target_name,
        status,
        timestamp
      FROM medical_provider_activity_logs
      WHERE ${whereClause}
      ORDER BY timestamp DESC
      LIMIT 50
    `, params);

    // Get failed activities
    const failedResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM medical_provider_activity_logs
      WHERE ${whereClause} AND status = 'failed'
    `, params);

    res.json({
      success: true,
      summary: {
        totalActivities: parseInt(totalResult.rows[0].total),
        failedActivities: parseInt(failedResult.rows[0].count),
        activitiesByCategory: categoryResult.rows,
        topUsers: topUsersResult.rows,
        recentActivities: recentResult.rows
      }
    });
  } catch (error) {
    console.error('Activity summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve activity summary'
    });
  }
};

// Get activity logs with pagination
exports.getActivityLogs = async (req, res) => {
  try {
    const medicalProviderId = req.medicalProviderId;
    const { 
      page = 1, 
      limit = 50, 
      action, 
      category, 
      userId, 
      status,
      startDate,
      endDate
    } = req.query;

    // Build filters
    let filters = ['medical_provider_id = $1'];
    const params = [medicalProviderId];
    let paramIndex = 2;

    if (action) {
      filters.push(`action = $${paramIndex++}`);
      params.push(action);
    }

    if (category) {
      filters.push(`action_category = $${paramIndex++}`);
      params.push(category);
    }

    if (userId) {
      filters.push(`user_id = $${paramIndex++}`);
      params.push(userId);
    }

    if (status) {
      filters.push(`status = $${paramIndex++}`);
      params.push(status);
    }

    if (startDate) {
      filters.push(`timestamp >= $${paramIndex++}`);
      params.push(new Date(startDate));
    }

    if (endDate) {
      filters.push(`timestamp <= $${paramIndex++}`);
      params.push(new Date(endDate));
    }

    const whereClause = filters.join(' AND ');

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM medical_provider_activity_logs WHERE ${whereClause}`,
      params
    );

    // Get paginated logs
    const offset = (page - 1) * limit;
    const logsResult = await pool.query(`
      SELECT 
        id,
        action,
        action_category,
        user_id,
        user_name,
        user_email,
        target_type,
        target_id,
        target_name,
        metadata,
        ip_address,
        status,
        error_message,
        timestamp
      FROM medical_provider_activity_logs
      WHERE ${whereClause}
      ORDER BY timestamp DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limit, offset]);

    const totalCount = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      logs: logsResult.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get activity logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve activity logs'
    });
  }
};

// Get activity timeline for specific user
exports.getUserActivityTimeline = async (req, res) => {
  try {
    const { userId } = req.params;
    const medicalProviderId = req.medicalProviderId;
    const { page = 1, limit = 20 } = req.query;

    // Get user details
    const userResult = await pool.query(`
      SELECT 
        id,
        first_name,
        last_name,
        email,
        role,
        status
      FROM medical_provider_users
      WHERE id = $1 AND medical_provider_id = $2
    `, [userId, medicalProviderId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];

    // Get total count of activities
    const countResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM medical_provider_activity_logs
      WHERE medical_provider_id = $1 AND user_id = $2
    `, [medicalProviderId, userId]);

    // Get paginated activities
    const offset = (page - 1) * limit;
    const activitiesResult = await pool.query(`
      SELECT 
        id,
        action,
        action_category,
        target_type,
        target_name,
        metadata,
        ip_address,
        status,
        error_message,
        timestamp
      FROM medical_provider_activity_logs
      WHERE medical_provider_id = $1 AND user_id = $2
      ORDER BY timestamp DESC
      LIMIT $3 OFFSET $4
    `, [medicalProviderId, userId, limit, offset]);

    // Get activity summary by category
    const categoryResult = await pool.query(`
      SELECT 
        action_category,
        COUNT(*) as count
      FROM medical_provider_activity_logs
      WHERE medical_provider_id = $1 AND user_id = $2
      GROUP BY action_category
      ORDER BY count DESC
    `, [medicalProviderId, userId]);

    const totalCount = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      success: true,
      user: {
        id: user.id,
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        role: user.role,
        status: user.status
      },
      activities: activitiesResult.rows,
      activityByCategory: categoryResult.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get user timeline error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user timeline'
    });
  }
};

// Get activity statistics
exports.getActivityStatistics = async (req, res) => {
  try {
    const medicalProviderId = req.medicalProviderId;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Activity by day
    const dailyResult = await pool.query(`
      SELECT 
        DATE(timestamp) as date,
        COUNT(*) as count
      FROM medical_provider_activity_logs
      WHERE medical_provider_id = $1 AND timestamp >= $2
      GROUP BY DATE(timestamp)
      ORDER BY date DESC
    `, [medicalProviderId, startDate]);

    // Most common actions
    const actionsResult = await pool.query(`
      SELECT 
        action,
        action_category,
        COUNT(*) as count
      FROM medical_provider_activity_logs
      WHERE medical_provider_id = $1 AND timestamp >= $2
      GROUP BY action, action_category
      ORDER BY count DESC
      LIMIT 10
    `, [medicalProviderId, startDate]);

    // Most active users
    const usersResult = await pool.query(`
      SELECT 
        user_id,
        user_name,
        user_email,
        COUNT(*) as count
      FROM medical_provider_activity_logs
      WHERE medical_provider_id = $1 AND timestamp >= $2 AND user_id IS NOT NULL
      GROUP BY user_id, user_name, user_email
      ORDER BY count DESC
      LIMIT 5
    `, [medicalProviderId, startDate]);

    // Failed activities
    const failedResult = await pool.query(`
      SELECT 
        action,
        COUNT(*) as count
      FROM medical_provider_activity_logs
      WHERE medical_provider_id = $1 AND timestamp >= $2 AND status = 'failed'
      GROUP BY action
      ORDER BY count DESC
      LIMIT 5
    `, [medicalProviderId, startDate]);

    res.json({
      success: true,
      statistics: {
        dailyActivity: dailyResult.rows,
        topActions: actionsResult.rows,
        mostActiveUsers: usersResult.rows,
        failedActivities: failedResult.rows,
        period: `${days} days`
      }
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve statistics'
    });
  }
};
