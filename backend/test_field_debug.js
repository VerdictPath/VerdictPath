const axios = require('axios');
require('dotenv').config();

async function debugFields() {
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
    
    const listRes = await axios.get('http://localhost:5000/api/medicalprovider/users', {
      headers: { 'Authorization': `Bearer ${regRes.data.token}` }
    });
    
    const user = listRes.data.users[0];
    
    console.log('User object fields:');
    console.log(JSON.stringify(user, null, 2));
    
    console.log('\n\nField check:');
    console.log('firstName:', user.firstName ? '✓' : '✗');
    console.log('lastName:', user.lastName ? '✓' : '✗');
    console.log('userCode:', user.userCode ? '✓' : '✗');
    console.log('hasOwnProperty canManageUsers:', user.hasOwnProperty('canManageUsers') ? '✓' : '✗');
    console.log('createdBy !== undefined:', user.createdBy !== undefined ? '✓' : '✗');
    console.log('createdBy value:', user.createdBy);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

debugFields();
