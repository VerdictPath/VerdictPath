// Firebase client configuration
// Note: These are client-side credentials and are safe to expose in the browser
// Security is enforced by Firebase Database Rules, not by hiding these values

// Get values from environment variables or use fallbacks for development
const getEnvVar = (key, fallback = '') => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return fallback;
};

export const firebaseConfig = {
  apiKey: getEnvVar('EXPO_PUBLIC_FIREBASE_API_KEY', getEnvVar('FIREBASE_API_KEY', 'AIzaSyB_9r8D5hybCknkPO-CZTOSAG7G53ca6n0')),
  authDomain: getEnvVar('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN', getEnvVar('FIREBASE_AUTH_DOMAIN', 'verdictpath-aaf5d.firebaseapp.com')),
  databaseURL: getEnvVar('EXPO_PUBLIC_FIREBASE_DATABASE_URL', getEnvVar('FIREBASE_DATABASE_URL', 'https://verdictpath-aaf5d-default-rtdb.firebaseio.com')),
  projectId: getEnvVar('EXPO_PUBLIC_FIREBASE_PROJECT_ID', getEnvVar('FIREBASE_PROJECT_ID', 'verdictpath-aaf5d')),
  storageBucket: getEnvVar('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET', getEnvVar('FIREBASE_STORAGE_BUCKET', 'verdictpath-aaf5d.firebasestorage.app')),
  messagingSenderId: getEnvVar('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', getEnvVar('FIREBASE_MESSAGING_SENDER_ID', '326881493456')),
  appId: getEnvVar('EXPO_PUBLIC_FIREBASE_APP_ID', getEnvVar('FIREBASE_APP_ID', '1:326881493456:web:da33cd312bfc528d0379d5'))
};
