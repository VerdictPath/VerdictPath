const db = require('../config/db');

/**
 * HIPAA Security Middleware
 * Account lockout, rate limiting, and security controls
 */

/**
 * Check if account is locked out after too many failed login attempts
 */
const checkAccountLockout = async (req, res, next) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return next();
    }
    
    // Check account security status
    // HIPAA: Check ALL user types (client, lawfirm, medical_provider)
    const securityQuery = `
      SELECT 
        s.login_attempts,
        s.lock_until,
        s.user_id,
        s.user_type
      FROM account_security s
      INNER JOIN users u ON s.user_id = u.id
      WHERE u.email = $1
      LIMIT 1
    `;
    
    const result = await db.query(securityQuery, [email.toLowerCase()]);
    
    if (result.rows.length > 0) {
      const security = result.rows[0];
      
      // Check if account is currently locked
      if (security.lock_until && new Date(security.lock_until) > new Date()) {
        const lockMinutes = Math.ceil((new Date(security.lock_until) - new Date()) / 60000);
        return res.status(423).json({
          message: `Account is locked due to too many failed login attempts. Try again in ${lockMinutes} minutes.`,
          lockedUntil: security.lock_until
        });
      }
    }
    
    next();
  } catch (error) {
    console.error('Account lockout check failed:', error);
    next(); // Don't block on error
  }
};

/**
 * Handle failed login attempt
 * Increments login attempts and locks account if threshold exceeded
 */
const handleFailedLogin = async (userId, userType) => {
  try {
    const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
    const lockoutMinutes = parseInt(process.env.LOCKOUT_DURATION_MINUTES) || 30;
    
    // Get current security record
    const current = await db.query(
      'SELECT login_attempts FROM account_security WHERE user_id = $1 AND user_type = $2',
      [userId, userType]
    );
    
    if (current.rows.length === 0) {
      // Create security record with first failed attempt
      await db.query(
        `INSERT INTO account_security (user_id, user_type, login_attempts) 
         VALUES ($1, $2, 1)`,
        [userId, userType]
      );
    } else {
      const attempts = current.rows[0].login_attempts + 1;
      
      if (attempts >= maxAttempts) {
        // Lock the account
        const lockUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000);
        await db.query(
          `UPDATE account_security 
           SET login_attempts = $1, lock_until = $2 
           WHERE user_id = $3 AND user_type = $4`,
          [attempts, lockUntil, userId, userType]
        );
      } else {
        // Increment attempts
        await db.query(
          `UPDATE account_security 
           SET login_attempts = $1 
           WHERE user_id = $2 AND user_type = $3`,
          [attempts, userId, userType]
        );
      }
    }
  } catch (error) {
    console.error('Failed to handle login attempt:', error);
  }
};

/**
 * Handle successful login
 * Resets login attempts and updates last login timestamp
 */
const handleSuccessfulLogin = async (userId, userType, ipAddress) => {
  try {
    // Update or create security record
    const query = `
      INSERT INTO account_security (user_id, user_type, login_attempts, last_login, last_login_ip, last_activity)
      VALUES ($1, $2, 0, NOW(), $3, NOW())
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        login_attempts = 0,
        lock_until = NULL,
        last_login = NOW(),
        last_login_ip = $3,
        last_activity = NOW()
    `;
    
    await db.query(query, [userId, userType, ipAddress]);
  } catch (error) {
    console.error('Failed to handle successful login:', error);
  }
};

/**
 * Check if password needs to be changed (HIPAA recommends 90-day rotation)
 */
const checkPasswordExpiry = async (req, res, next) => {
  try {
    if (!req.user) {
      return next();
    }
    
    const expiryDays = parseInt(process.env.PASSWORD_EXPIRY_DAYS) || 90;
    
    const result = await db.query(
      `SELECT password_changed_at 
       FROM account_security 
       WHERE user_id = $1 AND user_type = $2`,
      [req.user.id, req.user.userType]
    );
    
    if (result.rows.length > 0 && result.rows[0].password_changed_at) {
      const passwordAge = (Date.now() - new Date(result.rows[0].password_changed_at)) / (1000 * 60 * 60 * 24);
      
      if (passwordAge > expiryDays) {
        return res.status(403).json({
          message: 'Password has expired. Please change your password.',
          passwordExpired: true
        });
      }
    }
    
    next();
  } catch (error) {
    console.error('Password expiry check failed:', error);
    next(); // Don't block on error
  }
};

module.exports = {
  checkAccountLockout,
  handleFailedLogin,
  handleSuccessfulLogin,
  checkPasswordExpiry
};
