import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, off, get } from 'firebase/database';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';
import { firebaseConfig } from '../config/firebase';

console.log('🔥 Firebase Service Loaded - Config:', {
  hasApiKey: !!firebaseConfig.apiKey,
  hasDatabaseURL: !!firebaseConfig.databaseURL,
  projectId: firebaseConfig.projectId
});

let app = null;
let database = null;
let auth = null;
let isInitialized = false;
let isAuthenticated = false;
let activeListeners = new Map();

export const initializeFirebase = () => {
  try {
    if (!isInitialized) {
      console.log('🔥 Initializing Firebase with config:', {
        apiKey: firebaseConfig.apiKey ? '✓ Set' : '✗ Missing',
        authDomain: firebaseConfig.authDomain ? '✓ Set' : '✗ Missing',
        databaseURL: firebaseConfig.databaseURL ? '✓ Set' : '✗ Missing',
        projectId: firebaseConfig.projectId ? '✓ Set' : '✗ Missing',
      });
      app = initializeApp(firebaseConfig);
      database = getDatabase(app);
      auth = getAuth(app);
      isInitialized = true;
      console.log('✅ Firebase initialized successfully');
    }
    return { success: true, database, auth };
  } catch (error) {
    console.error('❌ Firebase initialization error:', error);
    return { success: false, error: error.message };
  }
};

export const authenticateWithBackend = async (authToken) => {
  try {
    if (!isInitialized) {
      initializeFirebase();
    }

    if (isAuthenticated) {
      console.log('✓ Already authenticated to Firebase');
      return { success: true };
    }

    console.log('🔑 Requesting Firebase custom token from backend...');
    console.log('🔑 Auth token present:', !!authToken);
    console.log('🔑 Auth token value (first 20 chars):', authToken?.substring(0, 20) + '...');
    console.log('🔑 Request URL:', `${API_BASE_URL}/api/notifications/firebase-token`);
    
    let response;
    try {
      response = await fetch(`${API_BASE_URL}/api/notifications/firebase-token`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      console.log('🔑 Fetch completed successfully');
    } catch (fetchError) {
      console.error('❌ Fetch request failed:', {
        message: fetchError?.message || 'No message',
        name: fetchError?.name || 'No name',
        type: typeof fetchError,
        error: fetchError
      });
      throw new Error(`Network error fetching Firebase token: ${fetchError?.message || 'Unknown error'}`);
    }

    console.log('🔑 Response status:', response.status);
    console.log('🔑 Response content-type:', response.headers.get('content-type'));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to get Firebase token:', response.status, errorText);
      throw new Error(`Failed to get Firebase token: ${response.status} - ${errorText}`);
    }

    let responseData;
    try {
      responseData = await response.json();
      console.log('✓ Parsed JSON response:', { hasToken: !!responseData.token, uid: responseData.uid, keys: Object.keys(responseData) });
    } catch (jsonError) {
      const responseText = await response.text();
      console.error('❌ Failed to parse JSON response:', responseText);
      throw new Error(`Invalid JSON response from Firebase token endpoint: ${responseText.substring(0, 100)}`);
    }

    if (!responseData || !responseData.token) {
      console.error('❌ Response missing token field:', responseData);
      throw new Error('Firebase token endpoint did not return a token');
    }

    console.log('✓ Received Firebase custom token response:', { hasToken: !!responseData.token, uid: responseData.uid });

    try {
      console.log('🔐 Attempting to sign in to Firebase with custom token...');
      const userCredential = await signInWithCustomToken(auth, responseData.token);
      
      isAuthenticated = true;
      console.log('✅ Successfully authenticated to Firebase, UID:', userCredential.user.uid);
      return { success: true };
    } catch (firebaseError) {
      console.error('❌ Firebase signInWithCustomToken failed:', {
        message: firebaseError?.message || 'No message',
        code: firebaseError?.code || 'No code',
        name: firebaseError?.name || 'No name',
        type: typeof firebaseError,
        error: firebaseError
      });
      throw new Error(`Firebase sign-in failed: ${firebaseError?.message || firebaseError?.code || 'Unknown error'}`);
    }
  } catch (error) {
    const errorDetails = {
      message: error?.message || 'No error message',
      name: error?.name || 'No error name',
      stack: error?.stack || 'No stack trace',
      type: typeof error,
      isError: error instanceof Error,
      keys: error ? Object.keys(error) : [],
      stringified: JSON.stringify(error),
      error: error
    };
    console.error('❌ Firebase authentication error details:', errorDetails);
    isAuthenticated = false;
    return { success: false, error: error?.message || 'Firebase authentication failed' };
  }
};

