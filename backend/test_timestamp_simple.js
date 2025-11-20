const axios = require('axios');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function testTimestamps() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║      TIMESTAMP UPDATE PARITY TEST                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  try {
    // Get a medical provider user
    const medUser = await pool.query(
      'SELECT id FROM medical_provider_users WHERE status = $1 LIMIT 1',
      ['active']
    );
    
    if (medUser.rows.length === 0) {
      console.log('No active medical provider users found. Skipping test.');
      return;
    }
    
    const userId = medUser.rows[0].id;
    
    // Check current update statement for medical provider middleware
    console.log('🔍 Checking middleware UPDATE statements:\n');
    
    const medProviderAuth = require('fs').readFileSync('middleware/medicalProviderAuth.js', 'utf8');
    const lawFirmAuth = require('fs').readFileSync('middleware/lawFirmAuth.js', 'utf8');
    
    const medUpdate = medProviderAuth.match(/UPDATE medical_provider_users SET ([^WHERE]+)/);
    const lawUpdate = lawFirmAuth.match(/UPDATE law_firm_users SET ([^WHERE]+)/);
    
    console.log('Medical Provider Middleware:');
    console.log(`   UPDATE medical_provider_users SET ${medUpdate ? medUpdate[1].trim() : 'NOT FOUND'}\n`);
    
    console.log('Law Firm Middleware:');
    console.log(`   UPDATE law_firm_users SET ${lawUpdate ? lawUpdate[1].trim() : 'NOT FOUND'}\n`);
    
    if (medUpdate && lawUpdate) {
      if (medUpdate[1].trim() === lawUpdate[1].trim()) {
        console.log('✅ PARITY: Both middlewares use identical UPDATE statements\n');
      } else {
        console.log('❌ MISMATCH: Middlewares use different UPDATE statements\n');
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

testTimestamps();
