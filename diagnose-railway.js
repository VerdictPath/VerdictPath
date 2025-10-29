/**
 * Diagnostic Script: Check Railway Database Column
 * 
 * This script connects to Railway's database and checks if the
 * last_daily_claim_at column actually exists there.
 */

const { Pool } = require('pg');

async function diagnoseRailway() {
  console.log('🔍 Railway Database Diagnostic');
  console.log('='.repeat(60));
  
  const railwayDbUrl = process.argv[2];
  
  if (!railwayDbUrl) {
    console.error('❌ Please provide Railway DATABASE_URL');
    console.log('Usage: node diagnose-railway.js "YOUR_RAILWAY_DATABASE_URL"');
    process.exit(1);
  }
  
  const pool = new Pool({
    connectionString: railwayDbUrl,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    console.log('\n📋 Test 1: Check if column exists');
    console.log('-'.repeat(60));
    
    const columnCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name = 'last_daily_claim_at'
    `);
    
    if (columnCheck.rows.length > 0) {
      console.log('✅ Column EXISTS:', columnCheck.rows[0]);
    } else {
      console.log('❌ Column MISSING!');
      console.log('   The column was not added to Railway database!');
      process.exit(1);
    }
    
    console.log('\n📋 Test 2: Check sample user data');
    console.log('-'.repeat(60));
    
    const userData = await pool.query(`
      SELECT id, email, total_coins, login_streak, last_daily_claim_at 
      FROM users 
      LIMIT 3
    `);
    
    console.log(`Found ${userData.rows.length} users:`);
    userData.rows.forEach((user, i) => {
      console.log(`\nUser ${i + 1}:`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Coins: ${user.total_coins}`);
      console.log(`  Streak: ${user.login_streak}`);
      console.log(`  Last Claim: ${user.last_daily_claim_at || 'NULL (never claimed)'}`);
    });
    
    console.log('\n📋 Test 3: Simulate daily claim check');
    console.log('-'.repeat(60));
    
    if (userData.rows.length > 0) {
      const testUser = userData.rows[0];
      const lastClaimAt = testUser.last_daily_claim_at;
      
      if (!lastClaimAt) {
        console.log('✅ User has NEVER claimed (first claim should work)');
      } else {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const lastClaimDate = new Date(lastClaimAt);
        const lastClaimDay = new Date(
          lastClaimDate.getFullYear(),
          lastClaimDate.getMonth(),
          lastClaimDate.getDate()
        );
        
        console.log(`Last claim was: ${lastClaimAt}`);
        console.log(`Today's date: ${today}`);
        console.log(`Last claim day: ${lastClaimDay}`);
        
        if (lastClaimDay.getTime() === today.getTime()) {
          console.log('✅ SECURITY WORKING: User claimed TODAY, should be BLOCKED');
        } else {
          console.log('✅ User claimed on different day, new claim should work');
        }
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 DIAGNOSIS COMPLETE');
    console.log('='.repeat(60));
    
    console.log('\nIf column exists but users can still farm coins, the issue is:');
    console.log('  → Railway backend code is NOT checking this column');
    console.log('  → Railway needs to deploy the LATEST code from GitHub');
    console.log('\nNext steps:');
    console.log('  1. Check which GitHub branch Railway is deploying from');
    console.log('  2. Verify Railway is connected to the correct repo');
    console.log('  3. Try triggering a manual redeploy from Railway dashboard\n');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  } finally {
    await pool.end();
  }
}

diagnoseRailway().catch(console.error);
