/**
 * Daily Rewards Security Verification Script
 * 
 * This script helps verify that the daily rewards system is working correctly
 * and cannot be exploited to farm coins.
 * 
 * Usage:
 * 1. First run the SQL fix on Railway database (see RAILWAY_DATABASE_FIX.sql)
 * 2. Get a valid user authentication token from your app
 * 3. Run: node verify_security.js YOUR_AUTH_TOKEN
 */

const API_URL = 'https://verdictpath.up.railway.app';

async function testDailyClaim(authToken) {
  console.log('🔍 Testing Daily Rewards Security\n');
  console.log('='.repeat(60));
  
  // Test 1: First claim should succeed
  console.log('\n📋 TEST 1: First Claim of the Day');
  console.log('-'.repeat(60));
  
  try {
    const response1 = await fetch(`${API_URL}/api/coins/claim-daily`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const data1 = await response1.json();
    console.log('Status:', response1.status);
    console.log('Response:', JSON.stringify(data1, null, 2));
    
    if (response1.status === 200 && data1.success) {
      console.log('✅ PASS: First claim succeeded');
      console.log(`   Coins awarded: ${data1.bonus}`);
      console.log(`   New total: ${data1.totalCoins}`);
      console.log(`   Streak: ${data1.newStreak}`);
    } else if (response1.status === 400 && data1.alreadyClaimed) {
      console.log('⚠️  INFO: You already claimed today');
      console.log('   This is expected if you tested earlier today');
      console.log('   Wait until tomorrow to test fresh claims');
    } else {
      console.log('❌ UNEXPECTED: Check response above');
    }
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.log('\n💡 If you see "column does not exist" error:');
    console.log('   → Run the SQL in RAILWAY_DATABASE_FIX.sql on Railway database\n');
    return;
  }
  
  // Test 2: Immediate second claim should FAIL
  console.log('\n📋 TEST 2: Immediate Second Claim (Security Test)');
  console.log('-'.repeat(60));
  console.log('⏱️  Waiting 2 seconds...\n');
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  try {
    const response2 = await fetch(`${API_URL}/api/coins/claim-daily`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const data2 = await response2.json();
    console.log('Status:', response2.status);
    console.log('Response:', JSON.stringify(data2, null, 2));
    
    if (response2.status === 400 && data2.alreadyClaimed === true) {
      console.log('✅ PASS: Second claim correctly rejected');
      console.log('   Security working as expected!');
    } else if (response2.status === 200 && data2.success) {
      console.log('❌ FAIL: Second claim succeeded - SECURITY VULNERABILITY!');
      console.log('   🚨 The database fix was not applied correctly');
      console.log('   → Verify RAILWAY_DATABASE_FIX.sql was run on Railway');
    } else {
      console.log('❌ UNEXPECTED: Check response above');
    }
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
  
  // Test 3: Third attempt to verify consistency
  console.log('\n📋 TEST 3: Third Claim Attempt (Consistency Check)');
  console.log('-'.repeat(60));
  
  try {
    const response3 = await fetch(`${API_URL}/api/coins/claim-daily`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    const data3 = await response3.json();
    console.log('Status:', response3.status);
    console.log('Response:', JSON.stringify(data3, null, 2));
    
    if (response3.status === 400 && data3.alreadyClaimed === true) {
      console.log('✅ PASS: Third claim also rejected');
      console.log('   Consistent security enforcement!');
    } else {
      console.log('❌ FAIL: Security check failed');
    }
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SECURITY VERIFICATION COMPLETE');
  console.log('='.repeat(60));
  console.log('\n✅ SECURE: Only first claim succeeds, subsequent claims rejected');
  console.log('❌ VULNERABLE: Multiple claims succeed - apply database fix!\n');
}

// Run the test
const authToken = process.argv[2];

if (!authToken) {
  console.log('❌ Error: No auth token provided\n');
  console.log('Usage: node verify_security.js YOUR_AUTH_TOKEN\n');
  console.log('How to get your token:');
  console.log('1. Login to your app');
  console.log('2. Open browser console (F12)');
  console.log('3. Type: localStorage (or check Network tab for Authorization header)');
  console.log('4. Copy the token value\n');
  process.exit(1);
}

testDailyClaim(authToken);
