const chatService = require('../services/chatService');
const pool = require('../config/db');
const { sendNotificationSMS } = require('../services/smsService');
const { syncChatUnreadCounts } = require('../services/firebaseSync');
const { sendMessageReceivedEmail } = require('../services/emailService');

/**
 * Chat Controller - RESTful API for HIPAA-compliant messaging
 */

/**
 * GET /api/chat/available-connections
 * Get all available connections for messaging
 */
exports.getAvailableConnections = async (req, res) => {
  try {
    const userType = req.user.userType;
    const userId = req.user.id;
    const connections = [];

    // Individual users can message their law firms and medical providers
    if (userType === 'client' || userType === 'individual') {
      // Get connected law firms
      const lawFirms = await pool.query(`
        SELECT 
          lf.id,
          lf.firm_name as name,
          'law_firm' as type,
          lfc.registered_date as connected_at
        FROM law_firm_clients lfc
        JOIN law_firms lf ON lf.id = lfc.law_firm_id
        WHERE lfc.client_id = $1
        ORDER BY lf.firm_name
      `, [userId]);

      // Get connected medical providers
      const medicalProviders = await pool.query(`
        SELECT 
          mp.id,
          mp.provider_name as name,
          'medical_provider' as type,
          mpp.registered_date as connected_at
        FROM medical_provider_patients mpp
        JOIN medical_providers mp ON mp.id = mpp.medical_provider_id
        WHERE mpp.patient_id = $1
        ORDER BY mp.provider_name
      `, [userId]);

      connections.push(...lawFirms.rows, ...medicalProviders.rows);
    }

    // Law firms can message their clients and connected medical providers
    else if (userType === 'law_firm' || userType === 'lawfirm') {
      // Get clients
      const clients = await pool.query(`
        SELECT 
          u.id,
          CONCAT(u.first_name, ' ', u.last_name) as name,
          'client' as type,
          lfc.registered_date as connected_at
        FROM law_firm_clients lfc
        JOIN users u ON u.id = lfc.client_id
        WHERE lfc.law_firm_id = $1
        ORDER BY u.first_name, u.last_name
      `, [userId]);

      // Get connected medical providers
      const medicalProviders = await pool.query(`
        SELECT 
          mp.id,
          mp.provider_name as name,
          'medical_provider' as type,
          mplf.created_at as connected_at
        FROM medical_provider_law_firms mplf
        JOIN medical_providers mp ON mp.id = mplf.medical_provider_id
        WHERE mplf.law_firm_id = $1 AND mplf.connection_status = 'active'
        ORDER BY mp.provider_name
      `, [userId]);

      connections.push(...clients.rows, ...medicalProviders.rows);
    }

    // Medical providers can message their patients and connected law firms
    else if (userType === 'medical_provider' || userType === 'medicalprovider') {
      // Get patients
      const patients = await pool.query(`
        SELECT 
          u.id,
          CONCAT(u.first_name, ' ', u.last_name) as name,
          'client' as type,
          mpp.registered_date as connected_at
        FROM medical_provider_patients mpp
        JOIN users u ON u.id = mpp.patient_id
        WHERE mpp.medical_provider_id = $1
        ORDER BY u.first_name, u.last_name
      `, [userId]);

      // Get connected law firms
      const lawFirms = await pool.query(`
        SELECT 
          lf.id,
          lf.firm_name as name,
          'law_firm' as type,
          mplf.created_at as connected_at
        FROM medical_provider_law_firms mplf
        JOIN law_firms lf ON lf.id = mplf.law_firm_id
        WHERE mplf.medical_provider_id = $1 AND mplf.connection_status = 'active'
        ORDER BY lf.firm_name
      `, [userId]);

      connections.push(...patients.rows, ...lawFirms.rows);
    }

    res.json({ connections });
  } catch (error) {
    console.error('Error fetching available connections:', error);
    res.status(500).json({ error: 'Failed to fetch connections' });
  }
};

/**
 * GET /api/chat/conversations
 * Get all conversations for the authenticated user
 */
