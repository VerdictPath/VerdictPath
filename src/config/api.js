// API Configuration
// In Replit, we need to use the domain that the backend is accessible from
// The backend runs on port 3000, frontend on port 5000
const getApiBaseUrl = () => {
  // Check if we're in a browser environment (React Native Web)
  if (typeof window !== 'undefined' && window.location) {
    // Use the current hostname but point to backend port 3000
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    // In Replit, both frontend and backend are accessible via the same domain
    // Just use relative paths or the same origin with port 3000
    if (hostname.includes('replit.dev')) {
      // Use the same domain, backend is accessible at root
      return `${protocol}//${hostname}`;
    }
  }
  
  // Fallback for local development or native mobile
  return 'http://localhost:3000';
};

export const API_BASE_URL = getApiBaseUrl();

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
    UPDATE_STAGE: '/api/lawfirm/litigation-stage'
  },
  MEDICALPROVIDER: {
    DASHBOARD: '/api/medicalprovider/dashboard',
    PATIENT_DETAILS: (patientId) => `/api/medicalprovider/patient/${patientId}`
  }
};

export const apiRequest = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};
