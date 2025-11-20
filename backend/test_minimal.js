const axios = require('axios');
const BASE_URL = 'http://localhost:5000/api';

async function testQuick() {
  try {
    // Register law firm
    const timestamp = Date.now();
    const registerRes = await axios.post(`${BASE_URL}/auth/register/lawfirm`, {
      email: `firm.${timestamp}@test.com`,
      password: 'TestPass123!',
      firmName: `Test Firm ${timestamp}`,
      firstName: 'Admin',
      lastName: 'User',
      phoneNumber: '555-0100',
      privacyAccepted: true
    });
    
    console.log('✅ Registration Response:');
    console.log(JSON.stringify(registerRes.data, null, 2));
    
    const token = registerRes.data.token;
    
    // Test user list endpoint
    console.log('\n📋 Testing GET /lawfirm/users...');
    const listRes = await axios.get(`${BASE_URL}/lawfirm/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('✅ User List Response:');
    console.log(JSON.stringify(listRes.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testQuick();
