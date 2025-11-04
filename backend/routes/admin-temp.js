const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');

router.get('/reset-test-passwords-temp-endpoint-2025', async (req, res) => {
  try {
    const newPassword = 'VerdictPath2025!';
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    
    const results = {
      users: [],
      lawFirms: [],
      medicalProviders: []
    };
    
    const usersResult = await db.query(
      `UPDATE users 
       SET password = $1
       WHERE email IN ('testclient@example.com', 'michael.chen@test.com', 'sarah.johnson@test.com', 'john.doe@email.com', 'emily.rodriguez@test.com')
       RETURNING email, subscription_tier`,
      [hashedPassword]
    );
    results.users = usersResult.rows;
    
    const lawFirmsResult = await db.query(
      `UPDATE law_firms 
       SET password = $1
       WHERE email IN ('lawfirm@test.com', 'admin@testlegal.com')
       RETURNING email, firm_name`,
      [hashedPassword]
    );
    results.lawFirms = lawFirmsResult.rows;
    
    const providersResult = await db.query(
      `UPDATE medical_providers 
       SET password = $1
       WHERE email = 'testmed1@example.com'
       RETURNING email, provider_name`,
      [hashedPassword]
    );
    results.medicalProviders = providersResult.rows;
    
    res.json({
      success: true,
      message: 'Test passwords reset successfully!',
      newPassword: newPassword,
      updated: results,
      instructions: 'You can now login with the accounts listed above using password: VerdictPath2025!'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
