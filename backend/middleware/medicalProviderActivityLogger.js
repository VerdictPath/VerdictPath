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
  'password_changed': 'security'
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

// Log activity to database
async function logActivity({
  medicalProviderId,
  userId,
  userEmail,
  userName,
  action,
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
    const actionCategory = ACTION_CATEGORIES[action] || 'other';
    const sanitizedMetadata = sanitizeMetadata(metadata);

    await pool.query(`
      INSERT INTO medical_provider_activity_logs (
        medical_provider_id,
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
        error_message
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `, [
      medicalProviderId,
      userId,
      userEmail,
      userName,
      action,
      actionCategory,
      targetType,
      targetId,
      targetName,
      JSON.stringify(sanitizedMetadata),
      ipAddress,
      userAgent,
      status,
      errorMessage
    ]);
  } catch (error) {
    console.error('Activity logging error:', error);
  }
}

// Middleware wrapper to log activity
const logActivityMiddleware = (action, category) => {
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

        const logData = {
          medicalProviderId: req.medicalProviderId,
          userId: req.medicalProviderUser.id,
          userEmail: req.medicalProviderUser.email,
          userName: `${req.medicalProviderUser.first_name} ${req.medicalProviderUser.last_name}`,
          action,
          metadata,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('user-agent'),
          status: statusCode < 400 ? 'success' : 'failed'
        };

        logActivity(logData).catch(err => {
          console.error('Failed to log activity:', err);
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
  ACTION_CATEGORIES
};
