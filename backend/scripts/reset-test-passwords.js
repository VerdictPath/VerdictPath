const db = require('../config/db');
const bcrypt = require('bcryptjs');

const resetTestPasswords = async () => {
  try {
    
    const newPassword = 'VerdictPath2025!';
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    
    // Update Individual Users
    const usersResult = await db.query(
      `UPDATE users 
       SET password = $1
       WHERE email IN ('testclient@example.com', 'michael.chen@test.com', 'sarah.johnson@test.com', 'john.doe@email.com', 'emily.rodriguez@test.com')
       RETURNING email, subscription_tier`,
      [hashedPassword]
    );
    
    usersResult.rows.forEach(user => {
    });
    
    // Update Law Firms
    const lawFirmsResult = await db.query(
      `UPDATE law_firms 
       SET password = $1
       WHERE email IN ('lawfirm@test.com', 'admin@testlegal.com')
       RETURNING email, firm_name`,
      [hashedPassword]
    );
    
    lawFirmsResult.rows.forEach(firm => {
    });
    
    // Update Medical Providers
    const providersResult = await db.query(
      `UPDATE medical_providers 
       SET password = $1
       WHERE email = 'testmed1@example.com'
       RETURNING email, provider_name`,
      [hashedPassword]
    );
    
    providersResult.rows.forEach(provider => {
    });
    
    
    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
};

resetTestPasswords();
