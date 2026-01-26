const db = require('../config/db');

/**
 * Law Firm Activity Logging Service
 * 
 * Tracks user activities for law firms with enable_activity_tracking enabled.
 * Provides detailed audit trail of all user actions within the law firm portal.
 */
class ActivityLogger {
  
  /**
   * Log a law firm user activity
   * 
   * @param {Object} activityData
   * @param {number} activityData.lawFirmId - ID of the law firm
   * @param {number} activityData.userId - ID of the law firm user (can be null)
   * @param {string} activityData.userEmail - Email of the user
   * @param {string} activityData.userName - Full name of the user
   * @param {string} activityData.action - Action performed (see valid_action constraint)
   * @param {string} activityData.actionCategory - Category: user, client, document, financial, communication, case, settings, security
   * @param {string} activityData.targetType - Type of target entity (optional)
   * @param {number} activityData.targetId - ID of target entity (optional)
   * @param {string} activityData.targetName - Name of target entity (optional)
   * @param {Object} activityData.metadata - Additional context (optional)
   * @param {string} activityData.ipAddress - IP address of request (optional)
   * @param {string} activityData.userAgent - User agent string (optional)
   * @param {string} activityData.status - Result: success, failed, pending (default: success)
   * @param {string} activityData.errorMessage - Error message if failed (optional)
   */
  async log({
    lawFirmId,
    userId = null,
    userEmail,
    userName,
    action,
    actionCategory,
    targetType = null,
    targetId = null,
    targetName = null,
    metadata = {},
    ipAddress = null,
    userAgent = null,
    status = 'success',
    errorMessage = null
  }) {
    try {
      // Check if activity tracking is enabled for this law firm
      const firmCheck = await db.query(
        'SELECT enable_activity_tracking FROM law_firms WHERE id = $1',
        [lawFirmId]
      );
      
      if (firmCheck.rows.length === 0) {
        return null;
      }
      
      const isTrackingEnabled = firmCheck.rows[0].enable_activity_tracking;
      
      // Only log if tracking is enabled for this firm
      if (!isTrackingEnabled) {
        return null;
      }
      
      const query = `
        INSERT INTO law_firm_activity_logs 
        (law_firm_id, user_id, user_email, user_name, action, action_category,
         target_type, target_id, target_name, metadata, ip_address, user_agent,
         status, error_message, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
        RETURNING id, timestamp
      `;
      
      const values = [
        lawFirmId,
        userId,
        userEmail,
        userName,
        action,
        actionCategory,
        targetType,
        targetId,
        targetName,
        JSON.stringify(metadata),
        ipAddress,
        userAgent,
        status,
        errorMessage
      ];
      
      const result = await db.query(query, values);
      
      return result.rows[0];
    } catch (error) {
      // Activity logging failures should not block user actions
        error: error.message,
        action,
        lawFirmId,
        userId
      });
      
      return null;
    }
  }

  /**
   * Get activity logs for a law firm
   * 
   * @param {number} lawFirmId - Law firm ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Activity logs
   */
  async getLogs(lawFirmId, options = {}) {
    const {
      userId = null,
      actionCategory = null,
      action = null,
      startDate = null,
      endDate = null,
      limit = 100,
      offset = 0
    } = options;
    
    let query = `
      SELECT 
        id,
        law_firm_id,
        user_id,
        user_email,
        user_name,
        action,
        action_category,
        target_type,
        target_id,
        target_name,
        metadata,
        ip_address,
        user_agent,
        status,
        error_message,
        timestamp
      FROM law_firm_activity_logs
      WHERE law_firm_id = $1
    `;
    
    const values = [lawFirmId];
    let paramIndex = 2;
    
    if (userId) {
      query += ` AND user_id = $${paramIndex}`;
      values.push(userId);
      paramIndex++;
    }
    
    if (actionCategory) {
      query += ` AND action_category = $${paramIndex}`;
      values.push(actionCategory);
      paramIndex++;
    }
    
    if (action) {
      query += ` AND action = $${paramIndex}`;
      values.push(action);
      paramIndex++;
    }
    
    if (startDate) {
      query += ` AND timestamp >= $${paramIndex}`;
      values.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      query += ` AND timestamp <= $${paramIndex}`;
      values.push(endDate);
      paramIndex++;
    }
    
    query += ` ORDER BY timestamp DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    values.push(limit, offset);
    
    try {
      const result = await db.query(query, values);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get activity summary statistics
   * 
   * @param {number} lawFirmId - Law firm ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Activity statistics
   */
  async getStatistics(lawFirmId, options = {}) {
    const {
      startDate = null,
      endDate = null
    } = options;
    
    let query = `
      SELECT 
        action_category,
        COUNT(*) as count,
        COUNT(DISTINCT user_id) as unique_users
      FROM law_firm_activity_logs
      WHERE law_firm_id = $1
    `;
    
    const values = [lawFirmId];
    let paramIndex = 2;
    
    if (startDate) {
      query += ` AND timestamp >= $${paramIndex}`;
      values.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      query += ` AND timestamp <= $${paramIndex}`;
      values.push(endDate);
      paramIndex++;
    }
    
    query += ` GROUP BY action_category ORDER BY count DESC`;
    
    try {
      const result = await db.query(query, values);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get most active users
   * 
   * @param {number} lawFirmId - Law firm ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Most active users
   */
  async getMostActiveUsers(lawFirmId, options = {}) {
    const {
      startDate = null,
      endDate = null,
      limit = 10
    } = options;
    
    let query = `
      SELECT 
        user_id,
        user_email,
        user_name,
        COUNT(*) as activity_count,
        MAX(timestamp) as last_activity
      FROM law_firm_activity_logs
      WHERE law_firm_id = $1 AND user_id IS NOT NULL
    `;
    
    const values = [lawFirmId];
    let paramIndex = 2;
    
    if (startDate) {
      query += ` AND timestamp >= $${paramIndex}`;
      values.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      query += ` AND timestamp <= $${paramIndex}`;
      values.push(endDate);
      paramIndex++;
    }
    
    query += ` GROUP BY user_id, user_email, user_name 
               ORDER BY activity_count DESC 
               LIMIT $${paramIndex}`;
    values.push(limit);
    
    try {
      const result = await db.query(query, values);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get recent failed activities
   * 
   * @param {number} lawFirmId - Law firm ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Failed activities
   */
  async getFailedActivities(lawFirmId, options = {}) {
    const {
      limit = 50
    } = options;
    
    const query = `
      SELECT 
        id,
        user_id,
        user_email,
        user_name,
        action,
        action_category,
        error_message,
        timestamp
      FROM law_firm_activity_logs
      WHERE law_firm_id = $1 AND status = 'failed'
      ORDER BY timestamp DESC
      LIMIT $2
    `;
    
    try {
      const result = await db.query(query, [lawFirmId, limit]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new ActivityLogger();
