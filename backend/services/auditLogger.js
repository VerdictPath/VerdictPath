const db = require('../config/db');

/**
 * HIPAA-Compliant Audit Logging Service
 * 
 * HIPAA Requirements:
 * - Log all access to PHI (who, what, when, where)
 * - Logs must be tamper-proof (append-only)
 * - Retain logs for minimum 6 years (we use 7 years to be safe)
 * - Include sufficient detail for breach investigation
 */
class AuditLogger {
  
  /**
   * Log an action in the audit trail
   * 
   * @param {Object} auditData
   * @param {number} auditData.actorId - ID of user performing action
   * @param {string} auditData.actorType - Type of actor (client, lawfirm, medical_provider, system)
   * @param {string} auditData.action - Action performed (VIEW_PHI, UPLOAD_MEDICAL_RECORD, etc.)
   * @param {string} auditData.entityType - Type of entity accessed (User, MedicalRecord, etc.)
   * @param {number} auditData.entityId - ID of entity accessed
   * @param {string} auditData.status - Result (SUCCESS, FAILURE, DENIED)
   * @param {string} auditData.ipAddress - IP address of request
   * @param {string} auditData.userAgent - User agent string
   * @param {Object} auditData.metadata - Additional context (optional)
   * @param {number} auditData.targetUserId - ID of patient/client whose PHI was accessed (optional)
   */
  async log({
    actorId,
    actorType,
    action,
    entityType = null,
    entityId = null,
    status = 'SUCCESS',
    ipAddress,
    userAgent = null,
    metadata = {},
    targetUserId = null
  }) {
    try {
      const query = `
        INSERT INTO audit_logs 
        (actor_id, actor_type, action, entity_type, entity_id, target_user_id,
         status, ip_address, user_agent, metadata, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        RETURNING id, timestamp
      `;
      
      const values = [
        actorId,
        actorType,
        action,
        entityType,
        entityId,
        targetUserId,
        status,
        ipAddress,
        userAgent,
        JSON.stringify(metadata)
      ];
      
      const result = await db.query(query, values);
      
      return result.rows[0];
    } catch (error) {
      // Audit logging failures are CRITICAL - they should never fail silently
        error: error.message,
        action,
        actorId,
        actorType
      });
      
      // Don't throw - we don't want to block the user action
      // But we should alert monitoring systems
      // In production, this should trigger an alert to security team
      return null;
    }
  }

  /**
   * Log PHI access (medical records, billing, etc.)
   * This is a high-level helper for the most common audit log type
   */
  async logPhiAccess({
    userId,
    userType,
    action,
    patientId,
    recordType,
    recordId,
    ipAddress,
    userAgent,
    success = true
  }) {
    return this.log({
      actorId: userId,
      actorType: userType,
      action: action,
      entityType: recordType,
      entityId: recordId,
      targetUserId: patientId,
      status: success ? 'SUCCESS' : 'FAILURE',
      ipAddress: ipAddress,
      userAgent: userAgent,
      metadata: {
        recordType: recordType,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log authentication events
   */
  async logAuth({
    userId = null,
    email,
    action, // LOGIN, LOGOUT, LOGIN_FAILED, PASSWORD_CHANGE
    ipAddress,
    userAgent,
    success = true,
    failureReason = null
  }) {
    return this.log({
      actorId: userId || 0, // 0 for failed login attempts
      actorType: 'client',
      action: action,
      entityType: 'User',
      entityId: userId,
      status: success ? 'SUCCESS' : 'FAILURE',
      ipAddress: ipAddress,
      userAgent: userAgent,
      metadata: {
        email: email,
        failureReason: failureReason
      }
    });
  }

  /**
   * Get audit logs for a specific patient (for breach investigation)
   */
  async getPhiAccessLogs(patientId, options = {}) {
    const {
      startDate = null,
      endDate = null,
      limit = 100,
      offset = 0
    } = options;
    
    let query = `
      SELECT 
        id,
        actor_id,
        actor_type,
        action,
        entity_type,
        entity_id,
        target_user_id,
        status,
        ip_address,
        user_agent,
        metadata,
        timestamp
      FROM audit_logs
      WHERE target_user_id = $1
    `;
    
    const values = [patientId];
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
   * Get failed login attempts for security monitoring
   */
  async getFailedLoginAttempts(options = {}) {
    const {
      since = new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      limit = 100
    } = options;
    
    const query = `
      SELECT 
        actor_id,
        metadata->>'email' as email,
        ip_address,
        COUNT(*) as attempt_count,
        MAX(timestamp) as last_attempt
      FROM audit_logs
      WHERE action = 'LOGIN_FAILED'
        AND timestamp >= $1
      GROUP BY actor_id, metadata->>'email', ip_address
      HAVING COUNT(*) >= 3
      ORDER BY attempt_count DESC
      LIMIT $2
    `;
    
    try {
      const result = await db.query(query, [since, limit]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Detect suspicious access patterns (for breach detection)
   */
  async detectSuspiciousActivity(options = {}) {
    const {
      since = new Date(Date.now() - 24 * 60 * 60 * 1000),
      threshold = 50 // Number of PHI accesses that triggers alert
    } = options;
    
    const query = `
      SELECT 
        actor_id,
        actor_type,
        COUNT(DISTINCT target_user_id) as unique_patients_accessed,
        COUNT(*) as total_accesses,
        array_agg(DISTINCT ip_address) as ip_addresses
      FROM audit_logs
      WHERE action IN ('VIEW_PHI', 'VIEW_MEDICAL_RECORD', 'VIEW_BILLING', 'DOWNLOAD_DOCUMENT')
        AND timestamp >= $1
      GROUP BY actor_id, actor_type
      HAVING COUNT(*) > $2
      ORDER BY total_accesses DESC
    `;
    
    try {
      const result = await db.query(query, [since, threshold]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new AuditLogger();
