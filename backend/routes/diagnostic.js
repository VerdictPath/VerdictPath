const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

router.get('/version', authenticateToken, (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    status: 'running'
  });
});

module.exports = router;
