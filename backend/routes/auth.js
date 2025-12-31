const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const changePasswordController = require('../controllers/changePasswordController');
const { checkAccountLockout } = require('../middleware/security');
const { authLimiter } = require('../middleware/rateLimiter');
const { authenticateToken } = require('../middleware/auth');

// SECURITY: Rate limiting on registration endpoints (prevent spam accounts)
router.post('/register/client', authLimiter, authController.registerClient);
router.post('/register/lawfirm', authLimiter, authController.registerLawFirm);
router.post('/register/medicalprovider', authLimiter, authController.registerMedicalProvider);
router.post('/join/medicalprovider', authLimiter, authController.joinMedicalProvider);

// SECURITY: Rate limiting + account lockout on login endpoints (prevent brute force)
router.post('/login', authLimiter, checkAccountLockout, authController.login);
router.post('/login/lawfirm-user', authLimiter, checkAccountLockout, authController.loginLawFirmUser);
router.post('/login/medicalprovider-user', authLimiter, checkAccountLockout, authController.loginMedicalProviderUser);

// Password change endpoint for first-time login
router.post('/change-password/first-login', authLimiter, changePasswordController.changePasswordFirstLogin);

// Password change endpoint for authenticated users
router.post('/change-password', authenticateToken, changePasswordController.changePassword);

