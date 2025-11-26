const admin = require('firebase-admin');

let firebaseApp = null;
let firebaseEnabled = false;

function initializeFirebase() {
  if (firebaseApp) {
    return firebaseApp;
  }

  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT_JSON not configured - Firebase features disabled');
    firebaseEnabled = false;
    return null;
  }

  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });

    console.log('✅ Firebase Admin SDK initialized successfully');
    firebaseEnabled = true;
    return firebaseApp;
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin SDK:', error);
    firebaseEnabled = false;
    return null;
  }
}

function getDatabase() {
  if (!firebaseApp) {
    initializeFirebase();
  }
  if (!firebaseEnabled || !firebaseApp) {
    return null;
  }
  return admin.database();
}

function getNotificationPath(recipientType, recipientId, notificationId = null) {
  let basePath;
  
  if (recipientType === 'user') {
    basePath = `/users/${recipientId}/notifications`;
  } else if (recipientType === 'law_firm') {
    basePath = `/lawfirms/${recipientId}/notifications`;
  } else if (recipientType === 'medical_provider') {
    basePath = `/providers/${recipientId}/notifications`;
  } else {
    throw new Error(`Invalid recipient type: ${recipientType}`);
  }

  return notificationId ? `${basePath}/${notificationId}` : basePath;
}

async function syncNotificationToFirebase(notification) {
  try {
    const db = getDatabase();
    if (!db) {
      console.log('⚠️ Firebase not available - skipping notification sync');
      return { success: false, error: 'Firebase not configured' };
    }
    const path = getNotificationPath(
      notification.recipient_type,
      notification.recipient_id,
      notification.id
    );

    // Helper to convert timestamps to ISO strings
    const toISOString = (date) => {
      if (!date) return null;
      if (typeof date === 'string') return date;
      return new Date(date).toISOString();
    };

    const firebaseData = {
      id: notification.id,
      sender_type: notification.sender_type,
      sender_id: notification.sender_id,
      sender_name: notification.sender_name,
      recipient_type: notification.recipient_type,
      recipient_id: notification.recipient_id,
      title: notification.title,
      body: notification.body,
      type: notification.type,
      priority: notification.priority,
      action_url: notification.action_url,
      action_data: typeof notification.action_data === 'string' 
        ? notification.action_data 
        : JSON.stringify(notification.action_data || {}),
      status: notification.status,
      is_read: notification.status === 'read' || notification.is_read === true,
      is_clicked: notification.is_clicked || false,
      created_at: toISOString(notification.created_at) || new Date().toISOString(),
      sent_at: toISOString(notification.sent_at),
      read_at: toISOString(notification.read_at),
      clicked_at: toISOString(notification.clicked_at),
      synced_at: new Date().toISOString()
    };

    await db.ref(path).set(firebaseData);
    
    console.log(`✅ Synced notification ${notification.id} to Firebase at ${path}`, {
      title: firebaseData.title,
      body: firebaseData.body,
      created_at: firebaseData.created_at,
      status: firebaseData.status
    });
    return { success: true, path };
  } catch (error) {
    console.error('❌ Error syncing notification to Firebase:', error);
    return { success: false, error: error.message };
  }
}

async function syncStatusUpdateToFirebase(recipientType, recipientId, notificationId, updates) {
  try {
    const db = getDatabase();
    if (!db) {
      return { success: false, error: 'Firebase not configured' };
    }
    const path = getNotificationPath(recipientType, recipientId, notificationId);

    const firebaseUpdates = {};
    
    if (updates.status === 'read') {
      firebaseUpdates.is_read = true;
      firebaseUpdates.status = 'read';
      firebaseUpdates.read_at = updates.read_at || new Date().toISOString();
    }
    
    if (updates.is_clicked !== undefined) {
      firebaseUpdates.is_clicked = updates.is_clicked;
      if (updates.is_clicked) {
        firebaseUpdates.clicked_at = updates.clicked_at || new Date().toISOString();
      }
    }

    firebaseUpdates.synced_at = new Date().toISOString();

    await db.ref(path).update(firebaseUpdates);
    
    console.log(`✅ Synced status update for notification ${notificationId} to Firebase`);
    return { success: true, path };
  } catch (error) {
    console.error('❌ Error syncing status update to Firebase:', error);
    return { success: false, error: error.message };
  }
}

