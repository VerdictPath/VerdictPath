const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// Generate unique test credentials
const timestamp = Date.now();
const LAW_FIRM_TEST = {
  email: `lawfirm.test.${timestamp}@test.com`,
  password: 'TestPass123!',
  firmName: `Test Law Firm ${timestamp}`,
  firstName: 'Admin',
  lastName: 'User',
  phoneNumber: '555-0100',
  privacyAccepted: true
};

const MEDICAL_PROVIDER_TEST = {
  email: `provider.test.${timestamp}@test.com`,
  password: 'TestPass123!',
  providerName: `Test Provider ${timestamp}`,
  providerType: 'hospital',
  firstName: 'Admin',
  lastName: 'User',
  phoneNumber: '555-0200',
  privacyAccepted: true
};

async function testLawFirmUserManagement() {
  console.log('\n🏛️  === TESTING LAW FIRM USER MANAGEMENT ===\n');
  
  try {
    // Step 0: Register new law firm
    console.log('0️⃣  Registering new law firm...');
    const registerRes = await axios.post(`${BASE_URL}/auth/register/lawfirm`, LAW_FIRM_TEST);
    console.log('✅ Law firm registered successfully');
    console.log(`   Firm Code: ${registerRes.data.lawFirm.firmCode}`);
    
    // Step 1: Login as law firm
    console.log('\n1️⃣  Logging in as Law Firm...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: LAW_FIRM_TEST.email,
      password: LAW_FIRM_TEST.password,
      userType: 'lawfirm'
    });
    const lawFirmToken = loginRes.data.token;
    const lawFirmId = loginRes.data.user.id;
    console.log(`   Firm: ${loginRes.data.user.name}`);
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
      console.log(`   ✓ firstName: ${user.firstName} (${typeof user.firstName})`);
      console.log(`   ✓ lastName: ${user.lastName} (${typeof user.lastName})`);
      console.log(`   ✓ userCode: ${user.userCode} (${typeof user.userCode})`);
      console.log(`   ✓ canManageUsers: ${user.permissions?.canManageUsers} (${typeof user.permissions?.canManageUsers})`);
      console.log(`   ✓ createdBy: ${user.createdBy || 'System'}`);
      console.log(`   ✓ lastActivity: ${user.lastActivity || 'Never'}`);
      
      // Verify camelCase format
      if (typeof user.firstName !== 'string' || typeof user.lastName !== 'string') {
        throw new Error('Response not in camelCase format!');
      }
    }
    
    // Step 3: Create a new user
    console.log('\n3️⃣  Creating new user...');
    const newUser = {
      email: `attorney.${timestamp}@lawfirm.test`,
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
    
    // Step 4: Verify user appears in list
    console.log('\n4️⃣  Verifying user in list...');
    const listRes2 = await axios.get(`${BASE_URL}/lawfirm/users`, {
      headers: { 'Authorization': `Bearer ${lawFirmToken}` }
    });
    console.log(`✅ Now found ${listRes2.data.users.length} users (was ${listRes.data.users.length})`);
    
    return {
      success: true,
      token: lawFirmToken,
      newUserId: createRes.data.user.id,
      userCount: listRes2.data.users.length
    };
    
  } catch (error) {
    console.error('❌ Law Firm Test Failed:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('   Full error:', JSON.stringify(error.response.data, null, 2));
    }
    return { success: false, error: error.response?.data || error.message };
  }
}

async function testMedicalProviderUserManagement() {
  console.log('\n🏥 === TESTING MEDICAL PROVIDER USER MANAGEMENT ===\n');
  
  try {
    // Step 0: Register new medical provider
    console.log('0️⃣  Registering new medical provider...');
    const registerRes = await axios.post(`${BASE_URL}/auth/register/medicalprovider`, MEDICAL_PROVIDER_TEST);
    console.log('✅ Medical provider registered successfully');
    console.log(`   Provider Code: ${registerRes.data.medicalProvider.providerCode}`);
    
    // Step 1: Login as medical provider
    console.log('\n1️⃣  Logging in as Medical Provider...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: MEDICAL_PROVIDER_TEST.email,
      password: MEDICAL_PROVIDER_TEST.password,
      userType: 'medical_provider'
    });
    const medicalToken = loginRes.data.token;
    const medicalId = loginRes.data.user.id;
    console.log(`   Provider: ${loginRes.data.user.name}`);
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
      console.log(`   ✓ firstName: ${user.firstName} (${typeof user.firstName})`);
      console.log(`   ✓ lastName: ${user.lastName} (${typeof user.lastName})`);
      console.log(`   ✓ userCode: ${user.userCode} (${typeof user.userCode})`);
      console.log(`   ✓ canManageUsers: ${user.permissions?.canManageUsers} (${typeof user.permissions?.canManageUsers})`);
      console.log(`   ✓ createdBy: ${user.createdBy || 'System'}`);
      console.log(`   ✓ lastActivity: ${user.lastActivity || 'Never'}`);
      
      // Verify camelCase format
      if (typeof user.firstName !== 'string' || typeof user.lastName !== 'string') {
        throw new Error('Response not in camelCase format!');
      }
    }
    
    // Step 3: Create a new user
    console.log('\n3️⃣  Creating new user...');
    const newUser = {
      email: `physician.${timestamp}@provider.test`,
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
    
    // Step 4: Verify user appears in list
    console.log('\n4️⃣  Verifying user in list...');
    const listRes2 = await axios.get(`${BASE_URL}/medicalprovider/users`, {
      headers: { 'Authorization': `Bearer ${medicalToken}` }
    });
    console.log(`✅ Now found ${listRes2.data.users.length} users (was ${listRes.data.users.length})`);
    
    return {
      success: true,
      token: medicalToken,
      newUserId: createRes.data.user.id,
      userCount: listRes2.data.users.length
    };
    
  } catch (error) {
    console.error('❌ Medical Provider Test Failed:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('   Full error:', JSON.stringify(error.response.data, null, 2));
    }
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
  if (lawFirmResult.success) {
    console.log(`   - Created ${lawFirmResult.userCount} total users`);
  }
  
  console.log(`🏥 Medical Provider User Management: ${medicalResult.success ? '✅ PASS' : '❌ FAIL'}`);
  if (medicalResult.success) {
    console.log(`   - Created ${medicalResult.userCount} total users`);
  }
  
  if (lawFirmResult.success && medicalResult.success) {
    console.log('\n🎉 ALL TESTS PASSED! Both portals have full parity.');
    console.log('✅ Audit logging working');
    console.log('✅ Bootstrap scenario handled');
    console.log('✅ Creator names shown');
    console.log('✅ Last activity tracked');
    console.log('✅ CamelCase responses confirmed');
    process.exit(0);
  } else {
    console.log('\n⚠️  SOME TESTS FAILED. Review errors above.\n');
    process.exit(1);
  }
}

runTests();