exports.getConversations = async (req, res) => {
  try {
    // Normalize userType for database queries
    let participantType = req.user.userType;
    if (participantType === 'lawfirm') participantType = 'law_firm';
    if (participantType === 'medicalprovider') participantType = 'medical_provider';
    
    const participantId = req.user.id;

    const result = await pool.query(`
      SELECT
        c.id,
        c.conversation_type,
        c.created_by_type,
        c.created_by_id,
        c.last_message_at,
        c.is_archived,
        c.created_at,
        c.updated_at,
        cp.last_read_message_id,
        cp.last_read_at,
        cp.is_muted,
        (
          SELECT COUNT(*)
          FROM message_deliveries md
          JOIN messages m ON m.id = md.message_id
          WHERE md.participant_id = cp.id 
            AND md.delivery_status != 'read'
            AND m.conversation_id = c.id
        ) as unread_count,
        (
          SELECT json_build_object(
            'id', m.id,
            'sender_type', m.sender_type,
            'sender_id', m.sender_id,
            'sender_name', m.sender_name,
            'sent_at', m.sent_at,
            'message_type', m.message_type
          )
          FROM messages m
          WHERE m.conversation_id = c.id AND m.is_deleted = FALSE
          ORDER BY m.sent_at DESC
          LIMIT 1
        ) as last_message
      FROM conversations c
      INNER JOIN conversation_participants cp ON cp.conversation_id = c.id
      WHERE cp.participant_type = $1 AND cp.participant_id = $2
      ORDER BY c.last_message_at DESC
    `, [participantType, participantId]);

    res.json({
      conversations: result.rows.map(row => ({
        id: row.id,
        type: row.conversation_type,
        lastMessageAt: row.last_message_at,
        isArchived: row.is_archived,
        isMuted: row.is_muted,
        unreadCount: parseInt(row.unread_count) || 0,
        lastMessage: row.last_message,
        lastReadMessageId: row.last_read_message_id,
        lastReadAt: row.last_read_at,
        createdAt: row.created_at
      }))
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
};

/**
 * POST /api/chat/conversations
 * Create a new conversation
 * 
 * Note: req.user.id contains the correct entity ID for all user types:
 * - Individual users: user.id from users table
 * - Law firms: lawFirm.id from law_firms table (organization entity)
 * - Medical providers: medicalProvider.id from medical_providers table (organization entity)
 * 
 * User account IDs (lawFirmUserId, medicalProviderUserId) are stored separately in JWT
 * but are NOT used for chat participant identification.
 */
exports.createConversation = async (req, res) => {
  try {
    const { participantType, participantId } = req.body;
    
    // Get creator type and ID from authenticated user
    let creatorType = req.user.userType;
    let creatorId = req.user.id;  // Already contains correct entity ID per JWT structure
    
    // Normalize userType to match chat service expectations
    if (creatorType === 'client' || creatorType === 'individual') {
      creatorType = 'client';
    }
    if (creatorType === 'lawfirm') creatorType = 'law_firm';
    if (creatorType === 'medicalprovider') creatorType = 'medical_provider';

    if (!participantType || !participantId) {
      return res.status(400).json({ error: 'Participant type and ID required' });
    }

    const result = await chatService.createOrGetConversation(
      creatorType,
      creatorId,
      participantType,
      participantId
    );

    res.status(result.created ? 201 : 200).json({
      conversation: result.conversation,
      created: result.created
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(error.message.includes('No connection') ? 403 : 500).json({ 
      error: error.message 
    });
  }
};

/**
 * GET /api/chat/conversations/:conversationId/messages
 * Get messages from a conversation
 */
exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { before, after, limit = 50 } = req.query;
    
    // Normalize userType for database queries
    let participantType = req.user.userType;
    if (participantType === 'lawfirm') participantType = 'law_firm';
    if (participantType === 'medicalprovider') participantType = 'medical_provider';
    
    const participantId = req.user.id;

    const messages = await chatService.getMessages(
      conversationId,
      participantType,
      participantId,
      { before, after, limit: parseInt(limit) }
    );

    res.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(error.message.includes('Access denied') ? 403 : 500).json({ 
      error: error.message 
    });
  }
};

/**
 * POST /api/chat/conversations/:conversationId/messages
 * Send a message
 */
exports.sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { body, metadata = {} } = req.body;

    if (!body || body.trim().length === 0) {
      return res.status(400).json({ error: 'Message body is required' });
    }

    // Normalize userType for database queries
    let participantType = req.user.userType;
    if (participantType === 'lawfirm') participantType = 'law_firm';
    if (participantType === 'medicalprovider') participantType = 'medical_provider';
    
    const participantId = req.user.id;
    
    // Get sender name
    let senderName = req.user.email;
    if (participantType === 'user' || participantType === 'client' || participantType === 'individual') {
      const userResult = await pool.query('SELECT first_name, last_name FROM users WHERE id = $1', [participantId]);
      if (userResult.rows.length > 0) {
        senderName = `${userResult.rows[0].first_name} ${userResult.rows[0].last_name}`;
      }
    } else if (participantType === 'law_firm') {
      const lawFirmResult = await pool.query('SELECT firm_name FROM law_firms WHERE id = $1', [participantId]);
      if (lawFirmResult.rows.length > 0) {
        senderName = lawFirmResult.rows[0].firm_name;
      }
    } else if (participantType === 'medical_provider') {
      const providerResult = await pool.query('SELECT provider_name FROM medical_providers WHERE id = $1', [participantId]);
      if (providerResult.rows.length > 0) {
        senderName = providerResult.rows[0].provider_name;
      }
    }

    const message = await chatService.sendMessage(
      conversationId,
      participantType,
      participantId,
      senderName,
      body,
      metadata
    );

    // Send notifications to recipients
    try {
      // Get recipient info for all other participants
      const participants = await pool.query(`
        SELECT cp.participant_type, cp.participant_id, NULL as phone_encrypted, COALESCE(np.sms_notifications_enabled, false) as sms_notifications_enabled
        FROM conversation_participants cp
        LEFT JOIN users u ON u.id = cp.participant_id AND cp.participant_type = 'user'
        LEFT JOIN notification_preferences np ON np.user_id = u.id
        WHERE cp.conversation_id = $1 AND NOT (cp.participant_type = $2 AND cp.participant_id = $3)
      `, [conversationId, participantType, participantId]);

      for (const participant of participants.rows) {
        // Send SMS for urgent messages
        if (metadata.urgent && participant.participant_type === 'user' && participant.phone_encrypted && participant.sms_notifications_enabled) {
          const phoneNumber = require('./encryption').decrypt(participant.phone_encrypted);
          await sendNotificationSMS(
            phoneNumber,
            'urgent_message',
            `Urgent Message from ${senderName}`,
            body.substring(0, 100) + (body.length > 100 ? '...' : ''),
            'urgent'
          );
        }

        // Send email notification for new messages (non-blocking)
        try {
          let recipientEmail = null;
          let recipientName = null;

          if (participant.participant_type === 'user' || participant.participant_type === 'client' || participant.participant_type === 'individual') {
            const userResult = await pool.query('SELECT email, first_name, last_name FROM users WHERE id = $1', [participant.participant_id]);
            if (userResult.rows[0]) {
              recipientEmail = userResult.rows[0].email;
              recipientName = `${userResult.rows[0].first_name} ${userResult.rows[0].last_name}`;
            }
          } else if (participant.participant_type === 'law_firm') {
            const lawFirmResult = await pool.query('SELECT email, firm_name FROM law_firms WHERE id = $1', [participant.participant_id]);
            if (lawFirmResult.rows[0]) {
              recipientEmail = lawFirmResult.rows[0].email;
              recipientName = lawFirmResult.rows[0].firm_name;
            }
          } else if (participant.participant_type === 'medical_provider') {
            const providerResult = await pool.query('SELECT email, provider_name FROM medical_providers WHERE id = $1', [participant.participant_id]);
            if (providerResult.rows[0]) {
              recipientEmail = providerResult.rows[0].email;
              recipientName = providerResult.rows[0].provider_name;
            }
          }

          if (recipientEmail) {
            const previewText = body.substring(0, 100) + (body.length > 100 ? '...' : '');
            sendMessageReceivedEmail(recipientEmail, recipientName || 'User', senderName, previewText)
              .catch(err => console.error('Error sending message notification email:', err));
          }
        } catch (emailError) {
          console.error('Error getting recipient info for email:', emailError);
        }
      }
    } catch (notifError) {
      console.error('Error sending message notifications:', notifError);
    }

    res.status(201).json({ message });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(error.message.includes('not a participant') ? 403 : 500).json({ 
      error: error.message 
    });
  }
};

/**
 * POST /api/chat/conversations/:conversationId/read-receipts
 * Mark messages as read
 */
exports.markAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { lastReadMessageId } = req.body;

    if (!lastReadMessageId) {
      return res.status(400).json({ error: 'lastReadMessageId is required' });
    }

    // Normalize userType for database queries
    let participantType = req.user.userType;
    if (participantType === 'lawfirm') participantType = 'law_firm';
    if (participantType === 'medicalprovider') participantType = 'medical_provider';
    
    const participantId = req.user.id;

    await chatService.markAsRead(
      conversationId,
      participantType,
      participantId,
      lastReadMessageId
    );

    // Update unread counts in Firebase
    const unreadCounts = await chatService.getUnreadCounts(participantType, participantId);
    await syncChatUnreadCounts(participantType, participantId, unreadCounts);

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking as read:', error);
    res.status(error.message.includes('not found') ? 404 : 500).json({ 
      error: error.message 
    });
  }
};

