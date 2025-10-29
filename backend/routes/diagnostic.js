const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Diagnostic endpoint to check what code Railway is running
router.get('/version', (req, res) => {
  try {
    // Read the coinsController to see if it has the security fix
    const controllerPath = path.join(__dirname, '../controllers/coinsController.js');
    const controllerCode = fs.readFileSync(controllerPath, 'utf8');
    
    const hasSecurityFix = controllerCode.includes('last_daily_claim_at');
    const hasClaimDailyFunction = controllerCode.includes('claimDailyReward');
    const hasDateCheck = controllerCode.includes('Check if user already claimed today');
    
    res.json({
      timestamp: new Date().toISOString(),
      securityStatus: {
        hasLastClaimColumn: hasSecurityFix,
        hasClaimDailyFunction: hasClaimDailyFunction,
        hasDateValidation: hasDateCheck,
        isSecure: hasSecurityFix && hasClaimDailyFunction && hasDateCheck
      },
      message: (hasSecurityFix && hasClaimDailyFunction && hasDateCheck) 
        ? '✅ Security fix is deployed!' 
        : '❌ Old code is still running - needs redeploy'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
