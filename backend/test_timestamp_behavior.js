const axios = require('axios');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function testTimestampBehavior() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║      TIMESTAMP BEHAVIOR VERIFICATION                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  try {
    const timestamp = Date.now();
    
    // Register and login medical provider
    const regRes = await axios.post('http://localhost:5000/api/auth/register/medicalprovider', {
      email: `test${timestamp}@example.com`,
      password: 'TestPass123!',
      providerName: 'Test Provider',
      providerType: 'hospital',
      firstName: 'Admin',
      lastName: 'User',
      phoneNumber: '555-0100',
      privacyAccepted: true
    });
    
    const token = regRes.data.token;
    const userId = regRes.data.medicalProviderUser.id;
    
    // Get initial timestamps
    const initial = await pool.query(
      'SELECT last_login, last_activity FROM medical_provider_users WHERE id = $1',
      [userId]
    );
    
    console.log('📊 Immediately after registration:');
    console.log(`   last_login: ${initial.rows[0].last_login}`);
    console.log(`   last_activity: ${initial.rows[0].last_activity}\n`);
    
    // Wait 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Make a request (triggers middleware)
    await axios.get('http://localhost:5000/api/medicalprovider/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    // Get timestamps after middleware request
    const afterRequest = await pool.query(
      'SELECT last_login, last_activity FROM medical_provider_users WHERE id = $1',
      [userId]
    );
    
    console.log('📊 After middleware request (2 seconds later):');
    console.log(`   last_login: ${afterRequest.rows[0].last_login}`);
    console.log(`   last_activity: ${afterRequest.rows[0].last_activity}\n`);
    
    // Compare
    const loginChanged = initial.rows[0].last_login?.getTime() !== afterRequest.rows[0].last_login?.getTime();
    const activityChanged = initial.rows[0].last_activity?.getTime() !== afterRequest.rows[0].last_activity?.getTime();
    
    console.log('🔍 Changes detected:');
    console.log(`   last_login changed: ${loginChanged ? '❌ YES (WRONG!)' : '✅ NO (correct)'}`);
    console.log(`   last_activity changed: ${activityChanged ? '✅ YES (correct)' : '❌ NO (WRONG!)'}\n`);
    
    if (!loginChanged && activityChanged) {
      console.log('✅ CORRECT BEHAVIOR:');
      console.log('   - last_login stays fixed at login time');
      console.log('   - last_activity updates on each request\n');
    } else {
      console.log('❌ INCORRECT BEHAVIOR\n');
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  } finally {
    await pool.end();
  }
}

testTimestampBehavior();
