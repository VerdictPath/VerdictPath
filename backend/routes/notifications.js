const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notificationsController');
const { authenticateToken } = require('../middleware/auth');

router.post('/register-device', authenticateToken, notificationsController.registerDevice);
router.post('/unregister-device', authenticateToken, notificationsController.unregisterDevice);
router.get('/devices', authenticateToken, notificationsController.getMyDevices);

router.post('/send', authenticateToken, notificationsController.sendNotification);
router.get('/my-notifications', authenticateToken, notificationsController.getMyNotifications);
router.get('/unread-count', authenticateToken, notificationsController.getUnreadCount);
router.put('/:notificationId/read', authenticateToken, notificationsController.markAsRead);
router.put('/:notificationId/clicked', authenticateToken, notificationsController.markAsClicked);

module.exports = router;
