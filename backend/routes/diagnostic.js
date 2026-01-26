const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { authenticateToken } = require('../middleware/auth');
const firebaseSync = require('../services/firebaseSync');
const firebaseAdmin = require('firebase-admin');

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

// Firebase real-time diagnostics endpoint
router.get('/firebase-listener', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.userType;
    
    // Determine Firebase path based on user type
    let basePath;
    if (userType === 'individual') {
      basePath = `users/${userId}`;
    } else if (userType === 'lawfirm') {
      basePath = `lawfirms/${userId}`;
    } else if (userType === 'medical_provider') {
      basePath = `providers/${userId}`;
    } else {
      return res.status(400).json({ error: 'Invalid user type' });
    }
    
    const notificationsPath = `${basePath}/notifications`;
    const unreadCountPath = `${basePath}/unreadCount`;
    
    // Read current Firebase data
    const db = firebaseAdmin.database();
    const [notificationsSnapshot, unreadCountSnapshot] = await Promise.all([
      db.ref(notificationsPath).once('value'),
      db.ref(unreadCountPath).once('value')
    ]);
    
    const notifications = notificationsSnapshot.val() || {};
    const unreadCount = unreadCountSnapshot.val() || 0;
    
    // Send a test notification to verify real-time updates
    const testNotification = {
      id: `test-${Date.now()}`,
      title: '🔬 Diagnostic Test',
      message: 'If you see this in real-time, Firebase is working!',
      type: 'system',
      status: 'sent',
      is_read: false,
      created_at: new Date().toISOString()
    };
    
    // Write test notification to Firebase
    await db.ref(`${notificationsPath}/${testNotification.id}`).set(testNotification);
    await db.ref(unreadCountPath).set(unreadCount + 1);
    
    res.json({
      status: 'success',
      message: '✅ Firebase diagnostic complete',
      diagnosticInfo: {
        userId,
        userType,
        firebasePaths: {
          base: basePath,
          notifications: notificationsPath,
          unreadCount: unreadCountPath
        },
        currentData: {
          notificationCount: Object.keys(notifications).length,
          unreadCount: unreadCount,
          latestNotifications: Object.values(notifications)
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 3)
            .map(n => ({ id: n.id, title: n.title, created_at: n.created_at }))
        },
        testNotification: {
          sent: true,
          id: testNotification.id,
          message: 'Test notification sent to Firebase. Check if it appears in real-time!'
        }
      }
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Firebase diagnostic failed',
      details: error.message 
    });
  }
});

module.exports = router;
