/**
 * Railway Database Fix Script
 * 
 * This script connects to your Railway PostgreSQL database and adds
 * the missing column needed to prevent daily reward farming.
 * 
 * Usage: node fix-railway-database.js
 */

const { Pool } = require('pg');

async function fixRailwayDatabase() {
  console.log('🔧 Railway Database Fix Script');
  console.log('=' .repeat(60));
  
  // Get the Railway database URL from command line argument
  const railwayDbUrl = process.argv[2];
  
  if (!railwayDbUrl) {
    console.error('❌ ERROR: Railway DATABASE_URL not provided!\n');
    console.log('Usage:');
    console.log('  node fix-railway-database.js "YOUR_RAILWAY_DATABASE_URL"\n');
    console.log('How to get your Railway DATABASE_URL:');
    console.log('  1. Go to https://railway.app');
    console.log('  2. Open your Verdict Path project');
    console.log('  3. Click on your PostgreSQL service');
    console.log('  4. Click "Variables" tab');
    console.log('  5. Find DATABASE_URL and copy its value');
    console.log('  6. Run: node fix-railway-database.js "paste-the-url-here"\n');
    process.exit(1);
  }
  
  if (railwayDbUrl.includes('localhost') || railwayDbUrl.includes('127.0.0.1')) {
    console.error('❌ ERROR: This looks like a local database URL!');
    console.log('Please use your Railway DATABASE_URL, not your local one.\n');
    process.exit(1);
  }
  
  console.log('\n✅ Connecting to Railway database...');
  console.log(`   Host: ${new URL(railwayDbUrl).hostname}`);
  
  const pool = new Pool({
    connectionString: railwayDbUrl,
    ssl: {
      rejectUnauthorized: false // Railway requires SSL
    }
  });
  
  try {
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Connected successfully!\n');
    
    // Check if column already exists
    console.log('🔍 Checking if fix is needed...');
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'last_daily_claim_at'
    `);
    
    if (checkResult.rows.length > 0) {
      console.log('✅ Column already exists! Fix was already applied.');
      console.log('\n🎉 Your database is already secure!');
      await pool.end();
      return;
    }
    
    console.log('⚠️  Column missing - applying fix...\n');
    
    // Add the missing column
    console.log('📝 Running SQL:');
    console.log('   ALTER TABLE users ADD COLUMN last_daily_claim_at TIMESTAMP;');
    
    await pool.query('ALTER TABLE users ADD COLUMN last_daily_claim_at TIMESTAMP');
    
    console.log('✅ Column added successfully!\n');
    
    // Verify it worked
    const verifyResult = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'last_daily_claim_at'
    `);
    
    if (verifyResult.rows.length > 0) {
      console.log('✅ Verification successful!');
      console.log('   Column details:', verifyResult.rows[0]);
      console.log('\n' + '='.repeat(60));
      console.log('🎉 DATABASE FIX COMPLETE!');
      console.log('='.repeat(60));
      console.log('\n📋 Next Steps:');
      console.log('   1. Test your app at https://verdictpath.up.railway.app');
      console.log('   2. Login and click "Claim Daily Bonus"');
      console.log('   3. Try clicking it again - it should say "Already Claimed"');
      console.log('   4. Your coins should NOT increase on second click');
      console.log('\n✅ Security vulnerability eliminated!\n');
    } else {
      console.error('❌ Verification failed - column not found after adding');
    }
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Verify your Railway DATABASE_URL is correct');
    console.log('2. Check that your Railway database is running');
    console.log('3. Ensure you have permission to modify the database');
  } finally {
    await pool.end();
    console.log('\n🔌 Disconnected from database');
  }
}

// Run the fix
fixRailwayDatabase().catch(console.error);
