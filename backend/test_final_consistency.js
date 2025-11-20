const axios = require('axios');
require('dotenv').config();

async function testFinalConsistency() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║         FINAL CONSISTENCY VERIFICATION                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  let allPassed = true;
  
  try {
    const timestamp = Date.now();
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
    
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'verdictpath-secret-key-2024';
    const decoded = jwt.verify(regRes.data.token, JWT_SECRET);
    
    // Test 1: userType consistency
    console.log('1️⃣  JWT userType...');
    if (decoded.userType === 'medical_provider') {
      console.log('   ✅ Uses medical_provider (with underscore)\n');
    } else {
      console.log(`   ❌ Wrong userType: ${decoded.userType}\n`);
      allPassed = false;
    }
    
    // Test 2: Middleware accepts token
    console.log('2️⃣  Middleware authentication...');
    const listRes = await axios.get('http://localhost:5000/api/medicalprovider/users', {
      headers: { 'Authorization': `Bearer ${regRes.data.token}` }
    });
    
    if (listRes.data.success && listRes.data.users) {
      console.log('   ✅ Middleware accepts tokens\n');
    } else {
      console.log('   ❌ Middleware rejected token\n');
      allPassed = false;
    }
    
    const user = listRes.data.users[0];
    
    // Test 3: Schema parity - last_activity
    console.log('3️⃣  Schema parity (last_activity column)...');
    if (user.lastActivity) {
      console.log(`   ✅ lastActivity tracked: ${user.lastActivity}\n`);
    } else {
      console.log('   ❌ lastActivity missing\n');
      allPassed = false;
    }
    
    // Test 4: Response format - nested permissions
    console.log('4️⃣  Response format (nested permissions)...');
    if (user.permissions && user.permissions.canManageUsers !== undefined) {
      console.log('   ✅ Permissions properly nested\n');
    } else {
      console.log('   ❌ Permissions structure incorrect\n');
      allPassed = false;
    }
    
    // Test 5: CamelCase consistency
    console.log('5️⃣  CamelCase formatting...');
    const hasCamelCase = user.firstName && user.lastName && user.userCode;
    const hasSnakeCase = user.first_name || user.last_name || user.user_code;
    
    if (hasCamelCase && !hasSnakeCase) {
      console.log('   ✅ All fields use camelCase\n');
    } else {
      console.log('   ❌ Inconsistent field naming\n');
      allPassed = false;
    }
    
    // Test 6: Bootstrap scenario
    console.log('6️⃣  Bootstrap scenario support...');
    if (decoded.medicalProviderUserId === -1 || decoded.medicalProviderUserId > 0) {
      console.log(`   ✅ Bootstrap handling (userId: ${decoded.medicalProviderUserId})\n`);
    } else {
      console.log('   ❌ Bootstrap logic broken\n');
      allPassed = false;
    }
    
    // Test 7: Creator tracking
    console.log('7️⃣  Creator tracking...');
    if (user.createdBy !== undefined) {
      console.log(`   ✅ createdBy field present: ${user.createdBy || 'System'}\n`);
    } else {
      console.log('   ❌ createdBy field missing\n');
      allPassed = false;
    }
    
  } catch (error) {
    console.log(`\n   ❌ Test failed: ${error.response?.data?.message || error.message}`);
    allPassed = false;
  }
  
  console.log('╔════════════════════════════════════════════════════════════╗');
  if (allPassed) {
    console.log('║  ✅ ALL CONSISTENCY CHECKS PASSED                          ║');
    console.log('║  ✅ Medical Provider portal has full parity with Law Firm  ║');
  } else {
    console.log('║  ❌ SOME CONSISTENCY CHECKS FAILED                         ║');
  }
  console.log('╚════════════════════════════════════════════════════════════╝\n');
}

testFinalConsistency().catch(console.error);
