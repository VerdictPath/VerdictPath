// UPDATED API CONFIGURATION - Connect Frontend to Replit Backend [v2.2.0]
// Replace your existing /src/config/api.js with this file
// CACHE BUST: Fixed client/patient singular endpoints - December 15, 2025

// ============================================================================
// API BASE URL CONFIGURATION
// ============================================================================

// Environment-based API URL selection
// Priority: Environment Variable > Production > Local Development

const getApiBaseUrl = () => {
  // Priority 1: Explicit override via environment variable
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }

  // Priority 2: Use relative URL (works on web deployments)
  // This uses the same origin as the frontend, which is served by the backend
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return window.location.origin;
  }

  // Priority 3: Production Railway URL for native mobile apps (iOS/Android)
  return 'https://verdictpath.up.railway.app';
};

export const API_BASE_URL = getApiBaseUrl();

// ============================================================================
// API ENDPOINTS
// ============================================================================

export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    REGISTER_CLIENT: `${API_BASE_URL}/api/auth/register/client`,
    REGISTER_LAWFIRM: `${API_BASE_URL}/api/auth/register/lawfirm`,
    REGISTER_MEDICALPROVIDER: `${API_BASE_URL}/api/auth/register/medicalprovider`,
    JOIN_MEDICALPROVIDER: `${API_BASE_URL}/api/auth/join/medicalprovider`,
    JOIN_LAWFIRM: `${API_BASE_URL}/api/auth/join/lawfirm`,
    LOGIN: `${API_BASE_URL}/api/auth/login`,
    LOGIN_LAWFIRM_USER: `${API_BASE_URL}/api/auth/login/lawfirm-user`,
    LOGIN_MEDICALPROVIDER_USER: `${API_BASE_URL}/api/auth/login/medicalprovider-user`,
    LOGOUT: `${API_BASE_URL}/api/auth/logout`,
    REFRESH_TOKEN: `${API_BASE_URL}/api/auth/refresh-token`,
    CONTACT_INFO: `${API_BASE_URL}/api/auth/contact-info`,
  },

  // Coins & Gamification
  COINS: {
    BALANCE: `${API_BASE_URL}/api/coins/balance`,
    CLAIM_DAILY: `${API_BASE_URL}/api/coins/claim-daily`,
    CONVERT: `${API_BASE_URL}/api/coins/convert`,
  },

  // Litigation Progress
  LITIGATION: {
    PROGRESS: `${API_BASE_URL}/api/litigation/progress`,
    COMPLETE_SUBSTAGE: `${API_BASE_URL}/api/litigation/substage/complete`,
    COMPLETE_STAGE: `${API_BASE_URL}/api/litigation/stage/complete`,
    REVERT_STAGE: `${API_BASE_URL}/api/litigation/stage/revert`,
    REVERT_SUBSTAGE: `${API_BASE_URL}/api/litigation/substage/revert`,
    UPDATE_VIDEO_PROGRESS: `${API_BASE_URL}/api/litigation/video/progress`,
  },

  // Law Firm
  LAWFIRM: {
    DASHBOARD: `${API_BASE_URL}/api/lawfirm/dashboard`,
    CLIENTS: `${API_BASE_URL}/api/lawfirm/clients`,
    GET_CLIENTS: `${API_BASE_URL}/api/lawfirm/clients`,
    CLIENT_DETAILS: (clientId) => `${API_BASE_URL}/api/lawfirm/client/${clientId}`,
    CLIENT_PROGRESS: (clientId) => `${API_BASE_URL}/api/lawfirm/client/${clientId}/progress`,
  },

  // Medical Provider
  MEDICALPROVIDER: {
    DASHBOARD: `${API_BASE_URL}/api/medicalprovider/dashboard`,
    PATIENTS: `${API_BASE_URL}/api/medicalprovider/patients`,
    PATIENT_DETAILS: (patientId) => `${API_BASE_URL}/api/medicalprovider/patient/${patientId}`,
    LAW_FIRMS: `${API_BASE_URL}/api/connections/law-firms`,
    ADD_LAW_FIRM: `${API_BASE_URL}/api/connections/add-law-firm`,
    REMOVE_LAW_FIRM: `${API_BASE_URL}/api/connections/remove-law-firm`,
  },

  CONNECTIONS: {
    MY_CONNECTIONS: `${API_BASE_URL}/api/connections/my-connections`,
    UPDATE_LAWFIRM: `${API_BASE_URL}/api/connections/update-lawfirm`,
    ADD_MEDICAL_PROVIDER: `${API_BASE_URL}/api/connections/add-medical-provider`,
    DISCONNECT_LAWFIRM: `${API_BASE_URL}/api/connections/disconnect-lawfirm`,
    REMOVE_MEDICAL_PROVIDER: `${API_BASE_URL}/api/connections/remove-medical-provider`,
    ADD_LAWFIRM_MEDICAL_PROVIDER: `${API_BASE_URL}/api/connections/add-medical-provider-lawfirm`,
    REMOVE_LAWFIRM_MEDICAL_PROVIDER: `${API_BASE_URL}/api/connections/remove-medical-provider-lawfirm`,
    REQUESTS: `${API_BASE_URL}/api/connections/requests`,
    ACCEPT_REQUEST: (requestId) => `${API_BASE_URL}/api/connections/requests/${requestId}/accept`,
    DECLINE_REQUEST: (requestId) => `${API_BASE_URL}/api/connections/requests/${requestId}/decline`,
    CANCEL_REQUEST: (requestId) => `${API_BASE_URL}/api/connections/requests/${requestId}/cancel`,
  },

  // Invites & Referrals
  INVITES: {
    MY_CODE: `${API_BASE_URL}/api/invites/my-code`,
    GENERATE: `${API_BASE_URL}/api/invites/generate`,
    PROCESS: `${API_BASE_URL}/api/invites/process`,
    STATS: `${API_BASE_URL}/api/invites/stats`,
  },

  // File Uploads
  UPLOADS: {
    DOCUMENT: `${API_BASE_URL}/api/uploads/document`,
    DOCUMENTS: `${API_BASE_URL}/api/uploads/documents`,
    LIST: `${API_BASE_URL}/api/uploads`,
    GET: (documentId) => `${API_BASE_URL}/api/uploads/${documentId}`,
    DELETE: (documentId) => `${API_BASE_URL}/api/uploads/${documentId}`,
  },

  // Subscriptions (Stripe)
  SUBSCRIPTIONS: {
    CREATE_CHECKOUT: `${API_BASE_URL}/api/subscriptions/create-checkout-session`,
    PORTAL: `${API_BASE_URL}/api/subscriptions/portal-session`,
    STATUS: `${API_BASE_URL}/api/subscriptions/status`,
    WEBHOOK: `${API_BASE_URL}/api/subscriptions/webhook`, // Backend only
  },

  // Subscription Management
  SUBSCRIPTION: {
    LAWFIRM_CURRENT: `${API_BASE_URL}/api/subscription/lawfirm/current`,
    LAWFIRM_UPDATE: `${API_BASE_URL}/api/subscription/lawfirm/update`,
    MEDICALPROVIDER_CURRENT: `${API_BASE_URL}/api/subscription/medicalprovider/current`,
    MEDICALPROVIDER_UPDATE: `${API_BASE_URL}/api/subscription/medicalprovider/update`,
  },

  PAYMENT: {
    LAWFIRM_CHECKOUT: `${API_BASE_URL}/api/payment/lawfirm/create-checkout-session`,
    LAWFIRM_PAYMENT_INTENT: `${API_BASE_URL}/api/payment/lawfirm/create-payment-intent`,
    LAWFIRM_CONFIRM: `${API_BASE_URL}/api/payment/lawfirm/confirm-subscription`,
  },

  // Notifications
  NOTIFICATIONS: {
    LIST: `${API_BASE_URL}/api/notifications`,
    MY_NOTIFICATIONS: `${API_BASE_URL}/api/notifications/my-notifications`,
    UNREAD_COUNT: `${API_BASE_URL}/api/notifications/unread-count`,
    DETAIL: (notificationId) => `${API_BASE_URL}/api/notifications/${notificationId}`,
    THREAD: (notificationId) => `${API_BASE_URL}/api/notifications/${notificationId}/thread`,
    REPLY: (notificationId) => `${API_BASE_URL}/api/notifications/${notificationId}/reply`,
    MARK_READ: (notificationId) => `${API_BASE_URL}/api/notifications/${notificationId}/read`,
    MARK_CLICKED: (notificationId) => `${API_BASE_URL}/api/notifications/${notificationId}/clicked`,
    MARK_ALL_READ: `${API_BASE_URL}/api/notifications/mark-all-read`,
    REGISTER_DEVICE: `${API_BASE_URL}/api/notifications/register-device`,
    UNREGISTER_DEVICE: `${API_BASE_URL}/api/notifications/unregister-device`,
    SEND: `${API_BASE_URL}/api/notifications/send`,
    SEND_TO_ALL_CLIENTS: `${API_BASE_URL}/api/notifications/send-to-all-clients`,
    SEND_TO_CLIENTS: `${API_BASE_URL}/api/notifications/send-to-clients`,
    SEND_TO_CLIENT: `${API_BASE_URL}/api/notifications/send-to-client`,
    SEND_TO_ALL_PATIENTS: `${API_BASE_URL}/api/notifications/send-to-all-patients`,
    SEND_TO_PATIENTS: `${API_BASE_URL}/api/notifications/send-to-patients`,
    SEND_TO_PATIENT: `${API_BASE_URL}/api/notifications/send-to-patient`,
    ANALYTICS: `${API_BASE_URL}/api/notifications/analytics`,
    STATS: `${API_BASE_URL}/api/notifications/stats`,
    HISTORY: `${API_BASE_URL}/api/notifications/history`,
    PREFERENCES: `${API_BASE_URL}/api/notifications/preferences`,
  },

  // Negotiations
  NEGOTIATIONS: {
    LIST: `${API_BASE_URL}/api/negotiations`,
    INITIATE: `${API_BASE_URL}/api/negotiations/initiate`,
    COUNTER_OFFER: `${API_BASE_URL}/api/negotiations/counter-offer`,
    ACCEPT: `${API_BASE_URL}/api/negotiations/accept`,
    DECLINE: `${API_BASE_URL}/api/negotiations/decline`,
    REQUEST_CALL: `${API_BASE_URL}/api/negotiations/request-call`,
    LOG: (negotiationId) => `${API_BASE_URL}/api/negotiations/${negotiationId}/log`,
  },

  // Client-Medical Provider Relationships
  CLIENT_RELATIONSHIPS: {
    GET_CLIENT_PROVIDERS: (clientId) => `${API_BASE_URL}/api/client-relationships/clients/${clientId}/medical-providers`,
    ADD_PROVIDER: `${API_BASE_URL}/api/client-relationships/clients/link-provider`,
    REMOVE_PROVIDER: (clientId, providerId) => `${API_BASE_URL}/api/client-relationships/clients/${clientId}/medical-providers/${providerId}`,
  },

  // Tasks (Attorney-Assigned Tasks)
  TASKS: {
    MY_TASKS: `${API_BASE_URL}/api/tasks/my-tasks`,
    CREATE: `${API_BASE_URL}/api/tasks/create`,
    UPDATE_STATUS: (taskId) => `${API_BASE_URL}/api/tasks/${taskId}/status`,
    GET_CLIENT_TASKS: (clientId) => `${API_BASE_URL}/api/tasks/client/${clientId}`,
    DELETE: (taskId) => `${API_BASE_URL}/api/tasks/${taskId}`,
    TEMPLATES: `${API_BASE_URL}/api/tasks/templates`,
  },

  // Avatar
  AVATAR: {
    SELECT: `${API_BASE_URL}/api/avatar/select`,
    CURRENT: `${API_BASE_URL}/api/avatar/current`,
  },

  // Music
  MUSIC: {
    PREFERENCE: `${API_BASE_URL}/api/music/preference`,
  },

  // Law Firm Users (Multi-User Management)
  LAWFIRM_USERS: {
    CREATE: `${API_BASE_URL}/api/lawfirm/users`,
    GET_ALL: `${API_BASE_URL}/api/lawfirm/users`,
    GET_DETAILS: (userId) => `${API_BASE_URL}/api/lawfirm/users/${userId}`,
    UPDATE: (userId) => `${API_BASE_URL}/api/lawfirm/users/${userId}`,
    DEACTIVATE: (userId) => `${API_BASE_URL}/api/lawfirm/users/${userId}/deactivate`,
    REACTIVATE: (userId) => `${API_BASE_URL}/api/lawfirm/users/${userId}/reactivate`,
  },

  // Law Firm Activity Tracking
  LAWFIRM_ACTIVITY: {
    GET_LOGS: `${API_BASE_URL}/api/lawfirm/activity`,
    GET_STATISTICS: `${API_BASE_URL}/api/lawfirm/activity/statistics`,
    GET_SUMMARY: `${API_BASE_URL}/api/lawfirm/activity/summary`,
    GET_MOST_ACTIVE: `${API_BASE_URL}/api/lawfirm/activity/most-active-users`,
    GET_FAILED: `${API_BASE_URL}/api/lawfirm/activity/failed`,
    GET_USER_TIMELINE: (userId) => `${API_BASE_URL}/api/lawfirm/activity/user/${userId}/timeline`,
  },

  // Medical Provider Users (Multi-User Management)
  MEDICAL_PROVIDER_USERS: {
    CREATE: `${API_BASE_URL}/api/medicalprovider/users`,
    GET_ALL: `${API_BASE_URL}/api/medicalprovider/users`,
    GET_DETAILS: (userId) => `${API_BASE_URL}/api/medicalprovider/users/${userId}`,
    UPDATE: (userId) => `${API_BASE_URL}/api/medicalprovider/users/${userId}`,
    DEACTIVATE: (userId) => `${API_BASE_URL}/api/medicalprovider/users/${userId}/deactivate`,
    REACTIVATE: (userId) => `${API_BASE_URL}/api/medicalprovider/users/${userId}/reactivate`,
  },

  // Medical Provider Activity Tracking (HIPAA-Compliant)
  MEDICAL_PROVIDER_ACTIVITY: {
    GET_LOGS: `${API_BASE_URL}/api/medicalprovider/activity/logs`,
    GET_SUMMARY: `${API_BASE_URL}/api/medicalprovider/activity/summary`,
    GET_USER_TIMELINE: (userId) => `${API_BASE_URL}/api/medicalprovider/activity/user/${userId}/timeline`,
    HIPAA_REPORT: `${API_BASE_URL}/api/medicalprovider/activity/hipaa-report`,
    PATIENT_AUDIT: (patientId) => `${API_BASE_URL}/api/medicalprovider/activity/patient/${patientId}/audit`,
  },

  // Settlements
  SETTLEMENTS: {
    LIST: `${API_BASE_URL}/api/settlements`,
    CREATE: `${API_BASE_URL}/api/settlements`,
    GET: (id) => `${API_BASE_URL}/api/settlements/${id}`,
    UPDATE: (id) => `${API_BASE_URL}/api/settlements/${id}`,
    ADD_LIEN: (id) => `${API_BASE_URL}/api/settlements/${id}/liens`,
    SEND_STATEMENT: (id) => `${API_BASE_URL}/api/settlements/${id}/send-statement`,
    CONNECTED_PROVIDERS: `${API_BASE_URL}/api/settlements/connected-providers`,
  },

  // Disbursements (Settlement Disbursements)
  DISBURSEMENTS: {
    PROCESS: `${API_BASE_URL}/api/disbursements/process`,
    GET_HISTORY: `${API_BASE_URL}/api/disbursements/history`,
    GET_CLIENT_PROVIDERS: `${API_BASE_URL}/api/disbursements/client-providers`,
    GET_RECEIVED: `${API_BASE_URL}/api/disbursements/received`,
    GET_DETAILS: (disbursementId) => `${API_BASE_URL}/api/disbursements/${disbursementId}`,
  },

  // Bank Information (Individual Users)
  BANK_INFO: {
    GET: `${API_BASE_URL}/api/bank-info`,
    SAVE: `${API_BASE_URL}/api/bank-info`,
    DELETE: `${API_BASE_URL}/api/bank-info`,
  },

  // Stripe Connect (Payment Setup)
  STRIPE_CONNECT: {
    // Shared endpoints (role-aware)
    ACCOUNT_STATUS: `${API_BASE_URL}/api/stripe-connect/account-status`,
    
    // Law Firm endpoints (Stripe Customer - they pay)
    CREATE_CUSTOMER: `${API_BASE_URL}/api/stripe-connect/create-customer`,
    CUSTOMER_STATUS: `${API_BASE_URL}/api/stripe-connect/customer-status`,
    CREATE_SETUP_INTENT: `${API_BASE_URL}/api/stripe-connect/create-setup-intent`,
    BILLING_PORTAL: `${API_BASE_URL}/api/stripe-connect/create-billing-portal`,
    SET_DEFAULT_PAYMENT: `${API_BASE_URL}/api/stripe-connect/set-default-payment-method`,
    
    // Recipient endpoints (Stripe Connect - they receive)
    CREATE_ACCOUNT: `${API_BASE_URL}/api/stripe-connect/create-account`,
    ONBOARDING_LINK: `${API_BASE_URL}/api/stripe-connect/create-onboarding-link`,
    DASHBOARD_LINK: `${API_BASE_URL}/api/stripe-connect/create-dashboard-link`,
  },
};

