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
  
  try {
    // Step 0: Register new law firm
    const registerRes = await axios.post(`${BASE_URL}/auth/register/lawfirm`, LAW_FIRM_TEST);
    
    // Step 1: Login as law firm
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: LAW_FIRM_TEST.email,
      password: LAW_FIRM_TEST.password,
      userType: 'lawfirm'
    });
    const lawFirmToken = loginRes.data.token;
    const lawFirmId = loginRes.data.user.id;
    
    // Step 2: List existing users
    const listRes = await axios.get(`${BASE_URL}/lawfirm/users`, {
      headers: { 'Authorization': `Bearer ${lawFirmToken}` }
    });
    if (listRes.data.users.length > 0) {
      const user = listRes.data.users[0];
      
      // Verify camelCase format
      if (typeof user.firstName !== 'string' || typeof user.lastName !== 'string') {
        throw new Error('Response not in camelCase format!');
      }
    }
    
    // Step 3: Create a new user
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
    
    // Step 4: Verify user appears in list
    const listRes2 = await axios.get(`${BASE_URL}/lawfirm/users`, {
      headers: { 'Authorization': `Bearer ${lawFirmToken}` }
    });
    
    return {
      success: true,
      token: lawFirmToken,
      newUserId: createRes.data.user.id,
      userCount: listRes2.data.users.length
    };
    
  } catch (error) {
    if (error.response?.data) {
    }
    return { success: false, error: error.response?.data || error.message };
  }
}

async function testMedicalProviderUserManagement() {
  
  try {
    // Step 0: Register new medical provider
    const registerRes = await axios.post(`${BASE_URL}/auth/register/medicalprovider`, MEDICAL_PROVIDER_TEST);
    
    // Step 1: Login as medical provider
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: MEDICAL_PROVIDER_TEST.email,
      password: MEDICAL_PROVIDER_TEST.password,
      userType: 'medical_provider'
    });
    const medicalToken = loginRes.data.token;
    const medicalId = loginRes.data.user.id;
    
    // Step 2: List existing users
    const listRes = await axios.get(`${BASE_URL}/medicalprovider/users`, {
      headers: { 'Authorization': `Bearer ${medicalToken}` }
    });
    if (listRes.data.users.length > 0) {
      const user = listRes.data.users[0];
      
      // Verify camelCase format
      if (typeof user.firstName !== 'string' || typeof user.lastName !== 'string') {
        throw new Error('Response not in camelCase format!');
      }
    }
    
    // Step 3: Create a new user
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
    
    // Step 4: Verify user appears in list
    const listRes2 = await axios.get(`${BASE_URL}/medicalprovider/users`, {
      headers: { 'Authorization': `Bearer ${medicalToken}` }
    });
    
    return {
      success: true,
      token: medicalToken,
      newUserId: createRes.data.user.id,
      userCount: listRes2.data.users.length
    };
    
  } catch (error) {
    if (error.response?.data) {
    }
    return { success: false, error: error.response?.data || error.message };
  }
}

async function runTests() {
  
  const lawFirmResult = await testLawFirmUserManagement();
  const medicalResult = await testMedicalProviderUserManagement();
  
  
  if (lawFirmResult.success) {
  }
  
  if (medicalResult.success) {
  }
  
  if (lawFirmResult.success && medicalResult.success) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests();