async function deleteNotificationFromFirebase(recipientType, recipientId, notificationId) {
  try {
    const db = getDatabase();
    if (!db) {
      return { success: false, error: 'Firebase not configured' };
    }
    const path = getNotificationPath(recipientType, recipientId, notificationId);

    await db.ref(path).remove();
    
    console.log(`✅ Deleted notification ${notificationId} from Firebase`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error deleting notification from Firebase:', error);
    return { success: false, error: error.message };
  }
}

async function syncUnreadCountToFirebase(recipientType, recipientId, count) {
  try {
    const db = getDatabase();
    if (!db) {
      return { success: false, error: 'Firebase not configured' };
    }
    let path;
    
    if (recipientType === 'user') {
      path = `/users/${recipientId}/unread_count`;
    } else if (recipientType === 'law_firm') {
      path = `/lawfirms/${recipientId}/unread_count`;
    } else if (recipientType === 'medical_provider') {
      path = `/providers/${recipientId}/unread_count`;
    }

    await db.ref(path).set(count);
    
    console.log(`✅ Synced unread count (${count}) to Firebase for ${recipientType} ${recipientId}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error syncing unread count to Firebase:', error);
    return { success: false, error: error.message };
  }
}

async function batchSyncNotifications(notifications) {
  const db = getDatabase();
  if (!db) {
    return { success: false, error: 'Firebase not configured' };
  }
  const updates = {};

  for (const notification of notifications) {
    try {
      const path = getNotificationPath(
        notification.recipient_type,
        notification.recipient_id,
        notification.id
      );

      updates[path] = {
        id: notification.id,
        sender_type: notification.sender_type,
        sender_id: notification.sender_id,
        sender_name: notification.sender_name,
        recipient_type: notification.recipient_type,
        recipient_id: notification.recipient_id,
        title: notification.title,
        body: notification.body,
        type: notification.type,
        priority: notification.priority,
        action_url: notification.action_url,
        action_data: typeof notification.action_data === 'string' 
          ? notification.action_data 
          : JSON.stringify(notification.action_data || {}),
        status: notification.status,
        is_read: notification.status === 'read',
        is_clicked: notification.is_clicked || false,
        created_at: notification.created_at,
        sent_at: notification.sent_at,
        read_at: notification.read_at,
        clicked_at: notification.clicked_at,
        synced_at: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Error preparing notification ${notification.id} for batch sync:`, error);
    }
  }

  try {
    await db.ref().update(updates);
    console.log(`✅ Batch synced ${Object.keys(updates).length} notifications to Firebase`);
    return { success: true, count: Object.keys(updates).length };
  } catch (error) {
    console.error('❌ Error batch syncing notifications to Firebase:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Chat Firebase Sync Functions
 */

async function syncNewMessageToFirebase(message, encrypted) {
  try {
    const db = getDatabase();
    if (!db) {
      return { success: false, error: 'Firebase not configured' };
    }
    const conversationPath = `/chat/conversations/${message.conversation_id}`;
    
    // Validate encrypted components before syncing (HIPAA compliance requirement)
    if (!encrypted || !encrypted.iv || !encrypted.authTag || !encrypted.ciphertext) {
      console.error('❌ Firebase sync failed: Invalid encryption components', {
        messageId: message.id,
        hasIv: !!encrypted?.iv,
        hasAuthTag: !!encrypted?.authTag,
        hasCiphertext: !!encrypted?.ciphertext
      });
      throw new Error('Cannot sync message with invalid encryption to Firebase');
    }
    
    // Sync message to Firebase (with encrypted content only - HIPAA compliant)
    const messageData = {
      id: message.id,
      sender_type: message.sender_type,
      sender_id: message.sender_id,
      sender_name: message.sender_name,
      body_ciphertext: encrypted.ciphertext,
      body_iv: encrypted.iv,
      body_auth_tag: encrypted.authTag,
      message_type: message.message_type,
      status: message.status,
      sent_at: message.sent_at || new Date().toISOString(),
      metadata: message.metadata || {}
    };

    // Store message in Firebase
    await db.ref(`${conversationPath}/messages/${message.id}`).set(messageData);

    // Update conversation metadata
    await db.ref(`${conversationPath}/metadata`).update({
      last_message_at: messageData.sent_at,
      last_message_preview: `${message.sender_name}: Message`,
      updated_at: new Date().toISOString()
    });

    console.log(`✅ Synced message ${message.id} to Firebase for conversation ${message.conversation_id}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error syncing message to Firebase:', error);
    return { success: false, error: error.message };
  }
}

async function syncConversationToFirebase(conversation) {
  try {
    const db = getDatabase();
    if (!db) {
      return { success: false, error: 'Firebase not configured' };
    }
    const path = `/chat/conversations/${conversation.id}/metadata`;

    const conversationData = {
      id: conversation.id,
      conversation_type: conversation.conversation_type,
      created_by_type: conversation.created_by_type,
      created_by_id: conversation.created_by_id,
      last_message_at: conversation.last_message_at || new Date().toISOString(),
      is_archived: conversation.is_archived || false,
      created_at: conversation.created_at || new Date().toISOString(),
      synced_at: new Date().toISOString()
    };

    await db.ref(path).set(conversationData);
    
    console.log(`✅ Synced conversation ${conversation.id} to Firebase`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error syncing conversation to Firebase:', error);
    return { success: false, error: error.message };
  }
}

async function syncTypingIndicator(conversationId, participantType, participantId, isTyping) {
  try {
    const db = getDatabase();
    if (!db) {
      return { success: false, error: 'Firebase not configured' };
    }
    const participantKey = `${participantType}_${participantId}`;
    const path = `/chat/conversations/${conversationId}/typing/${participantKey}`;

    if (isTyping) {
      await db.ref(path).set({
        isTyping: true,
        updatedAt: new Date().toISOString()
      });
    } else {
      await db.ref(path).remove();
    }

    console.log(`✅ Synced typing indicator for ${participantKey} in conversation ${conversationId}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error syncing typing indicator to Firebase:', error);
    return { success: false, error: error.message };
  }
}

async function syncChatUnreadCounts(participantType, participantId, unreadCounts) {
  try {
    const db = getDatabase();
    if (!db) {
      return { success: false, error: 'Firebase not configured' };
    }
    const path = `/chat/${participantType}s/${participantId}/unread_counts`;

    const countsObject = {};
    unreadCounts.forEach(item => {
      countsObject[item.conversation_id] = parseInt(item.unread_count) || 0;
    });

    await db.ref(path).set(countsObject);
    
    console.log(`✅ Synced chat unread counts to Firebase for ${participantType} ${participantId}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error syncing chat unread counts to Firebase:', error);
    return { success: false, error: error.message };
  }
}

initializeFirebase();

module.exports = {
  initializeFirebase,
  getDatabase,
  syncNotificationToFirebase,
  syncStatusUpdateToFirebase,
  deleteNotificationFromFirebase,
  syncUnreadCountToFirebase,
  batchSyncNotifications,
  getNotificationPath,
  // Chat functions
  syncNewMessageToFirebase,
  syncConversationToFirebase,
  syncTypingIndicator,
  syncChatUnreadCounts
};
