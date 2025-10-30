const express = require('express');
const router = express.Router();
const eventRequestController = require('../controllers/eventRequestController');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Create event request (law firm only)
router.post('/', eventRequestController.createEventRequest);

// Get all event requests for current user
router.get('/', eventRequestController.getEventRequests);

// Get specific event request with proposed dates
router.get('/:requestId', eventRequestController.getEventRequestById);

// Submit proposed dates (client only)
router.post('/:requestId/propose-dates', eventRequestController.submitProposedDates);

// Confirm one of the proposed dates (law firm only)
router.post('/:requestId/confirm', eventRequestController.confirmProposedDate);

// Cancel event request
router.post('/:requestId/cancel', eventRequestController.cancelEventRequest);

module.exports = router;
