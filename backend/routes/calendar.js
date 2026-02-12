const express = require('express');
const router = express.Router();
const calendarController = require('../controllers/calendarController');
const { authenticateToken } = require('../middleware/auth');

router.get('/events', authenticateToken, calendarController.getEvents);

router.get('/events/check-conflicts', authenticateToken, calendarController.checkConflicts);

router.post('/events', authenticateToken, calendarController.createEvent);

router.put('/events/:eventId', authenticateToken, calendarController.updateEvent);

router.delete('/events/:eventId', authenticateToken, calendarController.deleteEvent);

router.put('/events/:eventId/sync', authenticateToken, calendarController.updateSyncStatus);

module.exports = router;
