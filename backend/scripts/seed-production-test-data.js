const db = require('../config/db');
const bcrypt = require('bcryptjs');

const seedProductionTestData = async () => {
  try {
    console.log('🌱 Seeding production test data...\n');
    
    const password = bcrypt.hashSync('VerdictPath2025!', 10);
    
    // Step 1: Create test individual users
    console.log('Step 1: Creating individual user accounts...');
    
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
        `INSERT INTO users (email, password, first_name, last_name, subscription_tier, accepted_privacy_policy, accepted_terms, accepted_eula, privacy_policy_accepted_at, terms_accepted_at, eula_accepted_at)
         VALUES ($1, $2, $3, $4, $5, true, true, true, NOW(), NOW(), NOW())
         ON CONFLICT (email) DO UPDATE 
         SET password = $2, subscription_tier = $5
         RETURNING id`,
        [user.email, password, user.firstName, user.lastName, user.tier]
      );
      userIds[user.email] = result.rows[0].id;
      console.log(`  ✅ ${user.email} (${user.tier})`);
    }
    
    // Step 2: Get law firm IDs
    console.log('\nStep 2: Getting law firm IDs...');
    const lawFirmResult = await db.query(
      `SELECT id, email FROM law_firms WHERE email IN ('lawfirm@test.com', 'admin@testlegal.com')`
    );
    
    const lawFirms = {};
    lawFirmResult.rows.forEach(lf => {
      lawFirms[lf.email] = lf.id;
      console.log(`  ✅ ${lf.email} (ID: ${lf.id})`);
    });
    
    // Step 3: Connect clients to law firms
    console.log('\nStep 3: Connecting clients to law firms...');
    
    // lawfirm@test.com connections
    const smithClients = [
      'john.doe@email.com',
      'sarah.johnson@test.com',
      'michael.chen@test.com',
      'emily.rodriguez@test.com'
    ];
    
    for (const email of smithClients) {
      if (userIds[email] && lawFirms['lawfirm@test.com']) {
        await db.query(
          `INSERT INTO law_firm_clients (law_firm_id, client_id, registered_date)
           VALUES ($1, $2, NOW())
           ON CONFLICT DO NOTHING`,
          [lawFirms['lawfirm@test.com'], userIds[email]]
        );
        console.log(`  ✅ Connected ${email} to Smith & Associates`);
      }
    }
    
    // admin@testlegal.com connections
    const testLegalClients = [
      'michael.chen@example.com',
      'sarah.johnson@example.com',
      'testclient@example.com',
      'emily.rodriguez@example.com',
      'david.thompson@example.com'
    ];
    
    for (const email of testLegalClients) {
      if (userIds[email] && lawFirms['admin@testlegal.com']) {
        await db.query(
          `INSERT INTO law_firm_clients (law_firm_id, client_id, registered_date)
           VALUES ($1, $2, NOW())
           ON CONFLICT DO NOTHING`,
          [lawFirms['admin@testlegal.com'], userIds[email]]
        );
        console.log(`  ✅ Connected ${email} to Test Legal Group`);
      }
    }
    
    // Step 4: Get medical provider ID and connect patients
    console.log('\nStep 4: Getting medical provider and connecting patients...');
    const providerResult = await db.query(
      `SELECT id FROM medical_providers WHERE email = 'testmed1@example.com'`
    );
    
    if (providerResult.rows.length > 0) {
      const providerId = providerResult.rows[0].id;
      console.log(`  ✅ Test Medical Center (ID: ${providerId})`);
      
      const patients = [
        'testclient@example.com',
        'sarah.johnson@example.com',
        'michael.chen@example.com'
      ];
      
      for (const email of patients) {
        if (userIds[email]) {
          await db.query(
            `INSERT INTO medical_provider_patients (medical_provider_id, patient_id, registered_date)
             VALUES ($1, $2, NOW())
             ON CONFLICT DO NOTHING`,
            [providerId, userIds[email]]
          );
          console.log(`  ✅ Connected ${email} as patient`);
        }
      }
    }
    
    // Step 5: Add litigation progress for testclient@example.com
    console.log('\nStep 5: Adding litigation progress...');
    if (userIds['testclient@example.com']) {
      const userId = userIds['testclient@example.com'];
      
      await db.query(
        `INSERT INTO user_litigation_progress (user_id, current_stage_id, current_stage_name, total_coins_earned, total_substages_completed, progress_percentage, started_at, last_activity_at)
         VALUES ($1, 1, 'Pre-Litigation', 753, 20, 10.00, NOW(), NOW())
         ON CONFLICT (user_id) DO UPDATE
         SET current_stage_id = 1, current_stage_name = 'Pre-Litigation', total_coins_earned = 753, total_substages_completed = 20, progress_percentage = 10.00`,
        [userId]
      );
      console.log(`  ✅ Added progress for testclient@example.com`);
    }
    
    console.log('\n🎉 Production test data seeded successfully!');
    console.log('\n📋 Summary:');
    console.log(`   • ${Object.keys(userIds).length} individual users created`);
    console.log(`   • lawfirm@test.com: 4 clients connected`);
    console.log(`   • admin@testlegal.com: 5 clients connected`);
    console.log(`   • testmed1@example.com: 3 patients connected`);
    console.log(`   • testclient@example.com: Litigation progress added`);
    console.log('\n🔑 All accounts use password: VerdictPath2025!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
};

seedProductionTestData();