// ============================================================================
// IMPROVED API REQUEST FUNCTION WITH BETTER ERROR HANDLING
// ============================================================================

let isRefreshing = false;
let refreshPromise = null;

async function attemptTokenRefresh(originalHeaders) {
  if (isRefreshing) {
    return refreshPromise;
  }
  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refreshResponse = await fetch(API_ENDPOINTS.AUTH.REFRESH_TOKEN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...originalHeaders,
        },
        credentials: 'include',
      });
      if (!refreshResponse.ok) {
        return null;
      }
      const refreshData = await refreshResponse.json();
      return refreshData.token || true;
    } catch {
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export async function apiRequest(url, options = {}, _isRetry = false) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
    credentials: 'include',
  };

  try {
    
    const response = await fetch(url, config);

    const contentType = response.headers.get('content-type');
    
    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      if (response.status === 401 && data?.code === 'TOKEN_EXPIRED' && !_isRetry) {
        const refreshResult = await attemptTokenRefresh(options.headers || {});
        if (refreshResult) {
          const retryHeaders = { ...options.headers };
          if (typeof refreshResult === 'string' && retryHeaders.Authorization) {
            retryHeaders.Authorization = `Bearer ${refreshResult}`;
          }
          return apiRequest(url, { ...options, headers: retryHeaders }, true);
        }
      }

      const errorMessage = data?.message || data?.error || response.statusText || 'Request failed';
      
      console.error('[API] Error:', {
        status: response.status,
        message: errorMessage,
        url: url
      });

      const error = new Error(errorMessage);
      error.status = response.status;
      error.response = data;
      throw error;
    }

    return data;

  } catch (error) {
    if (error.message === 'Network request failed' || error.message === 'Failed to fetch') {
      console.error('[API] Network Error - Check your internet connection');
      throw new Error('Network error. Please check your internet connection.');
    }

    if (error.name === 'AbortError') {
      console.error('[API] Request Timeout');
      throw new Error('Request timeout. Please try again.');
    }

    console.error('[API] Request failed:', error);
    throw error;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if backend is reachable
 */
export async function checkBackendHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',  // Send httpOnly cookies
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Backend is healthy:', data);
      return true;
    }
    
    console.warn('⚠️ Backend responded but not OK:', response.status);
    return false;
  } catch (error) {
    console.error('❌ Backend is unreachable:', error);
    return false;
  }
}

