const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Map of action types to categories
const ACTION_CATEGORIES = {
  // User actions
  'user_login': 'user',
  'user_logout': 'user',
  'user_created': 'user',
  'user_updated': 'user',
  'user_deactivated': 'user',
  'user_reactivated': 'user',
  'user_list_viewed': 'user',
  'user_profile_viewed': 'user',
  
  // Patient actions
  'patient_added': 'patient',
  'patient_updated': 'patient',
  'patient_removed': 'patient',
  'patient_list_viewed': 'patient',
  'patient_profile_viewed': 'patient',
  'patient_search': 'patient',
  'patient_phi_viewed': 'patient',
  'patient_record_accessed': 'patient',
  
  // Medical record actions (HIPAA critical) - use 'document' category
  'medical_record_created': 'document',
  'medical_record_updated': 'document',
  'medical_record_viewed': 'document',
  'medical_record_deleted': 'document',
  'xray_viewed': 'document',
  'lab_result_viewed': 'document',
  
  // Document actions
  'document_uploaded': 'document',
  'document_viewed': 'document',
  'document_downloaded': 'document',
  'document_deleted': 'document',
  'document_shared': 'document',
  
  // Financial actions
  'bill_created': 'financial',
  'bill_updated': 'financial',
  'negotiation_initiated': 'financial',
  'negotiation_response': 'financial',
  'payment_received': 'financial',
  'billing_record_accessed': 'financial',
  
  // Communication actions
  'notification_sent': 'communication',
  'message_sent': 'communication',
  'calendar_event_created': 'communication',
  
  // Settings actions
  'settings_updated': 'settings',
  'permissions_updated': 'settings',
  
  // Security actions
  'permission_denied': 'security',
  'login_failed': 'security',
  'password_changed': 'security',
  'unauthorized_access_attempt': 'security',
  'hipaa_audit_log_viewed': 'security'
};

// Map action types to sensitivity levels for HIPAA compliance
const ACTION_SENSITIVITY = {
  // Critical - Direct PHI access
  'patient_phi_viewed': 'critical',
  'medical_record_viewed': 'critical',
  'medical_record_updated': 'critical',
  'medical_record_deleted': 'critical',
  'xray_viewed': 'critical',
  'lab_result_viewed': 'critical',
  
  // High - Patient operations
  'patient_record_accessed': 'high',
  'patient_updated': 'high',
  'medical_record_created': 'high',
  'billing_record_accessed': 'high',
  
  // Medium - Normal operations
  'patient_added': 'medium',
  'patient_list_viewed': 'medium',
  'document_viewed': 'medium',
  'bill_created': 'medium',
  
  // Low - Non-patient actions
  'user_login': 'low',
  'user_logout': 'low',
  'settings_updated': 'low',
  'user_list_viewed': 'low'
};

// Sanitize sensitive data from metadata
function sanitizeMetadata(metadata) {
  if (!metadata) return {};
  
  const sanitized = { ...metadata };
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'Authorization'];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return sanitized;
}

// Log activity to database with HIPAA compliance fields
async function logActivity({
  medicalProviderId,
  userId,
  userEmail,
  userName,
  userRole = null,
  action,
  targetType = null,
  targetId = null,
  targetName = null,
  metadata = {},
  ipAddress = null,
  userAgent = null,
  status = 'success',
  errorMessage = null,
  // HIPAA-specific fields
  sensitivityLevel = null,
  patientId = null,
  patientName = null,
  hipaaCompliant = true,
  auditRequired = false,
  location = null,
  deviceInfo = null
}) {
  try {
    const actionCategory = ACTION_CATEGORIES[action] || 'other';
    const sanitizedMetadata = sanitizeMetadata(metadata);
    
    // Auto-determine sensitivity level if not provided
    const finalSensitivity = sensitivityLevel || ACTION_SENSITIVITY[action] || 'medium';
    
    // Auto-flag audit requirement for critical actions
    const finalAuditRequired = auditRequired || 
      finalSensitivity === 'critical' || 
      action.includes('deleted') ||
      action.includes('unauthorized');

    await pool.query(`
      INSERT INTO medical_provider_activity_logs (
        medical_provider_id,
        user_id,
        user_email,
        user_name,
        user_role,
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
        sensitivity_level,
        patient_id,
        patient_name,
        hipaa_compliant,
        audit_required,
        location,
        device_info
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
    `, [
      medicalProviderId,
      userId,
      userEmail,
      userName,
      userRole,
      action,
      actionCategory,
      targetType,
      targetId,
      targetName,
      JSON.stringify(sanitizedMetadata),
      ipAddress,
      userAgent,
      status,
      errorMessage,
      finalSensitivity,
      patientId,
      patientName,
      hipaaCompliant,
      finalAuditRequired,
      location,
      deviceInfo
    ]);
  } catch (error) {
  }
}

// Middleware wrapper to log activity with HIPAA compliance
const logActivityMiddleware = (action, options = {}) => {
  return async (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      // Capture response
      const statusCode = res.statusCode;
      
      // Only log if medical provider context exists
      if (req.medicalProviderUser && req.medicalProviderId) {
        const metadata = {
          method: req.method,
          path: req.path,
          statusCode,
          query: req.query,
          body: sanitizeMetadata(req.body)
        };

        // Extract patient info from request if available
        const patientId = req.params.patientId || req.body.patientId || options.patientId || null;
        const patientName = req.body.patientName || options.patientName || null;

        const logData = {
          medicalProviderId: req.medicalProviderId,
          userId: req.medicalProviderUser.id,
          userEmail: req.medicalProviderUser.email,
          userName: `${req.medicalProviderUser.first_name} ${req.medicalProviderUser.last_name}`,
          userRole: req.medicalProviderUser.role,
          action,
          metadata,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('user-agent'),
          status: statusCode < 400 ? 'success' : 'failed',
          // HIPAA fields
          sensitivityLevel: options.sensitivityLevel,
          patientId,
          patientName,
          hipaaCompliant: statusCode < 400,
          auditRequired: options.auditRequired || false,
          location: options.location || null,
          deviceInfo: req.get('user-agent')
        };

        logActivity(logData).catch(err => {
        });
      }
      
      originalSend.call(this, data);
    };
    
    next();
  };
};

module.exports = {
  logActivity,
  logActivityMiddleware,
  logMedicalActivity: logActivityMiddleware,
  ACTION_CATEGORIES,
  ACTION_SENSITIVITY
};
