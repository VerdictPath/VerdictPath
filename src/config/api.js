// UPDATED API CONFIGURATION - Connect Frontend to Replit Backend
// Replace your existing /src/config/api.js with this file

// ============================================================================
// API BASE URL CONFIGURATION
// ============================================================================

// RAILWAY PRODUCTION DEPLOYMENT
// export const API_BASE_URL = 'https://verdictpath.up.railway.app';

// LOCAL DEVELOPMENT (uncomment when testing locally)
// export const API_BASE_URL = 'http://localhost:5000';

// REPLIT DEVELOPMENT (if using Replit for backend)
export const API_BASE_URL = 'https://3db82e01-661d-40f3-8a58-a2671f45f1df-00-ogc5sltdyi6u.riker.replit.dev';

// ============================================================================
// API ENDPOINTS
// ============================================================================

export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    REGISTER_CLIENT: `${API_BASE_URL}/api/auth/register/client`,
    REGISTER_LAWFIRM: `${API_BASE_URL}/api/auth/register/lawfirm`,
    REGISTER_MEDICALPROVIDER: `${API_BASE_URL}/api/auth/register/medicalprovider`,
    LOGIN: `${API_BASE_URL}/api/auth/login`,
    LOGOUT: `${API_BASE_URL}/api/auth/logout`,
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
    COMPLETE_SUBSTAGE: `${API_BASE_URL}/api/litigation/complete-substage`,
    COMPLETE_STAGE: `${API_BASE_URL}/api/litigation/complete-stage`,
    REVERT_STAGE: `${API_BASE_URL}/api/litigation/revert-stage`,
  },

  // Law Firm
  LAWFIRM: {
    DASHBOARD: `${API_BASE_URL}/api/lawfirm/dashboard`,
    CLIENTS: `${API_BASE_URL}/api/lawfirm/clients`,
    CLIENT_DETAILS: (clientId) => `${API_BASE_URL}/api/lawfirm/clients/${clientId}`,
    CLIENT_PROGRESS: (clientId) => `${API_BASE_URL}/api/lawfirm/clients/${clientId}/progress`,
  },

  // Medical Provider
  MEDICALPROVIDER: {
    PATIENTS: `${API_BASE_URL}/api/medicalprovider/patients`,
    PATIENT_DETAILS: (patientId) => `${API_BASE_URL}/api/medicalprovider/patients/${patientId}`,
    LAW_FIRMS: `${API_BASE_URL}/api/connections/law-firms`,
    ADD_LAW_FIRM: `${API_BASE_URL}/api/connections/add-law-firm`,
    REMOVE_LAW_FIRM: `${API_BASE_URL}/api/connections/remove-law-firm`,
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

  // Notifications
  NOTIFICATIONS: {
    LIST: `${API_BASE_URL}/api/notifications`,
    UNREAD_COUNT: `${API_BASE_URL}/api/notifications/unread-count`,
    MARK_READ: `${API_BASE_URL}/api/notifications/mark-read`,
    MARK_CLICKED: `${API_BASE_URL}/api/notifications/mark-clicked`,
    MARK_ALL_READ: `${API_BASE_URL}/api/notifications/mark-all-read`,
    REGISTER_DEVICE: `${API_BASE_URL}/api/notifications/register-device`,
    UNREGISTER_DEVICE: `${API_BASE_URL}/api/notifications/unregister-device`,
    SEND: `${API_BASE_URL}/api/notifications/send`,
    SEND_TO_CLIENTS: `${API_BASE_URL}/api/notifications/send-to-clients`,
    ANALYTICS: `${API_BASE_URL}/api/notifications/analytics`,
  },

  // Negotiations
  NEGOTIATIONS: {
    LIST: `${API_BASE_URL}/api/negotiations`,
    INITIATE: `${API_BASE_URL}/api/negotiations/initiate`,
    COUNTER_OFFER: `${API_BASE_URL}/api/negotiations/counter-offer`,
    ACCEPT: `${API_BASE_URL}/api/negotiations/accept`,
    REQUEST_CALL: `${API_BASE_URL}/api/negotiations/request-call`,
    LOG: (negotiationId) => `${API_BASE_URL}/api/negotiations/${negotiationId}/log`,
  },

  // Avatar
  AVATAR: {
    SELECT: `${API_BASE_URL}/api/avatar/select`,
    CURRENT: `${API_BASE_URL}/api/avatar/current`,
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
};

// ============================================================================
// IMPROVED API REQUEST FUNCTION WITH BETTER ERROR HANDLING
// ============================================================================

export async function apiRequest(url, options = {}) {
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  const config = { ...defaultOptions, ...options };

  try {
    console.log(`[API] ${config.method || 'GET'} ${url}`);
    
    const response = await fetch(url, config);
    
    // Log response status
    console.log(`[API] Response: ${response.status} ${response.statusText}`);

    // Handle non-JSON responses (like for file downloads)
    const contentType = response.headers.get('content-type');
    
    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      // For non-JSON responses (files, etc.)
      data = await response.text();
    }

    // Handle errors
    if (!response.ok) {
      // Extract error message from response
      const errorMessage = data?.message || data?.error || response.statusText || 'Request failed';
      
      // Log for debugging
      console.error('[API] Error:', {
        status: response.status,
        message: errorMessage,
        url: url
      });

      // Throw with detailed error
      const error = new Error(errorMessage);
      error.status = response.status;
      error.response = data;
      throw error;
    }

    return data;

  } catch (error) {
    // Network errors or other fetch errors
    if (error.message === 'Network request failed' || error.message === 'Failed to fetch') {
      console.error('[API] Network Error - Check your internet connection');
      throw new Error('Network error. Please check your internet connection.');
    }

    // Timeout errors
    if (error.name === 'AbortError') {
      console.error('[API] Request Timeout');
      throw new Error('Request timeout. Please try again.');
    }

    // Re-throw the error with context
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
  console.warn('Please update API_BASE_URL in /src/config/api.js with your actual Replit URL');
}

// Log API configuration on app start
console.log('🔧 API Configuration:');
console.log('Base URL:', API_BASE_URL);

// Test backend connection on app start (optional - comment out if not needed)
if (__DEV__) {
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
    console.log(`Upload progress: ${progress}%`);
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
  console.log('Login successful:', data);
} catch (error) {
  // Handle specific error types
  if (isAuthError(error)) {
    console.log('Invalid credentials');
  } else if (isNetworkError(error)) {
    console.log('Network error');
  } else {
    console.log('Error:', getErrorMessage(error));
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
  isNetworkError,
};