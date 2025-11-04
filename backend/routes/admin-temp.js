const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');

router.get('/seed-production-data-temp-endpoint-2025', async (req, res) => {
  try {
    const password = bcrypt.hashSync('VerdictPath2025!', 10);
    
    const users = [
      { email: 'john.doe@email.com', firstName: 'John', lastName: 'Doe', tier: 'free' },
      { email: 'sarah.johnson@test.com', firstName: 'Sarah', lastName: 'Johnson', tier: 'free' },
      { email: 'michael.chen@test.com', firstName: 'Michael', lastName: 'Chen', tier: 'basic' },
      { email: 'emily.rodriguez@test.com', firstName: 'Emily', lastName: 'Rodriguez', tier: 'premium' },
      { email: 'testclient@example.com', firstName: 'John', lastName: 'Doe', tier: 'premium' },
      { email: 'michael.chen@example.com', firstName: 'Michael', lastName: 'Chen', tier: 'free' },
      { email: 'sarah.johnson@example.com', firstName: 'Sarah', lastName: 'Johnson', tier: 'free' },
      { email: 'emily.rodriguez@example.com', firstName: 'Emily', lastName: 'Rodriguez', tier: 'free' },
      { email: 'david.thompson@example.com', firstName: 'David', lastName: 'Thompson', tier: 'basic' }
    ];
    
    const userIds = {};
    for (const user of users) {
      const result = await db.query(
        `INSERT INTO users (email, password, first_name, last_name, subscription_tier, privacy_accepted_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (email) DO UPDATE 
         SET password = $2, subscription_tier = $5
         RETURNING id`,
        [user.email, password, user.firstName, user.lastName, user.tier]
      );
      userIds[user.email] = result.rows[0].id;
    }
    
    const lawFirmResult = await db.query(
      `SELECT id, email FROM law_firms WHERE email IN ('lawfirm@test.com', 'admin@testlegal.com')`
    );
    
    const lawFirms = {};
    lawFirmResult.rows.forEach(lf => {
      lawFirms[lf.email] = lf.id;
    });
    
    const smithClients = ['john.doe@email.com', 'sarah.johnson@test.com', 'michael.chen@test.com', 'emily.rodriguez@test.com'];
    for (const email of smithClients) {
      if (userIds[email] && lawFirms['lawfirm@test.com']) {
        await db.query(
          `INSERT INTO law_firm_clients (law_firm_id, client_id, registered_date)
           VALUES ($1, $2, NOW())
           ON CONFLICT DO NOTHING`,
          [lawFirms['lawfirm@test.com'], userIds[email]]
        );
      }
    }
    
    const testLegalClients = ['michael.chen@example.com', 'sarah.johnson@example.com', 'testclient@example.com', 'emily.rodriguez@example.com', 'david.thompson@example.com'];
    for (const email of testLegalClients) {
      if (userIds[email] && lawFirms['admin@testlegal.com']) {
        await db.query(
          `INSERT INTO law_firm_clients (law_firm_id, client_id, registered_date)
           VALUES ($1, $2, NOW())
           ON CONFLICT DO NOTHING`,
          [lawFirms['admin@testlegal.com'], userIds[email]]
        );
      }
    }
    
    const providerResult = await db.query(
      `SELECT id FROM medical_providers WHERE email = 'testmed1@example.com'`
    );
    
    if (providerResult.rows.length > 0) {
      const providerId = providerResult.rows[0].id;
      const patients = ['testclient@example.com', 'sarah.johnson@example.com', 'michael.chen@example.com'];
      
      for (const email of patients) {
        if (userIds[email]) {
          await db.query(
            `INSERT INTO medical_provider_patients (medical_provider_id, patient_id, registered_date)
             VALUES ($1, $2, NOW())
             ON CONFLICT DO NOTHING`,
            [providerId, userIds[email]]
          );
        }
      }
    }
    
    if (userIds['testclient@example.com']) {
      await db.query(
        `INSERT INTO user_litigation_progress (user_id, current_stage_id, current_stage_name, total_coins_earned, total_substages_completed, progress_percentage, started_at, last_activity_at)
         VALUES ($1, 1, 'Pre-Litigation', 753, 20, 10.00, NOW(), NOW())
         ON CONFLICT (user_id) DO UPDATE
         SET current_stage_id = 1, current_stage_name = 'Pre-Litigation', total_coins_earned = 753, total_substages_completed = 20, progress_percentage = 10.00`,
        [userIds['testclient@example.com']]
      );
    }
    
    res.json({
      success: true,
      message: 'Production test data seeded successfully!',
      summary: {
        usersCreated: Object.keys(userIds).length,
        smithClientsConnected: 4,
        testLegalClientsConnected: 5,
        medicalPatientsConnected: 3,
        progressAdded: 1
      },
      accounts: {
        individual: 'testclient@example.com',
        lawFirm: 'lawfirm@test.com',
        medicalProvider: 'testmed1@example.com',
        password: 'VerdictPath2025!'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

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
