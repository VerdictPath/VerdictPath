const { DateTime } = require('luxon');

/**
 * Calculate when quiet hours end and return the scheduled delivery time
 * Uses Luxon for proper timezone-aware calculations
 * @param {string} endTime - Format: "HH:MM" (e.g., "08:00")
 * @param {string} timezone - User's timezone (e.g., "America/New_York")
 * @returns {string} - ISO UTC timestamp string when quiet hours end in user's local time
 */
function calculateQuietHoursEnd(endTime, timezone) {
  try {
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    // Get current time in the user's timezone
    const nowInUserTz = DateTime.now().setZone(timezone);
    
    // Create a DateTime for when quiet hours end today in the user's timezone
    let quietEndInUserTz = nowInUserTz.set({ 
      hour: endHour, 
      minute: endMin, 
      second: 0, 
      millisecond: 0 
    });
    
    // If the end time has already passed today, schedule for tomorrow
    if (quietEndInUserTz <= nowInUserTz) {
      quietEndInUserTz = quietEndInUserTz.plus({ days: 1 });
    }
    
    // Convert to UTC and return as ISO string for PostgreSQL with Z suffix
    // This ensures the timestamp is stored correctly regardless of server timezone
    // Force Z normalization by explicitly converting to UTC ISO string
    return quietEndInUserTz.toUTC().toISO({ suppressMilliseconds: false, includeOffset: false });
  } catch (error) {
    // Default to 1 hour from now as fallback with Z normalization
    const fallback = DateTime.now().plus({ hours: 1 }).toUTC().toISO({ suppressMilliseconds: false, includeOffset: false });
    return fallback;
  }
}

/**
 * Queue a notification for later delivery (during quiet hours)
 * @param {object} pool - PostgreSQL pool or client instance
 * @param {object} notificationData - The notification data to queue
 * @returns {Promise<object>} - The queued notification record
 */
async function queueNotification(pool, notificationData) {
  const {
    senderType,
    senderId,
    senderName,
    recipientType,
    recipientId,
    type,
    priority,
    title,
    body,
    actionUrl,
    actionData,
    scheduledFor
  } = notificationData;
  
  const query = `
    INSERT INTO notification_queue (
      sender_type, sender_id, sender_name, recipient_type, recipient_id,
      type, priority, title, body, action_url, action_data, scheduled_for, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'queued')
    RETURNING *
  `;
  
  const values = [
    senderType,
    senderId,
    senderName,
    recipientType,
    recipientId,
    type,
    priority || 'medium',
    title,
    body,
    actionUrl || null,
    actionData ? JSON.stringify(actionData) : null,
    scheduledFor
  ];
  
  const result = await pool.query(query, values);
  return result.rows[0];
}

module.exports = {
  calculateQuietHoursEnd,
  queueNotification
};
