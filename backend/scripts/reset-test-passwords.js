const db = require('../config/db');
const bcrypt = require('bcryptjs');

const resetTestPasswords = async () => {
  try {
    console.log('🔄 Resetting test account passwords...\n');
    
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
      console.log(`✅ Updated: ${user.email} (${user.subscription_tier} tier)`);
    });
    
    // Update Law Firms
    console.log('\nUpdating law firm accounts...');
    const lawFirmsResult = await db.query(
      `UPDATE law_firms 
       SET password = $1
       WHERE email IN ('lawfirm@test.com', 'admin@testlegal.com')
       RETURNING email, firm_name`,
      [hashedPassword]
    );
    
    lawFirmsResult.rows.forEach(firm => {
      console.log(`✅ Updated: ${firm.email} (${firm.firm_name})`);
    });
    
    // Update Medical Providers
    console.log('\nUpdating medical provider accounts...');
    const providersResult = await db.query(
      `UPDATE medical_providers 
       SET password = $1
       WHERE email = 'testmed1@example.com'
       RETURNING email, provider_name`,
      [hashedPassword]
    );
    
    providersResult.rows.forEach(provider => {
      console.log(`✅ Updated: ${provider.email} (${provider.provider_name})`);
    });
    
    console.log(`\n🎉 Password reset complete! New password for all test accounts: ${newPassword}`);
    console.log('   Individual: testclient@example.com');
    console.log('   Law Firm: lawfirm@test.com');
    console.log('   Medical Provider: testmed1@example.com');
    console.log(`   Password: ${newPassword}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting passwords:', error);
    process.exit(1);
  }
};

resetTestPasswords();
