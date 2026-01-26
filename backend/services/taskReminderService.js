const { Pool } = require('pg');
const { DateTime } = require('luxon');
const { sendTaskReminderSMS } = require('./smsService');
const encryptionService = require('./encryption');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Concurrency guard to prevent overlapping scheduler runs
let isRunning = false;

async function sendTaskReminders() {
  // Prevent concurrent executions
  if (isRunning) {
    return { success: false, skipped: true };
  }
  
  isRunning = true;
  
  try {
    return await _sendTaskRemindersInternal();
  } finally {
    isRunning = false;
  }
}

async function _sendTaskRemindersInternal() {
  
  try {
    // First check if the law_firm_tasks table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'law_firm_tasks'
      )
    `);
    
    if (!tableCheck.rows[0].exists) {
      return { success: true, tasksProcessed: 0, smsSent: 0, notificationsSent: 0, skipped: true };
    }
    
    // Find tasks due in the next 24 hours that haven't been completed
    const tomorrow = DateTime.now().plus({ hours: 24 }).toISO();
    const now = DateTime.now().toISO();
    
    const tasksQuery = `
      SELECT 
        lft.id,
        lft.task_title,
        lft.due_date,
        lft.priority,
        lft.client_id,
        NULL as phone_encrypted,
        u.email as user_email,
        lf.firm_name,
        COALESCE(np.sms_notifications_enabled, false) as sms_notifications_enabled,
        np.task_notifications
      FROM law_firm_tasks lft
      JOIN users u ON u.id = lft.client_id
      JOIN law_firms lf ON lf.id = lft.law_firm_id
      LEFT JOIN notification_preferences np ON np.user_id = lft.client_id
      WHERE lft.status IN ('pending', 'in_progress')
        AND lft.due_date IS NOT NULL
        AND lft.due_date >= $1
        AND lft.due_date <= $2
        AND NOT EXISTS (
          SELECT 1 FROM task_reminders tr 
          WHERE tr.task_id = lft.id 
            AND tr.reminder_sent_at >= NOW() - INTERVAL '23 hours'
        )
    `;
    
    const result = await pool.query(tasksQuery, [now, tomorrow]);
    
    
    let smsCount = 0;
    let notificationCount = 0;
    
    for (const task of result.rows) {
      // Require explicit SMS opt-in
      const smsEnabled = task.sms_notifications_enabled === true;
      const taskNotificationsEnabled = task.task_notifications !== false;
      
      // Send SMS reminder if user has phone number and SMS enabled
      if (task.phone_encrypted && smsEnabled && taskNotificationsEnabled) {
        // Decrypt phone number before sending to Twilio
        const phoneNumber = encryptionService.decrypt(task.phone_encrypted);
        
        if (phoneNumber) {
          const smsResult = await sendTaskReminderSMS(
            phoneNumber,
            task.task_title,
            task.due_date,
            task.firm_name
          );
          
          if (smsResult.success) {
            smsCount++;
          }
        }
      }
      
      // Create in-app notification regardless of SMS
      try {
        await pool.query(
          `INSERT INTO notifications 
            (sender_type, sender_id, sender_name, recipient_type, recipient_id, 
             type, priority, title, body, action_url, action_data, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            'system',
            0,
            'Verdict Path',
            'user',
            task.client_id,
            'task_reminder',
            task.priority === 'urgent' ? 'urgent' : 'high',
            `⏰ Task Due Soon: ${task.task_title}`,
            `This task from ${task.firm_name} is due ${DateTime.fromISO(task.due_date).toRelative()}. Don't forget to complete it!`,
            'verdictpath://tasks',
            JSON.stringify({ taskId: task.id }),
            'pending'
          ]
        );
        notificationCount++;
      } catch (notifError) {
      }
      
      // Record that we sent this reminder
      await pool.query(
        `INSERT INTO task_reminders (task_id, reminder_type, reminder_sent_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (task_id, reminder_type) DO UPDATE SET reminder_sent_at = CURRENT_TIMESTAMP`,
        [task.id, '24_hours_before']
      );
    }
    
    
    return {
      success: true,
      tasksProcessed: result.rows.length,
      smsSent: smsCount,
      notificationsSent: notificationCount
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Create task_reminders table if it doesn't exist
async function initializeReminderTable() {
  try {
    // First check if the law_firm_tasks table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'law_firm_tasks'
      )
    `);
    
    if (!tableCheck.rows[0].exists) {
      return;
    }
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS task_reminders (
        id SERIAL PRIMARY KEY,
        task_id INTEGER NOT NULL REFERENCES law_firm_tasks(id) ON DELETE CASCADE,
        reminder_type VARCHAR(50) NOT NULL DEFAULT '24_hours_before',
        reminder_sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(task_id, reminder_type)
      )
    `);
  } catch (error) {
  }
}

// Run every hour to check for tasks due in next 24 hours
function startReminderScheduler() {
  // Initialize table on startup
  initializeReminderTable();
  
  // Run immediately on startup
  sendTaskReminders();
  
  // Then run every hour
  const HOUR_IN_MS = 60 * 60 * 1000;
  setInterval(sendTaskReminders, HOUR_IN_MS);
  
}

module.exports = {
  sendTaskReminders,
  startReminderScheduler,
  initializeReminderTable
};
