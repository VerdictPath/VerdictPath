const admin = require('firebase-admin');

let firebaseApp = null;
let firebaseEnabled = false;

function initializeFirebase() {
  if (firebaseApp) {
    return firebaseApp;
  }

  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    firebaseEnabled = false;
    return null;
  }

  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL
    });

    firebaseEnabled = true;
    return firebaseApp;
  } catch (error) {
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
      return { success: false, error: 'Firebase not configured' };
    }
    const path = getNotificationPath(
      notification.recipient_type,
      notification.recipient_id,
      notification.id
    );

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
    
      title: firebaseData.title,
      body: firebaseData.body,
      created_at: firebaseData.created_at,
      status: firebaseData.status
    });
    return { success: true, path };
  } catch (error) {
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
    
    return { success: true, path };
  } catch (error) {
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
    
    return { success: true };
  } catch (error) {
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
    
    return { success: true };
  } catch (error) {
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
    }
  }

  try {
    await db.ref().update(updates);
    return { success: true, count: Object.keys(updates).length };
  } catch (error) {
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
    
    if (!encrypted || !encrypted.iv || !encrypted.authTag || !encrypted.ciphertext) {
        messageId: message.id,
        hasIv: !!encrypted?.iv,
        hasAuthTag: !!encrypted?.authTag,
        hasCiphertext: !!encrypted?.ciphertext
      });
      throw new Error('Cannot sync message with invalid encryption to Firebase');
    }
    
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

    await db.ref(`${conversationPath}/messages/${message.id}`).set(messageData);

    await db.ref(`${conversationPath}/metadata`).update({
      last_message_at: messageData.sent_at,
      last_message_preview: `${message.sender_name}: Message`,
      updated_at: new Date().toISOString()
    });

    return { success: true };
  } catch (error) {
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
    
    return { success: true };
  } catch (error) {
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

    return { success: true };
  } catch (error) {
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
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Negotiation Firebase Sync Functions
 * Path: /negotiations/{userType}s/{userId}/{negotiationId}
 */

function getNegotiationPath(userType, userId, negotiationId = null) {
  let basePath;
  
  if (userType === 'law_firm') {
    basePath = `/negotiations/law_firms/${userId}`;
  } else if (userType === 'medical_provider') {
    basePath = `/negotiations/medical_providers/${userId}`;
  } else {
    throw new Error(`Invalid user type for negotiations: ${userType}`);
  }

  return negotiationId ? `${basePath}/${negotiationId}` : basePath;
}

async function syncNegotiationToFirebase(negotiation) {
  try {
    const db = getDatabase();
    if (!db) {
      return { success: false, error: 'Firebase not configured' };
    }
    
    const toISOString = (date) => {
      if (!date) return null;
      if (typeof date === 'string') return date;
      return new Date(date).toISOString();
    };

    // Extract latest call request from history if available
    let callRequestPhone = null;
    let callRequestNotes = null;
    let callRequestBy = null;
    if (negotiation.history && Array.isArray(negotiation.history)) {
      const callRequest = negotiation.history.find(h => h.action === 'call_requested');
      if (callRequest) {
        callRequestPhone = callRequest.phoneNumber || null;
        callRequestNotes = callRequest.notes || null;
        callRequestBy = callRequest.actionBy || null;
      }
    }

    const negotiationData = {
      id: negotiation.id,
      client_id: negotiation.client_id,
      client_name: negotiation.client_name || null,
      law_firm_id: negotiation.law_firm_id,
      firm_name: negotiation.firm_name || null,
      law_firm_email: negotiation.law_firm_email || null,
      medical_provider_id: negotiation.medical_provider_id,
      provider_name: negotiation.provider_name || null,
      medical_provider_email: negotiation.medical_provider_email || null,
      bill_description: negotiation.bill_description,
      bill_amount: parseFloat(negotiation.bill_amount) || 0,
      current_offer: parseFloat(negotiation.current_offer) || 0,
      status: negotiation.status,
      initiated_by: negotiation.initiated_by,
      last_responded_by: negotiation.last_responded_by,
      interaction_count: parseInt(negotiation.interaction_count) || 0,
      call_request_phone: callRequestPhone,
      call_request_notes: callRequestNotes,
      call_request_by: callRequestBy,
      history: negotiation.history || [],
      created_at: toISOString(negotiation.created_at),
      updated_at: toISOString(negotiation.updated_at),
      accepted_at: toISOString(negotiation.accepted_at),
      synced_at: new Date().toISOString()
    };

    const lawFirmPath = getNegotiationPath('law_firm', negotiation.law_firm_id, negotiation.id);
    const providerPath = getNegotiationPath('medical_provider', negotiation.medical_provider_id, negotiation.id);

    await Promise.all([
      db.ref(lawFirmPath).set(negotiationData),
      db.ref(providerPath).set(negotiationData)
    ]);

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function syncNegotiationUpdateToFirebase(negotiation, updates) {
  try {
    const db = getDatabase();
    if (!db) {
      return { success: false, error: 'Firebase not configured' };
    }
    
    const toISOString = (date) => {
      if (!date) return null;
      if (typeof date === 'string') return date;
      return new Date(date).toISOString();
    };

    const firebaseUpdates = {
      ...updates,
      synced_at: new Date().toISOString()
    };

    if (updates.updated_at) firebaseUpdates.updated_at = toISOString(updates.updated_at);
    if (updates.accepted_at) firebaseUpdates.accepted_at = toISOString(updates.accepted_at);

    const lawFirmPath = getNegotiationPath('law_firm', negotiation.law_firm_id, negotiation.id);
    const providerPath = getNegotiationPath('medical_provider', negotiation.medical_provider_id, negotiation.id);

    await Promise.all([
      db.ref(lawFirmPath).update(firebaseUpdates),
      db.ref(providerPath).update(firebaseUpdates)
    ]);

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function deleteNegotiationFromFirebase(lawFirmId, medicalProviderId, negotiationId) {
  try {
    const db = getDatabase();
    if (!db) {
      return { success: false, error: 'Firebase not configured' };
    }
    
    const lawFirmPath = getNegotiationPath('law_firm', lawFirmId, negotiationId);
    const providerPath = getNegotiationPath('medical_provider', medicalProviderId, negotiationId);

    await Promise.all([
      db.ref(lawFirmPath).remove(),
      db.ref(providerPath).remove()
    ]);

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function batchSyncNegotiations(negotiations) {
  try {
    const db = getDatabase();
    if (!db) {
      return { success: false, error: 'Firebase not configured' };
    }
    const updates = {};

    for (const neg of negotiations) {
      const toISOString = (date) => {
        if (!date) return null;
        if (typeof date === 'string') return date;
        return new Date(date).toISOString();
      };

      // Extract latest call request from history if available
      let callRequestPhone = null;
      let callRequestNotes = null;
      let callRequestBy = null;
      if (neg.history && Array.isArray(neg.history)) {
        const callRequest = neg.history.find(h => h.action === 'call_requested');
        if (callRequest) {
          callRequestPhone = callRequest.phoneNumber || null;
          callRequestNotes = callRequest.notes || null;
          callRequestBy = callRequest.actionBy || null;
        }
      }

      const negotiationData = {
        id: neg.id,
        client_id: neg.client_id,
        client_name: neg.client_name || null,
        law_firm_id: neg.law_firm_id,
        firm_name: neg.firm_name || null,
        law_firm_email: neg.law_firm_email || null,
        medical_provider_id: neg.medical_provider_id,
        provider_name: neg.provider_name || null,
        medical_provider_email: neg.medical_provider_email || null,
        bill_description: neg.bill_description,
        bill_amount: parseFloat(neg.bill_amount) || 0,
        current_offer: parseFloat(neg.current_offer) || 0,
        status: neg.status,
        initiated_by: neg.initiated_by,
        last_responded_by: neg.last_responded_by,
        interaction_count: parseInt(neg.interaction_count) || 0,
        call_request_phone: callRequestPhone,
        call_request_notes: callRequestNotes,
        call_request_by: callRequestBy,
        history: neg.history || [],
        created_at: toISOString(neg.created_at),
        updated_at: toISOString(neg.updated_at),
        accepted_at: toISOString(neg.accepted_at),
        synced_at: new Date().toISOString()
      };

      const lawFirmPath = getNegotiationPath('law_firm', neg.law_firm_id, neg.id);
      const providerPath = getNegotiationPath('medical_provider', neg.medical_provider_id, neg.id);
      
      updates[lawFirmPath] = negotiationData;
      updates[providerPath] = negotiationData;
    }

    await db.ref().update(updates);
    return { success: true, count: negotiations.length };
  } catch (error) {
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
  syncChatUnreadCounts,
  // Negotiation functions
  getNegotiationPath,
  syncNegotiationToFirebase,
  syncNegotiationUpdateToFirebase,
  deleteNegotiationFromFirebase,
  batchSyncNegotiations
};
