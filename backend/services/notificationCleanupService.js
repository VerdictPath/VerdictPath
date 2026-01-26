const { Pool } = require('pg');
const { DateTime } = require('luxon');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

let isRunning = false;

async function cleanupExpiredNotifications() {
  if (isRunning) {
    console.log('⏩ Notification Cleanup Service already running, skipping this cycle');
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
  console.log('🧹 Notification Cleanup Service: Checking for expired notifications...');
  
  try {
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications'
      )
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('📋 Notification Cleanup Service: notifications table not found, skipping cleanup');
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
      console.log('📋 Notification Cleanup Service: auto_delete_at column not found, skipping cleanup');
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
      console.log(`🗑️ Notification Cleanup Service: Deleted ${deletedCount} expired notifications`);
      
      deleteResult.rows.slice(0, 5).forEach(notification => {
        console.log(`   - Deleted notification ${notification.id}: "${notification.title?.substring(0, 30) || 'No title'}..."`);
      });
      
      if (deletedCount > 5) {
        console.log(`   ... and ${deletedCount - 5} more`);
      }
    } else {
      console.log('✅ Notification Cleanup Service: No expired notifications to delete');
    }
    
    return { success: true, deletedCount };
    
  } catch (error) {
    console.error('❌ Notification Cleanup Service Error:', error.message);
    return { success: false, error: error.message };
  }
}

function startCleanupScheduler() {
  console.log('🧹 Starting Notification Cleanup Scheduler...');
  
  cleanupExpiredNotifications();
  
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const msUntilMidnight = midnight.getTime() - now.getTime();
  
  console.log(`⏰ Next cleanup scheduled in ${Math.round(msUntilMidnight / 1000 / 60)} minutes (at midnight)`);
  
  setTimeout(() => {
    cleanupExpiredNotifications();
    
    setInterval(() => {
      cleanupExpiredNotifications();
    }, 24 * 60 * 60 * 1000);
    
  }, msUntilMidnight);
  
  console.log('✅ Notification Cleanup Scheduler started (runs daily at midnight)');
}

module.exports = {
  cleanupExpiredNotifications,
  startCleanupScheduler
};