/**
 * Upload file with progress tracking
 */
export async function uploadFileWithProgress(file, token, onProgress, fileType = 'general', category = 'general') {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percentComplete = (e.loaded / e.total) * 100;
        if (onProgress) {
          onProgress(Math.round(percentComplete));
        }
      }
    });

    // Handle completion
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch (error) {
          reject(new Error('Invalid response from server'));
        }
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          reject(new Error(error.message || 'Upload failed'));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    });

    // Handle errors
    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload cancelled'));
    });

    // Prepare form data
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileType', fileType);
    formData.append('category', category);

    // Send request
    xhr.open('POST', API_ENDPOINTS.UPLOADS.DOCUMENT);
    xhr.withCredentials = true;  // Send httpOnly cookies with XHR
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  });
}

/**
 * Get error message from error object
 */
export function getErrorMessage(error) {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  if (error?.response?.message) {
    return error.response.message;
  }
  
  return 'An unexpected error occurred';
}

/**
 * Check if error is authentication error
 */
export function isAuthError(error) {
  return error?.status === 401 || error?.status === 403;
}

export function isTokenExpiredError(error) {
  return error?.status === 401 && error?.response?.code === 'TOKEN_EXPIRED';
}

/**
 * Check if error is network error
 */
export function isNetworkError(error) {
  return error?.message?.includes('Network') || 
         error?.message?.includes('fetch') ||
         error?.message?.includes('connection');
}

