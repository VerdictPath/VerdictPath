const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const musicController = require('../controllers/musicController');

router.get('/preference', authenticateToken, musicController.getMusicPreference);
router.put('/preference', authenticateToken, musicController.updateMusicPreference);

module.exports = router;
