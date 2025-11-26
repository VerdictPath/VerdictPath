const pool = require('../config/db');
const encryptionService = require('./encryption');
const { syncNewMessageToFirebase, syncConversationToFirebase, syncTypingIndicator } = require('./firebaseSync');

/**
 * Chat Service - HIPAA Compliant Real-time Messaging
 * Handles message encryption, connection validation, and Firebase sync
 */

/**
 * Validate that a connection exists between participants
 */
async function validateConnection(type1, id1, type2, id2) {
  // Normalize types
  if (type1 === 'client' || type1 === 'individual') type1 = 'user';
  if (type2 === 'client' || type2 === 'individual') type2 = 'user';
  
  let query, params;

  // Law Firm ↔ Individual User (Client)
  if ((type1 === 'law_firm' && type2 === 'user') || (type1 === 'user' && type2 === 'law_firm')) {
    const lawFirmId = type1 === 'law_firm' ? id1 : id2;
    const userId = type1 === 'user' ? id1 : id2;
    
    query = `
      SELECT 1 FROM law_firm_clients
      WHERE law_firm_id = $1 AND client_id = $2
      LIMIT 1
    `;
    params = [lawFirmId, userId];
  }
  // Medical Provider ↔ Individual User (Patient)
  else if ((type1 === 'medical_provider' && type2 === 'user') || (type1 === 'user' && type2 === 'medical_provider')) {
    const providerId = type1 === 'medical_provider' ? id1 : id2;
    const userId = type1 === 'user' ? id1 : id2;
    
    query = `
      SELECT 1 FROM medical_provider_patients
      WHERE medical_provider_id = $1 AND patient_id = $2
      LIMIT 1
    `;
    params = [providerId, userId];
  }
  // Law Firm ↔ Medical Provider
  else if ((type1 === 'law_firm' && type2 === 'medical_provider') || (type1 === 'medical_provider' && type2 === 'law_firm')) {
    const lawFirmId = type1 === 'law_firm' ? id1 : id2;
    const providerId = type1 === 'medical_provider' ? id1 : id2;
    
    query = `
      SELECT 1 FROM medical_provider_law_firms
      WHERE medical_provider_id = $1 AND law_firm_id = $2
      LIMIT 1
    `;
    params = [providerId, lawFirmId];
  }
  else {
    return { valid: false, error: 'Invalid participant types' };
  }

  const result = await pool.query(query, params);
  return { valid: result.rows.length > 0 };
}

/**
 * Get conversation type based on participant types
 */
function getConversationType(type1, type2) {
  // Normalize types
  if (type1 === 'client' || type1 === 'individual') type1 = 'user';
  if (type2 === 'client' || type2 === 'individual') type2 = 'user';
  
  if ((type1 === 'law_firm' && type2 === 'user') || (type1 === 'user' && type2 === 'law_firm')) {
    return 'lawfirm_client';
  }
  if ((type1 === 'medical_provider' && type2 === 'user') || (type1 === 'user' && type2 === 'medical_provider')) {
    return 'provider_patient';
  }
  if ((type1 === 'law_firm' && type2 === 'medical_provider') || (type1 === 'medical_provider' && type2 === 'law_firm')) {
    return 'firm_provider';
  }
  return null;
}

/**
 * Create or get existing conversation between two participants
 */
