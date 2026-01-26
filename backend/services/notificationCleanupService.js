const { Pool } = require('pg');
const { DateTime } = require('luxon');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

let isRunning = false;

async function cleanupExpiredNotifications() {
  if (isRunning) {
    return { success: false, skipped: true };
  }
  
  isRunning = true;
  
  try {
    return await _cleanupNotificationsInternal();
  } finally {
    isRunning = false;
  }
}

async function _cleanupNotificationsInternal() {
  
  try {
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications'
      )
    `);
    
    if (!tableCheck.rows[0].exists) {
      return { success: true, deletedCount: 0, skipped: true };
    }

    const columnCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications'
        AND column_name = 'auto_delete_at'
      )
    `);
    
    if (!columnCheck.rows[0].exists) {
      return { success: true, deletedCount: 0, skipped: true };
    }

    const now = DateTime.now().toISO();
    
    const deleteResult = await pool.query(`
      DELETE FROM notifications 
      WHERE auto_delete_at < $1 
        AND (archived = false OR archived IS NULL)
      RETURNING id, recipient_id, title
    `, [now]);
    
    const deletedCount = deleteResult.rowCount;
    
    if (deletedCount > 0) {
      
      deleteResult.rows.slice(0, 5).forEach(notification => {
      });
      
      if (deletedCount > 5) {
      }
    } else {
    }
    
    return { success: true, deletedCount };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function startCleanupScheduler() {
  
  cleanupExpiredNotifications();
  
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const msUntilMidnight = midnight.getTime() - now.getTime();
  
  
  setTimeout(() => {
    cleanupExpiredNotifications();
    
    setInterval(() => {
      cleanupExpiredNotifications();
    }, 24 * 60 * 60 * 1000);
    
  }, msUntilMidnight);
  
}

module.exports = {
  cleanupExpiredNotifications,
  startCleanupScheduler
};
