const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notificationsController');
const { authenticateToken } = require('../middleware/auth');

router.post('/register-device', authenticateToken, notificationsController.registerDevice);
router.post('/unregister-device', authenticateToken, notificationsController.unregisterDevice);
router.get('/devices', authenticateToken, notificationsController.getMyDevices);

router.post('/send', authenticateToken, notificationsController.sendNotification);
router.post('/send-to-all-clients', authenticateToken, notificationsController.sendToAllClients);
router.post('/send-to-clients', authenticateToken, notificationsController.sendToClients);
router.post('/send-to-client', authenticateToken, notificationsController.sendToClient);
router.post('/send-to-all-patients', authenticateToken, notificationsController.sendToAllPatients);
router.post('/send-to-patients', authenticateToken, notificationsController.sendToPatients);
router.post('/send-to-patient', authenticateToken, notificationsController.sendToPatient);

router.get('/my-notifications', authenticateToken, notificationsController.getMyNotifications);
router.get('/unread-count', authenticateToken, notificationsController.getUnreadCount);
router.get('/stats', authenticateToken, notificationsController.getMyNotificationStats);
router.get('/history', authenticateToken, notificationsController.getNotificationHistory);

router.put('/:notificationId/read', authenticateToken, notificationsController.markAsRead);
router.put('/:notificationId/clicked', authenticateToken, notificationsController.markAsClicked);

module.exports = router;
