const { Pool } = require('pg');
const pushNotificationService = require('./pushNotificationService');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

/**
 * Notification Queue Processor
 * 
 * Processes queued notifications that were blocked during quiet hours
 * and sends them when quiet hours have ended.
 * 
 * This should be called periodically via a cron job or scheduled task
 * (e.g., every 15 minutes)
 */
async function processNotificationQueue() {
  const client = await pool.connect();
  
  try {
    // Get all queued notifications that are ready to send
    // Use NOW() AT TIME ZONE 'UTC' to ensure UTC comparison
    const queuedNotifications = await client.query(`
      SELECT * FROM notification_queue
      WHERE status = 'queued'
        AND scheduled_for <= (NOW() AT TIME ZONE 'UTC')
        AND attempts < 3
      ORDER BY scheduled_for ASC
      LIMIT 100
    `);
    
    if (queuedNotifications.rows.length === 0) {
      return { processed: 0, succeeded: 0, failed: 0 };
    }
    
    
    let succeeded = 0;
    let failed = 0;
    
    for (const notification of queuedNotifications.rows) {
      try {
        await processQueuedNotification(notification, client);
        succeeded++;
      } catch (error) {
        failed++;
        
        // Update failure count
        await client.query(`
          UPDATE notification_queue
          SET attempts = attempts + 1,
              error_message = $1,
              updated_at = NOW(),
              status = CASE WHEN attempts + 1 >= 3 THEN 'failed' ELSE 'queued' END
          WHERE id = $2
        `, [error.message, notification.id]);
      }
    }
    
    
    return { processed: succeeded + failed, succeeded, failed };
  } catch (error) {
    throw error;
  } finally {
    client.release();
  }
}

async function processQueuedNotification(notification, client) {
  const {
    id, sender_type, sender_id, sender_name, recipient_type, recipient_id,
    type, priority, title, body, action_url, action_data
  } = notification;
  
  // Parse action_data if it's a string (from JSONB storage)
  const parsedActionData = typeof action_data === 'string' ? JSON.parse(action_data) : action_data;
  
  // Get recipient devices
  const deviceQuery = `
    SELECT expo_push_token FROM user_devices 
    WHERE ${recipient_type}_id = $1 AND is_active = true
  `;
  const deviceResult = await client.query(deviceQuery, [recipient_id]);
  
  if (deviceResult.rows.length === 0) {
    await markNotificationSent(id, client);
    return;
  }
  
  // Insert into notifications table with properly parsed action_data
  const notificationQuery = `
    INSERT INTO notifications (
      sender_type, sender_id, sender_name, recipient_type, recipient_id,
      type, priority, title, body, action_url, action_data, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending')
    RETURNING *
  `;
  
  const notificationResult = await client.query(notificationQuery, [
    sender_type, sender_id, sender_name, recipient_type, recipient_id,
    type, priority, title, body, action_url, 
    parsedActionData ? JSON.stringify(parsedActionData) : null
  ]);
  
  const insertedNotification = notificationResult.rows[0];
  
  // Send push notifications to all devices
  const pushPromises = deviceResult.rows.map(device =>
    pushNotificationService.sendPushNotification({
      expoPushToken: device.expo_push_token,
      title,
      body,
      data: {
        notificationId: insertedNotification.id,
        type,
        actionUrl: action_url,
        ...parsedActionData
      },
      priority
    })
  );
  
  await Promise.all(pushPromises);
  
  // Mark notification as delivered
  await client.query(
    'UPDATE notifications SET status = $1, delivered_at = CURRENT_TIMESTAMP WHERE id = $2',
    ['delivered', insertedNotification.id]
  );
  
  // Mark queued notification as sent
  await markNotificationSent(id, client);
  
}

async function markNotificationSent(queueId, client) {
  await client.query(`
    UPDATE notification_queue
    SET status = 'sent',
        sent_at = NOW(),
        updated_at = NOW()
    WHERE id = $1
  `, [queueId]);
}

// Export for use in cron jobs or scheduled tasks
module.exports = {
  processNotificationQueue
};

// If running as standalone script (e.g., node services/notificationQueueProcessor.js)
if (require.main === module) {
  processNotificationQueue()
    .then(result => {
      process.exit(0);
    })
    .catch(error => {
      process.exit(1);
    });
}