// One-time account creation for test accounts (call this once on Railway)
router.get('/debug/create-test-accounts', async (req, res) => {
  const db = require('../config/db');
  const bcrypt = require('bcryptjs');
  
  try {
    const hash = await bcrypt.hash('password123', 10);
    const results = [];
    
    // Create individual user if not exists
    const userCheck = await db.query(`SELECT id FROM users WHERE email = 'beta_individual'`);
    if (userCheck.rows.length === 0) {
      await db.query(`
        INSERT INTO users (first_name, last_name, email, password, user_type, subscription_tier, privacy_accepted_at)
        VALUES ('Beta', 'Individual', 'beta_individual', $1, 'individual', 'Free', NOW())
      `, [hash]);
      results.push('Created: beta_individual (individual user)');
    } else {
      await db.query(`UPDATE users SET password = $1 WHERE email = 'beta_individual'`, [hash]);
      results.push('Updated password: beta_individual');
    }
    
    // Create law firm if not exists
    const lfCheck = await db.query(`SELECT id FROM law_firms WHERE email = 'beta_lawfirm'`);
    let lawFirmId;
    if (lfCheck.rows.length === 0) {
      const lfResult = await db.query(`
        INSERT INTO law_firms (firm_name, firm_code, email, password, subscription_tier, plan_type, privacy_accepted_at)
        VALUES ('Beta Test Law Firm', 'LAW-BETA01', 'beta_lawfirm', $1, 'Premium', 'premium', NOW())
        RETURNING id
      `, [hash]);
      lawFirmId = lfResult.rows[0].id;
      results.push('Created: beta_lawfirm (law firm)');
    } else {
      lawFirmId = lfCheck.rows[0].id;
      await db.query(`UPDATE law_firms SET password = $1 WHERE email = 'beta_lawfirm'`, [hash]);
      results.push('Updated password: beta_lawfirm');
    }
    
    // Create law firm user if not exists
    const lfuCheck = await db.query(`SELECT id FROM law_firm_users WHERE email = 'beta_lawfirm'`);
    if (lfuCheck.rows.length === 0) {
      await db.query(`
        INSERT INTO law_firm_users (law_firm_id, first_name, last_name, email, password, user_code, role, status, can_manage_users, can_manage_clients, can_manage_disbursements, can_manage_settings)
        VALUES ($1, 'Beta', 'Admin', 'beta_lawfirm', $2, 'LAW-BETA01-ADMIN', 'admin', 'active', true, true, true, true)
      `, [lawFirmId, hash]);
      results.push('Created: beta_lawfirm (law firm user)');
    } else {
      await db.query(`UPDATE law_firm_users SET password = $1 WHERE email = 'beta_lawfirm'`, [hash]);
      results.push('Updated password: beta_lawfirm (law firm user)');
    }
    
    // Create medical provider if not exists
    const mpCheck = await db.query(`SELECT id FROM medical_providers WHERE email = 'testmed1@example.com'`);
    let medProviderId;
    if (mpCheck.rows.length === 0) {
      const mpResult = await db.query(`
        INSERT INTO medical_providers (provider_name, provider_code, email, password, subscription_tier, privacy_accepted_at)
        VALUES ('Test Medical Center', 'TESTMED1', 'testmed1@example.com', $1, 'Premium', NOW())
        RETURNING id
      `, [hash]);
      medProviderId = mpResult.rows[0].id;
      results.push('Created: testmed1@example.com (medical provider)');
    } else {
      medProviderId = mpCheck.rows[0].id;
      await db.query(`UPDATE medical_providers SET password = $1 WHERE email = 'testmed1@example.com'`, [hash]);
      results.push('Updated password: testmed1@example.com');
    }
    
    // Create medical provider user if not exists
    const mpuCheck = await db.query(`SELECT id FROM medical_provider_users WHERE email = 'testmed1@example.com'`);
    if (mpuCheck.rows.length === 0) {
      await db.query(`
        INSERT INTO medical_provider_users (medical_provider_id, first_name, last_name, email, password, user_code, role, status, can_manage_users, can_manage_patients, can_manage_billing, can_manage_settings)
        VALUES ($1, 'Test', 'Medical', 'testmed1@example.com', $2, 'TESTMED1-ADMIN', 'admin', 'active', true, true, true, true)
      `, [medProviderId, hash]);
      results.push('Created: testmed1@example.com (medical provider user)');
    } else {
      await db.query(`UPDATE medical_provider_users SET password = $1 WHERE email = 'testmed1@example.com'`, [hash]);
      results.push('Updated password: testmed1@example.com (medical provider user)');
    }
    
    res.json({
      success: true,
      message: 'Test accounts created/updated. Password: password123',
      results
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// One-time password reset for test accounts (call this once on Railway)
router.get('/debug/reset-passwords', async (req, res) => {
  const db = require('../config/db');
  const bcrypt = require('bcryptjs');
  
  try {
    const hash = await bcrypt.hash('password123', 10);
    const results = [];
    
    // Reset medical_provider_users
    const r1 = await db.query(
      `UPDATE medical_provider_users SET password = $1 WHERE email IN ('testmed1@example.com', 'beta_provider') RETURNING email`,
      [hash]
    );
    results.push({ table: 'medical_provider_users', updated: r1.rows.map(r => r.email) });
    
    // Reset medical_providers
    const r2 = await db.query(
      `UPDATE medical_providers SET password = $1 WHERE email IN ('testmed1@example.com', 'beta_provider') RETURNING email`,
      [hash]
    );
    results.push({ table: 'medical_providers', updated: r2.rows.map(r => r.email) });
    
    // Reset law_firm_users
    const r3 = await db.query(
      `UPDATE law_firm_users SET password = $1 WHERE email = 'beta_lawfirm' RETURNING email`,
      [hash]
    );
    results.push({ table: 'law_firm_users', updated: r3.rows.map(r => r.email) });
    
    // Reset law_firms
    const r4 = await db.query(
      `UPDATE law_firms SET password = $1 WHERE email = 'beta_lawfirm' RETURNING email`,
      [hash]
    );
    results.push({ table: 'law_firms', updated: r4.rows.map(r => r.email) });
    
    // Reset users (individuals)
    const r5 = await db.query(
      `UPDATE users SET password = $1 WHERE email = 'beta_individual' RETURNING email`,
      [hash]
    );
    results.push({ table: 'users', updated: r5.rows.map(r => r.email) });
    
    res.json({
      success: true,
      message: 'Passwords reset to: password123',
      results
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Diagnostic endpoint to check if test accounts exist (no password exposure)
router.get('/debug/accounts-check', async (req, res) => {
  const db = require('../config/db');
  const bcrypt = require('bcryptjs');
  
  try {
    // Check individual users
    const users = await db.query(
      `SELECT email, CASE WHEN password IS NOT NULL THEN 'has_password' ELSE 'no_password' END as pwd_status,
       LENGTH(password) as pwd_length FROM users WHERE email IN ('beta_individual', 'testclient@example.com') LIMIT 5`
    );
    
    // Check law firms
    const lawFirms = await db.query(
      `SELECT email, CASE WHEN password IS NOT NULL THEN 'has_password' ELSE 'no_password' END as pwd_status,
       LENGTH(password) as pwd_length FROM law_firms WHERE email IN ('beta_lawfirm', 'lawfirm@test.com') LIMIT 5`
    );
    
    // Check medical providers
    const medProviders = await db.query(
      `SELECT email, CASE WHEN password IS NOT NULL THEN 'has_password' ELSE 'no_password' END as pwd_status,
       LENGTH(password) as pwd_length FROM medical_providers WHERE email IN ('beta_provider', 'testmed1@example.com') LIMIT 5`
    );
    
    // Test bcrypt with a known password
    const testHash = await bcrypt.hash('password123', 10);
    const testCompare = await bcrypt.compare('password123', testHash);
    
    res.json({
      status: 'ok',
      bcrypt_working: testCompare,
      database_connected: true,
      accounts: {
        users: users.rows.map(u => ({ email: u.email, status: u.pwd_status, hash_length: u.pwd_length })),
        law_firms: lawFirms.rows.map(l => ({ email: l.email, status: l.pwd_status, hash_length: l.pwd_length })),
        medical_providers: medProviders.rows.map(m => ({ email: m.email, status: m.pwd_status, hash_length: m.pwd_length }))
      },
      env_check: {
        has_database_url: !!process.env.DATABASE_URL,
        has_jwt_secret: !!process.env.JWT_SECRET,
        node_env: process.env.NODE_ENV || 'not_set'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      database_connected: false
    });
  }
});

module.exports = router;