export const getFirebaseDatabase = () => {
  if (!isInitialized) {
    initializeFirebase();
  }
  return database;
};

export const waitForAuthReady = async (timeoutMs = 5000) => {
  if (!auth) {
    initializeFirebase();
  }
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Firebase auth state timeout'));
    }, timeoutMs);
    
    const unsubscribe = auth.onAuthStateChanged((user) => {
      clearTimeout(timeout);
      unsubscribe();
      if (user) {
        console.log('✅ Firebase auth state confirmed, user:', user.uid);
        resolve({ success: true, user });
      } else {
        console.warn('⚠️ Firebase auth state ready but no user authenticated');
        resolve({ success: false, error: 'No authenticated user' });
      }
    });
  });
};

export const subscribeToNotifications = async (userType, userId, onNotificationsUpdate, onUnreadCountUpdate, authToken) => {
  if (!database) {
    console.error('Firebase database not initialized');
    return null;
  }

  if (!isAuthenticated && authToken) {
    console.log('🔐 Authenticating to Firebase before subscribing...');
    const authResult = await authenticateWithBackend(authToken);
    if (!authResult.success) {
      console.error('❌ Failed to authenticate to Firebase, cannot subscribe');
      return null;
    }
  } else if (!isAuthenticated) {
    console.error('❌ No auth token provided for Firebase authentication');
    return null;
  }

  let basePath;
  if (userType === 'user' || userType === 'individual') {
    basePath = 'users';
  } else if (userType === 'law_firm' || userType === 'lawfirm') {
    basePath = 'lawfirms';
  } else if (userType === 'medical_provider') {
    basePath = 'providers';
  } else {
    console.error('⚠️ Unknown userType:', userType, '- defaulting to users');
    basePath = 'users';
  }
  
  const notificationsPath = `${basePath}/${userId}/notifications`;
  const unreadCountPath = `${basePath}/${userId}/unread_count`;

  console.log(`📡 Setting up Firebase listeners for path: ${notificationsPath}`);

  const notificationsRef = ref(database, notificationsPath);
  const unreadCountRef = ref(database, unreadCountPath);

  const notificationsUnsubscribe = onValue(
    notificationsRef,
    (snapshot) => {
      try {
        const data = snapshot.val();
        console.log(`🔔 Firebase notifications update received:`, data ? Object.keys(data).length : 0, 'notifications');
        if (data) {
          // Log a sample notification to debug
          const firstKey = Object.keys(data)[0];
          if (firstKey) {
            console.log('📋 Sample notification from Firebase:', {
              id: firstKey,
              hasTitle: !!data[firstKey].title,
              hasBody: !!data[firstKey].body,
              title: data[firstKey].title,
              body: data[firstKey].body?.substring(0, 50),
              status: data[firstKey].status,
              is_read: data[firstKey].is_read
            });
          }
          
          const notifications = Object.entries(data).map(([id, notif]) => ({
            id,
            ...notif,
            action_data: typeof notif.action_data === 'string' 
              ? JSON.parse(notif.action_data) 
              : notif.action_data
          }));
          notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
          onNotificationsUpdate(notifications);
        } else {
          onNotificationsUpdate([]);
        }
      } catch (error) {
        console.error('❌ Error processing Firebase notifications:', error);
      }
    },
    (error) => {
      console.error('❌ Firebase notifications listener error:', error);
    }
  );

  const unreadCountUnsubscribe = onValue(
    unreadCountRef,
    (snapshot) => {
      try {
        const count = snapshot.val() || 0;
        console.log(`🔢 Firebase unread count update received:`, count);
        onUnreadCountUpdate(count);
      } catch (error) {
        console.error('❌ Error processing Firebase unread count:', error);
      }
    },
    (error) => {
      console.error('❌ Firebase unread count listener error:', error);
    }
  );

  console.log(`✅ Firebase listeners setup complete for ${userType} ${userId}`);

  const listenerId = `${userType}_${userId}`;
  activeListeners.set(listenerId, {
    notificationsRef,
    unreadCountRef,
    notificationsUnsubscribe,
    unreadCountUnsubscribe
  });

  return () => {
    off(notificationsRef);
    off(unreadCountRef);
    activeListeners.delete(listenerId);
  };
};

