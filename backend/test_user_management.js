const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// Test credentials
const LAW_FIRM_CREDENTIALS = {
  email: 'beta_lawfirm',
  password: 'SecurePass123!'
};

const MEDICAL_PROVIDER_CREDENTIALS = {
  email: 'beta_provider',
  password: 'SecurePass123!'
};

async function testLawFirmUserManagement() {
  console.log('\n🏛️  === TESTING LAW FIRM USER MANAGEMENT ===\n');
  
  try {
    // Step 1: Login as law firm
    console.log('1️⃣  Logging in as Law Firm...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      ...LAW_FIRM_CREDENTIALS,
      userType: 'lawfirm'
    });
    const lawFirmToken = loginRes.data.token;
    const lawFirmId = loginRes.data.account.id;
    console.log('✅ Login successful');
    console.log(`   Firm: ${loginRes.data.account.name}`);
    console.log(`   Token: ${lawFirmToken.substring(0, 20)}...`);
    
    // Step 2: List existing users
    console.log('\n2️⃣  Fetching existing users...');
    const listRes = await axios.get(`${BASE_URL}/lawfirm/users`, {
      headers: { 'Authorization': `Bearer ${lawFirmToken}` }
    });
    console.log(`✅ Found ${listRes.data.users.length} users`);
    console.log('   Response format check:');
    if (listRes.data.users.length > 0) {
      const user = listRes.data.users[0];
      console.log(`   - firstName: ${user.firstName} (${typeof user.firstName})`);
      console.log(`   - lastName: ${user.lastName} (${typeof user.lastName})`);
      console.log(`   - userCode: ${user.userCode} (${typeof user.userCode})`);
      console.log(`   - canManageUsers: ${user.permissions?.canManageUsers} (${typeof user.permissions?.canManageUsers})`);
      console.log(`   - createdBy: ${user.createdBy || 'N/A'}`);
      console.log(`   - lastActivity: ${user.lastActivity || 'N/A'}`);
    }
    
    // Step 3: Create a new user
    console.log('\n3️⃣  Creating new user...');
    const newUser = {
      email: `test.attorney.${Date.now()}@lawfirm.test`,
      password: 'TestPass123!',
      firstName: 'Test',
      lastName: 'Attorney',
      role: 'attorney',
      permissions: {
        canManageUsers: false,
        canManageClients: true,
        canViewAllClients: true,
        canSendNotifications: true,
        canManageDisbursements: false,
        canViewAnalytics: true,
        canManageSettings: false
      }
    };
    
    const createRes = await axios.post(`${BASE_URL}/lawfirm/users`, newUser, {
      headers: { 'Authorization': `Bearer ${lawFirmToken}` }
    });
    console.log('✅ User created successfully');
    console.log(`   User ID: ${createRes.data.user.id}`);
    console.log(`   User Code: ${createRes.data.user.userCode}`);
    console.log(`   Full Name: ${createRes.data.user.firstName} ${createRes.data.user.lastName}`);
    console.log(`   Role: ${createRes.data.user.role}`);
    
    return {
      success: true,
      token: lawFirmToken,
      newUserId: createRes.data.user.id
    };
    
  } catch (error) {
    console.error('❌ Law Firm Test Failed:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
}

async function testMedicalProviderUserManagement() {
  console.log('\n🏥 === TESTING MEDICAL PROVIDER USER MANAGEMENT ===\n');
  
  try {
    // Step 1: Login as medical provider
    console.log('1️⃣  Logging in as Medical Provider...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      ...MEDICAL_PROVIDER_CREDENTIALS,
      userType: 'medical_provider'
    });
    const medicalToken = loginRes.data.token;
    const medicalId = loginRes.data.account.id;
    console.log('✅ Login successful');
    console.log(`   Provider: ${loginRes.data.account.name}`);
    console.log(`   Token: ${medicalToken.substring(0, 20)}...`);
    
    // Step 2: List existing users
    console.log('\n2️⃣  Fetching existing users...');
    const listRes = await axios.get(`${BASE_URL}/medicalprovider/users`, {
      headers: { 'Authorization': `Bearer ${medicalToken}` }
    });
    console.log(`✅ Found ${listRes.data.users.length} users`);
    console.log('   Response format check:');
    if (listRes.data.users.length > 0) {
      const user = listRes.data.users[0];
      console.log(`   - firstName: ${user.firstName} (${typeof user.firstName})`);
      console.log(`   - lastName: ${user.lastName} (${typeof user.lastName})`);
      console.log(`   - userCode: ${user.userCode} (${typeof user.userCode})`);
      console.log(`   - canManageUsers: ${user.permissions?.canManageUsers} (${typeof user.permissions?.canManageUsers})`);
      console.log(`   - createdBy: ${user.createdBy || 'N/A'}`);
      console.log(`   - lastActivity: ${user.lastActivity || 'N/A'}`);
    }
    
    // Step 3: Create a new user
    console.log('\n3️⃣  Creating new user...');
    const newUser = {
      email: `test.physician.${Date.now()}@provider.test`,
      password: 'TestPass123!',
      firstName: 'Test',
      lastName: 'Physician',
      role: 'physician',
      permissions: {
        canManageUsers: false,
        canManagePatients: true,
        canViewAllPatients: true,
        canAccessPhi: true,
        canViewMedicalRecords: true,
        canEditMedicalRecords: true,
        canManageBilling: false,
        canViewAnalytics: true,
        canManageSettings: false,
        canManageConnections: false
      },
      hipaaTrainingDate: new Date().toISOString().split('T')[0]
    };
    
    const createRes = await axios.post(`${BASE_URL}/medicalprovider/users`, newUser, {
      headers: { 'Authorization': `Bearer ${medicalToken}` }
    });
    console.log('✅ User created successfully');
    console.log(`   User ID: ${createRes.data.user.id}`);
    console.log(`   User Code: ${createRes.data.user.userCode}`);
    console.log(`   Full Name: ${createRes.data.user.firstName} ${createRes.data.user.lastName}`);
    console.log(`   Role: ${createRes.data.user.role}`);
    console.log(`   HIPAA Training: ${createRes.data.user.hipaaTrainingDate || 'N/A'}`);
    
    return {
      success: true,
      token: medicalToken,
      newUserId: createRes.data.user.id
    };
    
  } catch (error) {
    console.error('❌ Medical Provider Test Failed:', error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
}

async function runTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     USER MANAGEMENT INTEGRATION TEST SUITE                 ║');
  console.log('║     Testing Law Firm vs Medical Provider Parity           ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  const lawFirmResult = await testLawFirmUserManagement();
  const medicalResult = await testMedicalProviderUserManagement();
  
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    TEST SUMMARY                            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log(`🏛️  Law Firm User Management: ${lawFirmResult.success ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`🏥 Medical Provider User Management: ${medicalResult.success ? '✅ PASS' : '❌ FAIL'}`);
  
  if (lawFirmResult.success && medicalResult.success) {
    console.log('\n🎉 ALL TESTS PASSED! Both portals have full parity.\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  SOME TESTS FAILED. Review errors above.\n');
    process.exit(1);
  }
}

runTests();
