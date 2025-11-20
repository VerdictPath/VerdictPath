const axios = require('axios');
require('dotenv').config();

async function testConsistency() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║         CONSISTENCY & CODE QUALITY CHECK                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  let allPassed = true;
  
  try {
    // Test 1: Check userType consistency in JWT tokens
    console.log('1️⃣  Testing userType consistency in JWT tokens...');
    
    // Register and login via main flow
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
    
    if (decoded.userType === 'medical_provider') {
      console.log('   ✅ Main registration uses correct userType: medical_provider');
    } else {
      console.log(`   ❌ Main registration uses wrong userType: ${decoded.userType}`);
      allPassed = false;
    }
    
    // Test 2: Check middleware accepts the token
    console.log('\n2️⃣  Testing middleware accepts medical_provider tokens...');
    const listRes = await axios.get('http://localhost:5000/api/medicalprovider/users', {
      headers: { 'Authorization': `Bearer ${regRes.data.token}` }
    });
    
    if (listRes.data.success && listRes.data.users) {
      console.log('   ✅ Middleware successfully accepts medical_provider tokens');
    } else {
      console.log('   ❌ Middleware rejected the token');
      allPassed = false;
    }
    
    // Test 3: Check lastActivity is being tracked
    console.log('\n3️⃣  Testing lastActivity tracking...');
    const user = listRes.data.users[0];
    
    if (user.lastActivity) {
      console.log(`   ✅ lastActivity is tracked: ${user.lastActivity}`);
    } else {
      console.log('   ❌ lastActivity is missing or null');
      allPassed = false;
    }
    
    // Test 4: Check response format consistency
    console.log('\n4️⃣  Testing response format consistency...');
    const hasAllFields = user.firstName && user.lastName && user.userCode && 
                         user.hasOwnProperty('canManageUsers') && user.createdBy !== undefined;
    
    if (hasAllFields) {
      console.log('   ✅ Response has all expected camelCase fields');
    } else {
      console.log('   ❌ Response missing expected fields');
      allPassed = false;
    }
    
  } catch (error) {
    console.log(`\n   ❌ Test failed: ${error.response?.data?.message || error.message}`);
    allPassed = false;
  }
  
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  if (allPassed) {
    console.log('║  ✅ ALL CONSISTENCY CHECKS PASSED                          ║');
  } else {
    console.log('║  ❌ SOME CONSISTENCY CHECKS FAILED                         ║');
  }
  console.log('╚════════════════════════════════════════════════════════════╝\n');
}

testConsistency().catch(console.error);
