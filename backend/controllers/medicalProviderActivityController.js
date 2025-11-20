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

// HIPAA Compliance Report (Admin Only)
exports.getHIPAAComplianceReport = async (req, res) => {
  try {
    const medicalProviderId = req.medicalProviderId;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Overall compliance metrics
    const overallResult = await pool.query(`
      SELECT 
        COUNT(*) as total_activities,
        COUNT(CASE WHEN hipaa_compliant = true THEN 1 END) as compliant_activities,
        COUNT(CASE WHEN hipaa_compliant = false THEN 1 END) as non_compliant_activities,
        COUNT(CASE WHEN audit_required = true THEN 1 END) as audit_required_count,
        COUNT(CASE WHEN sensitivity_level = 'critical' THEN 1 END) as critical_activities,
        COUNT(CASE WHEN sensitivity_level = 'high' THEN 1 END) as high_sensitivity_activities
      FROM medical_provider_activity_logs
      WHERE medical_provider_id = $1 AND timestamp >= $2
    `, [medicalProviderId, startDate]);

    // Activities by sensitivity level
    const sensitivityResult = await pool.query(`
      SELECT 
        sensitivity_level,
        COUNT(*) as count,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT patient_id) as unique_patients
      FROM medical_provider_activity_logs
      WHERE medical_provider_id = $1 AND timestamp >= $2
      GROUP BY sensitivity_level
      ORDER BY 
        CASE sensitivity_level
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END
    `, [medicalProviderId, startDate]);

    // Critical activities requiring review
    const criticalResult = await pool.query(`
      SELECT 
        id,
        action,
        user_name,
        user_email,
        user_role,
        patient_name,
        sensitivity_level,
        status,
        timestamp
      FROM medical_provider_activity_logs
      WHERE medical_provider_id = $1 
        AND timestamp >= $2
        AND (sensitivity_level = 'critical' OR audit_required = true)
      ORDER BY timestamp DESC
      LIMIT 50
    `, [medicalProviderId, startDate]);

    // User HIPAA training status
    const trainingResult = await pool.query(`
      SELECT 
        id,
        first_name || ' ' || last_name as name,
        email,
        role,
        hipaa_training_date,
        hipaa_training_expiry,
        CASE 
          WHEN hipaa_training_expiry IS NULL THEN 'not_set'
          WHEN hipaa_training_expiry < CURRENT_TIMESTAMP THEN 'expired'
          WHEN hipaa_training_expiry < CURRENT_TIMESTAMP + INTERVAL '30 days' THEN 'expiring_soon'
          ELSE 'valid'
        END as training_status
      FROM medical_provider_users
      WHERE medical_provider_id = $1 AND status = 'active'
      ORDER BY 
        CASE 
          WHEN hipaa_training_expiry IS NULL THEN 1
          WHEN hipaa_training_expiry < CURRENT_TIMESTAMP THEN 2
          WHEN hipaa_training_expiry < CURRENT_TIMESTAMP + INTERVAL '30 days' THEN 3
          ELSE 4
        END,
        hipaa_training_expiry ASC
    `, [medicalProviderId]);

    // Non-compliant activities
    const nonCompliantResult = await pool.query(`
      SELECT 
        id,
        action,
        user_name,
        user_email,
        status,
        error_message,
        timestamp
      FROM medical_provider_activity_logs
      WHERE medical_provider_id = $1 
        AND timestamp >= $2
        AND hipaa_compliant = false
      ORDER BY timestamp DESC
      LIMIT 25
    `, [medicalProviderId, startDate]);

    // Patient access summary
    const patientAccessResult = await pool.query(`
      SELECT 
        patient_id,
        patient_name,
        COUNT(*) as access_count,
        COUNT(DISTINCT user_id) as unique_users,
        MAX(timestamp) as last_accessed
      FROM medical_provider_activity_logs
      WHERE medical_provider_id = $1 
        AND timestamp >= $2
        AND patient_id IS NOT NULL
      GROUP BY patient_id, patient_name
      ORDER BY access_count DESC
      LIMIT 20
    `, [medicalProviderId, startDate]);

    const metrics = overallResult.rows[0];
    const complianceRate = metrics.total_activities > 0 
      ? ((parseInt(metrics.compliant_activities) / parseInt(metrics.total_activities)) * 100).toFixed(2)
      : 100;

    res.json({
      success: true,
      report: {
        period: `Last ${days} days`,
        generatedAt: new Date().toISOString(),
        metrics: {
          totalActivities: parseInt(metrics.total_activities),
          compliantActivities: parseInt(metrics.compliant_activities),
          nonCompliantActivities: parseInt(metrics.non_compliant_activities),
          auditRequiredCount: parseInt(metrics.audit_required_count),
          criticalActivities: parseInt(metrics.critical_activities),
          highSensitivityActivities: parseInt(metrics.high_sensitivity_activities),
          complianceRate: parseFloat(complianceRate)
        },
        sensitivityBreakdown: sensitivityResult.rows,
        criticalActivities: criticalResult.rows,
        userTrainingStatus: trainingResult.rows,
        nonCompliantActivities: nonCompliantResult.rows,
        patientAccessSummary: patientAccessResult.rows
      }
    });
  } catch (error) {
    console.error('HIPAA compliance report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate HIPAA compliance report'
    });
  }
};