/**
 * POST /api/chat/conversations/:conversationId/typing
 * Send typing indicator
 */
exports.sendTypingIndicator = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { isTyping } = req.body;

    // Normalize userType for database queries
    let participantType = req.user.userType;
    if (participantType === 'lawfirm') participantType = 'law_firm';
    if (participantType === 'medicalprovider') participantType = 'medical_provider';
    
    const participantId = req.user.id;

    await chatService.sendTypingIndicator(
      conversationId,
      participantType,
      participantId,
      isTyping
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error sending typing indicator:', error);
    res.status(error.message.includes('Access denied') ? 403 : 500).json({ 
      error: error.message 
    });
  }
};

/**
 * GET /api/chat/unread-counts
 * Get unread message counts
 */
exports.getUnreadCounts = async (req, res) => {
  try {
    // Normalize userType for database queries
    let participantType = req.user.userType;
    if (participantType === 'lawfirm') participantType = 'law_firm';
    if (participantType === 'medicalprovider') participantType = 'medical_provider';
    
    const participantId = req.user.id;

    const unreadCounts = await chatService.getUnreadCounts(participantType, participantId);

    res.json({ unreadCounts });
  } catch (error) {
    console.error('Error fetching unread counts:', error);
    res.status(500).json({ error: 'Failed to fetch unread counts' });
  }
};