// ============================================================================
// CONFIGURATION VALIDATION
// ============================================================================

// Validate API_BASE_URL on module load
if (API_BASE_URL.includes('your-replit-username')) {
  console.warn('⚠️ WARNING: API_BASE_URL is not configured!');
}

// Log API configuration on app start

// Test backend connection on app start (optional - comment out if not needed)
if (typeof __DEV__ !== 'undefined' && __DEV__) {
  checkBackendHealth().then(isHealthy => {
    if (isHealthy) {
      console.log('✅ Backend connection successful!');
    } else {
      console.error('❌ Backend connection failed! Please check API_BASE_URL');
    }
  });
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/*
// Example 1: Simple GET request
const balance = await apiRequest(API_ENDPOINTS.COINS.BALANCE, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Example 2: POST request with body
const result = await apiRequest(API_ENDPOINTS.LITIGATION.COMPLETE_SUBSTAGE, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    stageId: 'pre-filing',
    subStageId: 'pre-1',
    subStageName: 'Initial Consultation',
    coinsEarned: 50
  })
});

// Example 3: File upload with progress
const file = { 
  uri: 'file://...',
  name: 'document.pdf',
  type: 'application/pdf'
};

const result = await uploadFileWithProgress(
  file,
  token,
  (progress) => {
  },
  'medical_bill',
  'medical'
);

// Example 4: Error handling
try {
  const data = await apiRequest(API_ENDPOINTS.AUTH.LOGIN, {
    method: 'POST',
    body: JSON.stringify({ email, password, userType: 'individual' })
  });
  // Success
} catch (error) {
  // Handle specific error types
  if (isAuthError(error)) {
  } else if (isNetworkError(error)) {
  } else {
  }
}
*/

// ============================================================================
// EXPORT EVERYTHING
// ============================================================================

export default {
  API_BASE_URL,
  API_ENDPOINTS,
  apiRequest,
  checkBackendHealth,
  uploadFileWithProgress,
  getErrorMessage,
  isAuthError,
  isTokenExpiredError,
  isNetworkError,
};
