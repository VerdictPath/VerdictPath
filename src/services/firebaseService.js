import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, off, get } from 'firebase/database';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';
import { firebaseConfig } from '../config/firebase';

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
        apiKey: firebaseConfig.apiKey ? '✓ Set' : '✗ Missing',
        authDomain: firebaseConfig.authDomain ? '✓ Set' : '✗ Missing',
        databaseURL: firebaseConfig.databaseURL ? '✓ Set' : '✗ Missing',
        projectId: firebaseConfig.projectId ? '✓ Set' : '✗ Missing',
      });
      app = initializeApp(firebaseConfig);
      database = getDatabase(app);
      auth = getAuth(app);
      isInitialized = true;
    }
    return { success: true, database, auth };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const authenticateWithBackend = async (authToken) => {
  try {
    if (!isInitialized) {
      initializeFirebase();
    }

    if (isAuthenticated) {
      return { success: true };
    }

    
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
    } catch (fetchError) {
        message: fetchError?.message || 'No message',
        name: fetchError?.name || 'No name',
        type: typeof fetchError,
        error: fetchError
      });
      throw new Error(`Network error fetching Firebase token: ${fetchError?.message || 'Unknown error'}`);
    }


    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get Firebase token: ${response.status} - ${errorText}`);
    }

    let responseData;
    try {
      responseData = await response.json();
    } catch (jsonError) {
      const responseText = await response.text();
      throw new Error(`Invalid JSON response from Firebase token endpoint: ${responseText.substring(0, 100)}`);
    }

    if (!responseData || !responseData.token) {
      throw new Error('Firebase token endpoint did not return a token');
    }


    try {
      const userCredential = await signInWithCustomToken(auth, responseData.token);
      
      isAuthenticated = true;
      return { success: true };
    } catch (firebaseError) {
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
        resolve({ success: true, user });
      } else {
        resolve({ success: false, error: 'No authenticated user' });
      }
    });
  });
};

export const subscribeToNotifications = async (userType, userId, onNotificationsUpdate, onUnreadCountUpdate, authToken) => {
  if (!database) {
    return null;
  }

  if (!isAuthenticated && authToken) {
    const authResult = await authenticateWithBackend(authToken);
    if (!authResult.success) {
      return null;
    }
  } else if (!isAuthenticated) {
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
    basePath = 'users';
  }
  
  const notificationsPath = `${basePath}/${userId}/notifications`;
  const unreadCountPath = `${basePath}/${userId}/unread_count`;


  const notificationsRef = ref(database, notificationsPath);
  const unreadCountRef = ref(database, unreadCountPath);

  const notificationsUnsubscribe = onValue(
    notificationsRef,
    (snapshot) => {
      try {
        const data = snapshot.val();
        if (data) {
          // Log a sample notification to debug
          const firstKey = Object.keys(data)[0];
          if (firstKey) {
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
      }
    },
    (error) => {
    }
  );

  const unreadCountUnsubscribe = onValue(
    unreadCountRef,
    (snapshot) => {
      try {
        const count = snapshot.val() || 0;
        onUnreadCountUpdate(count);
      } catch (error) {
      }
    },
    (error) => {
    }
  );


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
    return null;
  }
};

export const getUnreadCountOnce = async (userType, userId) => {
  if (!database) {
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
    basePath = 'users';
  }

  const unreadCountPath = `${basePath}/${userId}/unread_count`;
  const unreadCountRef = ref(database, unreadCountPath);

  try {
    const snapshot = await get(unreadCountRef);
    return snapshot.val() || 0;
  } catch (error) {
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
    return null;
  }

  if (!isAuthenticated && authToken) {
    const authResult = await authenticateWithBackend(authToken);
    if (!authResult.success) {
      return null;
    }
  } else if (!isAuthenticated) {
    return null;
  }

  const messagesPath = `chat/conversations/${conversationId}/messages`;
  const messagesRef = ref(database, messagesPath);


  const messagesUnsubscribe = onValue(
    messagesRef,
    (snapshot) => {
      try {
        const data = snapshot.val();
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
          
          onMessagesUpdate(messages);
        } else {
          onMessagesUpdate([]);
        }
      } catch (error) {
      }
    },
    (error) => {
    }
  );

  const listenerId = `chat_${conversationId}`;
  activeListeners.set(listenerId, {
    messagesRef,
    messagesUnsubscribe
  });


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
  }
};

/**
 * Subscribe to conversation list updates
 */
export const subscribeToChatConversations = async (userType, userId, onConversationsUpdate, authToken) => {
  if (!database) {
    return null;
  }

  if (!isAuthenticated && authToken) {
    const authResult = await authenticateWithBackend(authToken);
    if (!authResult.success) {
      return null;
    }
  } else if (!isAuthenticated) {
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
    basePath = 'users';
  }

  const conversationsPath = `chat/${basePath}/${userId}/conversations`;
  const conversationsRef = ref(database, conversationsPath);


  const conversationsUnsubscribe = onValue(
    conversationsRef,
    (snapshot) => {
      try {
        const data = snapshot.val();
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
      }
    },
    (error) => {
    }
  );

  const listenerId = `conversations_${userType}_${userId}`;
  activeListeners.set(listenerId, {
    conversationsRef,
    conversationsUnsubscribe
  });


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
    return null;
  }

  if (!isAuthenticated && authToken) {
    const authResult = await authenticateWithBackend(authToken);
    if (!authResult.success) {
      return null;
    }
  } else if (!isAuthenticated) {
    return null;
  }

  let basePath;
  if (userType === 'law_firm' || userType === 'lawfirm') {
    basePath = 'law_firms';
  } else if (userType === 'medical_provider') {
    basePath = 'medical_providers';
  } else {
    return null;
  }

  const negotiationsPath = `negotiations/${basePath}/${userId}`;
  const negotiationsRef = ref(database, negotiationsPath);


  const negotiationsUnsubscribe = onValue(
    negotiationsRef,
    (snapshot) => {
      try {
        const data = snapshot.val();
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
          
          onNegotiationsUpdate(negotiations);
        } else {
          onNegotiationsUpdate([]);
        }
      } catch (error) {
      }
    },
    (error) => {
    }
  );

  const listenerId = `negotiations_${userType}_${userId}`;
  activeListeners.set(listenerId, {
    negotiationsRef,
    negotiationsUnsubscribe
  });


  return () => {
    off(negotiationsRef);
    activeListeners.delete(listenerId);
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
