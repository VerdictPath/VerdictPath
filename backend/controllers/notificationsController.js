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
        'UPDATE notifications SET status = $1, delivery_status = $2, sent_at = CURRENT_TIMESTAMP WHERE id = $3',
        ['sent', 'sent', notification.id]
      );
    } else {
      await pool.query(
        'UPDATE notifications SET status = $1, delivery_status = $2, failed_reason = $3 WHERE id = $4',
        ['failed', 'failed', 'All push notifications failed to send', notification.id]
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

exports.sendToAllClients = async (req, res) => {
  const { title, body, type, priority = 'medium', actionUrl, actionData } = req.body;
  
  const entityInfo = getEntityInfo(req);
  if (!entityInfo) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (entityInfo.userType !== 'law_firm') {
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

        const pushResults = await Promise.allSettled(pushPromises);
        const sentSuccessfully = pushResults.filter(r => r.status === 'fulfilled').length > 0;

        if (pushResults.length === 0) {
          await pool.query(
            'UPDATE notifications SET status = $1, delivery_status = $2, failed_reason = $3 WHERE id = $4',
            ['failed', 'failed', 'No registered devices found', notificationResult.rows[0].id]
          );
        } else if (sentSuccessfully) {
          await pool.query(
            'UPDATE notifications SET status = $1, delivery_status = $2, sent_at = CURRENT_TIMESTAMP WHERE id = $3',
            ['sent', 'sent', notificationResult.rows[0].id]
          );
        } else {
          await pool.query(
            'UPDATE notifications SET status = $1, delivery_status = $2, failed_reason = $3 WHERE id = $4',
            ['failed', 'failed', 'All push notifications failed to send', notificationResult.rows[0].id]
          );
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
  
  if (entityInfo.userType !== 'law_firm') {
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

        const pushResults = await Promise.allSettled(pushPromises);
        const sentSuccessfully = pushResults.filter(r => r.status === 'fulfilled').length > 0;

        if (pushResults.length === 0) {
          await pool.query(
            'UPDATE notifications SET status = $1, delivery_status = $2, failed_reason = $3 WHERE id = $4',
            ['failed', 'failed', 'No registered devices found', notificationResult.rows[0].id]
          );
        } else if (sentSuccessfully) {
          await pool.query(
            'UPDATE notifications SET status = $1, delivery_status = $2, sent_at = CURRENT_TIMESTAMP WHERE id = $3',
            ['sent', 'sent', notificationResult.rows[0].id]
          );
        } else {
          await pool.query(
            'UPDATE notifications SET status = $1, delivery_status = $2, failed_reason = $3 WHERE id = $4',
            ['failed', 'failed', 'All push notifications failed to send', notificationResult.rows[0].id]
          );
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
  
  if (entityInfo.userType !== 'law_firm') {
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
        'UPDATE notifications SET status = $1, delivery_status = $2, failed_reason = $3 WHERE id = $4',
        ['failed', 'failed', 'No registered devices found', notification.id]
      );
    } else if (sentSuccessfully) {
      await pool.query(
        'UPDATE notifications SET status = $1, delivery_status = $2, sent_at = CURRENT_TIMESTAMP WHERE id = $3',
        ['sent', 'sent', notification.id]
      );
    } else {
      await pool.query(
        'UPDATE notifications SET status = $1, delivery_status = $2, failed_reason = $3 WHERE id = $4',
        ['failed', 'failed', 'All push notifications failed to send', notification.id]
      );
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
      JOIN medical_provider_patients mpp ON u.id = mpp.user_id
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

        const pushResults = await Promise.allSettled(pushPromises);
        const sentSuccessfully = pushResults.filter(r => r.status === 'fulfilled').length > 0;

        if (pushResults.length === 0) {
          await pool.query(
            'UPDATE notifications SET status = $1, delivery_status = $2, failed_reason = $3 WHERE id = $4',
            ['failed', 'failed', 'No registered devices found', notificationResult.rows[0].id]
          );
        } else if (sentSuccessfully) {
          await pool.query(
            'UPDATE notifications SET status = $1, delivery_status = $2, sent_at = CURRENT_TIMESTAMP WHERE id = $3',
            ['sent', 'sent', notificationResult.rows[0].id]
          );
        } else {
          await pool.query(
            'UPDATE notifications SET status = $1, delivery_status = $2, failed_reason = $3 WHERE id = $4',
            ['failed', 'failed', 'All push notifications failed to send', notificationResult.rows[0].id]
          );
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
      JOIN medical_provider_patients mpp ON u.id = mpp.user_id
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

        const pushResults = await Promise.allSettled(pushPromises);
        const sentSuccessfully = pushResults.filter(r => r.status === 'fulfilled').length > 0;

        if (pushResults.length === 0) {
          await pool.query(
            'UPDATE notifications SET status = $1, delivery_status = $2, failed_reason = $3 WHERE id = $4',
            ['failed', 'failed', 'No registered devices found', notificationResult.rows[0].id]
          );
        } else if (sentSuccessfully) {
          await pool.query(
            'UPDATE notifications SET status = $1, delivery_status = $2, sent_at = CURRENT_TIMESTAMP WHERE id = $3',
            ['sent', 'sent', notificationResult.rows[0].id]
          );
        } else {
          await pool.query(
            'UPDATE notifications SET status = $1, delivery_status = $2, failed_reason = $3 WHERE id = $4',
            ['failed', 'failed', 'All push notifications failed to send', notificationResult.rows[0].id]
          );
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
        'UPDATE notifications SET status = $1, delivery_status = $2, failed_reason = $3 WHERE id = $4',
        ['failed', 'failed', 'No registered devices found', notification.id]
      );
    } else if (sentSuccessfully) {
      await pool.query(
        'UPDATE notifications SET status = $1, delivery_status = $2, sent_at = CURRENT_TIMESTAMP WHERE id = $3',
        ['sent', 'sent', notification.id]
      );
    } else {
      await pool.query(
        'UPDATE notifications SET status = $1, delivery_status = $2, failed_reason = $3 WHERE id = $4',
        ['failed', 'failed', 'All push notifications failed to send', notification.id]
      );
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
        COUNT(CASE WHEN delivery_status = 'sent' THEN 1 END) as delivered,
        COUNT(CASE WHEN delivery_status = 'failed' THEN 1 END) as failed,
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
      filters.push(`delivery_status = $${queryParams.length}`);
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
        delivery_status, status, clicked, created_at, read_at, clicked_at
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
