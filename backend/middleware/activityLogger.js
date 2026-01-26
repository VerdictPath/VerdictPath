const activityLogger = require('../services/activityLogger');

/**
 * Activity Logging Middleware
 * 
 * Automatically logs successful activities for law firm user actions.
 * Works seamlessly with PostgreSQL activityLogger service.
 * 
 * Usage:
 *   router.post('/create', 
 *     verifyLawFirmUser,
 *     requireAdmin, 
 *     logActivity('user_created', 'user'),
 *     controller.createUser
 *   );
 */

/**
 * Create middleware to log activities
 * 
 * @param {string} action - Action type (e.g., 'user_created', 'client_updated')
 * @param {string} actionCategory - Category: user, client, document, financial, communication, case, settings, security
 * @param {Object} options - Optional configuration
 * @param {Function} options.getTargetInfo - Function to extract target info from req/res
 * @returns {Function} Express middleware
 */
exports.logActivity = (action, actionCategory, options = {}) => {
  return async (req, res, next) => {
    const originalJson = res.json;
    const originalSend = res.send;

    const logActivityAsync = async (responseData) => {
      try {
        // Extract law firm ID from req.user (set by lawFirmAuth middleware)
        const lawFirmId = req.user?.id || req.lawFirmId;
        const userId = req.user?.lawFirmUserId || null;
        
        if (!lawFirmId) {
          return;
        }

        // Check if activity tracking is enabled for this law firm
        if (!req.user?.enableActivityTracking) {
          return;
        }

        const userEmail = req.user?.email || 'unknown';
        // Build full name from firstName and lastName (lawFirmAuth provides these)
        const userName = req.user?.firstName && req.user?.lastName 
          ? `${req.user.firstName} ${req.user.lastName}`
          : req.user?.email || 'Unknown User';

        let targetType = null;
        let targetId = null;
        let targetName = null;

        if (options.getTargetInfo && typeof options.getTargetInfo === 'function') {
          const targetInfo = options.getTargetInfo(req, responseData);
          targetType = targetInfo.targetType || null;
          targetId = targetInfo.targetId || null;
          targetName = targetInfo.targetName || null;
        } else {
          if (req.params?.userId) {
            targetType = 'law_firm_user';
            targetId = parseInt(req.params.userId);
          } else if (req.params?.clientId) {
            targetType = 'client';
            targetId = parseInt(req.params.clientId);
          }

          if (responseData && typeof responseData === 'object') {
            if (responseData.user) {
              targetName = `${responseData.user.firstName || ''} ${responseData.user.lastName || ''}`.trim();
            } else if (responseData.client) {
              targetName = `${responseData.client.firstName || ''} ${responseData.client.lastName || ''}`.trim();
            } else if (responseData.firmName) {
              targetName = responseData.firmName;
            }
          }
        }

        const metadata = {
          method: req.method,
          path: req.path,
          params: req.params,
          query: req.query,
          ...(options.includeBody !== false && { body: sanitizeBody(req.body) })
        };

        setImmediate(async () => {
          try {
            await activityLogger.log({
              lawFirmId,
              userId,
              userEmail,
              userName,
              action,
              actionCategory,
              targetType,
              targetId,
              targetName,
              metadata,
              ipAddress: req.ip || req.connection?.remoteAddress || null,
              userAgent: req.headers['user-agent'] || null,
              status: 'success'
            });
          } catch (error) {
              error: error.message,
              action,
              lawFirmId,
              userId
            });
          }
        });

      } catch (error) {
      }
    };

    res.json = function(data) {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        logActivityAsync(data);
      }
      return originalJson.call(this, data);
    };

    res.send = function(data) {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        try {
          const parsed = typeof data === 'string' ? JSON.parse(data) : data;
          logActivityAsync(parsed);
        } catch (e) {
          logActivityAsync(null);
        }
      }
      return originalSend.call(this, data);
    };

    next();
  };
};

/**
 * Sanitize request body to remove sensitive data before logging
 */
function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return body;
  
  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard'];
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

/**
 * Manual activity logging function for non-route contexts
 * 
 * @param {Object} data - Activity log data
 * @returns {Promise<void>}
 */
exports.createActivityLog = async (data) => {
  try {
    await activityLogger.log(data);
  } catch (error) {
  }
};
