const axios = require('axios');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'verdictpath-secret-key-2024';

async function test() {
  try {
    // Register a medical provider
    const timestamp = Date.now();
    const registerRes = await axios.post('http://localhost:5000/api/auth/register/medicalprovider', {
      email: `provider.${timestamp}@test.com`,
      password: 'TestPass123!',
      providerName: `Test Provider ${timestamp}`,
      providerType: 'hospital',
      firstName: 'Admin',
      lastName: 'User',
      phoneNumber: '555-0200',
      privacyAccepted: true
    });
    
    console.log('✅ Registration successful');
    const token = registerRes.data.token;
    
    // Decode the token
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('\n📋 Decoded JWT Token:');
    console.log(JSON.stringify(decoded, null, 2));
    
    console.log('\n🔍 Checking middleware conditions:');
    console.log(`   decoded.userType !== 'medical_provider': ${decoded.userType !== 'medical_provider'}`);
    console.log(`   !decoded.isMedicalProviderUser: ${!decoded.isMedicalProviderUser}`);
    console.log(`   Combined (should be false): ${decoded.userType !== 'medical_provider' || !decoded.isMedicalProviderUser}`);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

test();
