const express = require('express');
const router = express.Router();
const avatarController = require('../controllers/avatarController');
const { authenticateToken } = require('../middleware/auth');

router.post('/select', authenticateToken, avatarController.selectAvatar);

router.get('/current', authenticateToken, avatarController.getCurrentAvatar);

module.exports = router;
