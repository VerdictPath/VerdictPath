const admin = require('firebase-admin');

exports.getFirebaseCustomToken = async (req, res) => {
  try {
    const { id, userType } = req.user;

    if (!id || !userType) {
      return res.status(401).json({ error: 'Authentication required' });
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
    res.status(500).json({ error: 'Failed to generate Firebase token' });
  }
};
