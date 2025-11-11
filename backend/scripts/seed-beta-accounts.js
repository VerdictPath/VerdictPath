#!/usr/bin/env node

/**
 * COMPREHENSIVE BETA TEST ACCOUNTS SEED SCRIPT
 * Creates 3 fully-featured test accounts for beta testing:
 * 1. Individual User: beta_individual / password123
 * 2. Law Firm: beta_lawfirm / password123
 * 3. Medical Provider: beta_provider / password123
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🏴‍☠️ Creating Beta Test Accounts...\n');
    
    // 1. CREATE LAW FIRM (Premium Plan)
    console.log('1️⃣  Creating law firm account...');
    const lawFirmResult = await client.query(`
      INSERT INTO law_firms (
        firm_name, firm_code, email, password,
        bar_number, phone_number, street, city, state, zip_code,
        subscription_tier, plan_type, firm_size, stripe_account_id, privacy_accepted_at
      ) VALUES (
        'Beta Test Law Firm', 
        'LAW-BETA01',
        'beta_lawfirm',
        $1,
        'BAR123456',
        '(555) 100-2000',
        '123 Justice Street',
        'Los Angeles',
        'CA',
        '90001',
        'Premium',
        'premium',
        'medium',
        'acct_beta_lawfirm_12345',
        NOW()
      ) RETURNING id
    `, [await bcrypt.hash('password123', 10)]);
    
    const lawFirmId = lawFirmResult.rows[0].id;
    console.log(`   ✅ Law Firm created (ID: ${lawFirmId})`);
    
    // 2. CREATE MEDICAL PROVIDER (Premium Plan)
    console.log('2️⃣  Creating medical provider account...');
    const medProviderResult = await client.query(`
      INSERT INTO medical_providers (
        provider_name, provider_code, email, password,
        npi_number, specialty, phone_number,
        street, city, state, zip_code,
        subscription_tier, stripe_account_id, privacy_accepted_at
      ) VALUES (
        'Beta Medical Center',
        'MED-BETA01',
        'beta_provider',
        $1,
        '1234567890',
        'Orthopedic Surgery',
        '(555) 200-3000',
        '456 Medical Plaza',
        'Los Angeles',
        'CA',
        '90002',
        'Premium',
        'acct_beta_provider_67890',
        NOW()
      ) RETURNING id
    `, [await bcrypt.hash('password123', 10)]);
    
    const medProviderId = medProviderResult.rows[0].id;
    console.log(`   ✅ Medical Provider created (ID: ${medProviderId})`);
    
    // 3. CREATE INDIVIDUAL USER (Free Tier)
    console.log('3️⃣  Creating individual user account...');
    const individualResult = await client.query(`
      INSERT INTO users (
        first_name, last_name, email, password, user_type,
        law_firm_code, connected_law_firm_id, subscription_tier,
        total_coins, login_streak, last_login_date, privacy_accepted_at
      ) VALUES (
        'Beta',
        'Individual',
        'beta_individual',
        $1,
        'individual',
        'LAW-BETA01',
        $2,
        'Free',
        245,
        5,
        CURRENT_DATE,
        NOW()
      ) RETURNING id
    `, [await bcrypt.hash('password123', 10), lawFirmId]);
    
    const individualId = individualResult.rows[0].id;
    console.log(`   ✅ Individual User created (ID: ${individualId})`);
    
    // Link individual to law firm
    await client.query(
      'INSERT INTO law_firm_clients (law_firm_id, client_id) VALUES ($1, $2)',
      [lawFirmId, individualId]
    );
    
    // 4. CREATE 42 CLIENT ACCOUNTS
    console.log('4️⃣  Creating 42 client accounts...');
    const clientIds = [];
    for (let i = 1; i <= 42; i++) {
      const tier = i % 3 === 0 ? 'Basic' : i % 5 === 0 ? 'Premium' : 'Free';
      const coins = 50 + (i * 17);
      const streak = (i % 7) + 1;
      const daysAgo = i % 10;
      
      const clientResult = await client.query(`
        INSERT INTO users (
          first_name, last_name, email, password, user_type,
          law_firm_code, connected_law_firm_id, subscription_tier,
          total_coins, login_streak, last_login_date, privacy_accepted_at
        ) VALUES (
          'Client',
          $1,
          $2,
          $3,
          'client',
          'LAW-BETA01',
          $4,
          $5,
          $6,
          $7,
          CURRENT_DATE - ($8 || ' days')::INTERVAL,
          NOW()
        ) RETURNING id
      `, [`Num${i}`, `client${i}@beta.test`, await bcrypt.hash('password123', 10), lawFirmId, tier, coins, streak, daysAgo]);
      
      clientIds.push(clientResult.rows[0].id);
      
      // Link to law firm
      await client.query(
        'INSERT INTO law_firm_clients (law_firm_id, client_id) VALUES ($1, $2)',
        [lawFirmId, clientResult.rows[0].id]
      );
    }
    console.log(`   ✅ Created ${clientIds.length} clients`);
    
    // 5. CREATE 23 PATIENT ACCOUNTS
    console.log('5️⃣  Creating 23 patient accounts...');
    const patientIds = [];
    for (let i = 1; i <= 23; i++) {
      const coins = 30 + (i * 12);
      const streak = (i % 5) + 1;
      const daysAgo = i % 8;
      
      const patientResult = await client.query(`
        INSERT INTO users (
          first_name, last_name, email, password, user_type,
          law_firm_code, connected_law_firm_id, subscription_tier,
          total_coins, login_streak, last_login_date, privacy_accepted_at
        ) VALUES (
          'Patient',
          $1,
          $2,
          $3,
          'client',
          'LAW-BETA01',
          $4,
          'Free',
          $5,
          $6,
          CURRENT_DATE - ($7 || ' days')::INTERVAL,
          NOW()
        ) RETURNING id
      `, [`P${i}`, `patient${i}@beta.test`, await bcrypt.hash('password123', 10), lawFirmId, coins, streak, daysAgo]);
      
      patientIds.push(patientResult.rows[0].id);
      
      // Link to law firm and medical provider
      await client.query(
        'INSERT INTO law_firm_clients (law_firm_id, client_id) VALUES ($1, $2)',
        [lawFirmId, patientResult.rows[0].id]
      );
      
      await client.query(
        'INSERT INTO medical_provider_patients (medical_provider_id, patient_id) VALUES ($1, $2)',
        [medProviderId, patientResult.rows[0].id]
      );
    }
    console.log(`   ✅ Created ${patientIds.length} patients`);
    
    // 6. CREATE LITIGATION PROGRESS FOR INDIVIDUAL (44% = 18 substages)
    console.log('6️⃣  Creating litigation progress for individual user...');
    const substages = [
      // Pre-Litigation (11 substages)
      ['pre-1', 'Police Report', 10], ['pre-2', 'Body Cam Footage', 10],
      ['pre-3', 'Dash Cam Footage', 10], ['pre-4', 'Pictures', 5],
      ['pre-5', 'Health Insurance Card', 5], ['pre-6', 'Auto Insurance Company', 5],
      ['pre-7', 'Auto Insurance Policy Number', 5], ['pre-8', 'Medical Bills', 15],
      ['pre-9', 'Medical Records', 35], ['pre-10', 'Demand Sent', 15],
      ['pre-11', 'Demand Rejected', 10],
      // Complaint Filed (4 substages)
      ['cf-1', 'Draft Complaint', 8], ['cf-2', 'File with Court', 10],
      ['cf-3', 'Serve Defendant', 7], ['cf-4', 'Answer Filed', 7],
      // Discovery (3 substages)
      ['disc-1', 'Interrogatories', 10], ['disc-2', 'Request for Production', 10],
      ['disc-3', 'Depositions', 10]
    ];
    
    for (const [substageId, substageName, coins] of substages) {
      const stageId = substageId.startsWith('pre-') ? 1 : substageId.startsWith('cf-') ? 2 : 3;
      const stageName = stageId === 1 ? 'Pre-Litigation' : stageId === 2 ? 'Complaint Filed' : 'Discovery';
      
      await client.query(`
        INSERT INTO litigation_substage_completions (
          user_id, stage_id, stage_name, substage_id, substage_name,
          substage_type, coins_earned, completed_at
        ) VALUES ($1, $2, $3, $4, $5, 'data_entry', $6, NOW() - '30 days'::INTERVAL)
      `, [individualId, stageId, stageName, substageId, substageName, coins]);
    }
    console.log(`   ✅ Created 18 substage completions (44% progress)`);
    
    // 7. CREATE 2 PENDING TASKS FOR INDIVIDUAL
    console.log('7️⃣  Creating 2 pending tasks...');
    await client.query(`
      INSERT INTO law_firm_tasks (
        law_firm_id, client_id, task_type, task_title, task_description,
        priority, due_date, coins_reward, status, created_at
      ) VALUES 
        ($1, $2, 'document_upload', 'Submit Updated Medical Records', 'Please upload your most recent medical records from Dr. Johnson visit on November 1st', 'high', CURRENT_DATE + INTERVAL '5 days', 25, 'pending', NOW() - INTERVAL '3 days'),
        ($1, $2, 'review', 'Review Settlement Offer', 'Please review the settlement offer document we sent via email and provide your feedback', 'medium', CURRENT_DATE + INTERVAL '7 days', 15, 'pending', NOW() - INTERVAL '2 days')
    `, [lawFirmId, individualId]);
    console.log('   ✅ Created 2 pending tasks');
    
    // 8. UPDATE SUBSCRIPTION TIERS TO PREMIUM
    console.log('8️⃣  Upgrading accounts to Premium...');
    await client.query('UPDATE law_firms SET subscription_tier = $1, plan_type = $2 WHERE id = $3', ['Premium', 'premium', lawFirmId]);
    await client.query('UPDATE medical_providers SET subscription_tier = $1 WHERE id = $2', ['Premium', medProviderId]);
    console.log('   ✅ Accounts upgraded to Premium');
    
    await client.query('COMMIT');
    
    console.log('\n✨ SUCCESS! Beta Test Accounts Created ✨\n');
    console.log('📋 LOGIN CREDENTIALS:\n');
    console.log('1️⃣  INDIVIDUAL USER:');
    console.log('   Username: beta_individual');
    console.log('   Password: password123');
    console.log('   Features: 44% roadmap completion, 2 pending tasks, Free tier\n');
    
    console.log('2️⃣  LAW FIRM:');
    console.log('   Username: beta_lawfirm');
    console.log('   Password: password123');
    console.log('   Features: 42 clients, Premium plan, disbursement account\n');
    
    console.log('3️⃣  MEDICAL PROVIDER:');
    console.log('   Username: beta_provider');
    console.log('   Password: password123');
    console.log('   Features: 23 patients, Premium plan, disbursement account\n');
    
    console.log('🏴‍☠️ Ready for beta testing!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating beta accounts:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
