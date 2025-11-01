// API Configuration - Environment-aware backend URL selection
import Constants from 'expo-constants';

const getApiBaseUrl = () => {
  // Priority 1: Explicit environment variable override (for testing/staging)
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }
  
  // Priority 2: Production environment (Railway deployment)
  if (!__DEV__) {
    return 'https://verdictpath.up.railway.app';
  }
  
  // Priority 3: Development environment
  // Check if running on a physical device (iOS/Android) via tunnel mode
  // Physical devices can't access localhost, so use Replit public URL
  const platform = Constants.platform;
  if (platform && (platform.ios || platform.android)) {
    // Running on physical device - use Replit public URL
    return 'https://3db82e01-661d-40f3-8a58-a2671f45f1df-00-ogc5sltdyi6u.riker.replit.dev';
  }
  
  // Priority 4: Web browser or Expo web (localhost works here)
  return 'http://localhost:3000';
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
    CLIENTS: '/api/lawfirm/clients',
    CLIENT_DETAILS: (clientId) => `/api/lawfirm/client/${clientId}`,
    UPDATE_STAGE: '/api/lawfirm/litigation-stage',
    ALL_DOCUMENTS: '/api/lawfirm/documents/all'
  },
  MEDICALPROVIDER: {
    DASHBOARD: '/api/medicalprovider/dashboard',
    PATIENTS: '/api/medicalprovider/patients',
    PATIENT_DETAILS: (patientId) => `/api/medicalprovider/patient/${patientId}`
  },
  COINS: {
    // UPDATE endpoint removed for security - use specific endpoints instead
    CONVERT: '/api/coins/convert',
    BALANCE: '/api/coins/balance',
    CONVERSION_HISTORY: '/api/coins/conversion-history',
    CLAIM_DAILY: '/api/coins/claim-daily'
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
    DISCONNECT_LAWFIRM: '/api/connections/disconnect-lawfirm',
    ADD_MEDICALPROVIDER: '/api/connections/add-medical-provider',
    REMOVE_MEDICALPROVIDER: '/api/connections/remove-medical-provider'
  },
  LITIGATION: {
    PROGRESS: '/api/litigation/progress',
    COMPLETE_SUBSTAGE: '/api/litigation/substage/complete',
    REVERT_SUBSTAGE: '/api/litigation/substage/revert',
    COMPLETE_STAGE: '/api/litigation/stage/complete',
    REVERT_STAGE: '/api/litigation/stage/revert',
    VIDEO_PROGRESS: '/api/litigation/video/progress'
  },
  NOTIFICATIONS: {
    REGISTER_DEVICE: '/api/notifications/register-device',
    UNREGISTER_DEVICE: '/api/notifications/unregister-device',
    MY_NOTIFICATIONS: '/api/notifications/my-notifications',
    UNREAD_COUNT: '/api/notifications/unread-count',
    MARK_READ: (id) => `/api/notifications/${id}/read`,
    MARK_CLICKED: (id) => `/api/notifications/${id}/clicked`,
    SEND_TO_CLIENTS: '/api/notifications/send-to-clients',
    SEND_TO_PATIENTS: '/api/notifications/send-to-patients'
  },
  TASKS: {
    MY_TASKS: '/api/tasks/my-tasks',
    CREATE: '/api/tasks/create',
    UPDATE_STATUS: (taskId) => `/api/tasks/${taskId}/status`,
    CLIENT_TASKS: (clientId) => `/api/tasks/client/${clientId}`,
    DELETE: (taskId) => `/api/tasks/${taskId}`,
    TEMPLATES: '/api/tasks/templates'
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
