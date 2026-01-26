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
  console.log('🔄 Starting full notification sync to Firebase...\n');
  
  try {
    // Fetch ALL notifications from PostgreSQL
    const query = `
      SELECT * FROM notifications 
      ORDER BY created_at DESC
    `;
    
    const result = await pool.query(query);
    const notifications = result.rows;
    
    console.log(`📊 Found ${notifications.length} notifications in PostgreSQL\n`);
    
    if (notifications.length === 0) {
      console.log('✅ No notifications to sync');
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
          console.log(`✅ Synced ${synced}/${notifications.length} notifications...`);
        }
      } catch (error) {
        console.error(`❌ Failed to sync notification ${notification.id}:`, error.message);
        failed++;
      }
    }
    
    console.log(`\n📊 Sync Complete:`);
    console.log(`   ✅ Synced: ${synced}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📝 Total: ${notifications.length}\n`);
    
  } catch (error) {
    console.error('❌ Fatal error during sync:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  syncAllNotificationsToFirebase()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { syncAllNotificationsToFirebase };
