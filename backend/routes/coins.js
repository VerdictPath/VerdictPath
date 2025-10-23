const express = require('express');
const router = express.Router();
const coinsController = require('../controllers/coinsController');
const { authenticateToken } = require('../middleware/auth');

router.post('/update', authenticateToken, coinsController.updateCoins);

router.post('/convert', authenticateToken, coinsController.convertCoinsToCredits);

router.get('/balance', authenticateToken, coinsController.getBalance);

router.get('/conversion-history', authenticateToken, coinsController.getConversionHistory);

module.exports = router;
