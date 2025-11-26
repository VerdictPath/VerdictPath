const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticateToken } = require('../middleware/auth');

/**
 * Chat Routes - HIPAA-compliant real-time messaging
 * All routes require authentication
 */

// Get all conversations for authenticated user
router.get('/conversations', authenticateToken, chatController.getConversations);

// Get available connections for messaging
router.get('/available-connections', authenticateToken, chatController.getAvailableConnections);

// Create new conversation
router.post('/conversations', authenticateToken, chatController.createConversation);

// Get messages from a conversation
router.get('/conversations/:conversationId/messages', authenticateToken, chatController.getMessages);

// Send a message
router.post('/conversations/:conversationId/messages', authenticateToken, chatController.sendMessage);

// Mark messages as read
router.post('/conversations/:conversationId/read-receipts', authenticateToken, chatController.markAsRead);

// Send typing indicator
router.post('/conversations/:conversationId/typing', authenticateToken, chatController.sendTypingIndicator);

// Get unread message counts
router.get('/unread-counts', authenticateToken, chatController.getUnreadCounts);

module.exports = router;
