const admin = require('firebase-admin');
const { initializeFirebase } = require('../services/firebaseSync');

exports.getFirebaseCustomToken = async (req, res) => {
  try {
    const { id, userType } = req.user;

    if (!id || !userType) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Initialize Firebase if not already initialized
    try {
      admin.app(); // Check if already initialized
    } catch (e) {
      // Not initialized, try to initialize
      const firebaseApp = initializeFirebase();
      if (!firebaseApp) {
        return res.status(503).json({ 
          error: 'Firebase not configured. Please set FIREBASE_SERVICE_ACCOUNT_JSON environment variable.' 
        });
      }
    }

    const uid = id.toString();
    
    const customToken = await admin.auth().createCustomToken(uid, {
      userType,
      userId: id
    });

    res.status(200).json({
      token: customToken,
      uid,
      userType
    });
  } catch (error) {
    console.error('Error creating Firebase custom token:', error);
    // If Firebase is not configured, return a more helpful error
    if (error.code === 'app/no-app') {
      return res.status(503).json({ 
        error: 'Firebase not configured. Please set FIREBASE_SERVICE_ACCOUNT_JSON environment variable.' 
      });
    }
    res.status(500).json({ error: 'Failed to generate Firebase token' });
  }
};