async function createOrGetConversation(creatorType, creatorId, participantType, participantId) {
  const client = await pool.pool.connect();
  
  try {
    await client.query('BEGIN');

    // Normalize types for database (convert client/individual to user)
    const normalizedCreatorType = (creatorType === 'client' || creatorType === 'individual') ? 'user' : creatorType;
    const normalizedParticipantType = (participantType === 'client' || participantType === 'individual') ? 'user' : participantType;

    // Validate connection exists (uses original types)
    const connectionCheck = await validateConnection(creatorType, creatorId, participantType, participantId);
    if (!connectionCheck.valid) {
      throw new Error('No connection exists between these participants');
    }

    const conversationType = getConversationType(creatorType, participantType);
    if (!conversationType) {
      throw new Error('Invalid conversation type');
    }

    // Check if conversation already exists (use normalized types for DB)
    const existingConv = await client.query(`
      SELECT DISTINCT c.* FROM conversations c
      INNER JOIN conversation_participants cp1 ON c.id = cp1.conversation_id
      INNER JOIN conversation_participants cp2 ON c.id = cp2.conversation_id
      WHERE c.conversation_type = $1
        AND cp1.participant_type = $2 AND cp1.participant_id = $3
        AND cp2.participant_type = $4 AND cp2.participant_id = $5
      LIMIT 1
    `, [conversationType, normalizedCreatorType, creatorId, normalizedParticipantType, participantId]);

    if (existingConv.rows.length > 0) {
      await client.query('COMMIT');
      return { conversation: existingConv.rows[0], created: false };
    }

    // Create new conversation (use normalized types for DB)
    const newConv = await client.query(`
      INSERT INTO conversations (conversation_type, created_by_type, created_by_id)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [conversationType, normalizedCreatorType, creatorId]);

    const conversationId = newConv.rows[0].id;

    // Add both participants (use normalized types for DB)
    await client.query(`
      INSERT INTO conversation_participants (conversation_id, participant_type, participant_id, role)
      VALUES 
        ($1, $2, $3, 'primary'),
        ($1, $4, $5, 'primary')
    `, [conversationId, normalizedCreatorType, creatorId, normalizedParticipantType, participantId]);

    await client.query('COMMIT');

    // Sync to Firebase
    await syncConversationToFirebase(newConv.rows[0]);

    return { conversation: newConv.rows[0], created: true };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Send a message in a conversation
 */
async function sendMessage(conversationId, senderType, senderId, senderName, messageBody, metadata = {}) {
  const client = await pool.pool.connect();
  
  try {
    await client.query('BEGIN');

    // Normalize type for database
    const normalizedSenderType = (senderType === 'client' || senderType === 'individual') ? 'user' : senderType;

    // Verify sender is a participant
    const participantCheck = await client.query(`
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = $1 AND participant_type = $2 AND participant_id = $3
    `, [conversationId, normalizedSenderType, senderId]);

    if (participantCheck.rows.length === 0) {
      throw new Error('Sender is not a participant in this conversation');
    }

    // Encrypt message body - encryption service returns "iv:authTag:ciphertext" string
    const encryptedString = encryptionService.encrypt(messageBody);
    
    // Validate encryption result (HIPAA compliance requirement)
    if (!encryptedString || typeof encryptedString !== 'string') {
      throw new Error('HIPAA VIOLATION: Encryption failed - message cannot be stored securely');
    }
    
    // Parse the encrypted string into separate fields for database storage
    const parts = encryptedString.split(':');
    if (parts.length !== 3) {
      throw new Error('HIPAA VIOLATION: Invalid encryption format - expected iv:authTag:ciphertext');
    }
    
    const [iv, authTag, ciphertext] = parts;
    
    // Validate all components are present and non-empty
    if (!iv || !authTag || !ciphertext) {
      throw new Error('HIPAA VIOLATION: Incomplete encryption components - cannot store message securely');
    }
    
    const encrypted = { iv, authTag, ciphertext };

    // Insert message
    const messageResult = await client.query(`
      INSERT INTO messages (
        conversation_id, 
        sender_type, 
        sender_id, 
        sender_name,
        body_ciphertext, 
        body_iv, 
        body_auth_tag,
        metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      conversationId,
      normalizedSenderType,
      senderId,
      senderName,
      encrypted.ciphertext,
      encrypted.iv,
      encrypted.authTag,
      JSON.stringify(metadata)
    ]);

    const message = messageResult.rows[0];

    // Create delivery records for all participants except sender
    const participants = await client.query(`
      SELECT id, participant_type, participant_id
      FROM conversation_participants
      WHERE conversation_id = $1 AND NOT (participant_type = $2 AND participant_id = $3)
    `, [conversationId, normalizedSenderType, senderId]);

    for (const participant of participants.rows) {
      await client.query(`
        INSERT INTO message_deliveries (message_id, participant_id, delivery_status)
        VALUES ($1, $2, 'sent')
      `, [message.id, participant.id]);
    }

    // Audit log
    await client.query(`
      INSERT INTO message_audit_log (message_id, conversation_id, action, actor_type, actor_id, context)
      VALUES ($1, $2, 'create', $3, $4, $5)
    `, [message.id, conversationId, normalizedSenderType, senderId, JSON.stringify({ senderName })]);

    await client.query('COMMIT');

    // Sync to Firebase for real-time delivery
    await syncNewMessageToFirebase(message, encrypted);

    return {
      ...message,
      body: messageBody // Return decrypted body for immediate display
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get messages from a conversation with pagination
 */
async function getMessages(conversationId, participantType, participantId, options = {}) {
  const { limit = 50, before = null, after = null } = options;

  // Normalize type for database
  const normalizedParticipantType = (participantType === 'client' || participantType === 'individual') ? 'user' : participantType;

  // Verify participant has access
  const accessCheck = await pool.query(`
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = $1 AND participant_type = $2 AND participant_id = $3
  `, [conversationId, normalizedParticipantType, participantId]);

  if (accessCheck.rows.length === 0) {
    throw new Error('Access denied to this conversation');
  }

  // Build query with pagination
  let query = `
    SELECT m.* 
    FROM messages m
    WHERE m.conversation_id = $1 AND m.is_deleted = FALSE
  `;
  const params = [conversationId];
  let paramIndex = 2;

  if (before) {
    query += ` AND m.sent_at < (SELECT sent_at FROM messages WHERE id = $${paramIndex})`;
    params.push(before);
    paramIndex++;
  }

  if (after) {
    query += ` AND m.sent_at > (SELECT sent_at FROM messages WHERE id = $${paramIndex})`;
    params.push(after);
    paramIndex++;
  }

  query += ` ORDER BY m.sent_at DESC LIMIT $${paramIndex}`;
  params.push(limit);

  const result = await pool.query(query, params);

  // Decrypt messages
  const messages = result.rows.map(msg => {
    try {
      // Reconstruct the encrypted string format: "iv:authTag:ciphertext"
      const encryptedString = `${msg.body_iv}:${msg.body_auth_tag}:${msg.body_ciphertext}`;
      const decrypted = encryptionService.decrypt(encryptedString);
      return {
        ...msg,
        body: decrypted,
        body_ciphertext: undefined,
        body_iv: undefined,
        body_auth_tag: undefined
      };
    } catch (error) {
      console.error('Error decrypting message:', error);
      return {
        ...msg,
        body: '[Encrypted message - decryption failed]'
      };
    }
  });

  // Audit log - track message reads with granular per-message detail
  if (messages.length > 0) {
    await pool.query(`
      INSERT INTO message_audit_log (conversation_id, action, actor_type, actor_id, context)
      VALUES ($1, 'read', $2, $3, $4)
    `, [
      conversationId, 
      normalizedParticipantType, 
      participantId, 
      JSON.stringify({ 
        messageCount: messages.length,
        messageIds: messages.map(m => m.id),
        pagination: { before, after, limit }
      })
    ]);
  }

  return messages.reverse(); // Return in chronological order
}

/**
 * Mark messages as read
 */
async function markAsRead(conversationId, participantType, participantId, lastReadMessageId) {
  const client = await pool.pool.connect();
  
  try {
    await client.query('BEGIN');

    // Normalize type for database
    const normalizedParticipantType = (participantType === 'client' || participantType === 'individual') ? 'user' : participantType;

    // Get participant record
    const participantResult = await client.query(`
      SELECT id FROM conversation_participants
      WHERE conversation_id = $1 AND participant_type = $2 AND participant_id = $3
    `, [conversationId, normalizedParticipantType, participantId]);

    if (participantResult.rows.length === 0) {
      throw new Error('Participant not found in conversation');
    }

    const participantRecordId = participantResult.rows[0].id;

    // Update participant's last read
    await client.query(`
      UPDATE conversation_participants
      SET last_read_message_id = $1, last_read_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [lastReadMessageId, participantRecordId]);

    // Update message deliveries
    const updateResult = await client.query(`
      UPDATE message_deliveries
      SET delivery_status = 'read', read_at = CURRENT_TIMESTAMP
      WHERE participant_id = $1 
        AND message_id IN (
          SELECT id FROM messages 
          WHERE conversation_id = $2 
            AND sent_at <= (SELECT sent_at FROM messages WHERE id = $3)
            AND NOT (sender_type = $4 AND sender_id = $5)
        )
        AND delivery_status != 'read'
      RETURNING message_id
    `, [participantRecordId, conversationId, lastReadMessageId, normalizedParticipantType, participantId]);

    // Audit log - track mark_as_read operations with specific message IDs
    if (updateResult.rows.length > 0) {
      await client.query(`
        INSERT INTO message_audit_log (conversation_id, action, actor_type, actor_id, context)
        VALUES ($1, 'mark_read', $2, $3, $4)
      `, [
        conversationId, 
        normalizedParticipantType, 
        participantId, 
        JSON.stringify({ 
          lastReadMessageId, 
          messagesMarkedRead: updateResult.rows.length,
          messageIds: updateResult.rows.map(row => row.message_id)
        })
      ]);
    }

    await client.query('COMMIT');

    return { success: true };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get unread message count for a participant across all conversations
 */
async function getUnreadCounts(participantType, participantId) {
  // Normalize type for database
  const normalizedParticipantType = (participantType === 'client' || participantType === 'individual') ? 'user' : participantType;

  const result = await pool.query(`
    SELECT 
      cp.conversation_id,
      c.conversation_type,
      COUNT(md.id) as unread_count
    FROM conversation_participants cp
    INNER JOIN conversations c ON c.id = cp.conversation_id
    LEFT JOIN message_deliveries md ON md.participant_id = cp.id AND md.delivery_status != 'read'
    WHERE cp.participant_type = $1 AND cp.participant_id = $2 AND c.is_archived = FALSE
    GROUP BY cp.conversation_id, c.conversation_type
    HAVING COUNT(md.id) > 0
  `, [normalizedParticipantType, participantId]);

  return result.rows;
}

/**
 * Send typing indicator (ephemeral - Firebase only)
 */
async function sendTypingIndicator(conversationId, participantType, participantId, isTyping) {
  // Normalize type for database
  const normalizedParticipantType = (participantType === 'client' || participantType === 'individual') ? 'user' : participantType;

  // Verify participant access
  const accessCheck = await pool.query(`
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = $1 AND participant_type = $2 AND participant_id = $3
  `, [conversationId, normalizedParticipantType, participantId]);

  if (accessCheck.rows.length === 0) {
    throw new Error('Access denied to this conversation');
  }

  // Sync to Firebase only (ephemeral, no database storage)
  await syncTypingIndicator(conversationId, normalizedParticipantType, participantId, isTyping);

  return { success: true };
}

module.exports = {
  createOrGetConversation,
  sendMessage,
  getMessages,
  markAsRead,
  getUnreadCounts,
  sendTypingIndicator,
  validateConnection
};
