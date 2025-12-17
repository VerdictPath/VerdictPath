const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notificationsController');
const firebaseAuthController = require('../controllers/firebaseAuthController');
const { authenticateToken } = require('../middleware/auth');

router.post('/register-device', authenticateToken, notificationsController.registerDevice);
router.post('/unregister-device', authenticateToken, notificationsController.unregisterDevice);
router.get('/devices', authenticateToken, notificationsController.getMyDevices);
router.get('/firebase-token', authenticateToken, firebaseAuthController.getFirebaseCustomToken);

router.post('/send', authenticateToken, notificationsController.sendNotification);
router.post('/send-to-all-clients', authenticateToken, notificationsController.sendToAllClients);
router.post('/send-to-clients', authenticateToken, notificationsController.sendToClients);
router.post('/send-to-client', authenticateToken, notificationsController.sendToClient);
router.post('/send-to-all-patients', authenticateToken, notificationsController.sendToAllPatients);
router.post('/send-to-patients', authenticateToken, notificationsController.sendToPatients);
router.post('/send-to-patient', authenticateToken, notificationsController.sendToPatient);
router.post('/send-to-connection', authenticateToken, notificationsController.sendToConnection);
router.get('/my-connections-for-notification', authenticateToken, notificationsController.getMyConnectionsForNotification);

router.get('/my-notifications', authenticateToken, notificationsController.getMyNotifications);
router.get('/sent-notifications', authenticateToken, notificationsController.getSentNotifications);
router.get('/unread-count', authenticateToken, notificationsController.getUnreadCount);
router.get('/stats', authenticateToken, notificationsController.getMyNotificationStats);
router.get('/history', authenticateToken, notificationsController.getNotificationHistory);
router.get('/preferences', authenticateToken, notificationsController.getPreferences);
router.get('/email-preferences', authenticateToken, notificationsController.getEmailCCPreferences);
router.get('/analytics', authenticateToken, notificationsController.getNotificationAnalytics);
router.get('/:notificationId', authenticateToken, notificationsController.getNotificationById);

router.put('/mark-all-read', authenticateToken, notificationsController.markAllAsRead);
router.put('/preferences', authenticateToken, notificationsController.updatePreferences);
router.put('/email-preferences', authenticateToken, notificationsController.updateEmailCCPreferences);
router.put('/:notificationId/read', authenticateToken, notificationsController.markAsRead);
router.put('/:notificationId/clicked', authenticateToken, notificationsController.markAsClicked);
router.put('/:notificationId/archive', authenticateToken, notificationsController.archiveNotification);

module.exports = router;
