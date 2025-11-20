const express = require('express');
const router = express.Router();
const gamificationController = require('../controllers/gamificationController');
const { authenticateToken } = require('../middleware/auth');
const { rewardLimiter } = require('../middleware/rateLimiter');

// SECURITY: Rate limit achievement tracking to prevent spam/farming
router.get('/achievements', authenticateToken, gamificationController.getAchievements);

router.post('/achievements/track', rewardLimiter, authenticateToken, gamificationController.trackProgress);

router.get('/badges', authenticateToken, gamificationController.getBadges);

router.get('/daily-challenges', authenticateToken, gamificationController.getDailyChallenges);

router.get('/leaderboard', authenticateToken, gamificationController.getLeaderboard);

router.get('/stats', authenticateToken, gamificationController.getUserStats);

module.exports = router;
