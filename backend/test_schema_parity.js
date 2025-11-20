const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkSchemaParity() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║           SCHEMA PARITY VERIFICATION                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Check last_* columns
  const lawFirmCols = await pool.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'law_firm_users' AND column_name LIKE 'last_%'
    ORDER BY column_name
  `);
  
  const medProviderCols = await pool.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'medical_provider_users' AND column_name LIKE 'last_%'
    ORDER BY column_name
  `);

  console.log('📊 Last Activity/Login Columns:');
  console.log('   Law Firm Users:', lawFirmCols.rows.map(r => r.column_name).join(', '));
  console.log('   Medical Provider Users:', medProviderCols.rows.map(r => r.column_name).join(', '));
  
  const lfCols = lawFirmCols.rows.map(r => r.column_name).sort();
  const mpCols = medProviderCols.rows.map(r => r.column_name).sort();
  
  if (JSON.stringify(lfCols) === JSON.stringify(mpCols)) {
    console.log('   ✅ MATCH - Both tables have identical last_* columns\n');
  } else {
    console.log('   ❌ MISMATCH - Tables have different last_* columns\n');
  }

  // Check permission columns
  const lfPerms = await pool.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'law_firm_users' AND column_name LIKE 'can_%'
    ORDER BY column_name
  `);
  
  const mpPerms = await pool.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'medical_provider_users' AND column_name LIKE 'can_%'
    ORDER BY column_name
  `);

  console.log('🔐 Permission Columns:');
  console.log('   Law Firm Users:', lfPerms.rows.length, 'permissions');
  console.log('   Medical Provider Users:', mpPerms.rows.length, 'permissions');
  
  if (mpPerms.rows.length > lfPerms.rows.length) {
    console.log('   ✅ Medical providers have MORE permissions (includes HIPAA-specific)\n');
  } else {
    console.log('   ⚠️  Permission count differs\n');
  }

  await pool.end();
}

checkSchemaParity().catch(console.error);
