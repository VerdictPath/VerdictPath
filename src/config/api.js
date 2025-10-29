// API Configuration
// Backend deployed on Railway, frontend on Replit
const getApiBaseUrl = () => {
  // PRODUCTION: Railway backend URL
  const railwayBackendUrl = 'https://verdictpath.up.railway.app';
  
  // Always use Railway backend for all environments
  return railwayBackendUrl;
};

export const API_BASE_URL = getApiBaseUrl();
export const API_URL = `${API_BASE_URL}/api`;

export const API_ENDPOINTS = {
  AUTH: {
    REGISTER_CLIENT: '/api/auth/register/client',
    REGISTER_LAWFIRM: '/api/auth/register/lawfirm',
    REGISTER_MEDICALPROVIDER: '/api/auth/register/medicalprovider',
    LOGIN: '/api/auth/login'
  },
  LAWFIRM: {
    DASHBOARD: '/api/lawfirm/dashboard',
    CLIENT_DETAILS: (clientId) => `/api/lawfirm/client/${clientId}`,
    UPDATE_STAGE: '/api/lawfirm/litigation-stage',
    ALL_DOCUMENTS: '/api/lawfirm/documents/all'
  },
  MEDICALPROVIDER: {
    DASHBOARD: '/api/medicalprovider/dashboard',
    PATIENT_DETAILS: (patientId) => `/api/medicalprovider/patient/${patientId}`
  },
  COINS: {
    UPDATE: '/api/coins/update',
    CONVERT: '/api/coins/convert',
    BALANCE: '/api/coins/balance',
    CONVERSION_HISTORY: '/api/coins/conversion-history'
  },
  INVITES: {
    MY_CODE: '/api/invites/my-code',
    STATS: '/api/invites/stats',
    VALIDATE: (code) => `/api/invites/validate/${code}`,
    PROCESS: '/api/invites/process'
  },
  SUBSCRIPTION: {
    LAWFIRM_CURRENT: '/api/subscription/lawfirm/current',
    LAWFIRM_UPDATE: '/api/subscription/lawfirm/update',
    MEDICALPROVIDER_CURRENT: '/api/subscription/medicalprovider/current',
    MEDICALPROVIDER_UPDATE: '/api/subscription/medicalprovider/update'
  },
  CONNECTIONS: {
    MY_CONNECTIONS: '/api/connections/my-connections',
    UPDATE_LAWFIRM: '/api/connections/update-lawfirm',
    UPDATE_MEDICALPROVIDER: '/api/connections/update-medicalprovider'
  },
  LITIGATION: {
    PROGRESS: '/api/litigation/progress',
    COMPLETE_SUBSTAGE: '/api/litigation/substage/complete',
    REVERT_SUBSTAGE: '/api/litigation/substage/revert',
    COMPLETE_STAGE: '/api/litigation/stage/complete',
    REVERT_STAGE: '/api/litigation/stage/revert',
    VIDEO_PROGRESS: '/api/litigation/video/progress'
  }
};

export const apiRequest = async (endpoint, options = {}) => {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log('API Request:', url, options.method || 'GET');
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    const data = await response.json();
    console.log('API Response:', response.status, data);

    if (!response.ok) {
      const errorMessage = data.message || data.error || 'API request failed';
      throw new Error(errorMessage);
    }

    return data;
  } catch (error) {
    console.error('API Error:', error.message || error);
    throw error;
  }
};
