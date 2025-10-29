const express = require('express');
const router = express.Router();
const coinsController = require('../controllers/coinsController');
const { authenticateToken } = require('../middleware/auth');

// REMOVED: /update endpoint to prevent coin farming vulnerability
// Coins are now only awarded through secure server-side processes:
// - Daily rewards: /claim-daily
// - Stage/substage completion: litigation endpoints
// - Invite rewards: invite endpoints

router.post('/convert', authenticateToken, coinsController.convertCoinsToCredits);

router.get('/balance', authenticateToken, coinsController.getBalance);

router.get('/conversion-history', authenticateToken, coinsController.getConversionHistory);

router.post('/claim-daily', authenticateToken, coinsController.claimDailyReward);

module.exports = router;
