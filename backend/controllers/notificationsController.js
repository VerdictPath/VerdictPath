const { Pool } = require('pg');
const { DateTime } = require('luxon');
const pushNotificationService = require('../services/pushNotificationService');
const { calculateQuietHoursEnd, queueNotification } = require('../services/notificationQueueService');
const { syncNotificationToFirebase, syncStatusUpdateToFirebase, syncUnreadCountToFirebase } = require('../services/firebaseSync');
const { sendNotificationSMS } = require('../services/smsService');
const encryptionService = require('../services/encryption');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Helper function to check if notification should be sent based on preferences and quiet hours
async function checkNotificationPreferences(recipientType, recipientId, notificationType, priority) {
  try {
    let idField;
    if (recipientType === 'user') {
      idField = 'user_id';
    } else if (recipientType === 'law_firm') {
      idField = 'law_firm_id';
    } else {
      idField = 'medical_provider_id';
    }

    const query = `SELECT * FROM notification_preferences WHERE ${idField} = $1`;
    const result = await pool.query(query, [recipientId]);

    if (result.rows.length === 0) {
      return { allowed: true, reason: null };
    }

    const prefs = result.rows[0];

    // Check if push notifications are enabled globally
    if (!prefs.push_notifications_enabled) {
      return { allowed: false, reason: 'Push notifications disabled by user' };
    }

    // Check urgent notification preference first
    if (priority === 'urgent' && !prefs.urgent_notifications) {
      return { allowed: false, reason: 'Urgent notifications disabled by user' };
    }

    // Urgent notifications bypass other checks but respect the urgent toggle
    if (priority === 'urgent') {
      return { allowed: true, reason: null };
    }

    // Check notification type preferences for non-urgent notifications
    const typeMapping = {
      'task_assigned': 'task_notifications',
      'task_reminder': 'task_notifications',
      'task_completed': 'task_notifications',
      'daily_streak': 'system_notifications',
      'milestone_update': 'system_notifications',
      'coin_reward': 'system_notifications',
      'marketing': 'marketing_notifications',
      'promotional': 'marketing_notifications',
      'product_update': 'marketing_notifications'
    };

    const prefField = typeMapping[notificationType];
    if (prefField && !prefs[prefField]) {
      return { allowed: false, reason: `${notificationType} notifications disabled by user` };
    }

    // Default to checking if type contains keywords
    if (notificationType.includes('system') && !prefs.system_notifications) {
      return { allowed: false, reason: 'System notifications disabled by user' };
    }
    if (notificationType.includes('task') && !prefs.task_notifications) {
      return { allowed: false, reason: 'Task notifications disabled by user' };
    }
    if ((notificationType.includes('marketing') || notificationType.includes('promotion')) && !prefs.marketing_notifications) {
      return { allowed: false, reason: 'Marketing notifications disabled by user' };
    }

    // Check quiet hours
    if (prefs.quiet_hours_enabled && priority !== 'urgent') {
      const isQuietTime = checkIfQuietHours(
        prefs.quiet_hours_start,
        prefs.quiet_hours_end,
        prefs.timezone
      );

      if (isQuietTime) {
        return { allowed: false, reason: 'Quiet hours active', queue: true };
      }
    }

    return { allowed: true, reason: null };
  } catch (error) {
    console.error('Error checking notification preferences:', error);
    return { allowed: true, reason: null };
  }
}

// Helper function to check if current time is in quiet hours
// Uses Luxon for timezone-safe calculations
function checkIfQuietHours(startTime, endTime, timezone) {
  try {
    // Get current time in the user's timezone
    const nowInUserTz = DateTime.now().setZone(timezone);
    const currentHour = nowInUserTz.hour;
    const currentMinute = nowInUserTz.minute;

    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const currentTimeMinutes = currentHour * 60 + currentMinute;
    const startTimeMinutes = startHour * 60 + startMin;
    const endTimeMinutes = endHour * 60 + endMin;

    // Handle quiet hours that span midnight
    if (startTimeMinutes < endTimeMinutes) {
      return currentTimeMinutes >= startTimeMinutes && currentTimeMinutes < endTimeMinutes;
    } else {
      return currentTimeMinutes >= startTimeMinutes || currentTimeMinutes < endTimeMinutes;
    }
  } catch (error) {
    console.error('Error checking quiet hours:', error);
    return false;
  }
}

function getEntityInfo(req) {
  const userType = req.user?.userType;
  const entityId = req.user?.id;
  
  if (!userType || !entityId) {
    return null;
  }
  
  let deviceType, recipientType;
  
  if (userType === 'lawfirm') {
    deviceType = 'law_firm';
    recipientType = 'law_firm';
  } else if (userType === 'medical_provider') {
    deviceType = 'medical_provider';
    recipientType = 'medical_provider';
  } else {
    deviceType = 'user';
    recipientType = 'user';
  }
  
  return { deviceType, recipientType, entityId, userType };
}

async function syncNewNotificationToFirebase(notification) {
  try {
    await syncNotificationToFirebase(notification);
  } catch (error) {
    console.error('Error syncing notification to Firebase (non-fatal):', error);
  }
}