// Patient Access Audit
exports.getPatientAccessAudit = async (req, res) => {
  try {
    const { patientId } = req.params;
    const medicalProviderId = req.medicalProviderId;
    const { days = 90, page = 1, limit = 50 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get patient access summary
    const summaryResult = await pool.query(`
      SELECT 
        patient_id,
        patient_name,
        COUNT(*) as total_accesses,
        COUNT(DISTINCT user_id) as unique_users,
        MIN(timestamp) as first_access,
        MAX(timestamp) as last_access,
        COUNT(CASE WHEN sensitivity_level = 'critical' THEN 1 END) as critical_accesses,
        COUNT(CASE WHEN action LIKE '%phi%' THEN 1 END) as phi_accesses
      FROM medical_provider_activity_logs
      WHERE medical_provider_id = $1 
        AND patient_id = $2
        AND timestamp >= $3
      GROUP BY patient_id, patient_name
    `, [medicalProviderId, patientId, startDate]);

    if (summaryResult.rows.length === 0) {
      return res.json({
        success: true,
        audit: {
          patientId,
          summary: {
            totalAccesses: 0,
            uniqueUsers: 0,
            noAccessRecorded: true
          },
          accessByUser: [],
          accessByType: [],
          recentAccesses: [],
          pagination: {
            currentPage: 1,
            totalPages: 0,
            totalCount: 0,
            limit: parseInt(limit)
          }
        }
      });
    }

    // Access breakdown by user
    const userResult = await pool.query(`
      SELECT 
        user_id,
        user_name,
        user_email,
        user_role,
        COUNT(*) as access_count,
        MAX(timestamp) as last_access,
        COUNT(CASE WHEN sensitivity_level = 'critical' THEN 1 END) as critical_accesses
      FROM medical_provider_activity_logs
      WHERE medical_provider_id = $1 
        AND patient_id = $2
        AND timestamp >= $3
      GROUP BY user_id, user_name, user_email, user_role
      ORDER BY access_count DESC
    `, [medicalProviderId, patientId, startDate]);

    // Access breakdown by action type
    const actionResult = await pool.query(`
      SELECT 
        action,
        action_category,
        sensitivity_level,
        COUNT(*) as count
      FROM medical_provider_activity_logs
      WHERE medical_provider_id = $1 
        AND patient_id = $2
        AND timestamp >= $3
      GROUP BY action, action_category, sensitivity_level
      ORDER BY count DESC
    `, [medicalProviderId, patientId, startDate]);

    // Get total count for pagination
    const countResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM medical_provider_activity_logs
      WHERE medical_provider_id = $1 
        AND patient_id = $2
        AND timestamp >= $3
    `, [medicalProviderId, patientId, startDate]);

    // Get paginated access history
    const offset = (page - 1) * limit;
    const accessResult = await pool.query(`
      SELECT 
        id,
        action,
        action_category,
        user_id,
        user_name,
        user_email,
        user_role,
        sensitivity_level,
        audit_required,
        status,
        ip_address,
        device_info,
        timestamp
      FROM medical_provider_activity_logs
      WHERE medical_provider_id = $1 
        AND patient_id = $2
        AND timestamp >= $3
      ORDER BY timestamp DESC
      LIMIT $4 OFFSET $5
    `, [medicalProviderId, patientId, startDate, limit, offset]);

    const totalCount = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalCount / limit);
    const summary = summaryResult.rows[0];

    res.json({
      success: true,
      audit: {
        patientId,
        patientName: summary.patient_name,
        period: `Last ${days} days`,
        summary: {
          totalAccesses: parseInt(summary.total_accesses),
          uniqueUsers: parseInt(summary.unique_users),
          firstAccess: summary.first_access,
          lastAccess: summary.last_access,
          criticalAccesses: parseInt(summary.critical_accesses),
          phiAccesses: parseInt(summary.phi_accesses)
        },
        accessByUser: userResult.rows,
        accessByType: actionResult.rows,
        recentAccesses: accessResult.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCount,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Patient access audit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve patient access audit'
    });
  }
};