export const unsubscribeFromNotifications = (userType, userId) => {
  const listenerId = `${userType}_${userId}`;
  const listener = activeListeners.get(listenerId);
  
  if (listener) {
    off(listener.notificationsRef);
    off(listener.unreadCountRef);
    activeListeners.delete(listenerId);
  }
};

export const unsubscribeAll = () => {
  activeListeners.forEach((listener) => {
    off(listener.notificationsRef);
    off(listener.unreadCountRef);
  });
  activeListeners.clear();
  isAuthenticated = false;
};

export const getNotificationsOnce = async (userType, userId) => {
  if (!database) {
    console.error('Firebase database not initialized');
    return null;
  }

  let basePath;
  if (userType === 'user' || userType === 'individual') {
    basePath = 'users';
  } else if (userType === 'law_firm' || userType === 'lawfirm') {
    basePath = 'lawfirms';
  } else if (userType === 'medical_provider') {
    basePath = 'providers';
  } else {
    console.error('⚠️ Unknown userType:', userType, '- defaulting to users');
    basePath = 'users';
  }

  const notificationsPath = `${basePath}/${userId}/notifications`;
  const notificationsRef = ref(database, notificationsPath);

  try {
    const snapshot = await get(notificationsRef);
    const data = snapshot.val();
    
    if (data) {
      const notifications = Object.entries(data).map(([id, notif]) => ({
        id,
        ...notif,
        action_data: typeof notif.action_data === 'string' 
          ? JSON.parse(notif.action_data) 
          : notif.action_data
      }));
      notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return notifications;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching notifications from Firebase:', error);
    return null;
  }
};

export const getUnreadCountOnce = async (userType, userId) => {
  if (!database) {
    console.error('Firebase database not initialized');
    return 0;
  }

  let basePath;
  if (userType === 'user' || userType === 'individual') {
    basePath = 'users';
  } else if (userType === 'law_firm' || userType === 'lawfirm') {
    basePath = 'lawfirms';
  } else if (userType === 'medical_provider') {
    basePath = 'providers';
  } else {
    console.error('⚠️ Unknown userType:', userType, '- defaulting to users');
    basePath = 'users';
  }

  const unreadCountPath = `${basePath}/${userId}/unread_count`;
  const unreadCountRef = ref(database, unreadCountPath);

  try {
    const snapshot = await get(unreadCountRef);
    return snapshot.val() || 0;
  } catch (error) {
    console.error('Error fetching unread count from Firebase:', error);
    return 0;
  }
};

export const isFirebaseAvailable = () => {
  return isInitialized && database !== null;
};

/**
 * Subscribe to real-time chat messages for a conversation
 */
export const subscribeToChatMessages = async (conversationId, onMessagesUpdate, authToken) => {
  if (!database) {
    console.error('Firebase database not initialized');
    return null;
  }

  if (!isAuthenticated && authToken) {
    console.log('🔐 Authenticating to Firebase before subscribing to chat...');
    const authResult = await authenticateWithBackend(authToken);
    if (!authResult.success) {
      console.error('❌ Failed to authenticate to Firebase, cannot subscribe to chat');
      return null;
    }
  } else if (!isAuthenticated) {
    console.error('❌ No auth token provided for Firebase authentication');
    return null;
  }

  const messagesPath = `chat/conversations/${conversationId}/messages`;
  const messagesRef = ref(database, messagesPath);

  console.log(`💬 Setting up Firebase listener for chat messages: ${messagesPath}`);

  const messagesUnsubscribe = onValue(
    messagesRef,
    (snapshot) => {
      try {
        const data = snapshot.val();
        console.log(`💬 Firebase messages update received for conversation ${conversationId}:`, 
          data ? Object.keys(data).length : 0, 'messages');
        
        if (data) {
          const messages = Object.entries(data).map(([id, msg]) => ({
            id,
            ...msg,
            metadata: typeof msg.metadata === 'string' 
              ? JSON.parse(msg.metadata) 
              : (msg.metadata || {})
          }));
          
          // Sort by sent_at timestamp
          messages.sort((a, b) => new Date(a.sent_at) - new Date(b.sent_at));
          
          console.log(`💬 Processed ${messages.length} messages from Firebase`);
          onMessagesUpdate(messages);
        } else {
          onMessagesUpdate([]);
        }
      } catch (error) {
        console.error('❌ Error processing Firebase chat messages:', error);
      }
    },
    (error) => {
      console.error('❌ Firebase chat messages listener error:', error);
    }
  );

  const listenerId = `chat_${conversationId}`;
  activeListeners.set(listenerId, {
    messagesRef,
    messagesUnsubscribe
  });

  console.log(`✅ Firebase chat listener setup complete for conversation ${conversationId}`);

  return () => {
    off(messagesRef);
    activeListeners.delete(listenerId);
  };
};

/**
 * Unsubscribe from chat messages for a conversation
 */
export const unsubscribeFromChatMessages = (conversationId) => {
  const listenerId = `chat_${conversationId}`;
  const listener = activeListeners.get(listenerId);
  
  if (listener) {
    off(listener.messagesRef);
    activeListeners.delete(listenerId);
    console.log(`🔕 Unsubscribed from chat conversation ${conversationId}`);
  }
};

/**
 * Subscribe to conversation list updates
 */
export const subscribeToChatConversations = async (userType, userId, onConversationsUpdate, authToken) => {
  if (!database) {
    console.error('Firebase database not initialized');
    return null;
  }

  if (!isAuthenticated && authToken) {
    console.log('🔐 Authenticating to Firebase before subscribing to conversations...');
    const authResult = await authenticateWithBackend(authToken);
    if (!authResult.success) {
      console.error('❌ Failed to authenticate to Firebase, cannot subscribe to conversations');
      return null;
    }
  } else if (!isAuthenticated) {
    console.error('❌ No auth token provided for Firebase authentication');
    return null;
  }

  let basePath;
  if (userType === 'user' || userType === 'individual') {
    basePath = 'users';
  } else if (userType === 'law_firm' || userType === 'lawfirm') {
    basePath = 'lawfirms';
  } else if (userType === 'medical_provider') {
    basePath = 'providers';
  } else {
    console.error('⚠️ Unknown userType:', userType, '- defaulting to users');
    basePath = 'users';
  }

  const conversationsPath = `chat/${basePath}/${userId}/conversations`;
  const conversationsRef = ref(database, conversationsPath);

  console.log(`💬 Setting up Firebase listener for conversations: ${conversationsPath}`);

  const conversationsUnsubscribe = onValue(
    conversationsRef,
    (snapshot) => {
      try {
        const data = snapshot.val();
        console.log(`💬 Firebase conversations update received:`, 
          data ? Object.keys(data).length : 0, 'conversations');
        
        if (data) {
          const conversations = Object.entries(data).map(([id, conv]) => ({
            id,
            ...conv
          }));
          
          // Sort by last_message_at
          conversations.sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));
          
          onConversationsUpdate(conversations);
        } else {
          onConversationsUpdate([]);
        }
      } catch (error) {
        console.error('❌ Error processing Firebase conversations:', error);
      }
    },
    (error) => {
      console.error('❌ Firebase conversations listener error:', error);
    }
  );

  const listenerId = `conversations_${userType}_${userId}`;
  activeListeners.set(listenerId, {
    conversationsRef,
    conversationsUnsubscribe
  });

  console.log(`✅ Firebase conversations listener setup complete for ${userType} ${userId}`);

  return () => {
    off(conversationsRef);
    activeListeners.delete(listenerId);
  };
};