async function getUnreadCountForUser(recipientType, recipientId) {
  try {
    const query = `
      SELECT COUNT(*) as count
      FROM notifications
      WHERE recipient_type = $1 AND recipient_id = $2 
        AND status != 'read'
    `;
    const result = await pool.query(query, [recipientType, recipientId]);
    return parseInt(result.rows[0].count) || 0;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
}

exports.registerDevice = async (req, res) => {
  const { expoPushToken, deviceName, platform, appVersion } = req.body;
  
  if (!expoPushToken) {
    return res.status(400).json({ error: 'Expo push token is required' });
  }

  if (!expoPushToken.startsWith('ExponentPushToken[')) {
    return res.status(400).json({ error: 'Invalid Expo push token format' });
  }

  const entityInfo = getEntityInfo(req);
  if (!entityInfo) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const { deviceType, entityId } = entityInfo;

  try {
    const checkQuery = `
      SELECT * FROM user_devices 
      WHERE expo_push_token = $1
    `;
    const checkResult = await pool.query(checkQuery, [expoPushToken]);

    let result;
    
    if (checkResult.rows.length > 0) {
      const updateQuery = `
        UPDATE user_devices 
        SET ${deviceType === 'user' ? 'user_id' : deviceType === 'law_firm' ? 'law_firm_id' : 'medical_provider_id'} = $1,
            device_name = COALESCE($2, device_name),
            platform = COALESCE($3, platform),
            app_version = COALESCE($4, app_version),
            is_active = true,
            last_used_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE expo_push_token = $5
        RETURNING *
      `;
      result = await pool.query(updateQuery, [entityId, deviceName, platform, appVersion, expoPushToken]);
    } else {
      const insertQuery = `
        INSERT INTO user_devices (
          ${deviceType}_id, device_type, expo_push_token, device_name, platform, app_version
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      result = await pool.query(insertQuery, [entityId, deviceType, expoPushToken, deviceName, platform, appVersion]);
    }

    res.status(200).json({
      message: 'Device registered successfully',
      device: result.rows[0]
    });
  } catch (error) {
    console.error('Device registration error:', error);
    res.status(500).json({ error: 'Failed to register device' });
  }
};

exports.unregisterDevice = async (req, res) => {
  const { expoPushToken } = req.body;
  
  if (!expoPushToken) {
    return res.status(400).json({ error: 'Expo push token is required' });
  }

  const entityInfo = getEntityInfo(req);
  if (!entityInfo) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const { deviceType, entityId } = entityInfo;

  try {
    const query = `
      UPDATE user_devices 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE expo_push_token = $1 AND ${deviceType}_id = $2
      RETURNING *
    `;
    
    const result = await pool.query(query, [expoPushToken, entityId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Device not found or unauthorized' });
    }

    res.status(200).json({
      message: 'Device unregistered successfully',
      device: result.rows[0]
    });
  } catch (error) {
    console.error('Device unregistration error:', error);
    res.status(500).json({ error: 'Failed to unregister device' });
  }
};

exports.getMyDevices = async (req, res) => {
  const entityInfo = getEntityInfo(req);
  if (!entityInfo) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const { deviceType, entityId } = entityInfo;

  try {
    const query = `
      SELECT id, device_name, platform, app_version, is_active, last_used_at, created_at
      FROM user_devices 
      WHERE ${deviceType}_id = $1 AND is_active = true
      ORDER BY last_used_at DESC
    `;
    
    const result = await pool.query(query, [entityId]);

    res.status(200).json({
      devices: result.rows
    });
  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
};

exports.sendNotification = async (req, res) => {
  const { recipientId, recipientType, title, body, type, priority = 'medium', actionUrl, actionData } = req.body;
  
  const entityInfo = getEntityInfo(req);
  if (!entityInfo) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const senderId = entityInfo.entityId;
  const senderType = entityInfo.recipientType;
  const senderName = req.user?.email || 'User';

  if (!recipientId || !recipientType || !title || !body) {
    return res.status(400).json({ error: 'Recipient, title, and body are required' });
  }

  if (!['user', 'law_firm', 'medical_provider'].includes(recipientType)) {
    return res.status(400).json({ error: 'Invalid recipient type' });
  }

  try {
    // Check if notification should be sent based on user preferences and quiet hours
    const prefCheck = await checkNotificationPreferences(recipientType, recipientId, type, priority);
    
    if (!prefCheck.allowed) {
      if (prefCheck.queue) {
        // Get user preferences to calculate when to send
        const prefsResult = await pool.query(
          `SELECT quiet_hours_end, timezone FROM notification_preferences 
           WHERE ${recipientType === 'user' ? 'user_id' : recipientType === 'law_firm' ? 'law_firm_id' : 'medical_provider_id'} = $1`,
          [recipientId]
        );
        
        const prefs = prefsResult.rows[0] || { quiet_hours_end: '08:00', timezone: 'America/New_York' };
        const scheduledFor = calculateQuietHoursEnd(prefs.quiet_hours_end, prefs.timezone);
        
        const queuedNotification = await queueNotification(pool, {
          senderType, senderId, senderName, recipientType, recipientId,
          type, priority, title, body, actionUrl, actionData, scheduledFor
        });
        
        return res.status(202).json({ 
          message: 'Notification queued for later delivery during non-quiet hours',
          reason: prefCheck.reason,
          queuedId: queuedNotification.id,
          scheduledFor: queuedNotification.scheduled_for
        });
      }
      return res.status(403).json({ 
        error: 'Notification blocked by user preferences',
        reason: prefCheck.reason
      });
    }

    // DECOUPLE: Always create notification first, regardless of device availability
    // This enables Firebase real-time sync for web/mobile clients without registered devices
    const notificationQuery = `
      INSERT INTO notifications (
        sender_type, sender_id, sender_name, recipient_type, recipient_id,
        type, priority, title, body, action_url, action_data, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending')
      RETURNING *
    `;
    
    const notificationResult = await pool.query(notificationQuery, [
      senderType, senderId, senderName, recipientType, recipientId,
      type, priority, title, body, actionUrl, JSON.stringify(actionData || {})
    ]);

    const notification = notificationResult.rows[0];
    
    // Check for devices AFTER creating notification (Expo push is optional)
    const deviceQuery = `
      SELECT expo_push_token FROM user_devices 
      WHERE ${recipientType}_id = $1 AND is_active = true
    `;
    const deviceResult = await pool.query(deviceQuery, [recipientId]);

    let devicesSent = 0;
    let pushStatus = 'no_devices';
    
    // Only attempt Expo push notifications if devices are registered
    if (deviceResult.rows.length > 0) {
      const safeActionData = actionData || {};
      const pushPromises = deviceResult.rows.map(device => 
        pushNotificationService.sendPushNotification({
          expoPushToken: device.expo_push_token,
          title,
          body,
          data: {
            notificationId: notification.id,
            type,
            actionUrl,
            ...safeActionData
          },
          priority: priority === 'urgent' ? 'high' : 'default'
        })
      );

      const pushResults = await Promise.allSettled(pushPromises);
      
      const sentSuccessfully = pushResults.filter(r => r.status === 'fulfilled').length > 0;
      devicesSent = pushResults.filter(r => r.status === 'fulfilled').length;
      
      if (sentSuccessfully) {
        await pool.query(
          'UPDATE notifications SET status = $1, sent_at = CURRENT_TIMESTAMP WHERE id = $2',
          ['sent', notification.id]
        );
        notification.status = 'sent';
        pushStatus = 'sent';
      } else {
        await pool.query(
          'UPDATE notifications SET status = $1, failed_reason = $2 WHERE id = $3',
          ['failed', 'All push notifications failed to send', notification.id]
        );
        notification.status = 'failed';
        pushStatus = 'failed';
      }
    } else {
      // No devices registered, but notification is created and will sync to Firebase
      await pool.query(
        'UPDATE notifications SET status = $1, sent_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['sent', notification.id]
      );
      notification.status = 'sent';
      console.log(`ℹ️  No Expo devices for ${recipientType} ${recipientId}, notification will sync to Firebase only`);
    }

    // Send SMS notification if user has SMS enabled and phone number
    let smsSent = false;
    try {
      if (recipientType === 'user') {
        // Get user phone number and SMS preferences
        const userQuery = await pool.query(
          `SELECT u.phone_encrypted, np.sms_notifications_enabled 
           FROM users u
           LEFT JOIN notification_preferences np ON np.user_id = u.id
           WHERE u.id = $1`,
          [recipientId]
        );
        
        if (userQuery.rows.length > 0) {
          const user = userQuery.rows[0];
          // Require explicit SMS opt-in (not just non-false)
          const smsEnabled = user.sms_notifications_enabled === true;
          
          if (user.phone_encrypted && smsEnabled) {
            // Decrypt phone number before sending to Twilio
            const phoneNumber = encryptionService.decrypt(user.phone_encrypted);
            
            if (phoneNumber) {
              // Send SMS for urgent/high priority or specific notification types
              const shouldSendSMS = 
                priority === 'urgent' || 
                priority === 'high' ||
                type === 'task_assigned' ||
                type === 'task_reminder' ||
                type === 'connection_request' ||
                type === 'appointment_reminder' ||
                type === 'deadline_reminder' ||
                type === 'settlement_disbursement' ||
                type === 'payment_received' ||
                type === 'payment_failed' ||
                type === 'payment_processed' ||
                type === 'disbursement_complete';
              
              if (shouldSendSMS) {
                const smsResult = await sendNotificationSMS(
                  phoneNumber,
                  type,
                  title,
                  body,
                  priority
                );
                smsSent = smsResult.success;
                
                if (smsSent) {
                  console.log(`📱 SMS notification sent to user ${recipientId} (phone number redacted for HIPAA)`);
                }
              }
            }
          }
        }
      }
    } catch (smsError) {
      console.error('SMS notification error (non-fatal):', smsError);
    }

    syncNewNotificationToFirebase(notification).catch(err => 
      console.error('Firebase sync error (non-fatal):', err)
    );

    const unreadCount = await getUnreadCountForUser(recipientType, recipientId);
    syncUnreadCountToFirebase(recipientType, recipientId, unreadCount).catch(err =>
      console.error('Firebase unread count sync error (non-fatal):', err)
    );

    res.status(200).json({
      message: devicesSent > 0 
        ? 'Notification sent successfully' 
        : 'Notification created and synced to Firebase (no Expo devices registered)',
      notification,
      devicesSent,
      pushStatus,
      smsSent,
      firebaseSynced: true
    });
  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
};

exports.getMyNotifications = async (req, res) => {
  const { limit = 50, offset = 0, status, type } = req.query;

  const entityInfo = getEntityInfo(req);
  if (!entityInfo) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const { recipientType, entityId: recipientId } = entityInfo;

  try {
    let query = `
      SELECT * FROM notifications 
      WHERE recipient_type = $1 AND recipient_id = $2
    `;
    const params = [recipientType, recipientId];
    let paramIndex = 3;

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (type) {
      query += ` AND type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    const countQuery = `
      SELECT COUNT(*) as total FROM notifications 
      WHERE recipient_type = $1 AND recipient_id = $2
    `;
    const countResult = await pool.query(countQuery, [recipientType, recipientId]);

    // Get sender names for all notifications
    const senderIds = {
      user: [],
      law_firm: [],
      medical_provider: []
    };
    
    result.rows.forEach(n => {
      if (n.sender_type && n.sender_id) {
        if (!senderIds[n.sender_type]) {
          senderIds[n.sender_type] = [];
        }
        if (!senderIds[n.sender_type].includes(n.sender_id)) {
          senderIds[n.sender_type].push(n.sender_id);
        }
      }
    });

    const senderNames = {};

    // Get user sender names
    if (senderIds.user.length > 0) {
      const userQuery = `SELECT id, first_name, last_name, email FROM users WHERE id = ANY($1)`;
      const userResult = await pool.query(userQuery, [senderIds.user]);
      userResult.rows.forEach(u => {
        senderNames[`user_${u.id}`] = u.first_name && u.last_name 
          ? `${u.first_name} ${u.last_name}` 
          : u.email;
      });
    }

    // Get law firm sender names
    if (senderIds.law_firm.length > 0) {
      const lawFirmQuery = `SELECT id, firm_name FROM law_firms WHERE id = ANY($1)`;
      const lawFirmResult = await pool.query(lawFirmQuery, [senderIds.law_firm]);
      lawFirmResult.rows.forEach(lf => {
        senderNames[`law_firm_${lf.id}`] = lf.firm_name;
      });
    }

    // Get medical provider sender names
    if (senderIds.medical_provider.length > 0) {
      const medProviderQuery = `SELECT id, provider_name FROM medical_providers WHERE id = ANY($1)`;
      const medProviderResult = await pool.query(medProviderQuery, [senderIds.medical_provider]);
      medProviderResult.rows.forEach(mp => {
        senderNames[`medical_provider_${mp.id}`] = mp.provider_name;
      });
    }

    const notificationsWithReadFlag = result.rows.map(notification => ({
      ...notification,
      is_read: notification.status === 'read',
      is_clicked: notification.clicked,
      sender_name: notification.sender_type && notification.sender_id 
        ? senderNames[`${notification.sender_type}_${notification.sender_id}`] || 'Unknown'
        : null
    }));

    // Sync all fetched notifications to Firebase to ensure completeness
    // This ensures old notifications get synced with full data
    if (notificationsWithReadFlag.length > 0) {
      const syncPromises = notificationsWithReadFlag.map(notification =>
        syncNotificationToFirebase(notification)
          .catch(err => console.error(`Firebase sync error for notification ${notification.id} (non-fatal):`, err))
      );
      // Don't await - let syncing happen in background
      Promise.allSettled(syncPromises).catch(err => 
        console.error('Firebase batch sync error (non-fatal):', err)
      );
    }

    res.status(200).json({
      notifications: notificationsWithReadFlag,
      total: parseInt(countResult.rows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
};

exports.getNotificationById = async (req, res) => {
  const { notificationId } = req.params;
  
  const entityInfo = getEntityInfo(req);
  if (!entityInfo) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const { recipientType, entityId } = entityInfo;

  try {
    const query = `
      SELECT * FROM notifications 
      WHERE id = $1 
      AND recipient_type = $2 AND recipient_id = $3
    `;
    
    const result = await pool.query(query, [notificationId, recipientType, entityId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    const notification = {
      ...result.rows[0],
      is_read: result.rows[0].status === 'read',
      is_clicked: result.rows[0].clicked
    };

    res.status(200).json({
      success: true,
      notification
    });
  } catch (error) {
    console.error('Get notification error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch notification' });
  }
};

exports.markAsRead = async (req, res) => {
  const { notificationId } = req.params;
  
  const entityInfo = getEntityInfo(req);
  if (!entityInfo) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const { recipientType, entityId } = entityInfo;

  try {
    const query = `
      UPDATE notifications 
      SET status = 'read', read_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 
      AND recipient_type = $2 AND recipient_id = $3
      AND status != 'read'
      RETURNING *
    `;
    
    const result = await pool.query(query, [notificationId, recipientType, entityId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found or already read' });
    }

    const notification = result.rows[0];

    // Sync full notification first (in case it was never synced), then update status
    syncNotificationToFirebase(notification)
      .catch(err => console.error('Firebase full sync error (non-fatal):', err));

    syncUnreadCountToFirebase(recipientType, entityId, await getUnreadCountForUser(recipientType, entityId))
      .catch(err => console.error('Firebase unread count sync error (non-fatal):', err));

    res.status(200).json({
      message: 'Notification marked as read',
      notification
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
};

exports.markAllAsRead = async (req, res) => {
  const entityInfo = getEntityInfo(req);
  if (!entityInfo) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const { recipientType, entityId } = entityInfo;

  try {
    const query = `
      UPDATE notifications 
      SET status = 'read', read_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE recipient_type = $1 AND recipient_id = $2
      AND status != 'read'
      RETURNING *
    `;
    
    const result = await pool.query(query, [recipientType, entityId]);
    const markedCount = result.rows.length;

    // Sync each notification fully to Firebase (in case they were never synced)
    if (markedCount > 0) {
      const syncPromises = result.rows.map(notification => 
        syncNotificationToFirebase(notification)
          .catch(err => console.error(`Firebase sync error for notification ${notification.id} (non-fatal):`, err))
      );
      await Promise.allSettled(syncPromises);

      // Update unread count in Firebase
      syncUnreadCountToFirebase(recipientType, entityId, 0)
        .catch(err => console.error('Firebase unread count sync error (non-fatal):', err));
    }

    res.status(200).json({
      message: `Marked ${markedCount} notification(s) as read`,
      count: markedCount
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
};

exports.markAsClicked = async (req, res) => {
  const { notificationId } = req.params;
  
  const entityInfo = getEntityInfo(req);
  if (!entityInfo) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const { recipientType, entityId } = entityInfo;

  try {
    const query = `
      UPDATE notifications 
      SET clicked = true, clicked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 
      AND recipient_type = $2 AND recipient_id = $3
      RETURNING *
    `;
    
    const result = await pool.query(query, [notificationId, recipientType, entityId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found or unauthorized' });
    }

    const notification = result.rows[0];

    // Sync full notification first (in case it was never synced)
    syncNotificationToFirebase(notification)
      .catch(err => console.error('Firebase sync error (non-fatal):', err));

    res.status(200).json({
      message: 'Notification clicked',
      notification
    });
  } catch (error) {
    console.error('Mark as clicked error:', error);
    res.status(500).json({ error: 'Failed to mark notification as clicked' });
  }
};

exports.getUnreadCount = async (req, res) => {
  const entityInfo = getEntityInfo(req);
  if (!entityInfo) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const { recipientType, entityId: recipientId } = entityInfo;

  try {
    const query = `
      SELECT COUNT(*) as unread_count 
      FROM notifications 
      WHERE recipient_type = $1 AND recipient_id = $2 AND status != 'read'
    `;
    
    const result = await pool.query(query, [recipientType, recipientId]);

    res.status(200).json({
      unreadCount: parseInt(result.rows[0].unread_count)
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
};

exports.sendToAllClients = async (req, res) => {
  const { title, body, type, priority = 'medium', actionUrl, actionData } = req.body;
  
  const entityInfo = getEntityInfo(req);
  if (!entityInfo) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (entityInfo.userType !== 'lawfirm') {
    return res.status(403).json({ error: 'Only law firms can use this endpoint' });
  }

  const lawFirmId = entityInfo.entityId;

  if (!title || !body) {
    return res.status(400).json({ error: 'Title and body are required' });
  }

  try {
    const clientsQuery = `
      SELECT u.id, u.email 
      FROM users u
      JOIN law_firm_clients lfc ON u.id = lfc.client_id
      WHERE lfc.law_firm_id = $1
    `;
    const clientsResult = await pool.query(clientsQuery, [lawFirmId]);

    if (clientsResult.rows.length === 0) {
      return res.status(404).json({ error: 'No clients found' });
    }

    const lawFirmQuery = 'SELECT firm_name FROM law_firms WHERE id = $1';
    const lawFirmResult = await pool.query(lawFirmQuery, [lawFirmId]);
    const senderName = lawFirmResult.rows[0]?.firm_name || 'Law Firm';

    const notificationPromises = clientsResult.rows.map(async (client) => {
      try {
        // Check user preferences for this client
        const prefCheck = await checkNotificationPreferences('user', client.id, type, priority);
        if (!prefCheck.allowed) {
          console.log(`Notification to client ${client.id} blocked:`, prefCheck.reason);
          return { success: false, clientId: client.id, skipped: true, reason: prefCheck.reason };
        }

        const notificationQuery = `
          INSERT INTO notifications (
            sender_type, sender_id, sender_name, recipient_type, recipient_id,
            type, priority, title, body, action_url, action_data
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING *
        `;
        const notificationResult = await pool.query(notificationQuery, [
          'law_firm', lawFirmId, senderName, 'user', client.id,
          type, priority, title, body, actionUrl, JSON.stringify(actionData || {})
        ]);

        const deviceQuery = `
          SELECT expo_push_token FROM user_devices 
          WHERE user_id = $1 AND is_active = true
        `;
        const deviceResult = await pool.query(deviceQuery, [client.id]);

        const safeActionData = actionData || {};
        const pushPromises = deviceResult.rows.map(device =>
          pushNotificationService.sendPushNotification({
            expoPushToken: device.expo_push_token,
            title,
            body,
            data: {
              notificationId: notificationResult.rows[0].id,
              type,
              actionUrl,
              ...safeActionData
            },
            priority: priority === 'urgent' ? 'high' : 'default'
          })
        );

        const notification = notificationResult.rows[0];
        const pushResults = await Promise.allSettled(pushPromises);
        const sentSuccessfully = pushResults.filter(r => r.status === 'fulfilled').length > 0;

        if (pushResults.length === 0) {
          await pool.query(
            'UPDATE notifications SET status = $1, failed_reason = $2 WHERE id = $3',
            ['failed', 'No registered devices found', notification.id]
          );
        } else if (sentSuccessfully) {
          await pool.query(
            'UPDATE notifications SET status = $1, sent_at = CURRENT_TIMESTAMP WHERE id = $2',
            ['sent', notification.id]
          );
        } else {
          await pool.query(
            'UPDATE notifications SET status = $1, failed_reason = $2 WHERE id = $3',
            ['failed', 'All push notifications failed to send', notification.id]
          );
        }

        // Sync to Firebase for real-time updates
        try {
          await syncNewNotificationToFirebase(notification);
          const unreadCount = await getUnreadCountForUser('user', client.id);
          await syncUnreadCountToFirebase('user', client.id, unreadCount);
        } catch (err) {
          console.error(`Firebase sync error for client ${client.id} (non-fatal):`, err);
        }

        return { success: true, clientId: client.id };
      } catch (error) {
        console.error(`Failed to send notification to client ${client.id}:`, error);
        return { success: false, clientId: client.id, error: error.message };
      }
    });

    const results = await Promise.allSettled(notificationPromises);
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;

    res.status(200).json({
      message: `Notifications sent to ${successCount} of ${clientsResult.rows.length} clients`,
      totalClients: clientsResult.rows.length,
      successCount
    });
  } catch (error) {
    console.error('Send to all clients error:', error);
    res.status(500).json({ error: 'Failed to send notifications' });
  }
};

exports.sendToClients = async (req, res) => {
  const { clientIds, title, body, type, priority = 'medium', actionUrl, actionData } = req.body;
  
  const entityInfo = getEntityInfo(req);
  if (!entityInfo) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (entityInfo.userType !== 'lawfirm') {
    return res.status(403).json({ error: 'Only law firms can use this endpoint' });
  }

  const lawFirmId = entityInfo.entityId;

  if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
    return res.status(400).json({ error: 'Client IDs array is required' });
  }

  if (!title || !body) {
    return res.status(400).json({ error: 'Title and body are required' });
  }

  try {
    const verifyQuery = `
      SELECT u.id, u.email 
      FROM users u
      JOIN law_firm_clients lfc ON u.id = lfc.client_id
      WHERE lfc.law_firm_id = $1 AND u.id = ANY($2::int[])
    `;
    const verifyResult = await pool.query(verifyQuery, [lawFirmId, clientIds]);

    if (verifyResult.rows.length === 0) {
      return res.status(403).json({ error: 'None of the selected clients are associated with your law firm' });
    }

    if (verifyResult.rows.length !== clientIds.length) {
      return res.status(403).json({ 
        error: `${clientIds.length - verifyResult.rows.length} of the selected clients are not associated with your law firm` 
      });
    }

    const lawFirmQuery = 'SELECT firm_name FROM law_firms WHERE id = $1';
    const lawFirmResult = await pool.query(lawFirmQuery, [lawFirmId]);
    const senderName = lawFirmResult.rows[0]?.firm_name || 'Law Firm';

    const notificationPromises = verifyResult.rows.map(async (client) => {
      try {
        // Check user preferences for this client
        const prefCheck = await checkNotificationPreferences('user', client.id, type, priority);
        if (!prefCheck.allowed) {
          console.log(`Notification to client ${client.id} blocked:`, prefCheck.reason);
          return { success: false, clientId: client.id, skipped: true, reason: prefCheck.reason };
        }

        const notificationQuery = `
          INSERT INTO notifications (
            sender_type, sender_id, sender_name, recipient_type, recipient_id,
            type, priority, title, body, action_url, action_data
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING *
        `;
        const notificationResult = await pool.query(notificationQuery, [
          'law_firm', lawFirmId, senderName, 'user', client.id,
          type, priority, title, body, actionUrl, JSON.stringify(actionData || {})
        ]);

        const deviceQuery = `
          SELECT expo_push_token FROM user_devices 
          WHERE user_id = $1 AND is_active = true
        `;
        const deviceResult = await pool.query(deviceQuery, [client.id]);

        const safeActionData = actionData || {};
        const pushPromises = deviceResult.rows.map(device =>
          pushNotificationService.sendPushNotification({
            expoPushToken: device.expo_push_token,
            title,
            body,
            data: {
              notificationId: notificationResult.rows[0].id,
              type,
              actionUrl,
              ...safeActionData
            },
            priority: priority === 'urgent' ? 'high' : 'default'
          })
        );

        const notification = notificationResult.rows[0];
        const pushResults = await Promise.allSettled(pushPromises);
        const sentSuccessfully = pushResults.filter(r => r.status === 'fulfilled').length > 0;

        if (pushResults.length === 0) {
          await pool.query(
            'UPDATE notifications SET status = $1, failed_reason = $2 WHERE id = $3',
            ['failed', 'No registered devices found', notification.id]
          );
        } else if (sentSuccessfully) {
          await pool.query(
            'UPDATE notifications SET status = $1, sent_at = CURRENT_TIMESTAMP WHERE id = $2',
            ['sent', notification.id]
          );
        } else {
          await pool.query(
            'UPDATE notifications SET status = $1, failed_reason = $2 WHERE id = $3',
            ['failed', 'All push notifications failed to send', notification.id]
          );
        }

        // Sync to Firebase for real-time updates
        try {
          await syncNewNotificationToFirebase(notification);
          const unreadCount = await getUnreadCountForUser('user', client.id);
          await syncUnreadCountToFirebase('user', client.id, unreadCount);
        } catch (err) {
          console.error(`Firebase sync error for client ${client.id} (non-fatal):`, err);
        }

        return { success: true, clientId: client.id };
      } catch (error) {
        console.error(`Failed to send notification to client ${client.id}:`, error);
        return { success: false, clientId: client.id, error: error.message };
      }
    });

    const results = await Promise.allSettled(notificationPromises);
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;

    res.status(200).json({
      success: true,
      message: `Notifications sent to ${successCount} of ${verifyResult.rows.length} clients`,
      totalClients: verifyResult.rows.length,
      successCount
    });
  } catch (error) {
    console.error('Send to clients error:', error);
    res.status(500).json({ error: 'Failed to send notifications' });
  }
};

exports.sendToClient = async (req, res) => {
  const { clientId, title, body, type, priority = 'medium', actionUrl, actionData } = req.body;
  
  const entityInfo = getEntityInfo(req);
  if (!entityInfo) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (entityInfo.userType !== 'lawfirm') {
    return res.status(403).json({ error: 'Only law firms can use this endpoint' });
  }

  const lawFirmId = entityInfo.entityId;

  if (!clientId || !title || !body) {
    return res.status(400).json({ error: 'Client ID, title, and body are required' });
  }

  try {
    const verifyQuery = `
      SELECT 1 FROM law_firm_clients 
      WHERE law_firm_id = $1 AND user_id = $2
    `;
    const verifyResult = await pool.query(verifyQuery, [lawFirmId, clientId]);

    if (verifyResult.rows.length === 0) {
      return res.status(403).json({ error: 'Client not associated with your law firm' });
    }

    const lawFirmQuery = 'SELECT firm_name FROM law_firms WHERE id = $1';
    const lawFirmResult = await pool.query(lawFirmQuery, [lawFirmId]);
    const senderName = lawFirmResult.rows[0]?.firm_name || 'Law Firm';

    // Check if notification should be sent based on user preferences and quiet hours
    const prefCheck = await checkNotificationPreferences('user', clientId, type, priority);
    
    if (!prefCheck.allowed) {
      if (prefCheck.queue) {
        // Get user preferences to calculate when to send
        const prefsResult = await pool.query(
          `SELECT quiet_hours_end, timezone FROM notification_preferences WHERE user_id = $1`,
          [clientId]
        );
        
        const prefs = prefsResult.rows[0] || { quiet_hours_end: '08:00', timezone: 'America/New_York' };
        const scheduledFor = calculateQuietHoursEnd(prefs.quiet_hours_end, prefs.timezone);
        
        const queuedNotification = await queueNotification(pool, {
          senderType: 'law_firm', senderId: lawFirmId, senderName,
          recipientType: 'user', recipientId: clientId,
          type, priority, title, body, actionUrl, actionData, scheduledFor
        });
        
        return res.status(202).json({ 
          message: 'Notification queued for later delivery during non-quiet hours',
          reason: prefCheck.reason,
          queuedId: queuedNotification.id,
          scheduledFor: queuedNotification.scheduled_for
        });
      }
      return res.status(403).json({ 
        error: 'Notification blocked by user preferences',
        reason: prefCheck.reason
      });
    }

    const notificationQuery = `
      INSERT INTO notifications (
        sender_type, sender_id, sender_name, recipient_type, recipient_id,
        type, priority, title, body, action_url, action_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    const notificationResult = await pool.query(notificationQuery, [
      'law_firm', lawFirmId, senderName, 'user', clientId,
      type, priority, title, body, actionUrl, JSON.stringify(actionData || {})
    ]);

    const deviceQuery = `
      SELECT expo_push_token FROM user_devices 
      WHERE user_id = $1 AND is_active = true
    `;
    const deviceResult = await pool.query(deviceQuery, [clientId]);

    const notification = notificationResult.rows[0];
    const safeActionData = actionData || {};
    const pushPromises = deviceResult.rows.map(device =>
      pushNotificationService.sendPushNotification({
        expoPushToken: device.expo_push_token,
        title,
        body,
        data: {
          notificationId: notification.id,
          type,
          actionUrl,
          ...safeActionData
        },
        priority: priority === 'urgent' ? 'high' : 'default'
      })
    );

    const pushResults = await Promise.allSettled(pushPromises);
    const sentSuccessfully = pushResults.filter(r => r.status === 'fulfilled').length > 0;

    if (pushResults.length === 0) {
      await pool.query(
        'UPDATE notifications SET status = $1, failed_reason = $2 WHERE id = $3',
        ['failed', 'No registered devices found', notification.id]
      );
    } else if (sentSuccessfully) {
      await pool.query(
        'UPDATE notifications SET status = $1, sent_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['sent', notification.id]
      );
    } else {
      await pool.query(
        'UPDATE notifications SET status = $1, failed_reason = $2 WHERE id = $3',
        ['failed', 'All push notifications failed to send', notification.id]
      );
    }

    // Sync to Firebase for real-time updates
    console.log('📤 Attempting to sync notification to Firebase:', notification.id);
    try {
      await syncNewNotificationToFirebase(notification);
      console.log('✅ Notification synced to Firebase successfully');
    } catch (err) {
      console.error('❌ Firebase sync error (non-fatal):', err);
    }
    
    const unreadCount = await getUnreadCountForUser('user', clientId);
    console.log('📤 Attempting to sync unread count to Firebase:', unreadCount);
    try {
      await syncUnreadCountToFirebase('user', clientId, unreadCount);
      console.log('✅ Unread count synced to Firebase successfully');
    } catch (err) {
      console.error('❌ Firebase unread count sync error (non-fatal):', err);
    }

    res.status(200).json({
      message: 'Notification sent successfully',
      notification,
      devicesReached: pushResults.filter(r => r.status === 'fulfilled').length
    });
  } catch (error) {
    console.error('Send to client error:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
};

exports.sendToAllPatients = async (req, res) => {
  const { title, body, type, priority = 'medium', actionUrl, actionData } = req.body;
  
  const entityInfo = getEntityInfo(req);
  if (!entityInfo) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (entityInfo.userType !== 'medical_provider') {
    return res.status(403).json({ error: 'Only medical providers can use this endpoint' });
  }

  const medicalProviderId = entityInfo.entityId;

  if (!title || !body) {
    return res.status(400).json({ error: 'Title and body are required' });
  }

  try {
    const patientsQuery = `
      SELECT u.id, u.email 
      FROM users u
      JOIN medical_provider_patients mpp ON u.id = mpp.patient_id
      WHERE mpp.medical_provider_id = $1
    `;
    const patientsResult = await pool.query(patientsQuery, [medicalProviderId]);

    if (patientsResult.rows.length === 0) {
      return res.status(404).json({ error: 'No patients found' });
    }

    const providerQuery = 'SELECT provider_name FROM medical_providers WHERE id = $1';
    const providerResult = await pool.query(providerQuery, [medicalProviderId]);
    const senderName = providerResult.rows[0]?.provider_name || 'Medical Provider';

    const notificationPromises = patientsResult.rows.map(async (patient) => {
      try {
        // Check user preferences for this patient
        const prefCheck = await checkNotificationPreferences('user', patient.id, type, priority);
        if (!prefCheck.allowed) {
          console.log(`Notification to patient ${patient.id} blocked:`, prefCheck.reason);
          return { success: false, patientId: patient.id, skipped: true, reason: prefCheck.reason };
        }

        const notificationQuery = `
          INSERT INTO notifications (
            sender_type, sender_id, sender_name, recipient_type, recipient_id,
            type, priority, title, body, action_url, action_data
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING *
        `;
        const notificationResult = await pool.query(notificationQuery, [
          'medical_provider', medicalProviderId, senderName, 'user', patient.id,
          type, priority, title, body, actionUrl, JSON.stringify(actionData || {})
        ]);

        const deviceQuery = `
          SELECT expo_push_token FROM user_devices 
          WHERE user_id = $1 AND is_active = true
        `;
        const deviceResult = await pool.query(deviceQuery, [patient.id]);

        const safeActionData = actionData || {};
        const pushPromises = deviceResult.rows.map(device =>
          pushNotificationService.sendPushNotification({
            expoPushToken: device.expo_push_token,
            title,
            body,
            data: {
              notificationId: notificationResult.rows[0].id,
              type,
              actionUrl,
              ...safeActionData
            },
            priority: priority === 'urgent' ? 'high' : 'default'
          })
        );

        const notification = notificationResult.rows[0];
        const pushResults = await Promise.allSettled(pushPromises);
        const sentSuccessfully = pushResults.filter(r => r.status === 'fulfilled').length > 0;

        if (pushResults.length === 0) {
          await pool.query(
            'UPDATE notifications SET status = $1, failed_reason = $2 WHERE id = $3',
            ['failed', 'No registered devices found', notification.id]
          );
        } else if (sentSuccessfully) {
          await pool.query(
            'UPDATE notifications SET status = $1, sent_at = CURRENT_TIMESTAMP WHERE id = $2',
            ['sent', notification.id]
          );
        } else {
          await pool.query(
            'UPDATE notifications SET status = $1, failed_reason = $2 WHERE id = $3',
            ['failed', 'All push notifications failed to send', notification.id]
          );
        }

        // Sync to Firebase for real-time updates
        try {
          await syncNewNotificationToFirebase(notification);
          const unreadCount = await getUnreadCountForUser('user', patient.id);
          await syncUnreadCountToFirebase('user', patient.id, unreadCount);
        } catch (err) {
          console.error(`Firebase sync error for patient ${patient.id} (non-fatal):`, err);
        }

        return { success: true, patientId: patient.id };
      } catch (error) {
        console.error(`Failed to send notification to patient ${patient.id}:`, error);
        return { success: false, patientId: patient.id, error: error.message };
      }
    });

    const results = await Promise.allSettled(notificationPromises);
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;

    res.status(200).json({
      message: `Notifications sent to ${successCount} of ${patientsResult.rows.length} patients`,
      totalPatients: patientsResult.rows.length,
      successCount
    });
  } catch (error) {
    console.error('Send to all patients error:', error);
    res.status(500).json({ error: 'Failed to send notifications' });
  }
};

exports.sendToPatients = async (req, res) => {
  const { patientIds, title, body, type, priority = 'medium', actionUrl, actionData } = req.body;
  
  const entityInfo = getEntityInfo(req);
  if (!entityInfo) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (entityInfo.userType !== 'medical_provider') {
    return res.status(403).json({ error: 'Only medical providers can use this endpoint' });
  }

  const medicalProviderId = entityInfo.entityId;

  if (!patientIds || !Array.isArray(patientIds) || patientIds.length === 0) {
    return res.status(400).json({ error: 'Patient IDs array is required' });
  }

  if (!title || !body) {
    return res.status(400).json({ error: 'Title and body are required' });
  }

  try {
    const verifyQuery = `
      SELECT u.id, u.email 
      FROM users u
      JOIN medical_provider_patients mpp ON u.id = mpp.patient_id
      WHERE mpp.medical_provider_id = $1 AND u.id = ANY($2::int[])
    `;
    const verifyResult = await pool.query(verifyQuery, [medicalProviderId, patientIds]);

    if (verifyResult.rows.length === 0) {
      return res.status(403).json({ error: 'None of the selected patients are associated with your medical practice' });
    }

    if (verifyResult.rows.length !== patientIds.length) {
      return res.status(403).json({ 
        error: `${patientIds.length - verifyResult.rows.length} of the selected patients are not associated with your medical practice` 
      });
    }

    const providerQuery = 'SELECT provider_name FROM medical_providers WHERE id = $1';
    const providerResult = await pool.query(providerQuery, [medicalProviderId]);
    const senderName = providerResult.rows[0]?.provider_name || 'Medical Provider';

    const notificationPromises = verifyResult.rows.map(async (patient) => {
      try {
        // Check user preferences for this patient
        const prefCheck = await checkNotificationPreferences('user', patient.id, type, priority);
        if (!prefCheck.allowed) {
          console.log(`Notification to patient ${patient.id} blocked:`, prefCheck.reason);
          return { success: false, patientId: patient.id, skipped: true, reason: prefCheck.reason };
        }

        const notificationQuery = `
          INSERT INTO notifications (
            sender_type, sender_id, sender_name, recipient_type, recipient_id,
            type, priority, title, body, action_url, action_data
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING *
        `;
        const notificationResult = await pool.query(notificationQuery, [
          'medical_provider', medicalProviderId, senderName, 'user', patient.id,
          type, priority, title, body, actionUrl, JSON.stringify(actionData || {})
        ]);

        const deviceQuery = `
          SELECT expo_push_token FROM user_devices 
          WHERE user_id = $1 AND is_active = true
        `;
        const deviceResult = await pool.query(deviceQuery, [patient.id]);

        const safeActionData = actionData || {};
        const pushPromises = deviceResult.rows.map(device =>
          pushNotificationService.sendPushNotification({
            expoPushToken: device.expo_push_token,
            title,
            body,
            data: {
              notificationId: notificationResult.rows[0].id,
              type,
              actionUrl,
              ...safeActionData
            },
            priority: priority === 'urgent' ? 'high' : 'default'
          })
        );

        const notification = notificationResult.rows[0];
        const pushResults = await Promise.allSettled(pushPromises);
        const sentSuccessfully = pushResults.filter(r => r.status === 'fulfilled').length > 0;

        if (pushResults.length === 0) {
          await pool.query(
            'UPDATE notifications SET status = $1, failed_reason = $2 WHERE id = $3',
            ['failed', 'No registered devices found', notification.id]
          );
        } else if (sentSuccessfully) {
          await pool.query(
            'UPDATE notifications SET status = $1, sent_at = CURRENT_TIMESTAMP WHERE id = $2',
            ['sent', notification.id]
          );
        } else {
          await pool.query(
            'UPDATE notifications SET status = $1, failed_reason = $2 WHERE id = $3',
            ['failed', 'All push notifications failed to send', notification.id]
          );
        }

        // Sync to Firebase for real-time updates
        try {
          await syncNewNotificationToFirebase(notification);
          const unreadCount = await getUnreadCountForUser('user', patient.id);
          await syncUnreadCountToFirebase('user', patient.id, unreadCount);
        } catch (err) {
          console.error(`Firebase sync error for patient ${patient.id} (non-fatal):`, err);
        }

        return { success: true, patientId: patient.id };
      } catch (error) {
        console.error(`Failed to send notification to patient ${patient.id}:`, error);
        return { success: false, patientId: patient.id, error: error.message };
      }
    });

    const results = await Promise.allSettled(notificationPromises);
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;

    res.status(200).json({
      success: true,
      message: `Notifications sent to ${successCount} of ${verifyResult.rows.length} patients`,
      totalPatients: verifyResult.rows.length,
      successCount
    });
  } catch (error) {
    console.error('Send to patients error:', error);
    res.status(500).json({ error: 'Failed to send notifications' });
  }
};

exports.sendToPatient = async (req, res) => {
  const { patientId, title, body, type, priority = 'medium', actionUrl, actionData } = req.body;
  
  const entityInfo = getEntityInfo(req);
  if (!entityInfo) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (entityInfo.userType !== 'medical_provider') {
    return res.status(403).json({ error: 'Only medical providers can use this endpoint' });
  }

  const medicalProviderId = entityInfo.entityId;

  if (!patientId || !title || !body) {
    return res.status(400).json({ error: 'Patient ID, title, and body are required' });
  }

  try {
    const verifyQuery = `
      SELECT 1 FROM medical_provider_patients 
      WHERE medical_provider_id = $1 AND user_id = $2
    `;
    const verifyResult = await pool.query(verifyQuery, [medicalProviderId, patientId]);

    if (verifyResult.rows.length === 0) {
      return res.status(403).json({ error: 'Patient not associated with your practice' });
    }

    const providerQuery = 'SELECT provider_name FROM medical_providers WHERE id = $1';
    const providerResult = await pool.query(providerQuery, [medicalProviderId]);
    const senderName = providerResult.rows[0]?.provider_name || 'Medical Provider';

    // Check if notification should be sent based on user preferences and quiet hours
    const prefCheck = await checkNotificationPreferences('user', patientId, type, priority);
    
    if (!prefCheck.allowed) {
      if (prefCheck.queue) {
        // Get user preferences to calculate when to send
        const prefsResult = await pool.query(
          `SELECT quiet_hours_end, timezone FROM notification_preferences WHERE user_id = $1`,
          [patientId]
        );
        
        const prefs = prefsResult.rows[0] || { quiet_hours_end: '08:00', timezone: 'America/New_York' };
        const scheduledFor = calculateQuietHoursEnd(prefs.quiet_hours_end, prefs.timezone);
        
        const queuedNotification = await queueNotification(pool, {
          senderType: 'medical_provider', senderId: medicalProviderId, senderName,
          recipientType: 'user', recipientId: patientId,
          type, priority, title, body, actionUrl, actionData, scheduledFor
        });
        
        return res.status(202).json({ 
          message: 'Notification queued for later delivery during non-quiet hours',
          reason: prefCheck.reason,
          queuedId: queuedNotification.id,
          scheduledFor: queuedNotification.scheduled_for
        });
      }
      return res.status(403).json({ 
        error: 'Notification blocked by user preferences',
        reason: prefCheck.reason
      });
    }

    const notificationQuery = `
      INSERT INTO notifications (
        sender_type, sender_id, sender_name, recipient_type, recipient_id,
        type, priority, title, body, action_url, action_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    const notificationResult = await pool.query(notificationQuery, [
      'medical_provider', medicalProviderId, senderName, 'user', patientId,
      type, priority, title, body, actionUrl, JSON.stringify(actionData || {})
    ]);

    const deviceQuery = `
      SELECT expo_push_token FROM user_devices 
      WHERE user_id = $1 AND is_active = true
    `;
    const deviceResult = await pool.query(deviceQuery, [patientId]);

    const notification = notificationResult.rows[0];
    const safeActionData = actionData || {};
    const pushPromises = deviceResult.rows.map(device =>
      pushNotificationService.sendPushNotification({
        expoPushToken: device.expo_push_token,
        title,
        body,
        data: {
          notificationId: notification.id,
          type,
          actionUrl,
          ...safeActionData
        },
        priority: priority === 'urgent' ? 'high' : 'default'
      })
    );

    const pushResults = await Promise.allSettled(pushPromises);
    const sentSuccessfully = pushResults.filter(r => r.status === 'fulfilled').length > 0;

    if (pushResults.length === 0) {
      await pool.query(
        'UPDATE notifications SET status = $1, failed_reason = $2 WHERE id = $3',
        ['failed', 'No registered devices found', notification.id]
      );
    } else if (sentSuccessfully) {
      await pool.query(
        'UPDATE notifications SET status = $1, sent_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['sent', notification.id]
      );
    } else {
      await pool.query(
        'UPDATE notifications SET status = $1, failed_reason = $2 WHERE id = $3',
        ['failed', 'All push notifications failed to send', notification.id]
      );
    }

    // Sync to Firebase for real-time updates
    console.log('📤 Attempting to sync notification to Firebase:', notification.id);
    try {
      await syncNewNotificationToFirebase(notification);
      console.log('✅ Notification synced to Firebase successfully');
    } catch (err) {
      console.error('❌ Firebase sync error (non-fatal):', err);
    }
    
    const unreadCount = await getUnreadCountForUser('user', patientId);
    console.log('📤 Attempting to sync unread count to Firebase:', unreadCount);
    try {
      await syncUnreadCountToFirebase('user', patientId, unreadCount);
      console.log('✅ Unread count synced to Firebase successfully');
    } catch (err) {
      console.error('❌ Firebase unread count sync error (non-fatal):', err);
    }

    res.status(200).json({
      message: 'Notification sent successfully',
      notification,
      devicesReached: pushResults.filter(r => r.status === 'fulfilled').length
    });
  } catch (error) {
    console.error('Send to patient error:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
};

exports.getMyNotificationStats = async (req, res) => {
  const { startDate, endDate } = req.query;
  
  const entityInfo = getEntityInfo(req);
  if (!entityInfo) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { recipientType, entityId } = entityInfo;

  if (recipientType === 'user') {
    return res.status(403).json({ error: 'This endpoint is only for law firms and medical providers' });
  }

  try {
    let dateFilter = '';
    const queryParams = [recipientType, entityId];
    
    if (startDate) {
      queryParams.push(startDate);
      dateFilter += ` AND created_at >= $${queryParams.length}`;
    }
    
    if (endDate) {
      queryParams.push(endDate);
      dateFilter += ` AND created_at <= $${queryParams.length}`;
    }

    const statsQuery = `
      SELECT 
        COUNT(*) as total_sent,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as delivered,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        COUNT(CASE WHEN status = 'read' THEN 1 END) as read_count,
        COUNT(CASE WHEN clicked = true THEN 1 END) as click_count,
        COUNT(CASE WHEN priority = 'urgent' THEN 1 END) as urgent_count,
        COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_count,
        COUNT(CASE WHEN priority = 'medium' THEN 1 END) as medium_count,
        COUNT(CASE WHEN priority = 'low' THEN 1 END) as low_count
      FROM notifications
      WHERE sender_type = $1 AND sender_id = $2${dateFilter}
    `;

    const statsResult = await pool.query(statsQuery, queryParams);
    const stats = statsResult.rows[0];

    const typeBreakdownQuery = `
      SELECT 
        type,
        COUNT(*) as count,
        COUNT(CASE WHEN status = 'read' THEN 1 END) as read_count,
        COUNT(CASE WHEN clicked = true THEN 1 END) as click_count
      FROM notifications
      WHERE sender_type = $1 AND sender_id = $2${dateFilter}
      GROUP BY type
      ORDER BY count DESC
    `;

    const typeBreakdownResult = await pool.query(typeBreakdownQuery, queryParams);

    const totalSent = parseInt(stats.total_sent);
    const delivered = parseInt(stats.delivered);
    const readCount = parseInt(stats.read_count);
    const clickCount = parseInt(stats.click_count);

    res.status(200).json({
      overview: {
        totalSent,
        delivered,
        failed: parseInt(stats.failed),
        deliveryRate: totalSent > 0 ? ((delivered / totalSent) * 100).toFixed(2) + '%' : '0%',
        readRate: delivered > 0 ? ((readCount / delivered) * 100).toFixed(2) + '%' : '0%',
        clickThroughRate: readCount > 0 ? ((clickCount / readCount) * 100).toFixed(2) + '%' : '0%'
      },
      priorityDistribution: {
        urgent: parseInt(stats.urgent_count),
        high: parseInt(stats.high_count),
        medium: parseInt(stats.medium_count),
        low: parseInt(stats.low_count)
      },
      typeBreakdown: typeBreakdownResult.rows.map(row => ({
        type: row.type,
        count: parseInt(row.count),
        readCount: parseInt(row.read_count),
        clickCount: parseInt(row.click_count),
        readRate: parseInt(row.count) > 0 ? ((parseInt(row.read_count) / parseInt(row.count)) * 100).toFixed(2) + '%' : '0%',
        clickRate: parseInt(row.read_count) > 0 ? ((parseInt(row.click_count) / parseInt(row.read_count)) * 100).toFixed(2) + '%' : '0%'
      }))
    });
  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({ error: 'Failed to get notification statistics' });
  }
};

exports.getNotificationHistory = async (req, res) => {
  const { recipientId, startDate, endDate, type, priority, deliveryStatus, limit = 100, offset = 0 } = req.query;
  
  const entityInfo = getEntityInfo(req);
  if (!entityInfo) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { recipientType, entityId } = entityInfo;

  if (recipientType === 'user') {
    return res.status(403).json({ error: 'This endpoint is only for law firms and medical providers' });
  }

  try {
    const filters = [];
    const queryParams = [recipientType, entityId];
    
    filters.push(`sender_type = $1 AND sender_id = $2`);
    
    if (recipientId) {
      queryParams.push(recipientId);
      filters.push(`recipient_id = $${queryParams.length}`);
    }
    
    if (startDate) {
      queryParams.push(startDate);
      filters.push(`created_at >= $${queryParams.length}`);
    }
    
    if (endDate) {
      queryParams.push(endDate);
      filters.push(`created_at <= $${queryParams.length}`);
    }
    
    if (type) {
      queryParams.push(type);
      filters.push(`type = $${queryParams.length}`);
    }
    
    if (priority) {
      queryParams.push(priority);
      filters.push(`priority = $${queryParams.length}`);
    }
    
    if (deliveryStatus) {
      queryParams.push(deliveryStatus);
      // delivery_status column removed - using status instead
    }

    queryParams.push(limit);
    const limitParam = `$${queryParams.length}`;
    
    queryParams.push(offset);
    const offsetParam = `$${queryParams.length}`;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM notifications
      WHERE ${filters.join(' AND ')}
    `;
    
    const countResult = await pool.query(countQuery, queryParams.slice(0, -2));

    const historyQuery = `
      SELECT 
        id, recipient_id, recipient_type, type, priority, title, body,
        status, clicked, created_at, read_at, clicked_at
      FROM notifications
      WHERE ${filters.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT ${limitParam} OFFSET ${offsetParam}
    `;

    const historyResult = await pool.query(historyQuery, queryParams);

    res.status(200).json({
      total: parseInt(countResult.rows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset),
      notifications: historyResult.rows
    });
  } catch (error) {
    console.error('Get notification history error:', error);
    res.status(500).json({ error: 'Failed to get notification history' });
  }
};

exports.getPreferences = async (req, res) => {
  const entityInfo = getEntityInfo(req);
  if (!entityInfo) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const { deviceType, entityId } = entityInfo;

  try {
    let query, idField;
    
    if (deviceType === 'user') {
      idField = 'user_id';
    } else if (deviceType === 'law_firm') {
      idField = 'law_firm_id';
    } else {
      idField = 'medical_provider_id';
    }

    query = `SELECT * FROM notification_preferences WHERE ${idField} = $1`;
    let result = await pool.query(query, [entityId]);

    if (result.rows.length === 0) {
      const insertQuery = `
        INSERT INTO notification_preferences (${idField})
        VALUES ($1)
        RETURNING *
      `;
      result = await pool.query(insertQuery, [entityId]);
    }

    const prefs = result.rows[0];

    res.json({
      push_notifications_enabled: prefs.push_notifications_enabled,
      email_notifications_enabled: prefs.email_notifications_enabled,
      sms_notifications_enabled: prefs.sms_notifications_enabled,
      quiet_hours_enabled: prefs.quiet_hours_enabled,
      quiet_hours_start: prefs.quiet_hours_start,
      quiet_hours_end: prefs.quiet_hours_end,
      timezone: prefs.timezone,
      urgent_notifications: prefs.urgent_notifications,
      task_notifications: prefs.task_notifications,
      system_notifications: prefs.system_notifications,
      marketing_notifications: prefs.marketing_notifications
    });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ error: 'Failed to fetch notification preferences' });
  }
};

exports.updatePreferences = async (req, res) => {
  const entityInfo = getEntityInfo(req);
  if (!entityInfo) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const { deviceType, entityId } = entityInfo;
  const {
    push_notifications_enabled,
    email_notifications_enabled,
    sms_notifications_enabled,
    quiet_hours_enabled,
    quiet_hours_start,
    quiet_hours_end,
    timezone,
    urgent_notifications,
    task_notifications,
    system_notifications,
    marketing_notifications
  } = req.body;

  try {
    let idField;
    
    if (deviceType === 'user') {
      idField = 'user_id';
    } else if (deviceType === 'law_firm') {
      idField = 'law_firm_id';
    } else {
      idField = 'medical_provider_id';
    }

    const checkQuery = `SELECT id FROM notification_preferences WHERE ${idField} = $1`;
    const checkResult = await pool.query(checkQuery, [entityId]);

    let result;
    
    if (checkResult.rows.length === 0) {
      const insertQuery = `
        INSERT INTO notification_preferences (
          ${idField},
          push_notifications_enabled,
          email_notifications_enabled,
          sms_notifications_enabled,
          quiet_hours_enabled,
          quiet_hours_start,
          quiet_hours_end,
          timezone,
          urgent_notifications,
          task_notifications,
          system_notifications,
          marketing_notifications
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;
      result = await pool.query(insertQuery, [
        entityId,
        push_notifications_enabled !== undefined ? push_notifications_enabled : true,
        email_notifications_enabled !== undefined ? email_notifications_enabled : true,
        sms_notifications_enabled !== undefined ? sms_notifications_enabled : false,
        quiet_hours_enabled !== undefined ? quiet_hours_enabled : false,
        quiet_hours_start || '22:00:00',
        quiet_hours_end || '08:00:00',
        timezone || 'America/New_York',
        urgent_notifications !== undefined ? urgent_notifications : true,
        task_notifications !== undefined ? task_notifications : true,
        system_notifications !== undefined ? system_notifications : true,
        marketing_notifications !== undefined ? marketing_notifications : false
      ]);
    } else {
      const updates = [];
      const values = [];
      let paramIndex = 1;

      if (push_notifications_enabled !== undefined) {
        updates.push(`push_notifications_enabled = $${paramIndex++}`);
        values.push(push_notifications_enabled);
      }
      if (email_notifications_enabled !== undefined) {
        updates.push(`email_notifications_enabled = $${paramIndex++}`);
        values.push(email_notifications_enabled);
      }
      if (sms_notifications_enabled !== undefined) {
        updates.push(`sms_notifications_enabled = $${paramIndex++}`);
        values.push(sms_notifications_enabled);
      }
      if (quiet_hours_enabled !== undefined) {
        updates.push(`quiet_hours_enabled = $${paramIndex++}`);
        values.push(quiet_hours_enabled);
      }
      if (quiet_hours_start !== undefined) {
        updates.push(`quiet_hours_start = $${paramIndex++}`);
        values.push(quiet_hours_start);
      }
      if (quiet_hours_end !== undefined) {
        updates.push(`quiet_hours_end = $${paramIndex++}`);
        values.push(quiet_hours_end);
      }
      if (timezone !== undefined) {
        updates.push(`timezone = $${paramIndex++}`);
        values.push(timezone);
      }
      if (urgent_notifications !== undefined) {
        updates.push(`urgent_notifications = $${paramIndex++}`);
        values.push(urgent_notifications);
      }
      if (task_notifications !== undefined) {
        updates.push(`task_notifications = $${paramIndex++}`);
        values.push(task_notifications);
      }
      if (system_notifications !== undefined) {
        updates.push(`system_notifications = $${paramIndex++}`);
        values.push(system_notifications);
      }
      if (marketing_notifications !== undefined) {
        updates.push(`marketing_notifications = $${paramIndex++}`);
        values.push(marketing_notifications);
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(entityId);

      const updateQuery = `
        UPDATE notification_preferences
        SET ${updates.join(', ')}
        WHERE ${idField} = $${paramIndex}
        RETURNING *
      `;
      
      result = await pool.query(updateQuery, values);
    }

    const prefs = result.rows[0];

    res.json({
      message: 'Notification preferences updated successfully',
      preferences: {
        push_notifications_enabled: prefs.push_notifications_enabled,
        email_notifications_enabled: prefs.email_notifications_enabled,
        sms_notifications_enabled: prefs.sms_notifications_enabled,
        quiet_hours_enabled: prefs.quiet_hours_enabled,
        quiet_hours_start: prefs.quiet_hours_start,
        quiet_hours_end: prefs.quiet_hours_end,
        timezone: prefs.timezone,
        urgent_notifications: prefs.urgent_notifications,
        task_notifications: prefs.task_notifications,
        system_notifications: prefs.system_notifications,
        marketing_notifications: prefs.marketing_notifications
      }
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
};

exports.getNotificationAnalytics = async (req, res) => {
  try {
    const entityInfo = getEntityInfo(req);
    if (!entityInfo) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { deviceType, entityId } = entityInfo;
    const { timeRange = '7days', clientId } = req.query;

    // Only law firms and medical providers can view analytics
    if (deviceType !== 'law_firm' && deviceType !== 'medical_provider') {
      return res.status(403).json({ error: 'Only law firms and medical providers can view analytics' });
    }

    // Calculate date range
    let daysAgo;
    switch (timeRange) {
      case '7days':
        daysAgo = 7;
        break;
      case '30days':
        daysAgo = 30;
        break;
      case '90days':
        daysAgo = 90;
        break;
      default:
        daysAgo = 7;
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    // Build query conditions
    const senderType = deviceType === 'law_firm' ? 'law_firm' : 'medical_provider';
    const conditions = ['sender_type = $1', 'sender_id = $2', 'created_at >= $3'];
    const params = [senderType, entityId, startDate];

    // Add client filter if provided
    if (clientId) {
      conditions.push(`recipient_id = $${params.length + 1}`);
      params.push(parseInt(clientId));
    }

    const whereClause = conditions.join(' AND ');

    // Get analytics data
    const analyticsQuery = `
      SELECT 
        COUNT(*) as total_sent,
        COUNT(delivered_at) as total_delivered,
        COUNT(read_at) as total_read,
        COUNT(clicked_at) as total_clicked,
        COUNT(CASE WHEN priority = 'urgent' THEN 1 END) as urgent_count,
        COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_count,
        COUNT(CASE WHEN priority = 'medium' THEN 1 END) as medium_count,
        COUNT(CASE WHEN priority = 'low' THEN 1 END) as low_count,
        COUNT(CASE WHEN type = 'task_assigned' THEN 1 END) as task_assigned_count,
        COUNT(CASE WHEN type = 'task_reminder' THEN 1 END) as task_reminder_count,
        COUNT(CASE WHEN type = 'document_request' THEN 1 END) as document_request_count,
        COUNT(CASE WHEN type = 'deadline_reminder' THEN 1 END) as deadline_reminder_count,
        COUNT(CASE WHEN type = 'appointment_reminder' THEN 1 END) as appointment_reminder_count,
        COUNT(CASE WHEN type = 'general' THEN 1 END) as general_count
      FROM notifications
      WHERE ${whereClause}
    `;

    const analyticsResult = await pool.query(analyticsQuery, params);
    const stats = analyticsResult.rows[0];

    // Get recent notifications for activity timeline
    const recentQuery = `
      SELECT 
        id,
        recipient_id,
        title,
        type,
        priority,
        created_at,
        delivered_at,
        read_at,
        clicked_at
      FROM notifications
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT 20
    `;

    const recentResult = await pool.query(recentQuery, params);

    // Get recipient names for recent notifications
    const recipientIds = [...new Set(recentResult.rows.map(n => n.recipient_id))];
    const recipientNames = {};

    if (recipientIds.length > 0) {
      const recipientsQuery = `
        SELECT id, first_name, last_name 
        FROM users 
        WHERE id = ANY($1)
      `;
      const recipientsResult = await pool.query(recipientsQuery, [recipientIds]);
      recipientsResult.rows.forEach(r => {
        recipientNames[r.id] = `${r.first_name} ${r.last_name}`;
      });
    }

    const recentNotifications = recentResult.rows.map(n => ({
      id: n.id,
      recipientId: n.recipient_id,
      recipientName: recipientNames[n.recipient_id] || 'Unknown',
      title: n.title,
      type: n.type,
      priority: n.priority,
      createdAt: n.created_at,
      deliveredAt: n.delivered_at,
      readAt: n.read_at,
      clickedAt: n.clicked_at,
      status: n.clicked_at ? 'clicked' : n.read_at ? 'read' : n.delivered_at ? 'delivered' : 'sent'
    }));

    res.json({
      success: true,
      analytics: {
        totalSent: parseInt(stats.total_sent) || 0,
        totalDelivered: parseInt(stats.total_delivered) || 0,
        totalRead: parseInt(stats.total_read) || 0,
        totalClicked: parseInt(stats.total_clicked) || 0,
        byPriority: {
          urgent: parseInt(stats.urgent_count) || 0,
          high: parseInt(stats.high_count) || 0,
          medium: parseInt(stats.medium_count) || 0,
          low: parseInt(stats.low_count) || 0
        },
        byType: {
          taskAssigned: parseInt(stats.task_assigned_count) || 0,
          taskReminder: parseInt(stats.task_reminder_count) || 0,
          documentRequest: parseInt(stats.document_request_count) || 0,
          deadlineReminder: parseInt(stats.deadline_reminder_count) || 0,
          appointmentReminder: parseInt(stats.appointment_reminder_count) || 0,
          general: parseInt(stats.general_count) || 0
        },
        recentNotifications: recentNotifications
      },
      timeRange,
      clientId: clientId || null
    });
  } catch (error) {
    console.error('Error fetching notification analytics:', error);
    res.status(500).json({ error: 'Failed to fetch notification analytics' });
  }
};
