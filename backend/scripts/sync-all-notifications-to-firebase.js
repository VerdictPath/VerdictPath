const { Pool } = require('pg');
const { syncNotificationToFirebase } = require('../services/firebaseSync');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

/**
 * One-time script to sync ALL notifications from PostgreSQL to Firebase
 * This ensures old notifications get their complete data (title, body, etc.)
 */
async function syncAllNotificationsToFirebase() {
  
  try {
    // Fetch ALL notifications from PostgreSQL
    const query = `
      SELECT * FROM notifications 
      ORDER BY created_at DESC
    `;
    
    const result = await pool.query(query);
    const notifications = result.rows;
    
    
    if (notifications.length === 0) {
      return;
    }
    
    // Sync each notification to Firebase
    let synced = 0;
    let failed = 0;
    
    for (const notification of notifications) {
      try {
        const notificationWithFlags = {
          ...notification,
          is_read: notification.status === 'read',
          is_clicked: notification.clicked
        };
        
        await syncNotificationToFirebase(notificationWithFlags);
        synced++;
        
        // Log progress every 10 notifications
        if (synced % 10 === 0) {
        }
      } catch (error) {
        failed++;
      }
    }
    
    
  } catch (error) {
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  syncAllNotificationsToFirebase()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      process.exit(1);
    });
}

module.exports = { syncAllNotificationsToFirebase };
