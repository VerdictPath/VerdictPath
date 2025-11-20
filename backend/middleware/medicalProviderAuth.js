const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const { JWT_SECRET } = require('./auth');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware to verify medical provider user authentication
const verifyMedicalProviderUser = async (req, res, next) => {
  try {
    // Extract JWT token from Authorization header or cookies
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1] || req.signedCookies?.token || req.cookies?.token;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No authentication token provided'
      });
    }

    // Decode and verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if it's a medical provider user
    if (decoded.userType !== 'medical_provider' || !decoded.isMedicalProviderUser) {
      return res.status(403).json({
        success: false,
        message: 'Invalid user type - medical provider user credentials required'
      });
    }

    // Get medical provider user details
    const userResult = await pool.query(`
      SELECT 
        mpu.*,
        mp.provider_name,
        mp.provider_code,
        mp.enable_activity_tracking,
        mp.hipaa_compliance_mode
      FROM medical_provider_users mpu
      JOIN medical_providers mp ON mpu.medical_provider_id = mp.id
      WHERE mpu.id = $1 AND mpu.status = 'active'
    `, [decoded.medicalProviderUserId]);

    if (userResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Medical provider user not found or inactive'
      });
    }

    const user = userResult.rows[0];

    // Set req.user for consistency with law firm pattern
    req.user = {
      id: user.medical_provider_id,
      medicalProviderUserId: user.id,
      email: user.email,
      userType: 'medical_provider',
      providerCode: user.provider_code,
      medicalProviderUserRole: user.role,
      isMedicalProviderUser: true,
      firstName: user.first_name,
      lastName: user.last_name,
      userCode: user.user_code,
      enableActivityTracking: user.enable_activity_tracking,
      hipaaComplianceMode: user.hipaa_compliance_mode
    };

    req.medicalProviderUser = user;
    req.medicalProviderId = user.medical_provider_id;
    
    // Update last activity
    await pool.query(
      'UPDATE medical_provider_users SET last_activity = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );
    
    next();
  } catch (error) {
    console.error('Medical provider auth error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

// Middleware to check if user has specific permission
const checkPermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.medicalProviderUser) {
        return res.status(401).json({
          success: false,
          message: 'Medical provider user authentication required'
        });
      }

      // Admin role has all permissions
      if (req.medicalProviderUser.role === 'admin') {
        return next();
      }

      // Check specific permission
      if (!req.medicalProviderUser[permission]) {
        return res.status(403).json({
          success: false,
          message: `You do not have permission: ${permission}`
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({
        success: false,
        message: 'Permission check failed'
      });
    }
  };
};

// Middleware to ensure user is an admin
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.medicalProviderUser) {
      return res.status(401).json({
        success: false,
        message: 'Medical provider user authentication required'
      });
    }

    if (req.medicalProviderUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Administrator access required'
      });
    }

    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({
      success: false,
      message: 'Authorization error'
    });
  }
};

// Utility to get user's full name
const getUserFullName = (user) => {
  if (!user) return 'Unknown User';
  return `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
};

module.exports = {
  verifyMedicalProviderUser,
  checkPermission,
  requireAdmin,
  getUserFullName
};
