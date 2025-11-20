const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware to verify medical provider user authentication
const verifyMedicalProviderUser = async (req, res, next) => {
  try {
    // Check if user is authenticated
    if (!req.user || req.user.type !== 'medicalprovider') {
      return res.status(401).json({
        success: false,
        message: 'Medical provider authentication required'
      });
    }

    // Get medical provider user details
    const userResult = await pool.query(`
      SELECT 
        mpu.*,
        mp.provider_name,
        mp.enable_activity_tracking,
        mp.hipaa_compliance_mode
      FROM medical_provider_users mpu
      JOIN medical_providers mp ON mpu.medical_provider_id = mp.id
      WHERE mpu.id = $1 AND mpu.status = 'active'
    `, [req.user.medicalProviderUserId]);

    if (userResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Medical provider user not found or inactive'
      });
    }

    req.medicalProviderUser = userResult.rows[0];
    req.medicalProviderId = userResult.rows[0].medical_provider_id;
    next();
  } catch (error) {
    console.error('Medical provider auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication error'
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
