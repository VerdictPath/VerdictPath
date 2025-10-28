// API Configuration
// Backend and frontend both run on port 5000 (single server architecture)
const getApiBaseUrl = () => {
  // Check if we're in a browser environment (React Native Web)
  if (typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    // In Replit, backend and frontend are on the same domain/port
    // Use the current origin (same protocol, hostname, and port)
    return `${protocol}//${hostname}`;
  }
  
  // For React Native mobile apps, use the Replit dev domain
  // This allows mobile devices to connect to the backend
  const replitDomain = '3db82e01-661d-40f3-8a58-a2671f45f1df-00-ogc5sltdyi6u.riker.replit.dev';
  return `https://${replitDomain}`;
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