/**
 * Subscribe to real-time negotiation updates
 * Path: /negotiations/{userType}s/{userId}/negotiations
 */
export const subscribeToNegotiations = async (userType, userId, onNegotiationsUpdate, authToken) => {
  if (!database) {
    console.error('Firebase database not initialized');
    return null;
  }

  if (!isAuthenticated && authToken) {
    console.log('🔐 Authenticating to Firebase before subscribing to negotiations...');
    const authResult = await authenticateWithBackend(authToken);
    if (!authResult.success) {
      console.error('❌ Failed to authenticate to Firebase, cannot subscribe to negotiations');
      return null;
    }
  } else if (!isAuthenticated) {
    console.error('❌ No auth token provided for Firebase authentication');
    return null;
  }

  let basePath;
  if (userType === 'law_firm' || userType === 'lawfirm') {
    basePath = 'law_firms';
  } else if (userType === 'medical_provider') {
    basePath = 'medical_providers';
  } else {
    console.error('⚠️ Unknown userType for negotiations:', userType);
    return null;
  }

  const negotiationsPath = `negotiations/${basePath}/${userId}`;
  const negotiationsRef = ref(database, negotiationsPath);

  console.log(`💰 Setting up Firebase listener for negotiations: ${negotiationsPath}`);

  const negotiationsUnsubscribe = onValue(
    negotiationsRef,
    (snapshot) => {
      try {
        const data = snapshot.val();
        console.log(`💰 Firebase negotiations update received:`, 
          data ? Object.keys(data).length : 0, 'negotiations');
        
        if (data) {
          const negotiations = Object.entries(data).map(([id, neg]) => ({
            id: parseInt(id) || id,
            ...neg
          }));
          
          // Sort by updated_at timestamp (most recent first)
          negotiations.sort((a, b) => {
            const dateA = new Date(a.updated_at || a.created_at || 0);
            const dateB = new Date(b.updated_at || b.created_at || 0);
            return dateB - dateA;
          });
          
          console.log(`💰 Processed ${negotiations.length} negotiations from Firebase`);
          onNegotiationsUpdate(negotiations);
        } else {
          onNegotiationsUpdate([]);
        }
      } catch (error) {
        console.error('❌ Error processing Firebase negotiations:', error);
      }
    },
    (error) => {
      console.error('❌ Firebase negotiations listener error:', error);
    }
  );

  const listenerId = `negotiations_${userType}_${userId}`;
  activeListeners.set(listenerId, {
    negotiationsRef,
    negotiationsUnsubscribe
  });

  console.log(`✅ Firebase negotiations listener setup complete for ${userType} ${userId}`);

  return () => {
    off(negotiationsRef);
    activeListeners.delete(listenerId);
    console.log(`🔕 Unsubscribed from negotiations for ${userType} ${userId}`);
  };
};

/**
 * Unsubscribe from negotiations for a specific user
 */
export const unsubscribeFromNegotiations = (userType, userId) => {
  const listenerId = `negotiations_${userType}_${userId}`;
  const listener = activeListeners.get(listenerId);
  
  if (listener) {
    off(listener.negotiationsRef);
    activeListeners.delete(listenerId);
    console.log(`🔕 Unsubscribed from negotiations for ${userType} ${userId}`);
  }
};

export default {
  initializeFirebase,
  authenticateWithBackend,
  getFirebaseDatabase,
  subscribeToNotifications,
  unsubscribeFromNotifications,
  unsubscribeAll,
  getNotificationsOnce,
  getUnreadCountOnce,
  isFirebaseAvailable,
  // Chat functions
  subscribeToChatMessages,
  unsubscribeFromChatMessages,
  subscribeToChatConversations,
  // Negotiation functions
  subscribeToNegotiations,
  unsubscribeFromNegotiations
};
