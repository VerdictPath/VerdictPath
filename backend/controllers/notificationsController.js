const { Pool } = require('pg');
const pushNotificationService = require('../services/pushNotificationService');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

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
    const deviceQuery = `
      SELECT expo_push_token FROM user_devices 
      WHERE ${recipientType}_id = $1 AND is_active = true
    `;
    const deviceResult = await pool.query(deviceQuery, [recipientId]);

    if (deviceResult.rows.length === 0) {
      return res.status(404).json({ error: 'No active devices found for recipient' });
    }

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
    
    if (sentSuccessfully) {
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

    res.status(200).json({
      message: 'Notification sent successfully',
      notification: {
        ...notification,
        status: sentSuccessfully ? 'sent' : 'failed'
      },
      devicesSent: pushResults.filter(r => r.status === 'fulfilled').length
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

    res.status(200).json({
      notifications: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
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

    res.status(200).json({
      message: 'Notification marked as read',
      notification: result.rows[0]
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
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

    res.status(200).json({
      message: 'Notification clicked',
      notification: result.rows[0]
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
