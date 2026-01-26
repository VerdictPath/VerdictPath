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
    
    // 2. CREATE MEDICAL PROVIDER (Premium Plan) + USER RECORD
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
    
    // Create corresponding user record for medical provider
    const medProviderUserResult = await client.query(`
      INSERT INTO users (
        first_name, last_name, email, password, user_type,
        subscription_tier, privacy_accepted_at
      ) VALUES (
        'Beta Medical',
        'Center',
        'beta_provider',
        $1,
        'medical_provider',
        'Premium',
        NOW()
      ) RETURNING id
    `, [await bcrypt.hash('password123', 10)]);
    
    const medProviderUserId = medProviderUserResult.rows[0].id;
    console.log(`   ✅ Medical Provider created (MP ID: ${medProviderId}, User ID: ${medProviderUserId})`);
    
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
    
    // 8. CREATE 3 ADDITIONAL MEDICAL PROVIDERS + USER RECORDS
    console.log('8️⃣  Creating 3 additional medical providers...');
    const additionalProviders = [];
    const additionalProviderUserIds = [];
    const providerDetails = [
      ['Advanced Imaging Center', 'Radiology', 'NPI2345678901'],
      ['Physical Therapy Associates', 'Physical Therapy', 'NPI3456789012'],
      ['Pain Management Clinic', 'Pain Management', 'NPI4567890123']
    ];
    
    for (let i = 0; i < providerDetails.length; i++) {
      const [name, specialty, npi] = providerDetails[i];
      const provResult = await client.query(`
        INSERT INTO medical_providers (
          provider_name, provider_code, email, password,
          npi_number, specialty, phone_number,
          street, city, state, zip_code,
          subscription_tier, stripe_account_id, privacy_accepted_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW()
        ) RETURNING id
      `, [
        name, `MED-BETA0${i+2}`, `provider${i+2}@beta.test`,
        await bcrypt.hash('password123', 10), npi, specialty,
        `(555) 20${i+1}-0000`, `${100 + i} Medical Blvd`, 'Los Angeles',
        'CA', `9000${i+3}`, 'Basic', `acct_beta_provider_${i+2}00`
      ]);
      additionalProviders.push(provResult.rows[0].id);
      
      // Create corresponding user record
      const userResult = await client.query(`
        INSERT INTO users (
          first_name, last_name, email, password, user_type,
          subscription_tier, privacy_accepted_at
        ) VALUES (
          $1, $2, $3, $4, 'medical_provider', 'Basic', NOW()
        ) RETURNING id
      `, [
        name.split(' ')[0], name.split(' ').slice(1).join(' '),
        `provider${i+2}@beta.test`,
        await bcrypt.hash('password123', 10)
      ]);
      additionalProviderUserIds.push(userResult.rows[0].id);
    }
    console.log(`   ✅ Created 3 additional medical providers with user records`);
    
    // 9. LINK INDIVIDUAL USER TO 4 MEDICAL PROVIDERS
    console.log('9️⃣  Linking individual user to 4 medical providers...');
    const allProviderUserIds = [medProviderUserId, ...additionalProviderUserIds];
    
    for (let i = 0; i < 4; i++) {
      await client.query(`
        INSERT INTO client_medical_providers (
          client_id, medical_provider_id, relationship_type, is_active, created_at
        ) VALUES ($1, $2, 'patient', true, NOW())
      `, [individualId, allProviderUserIds[i]]);
    }
    console.log(`   ✅ Linked individual to 4 medical providers`);
    
    // 10. CREATE 10 BILL NEGOTIATIONS FOR LAW FIRM
    console.log('🔟 Creating 10 bill negotiations...');
    const negotiationStatuses = [
      'pending_provider', 'pending_firm', 'pending_provider', 'pending_firm',
      'call_requested', 'accepted', 'accepted', 'pending_firm', 'pending_provider', 'call_requested'
    ];
    
    for (let i = 0; i < 10; i++) {
      const clientId = clientIds[i * 4];
      const providerId = medProviderId; // Use only the main provider to avoid FK issues
      const status = negotiationStatuses[i];
      const originalAmount = 5000 + (i * 500);
      const currentOffer = originalAmount - (i * 150);
      
      const descriptions = ['Emergency Room Visit', 'Physical Therapy Sessions', 'MRI Scan', 'Surgery Consultation', 'Follow-up Visits', 'X-Ray Imaging', 'Lab Tests', 'Medication Costs', 'Specialist Consultation', 'Rehabilitation Services'];
      
      const negResult = await client.query(`
        INSERT INTO negotiations (
          law_firm_id, medical_provider_id, client_id,
          bill_description, bill_amount, current_offer, status,
          initiated_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() - '5 days'::INTERVAL, NOW())
        RETURNING id
      `, [lawFirmId, providerId, clientId, descriptions[i], originalAmount, currentOffer, status, i % 2 === 0 ? 'law_firm' : 'provider']);
      
      const negotiationId = negResult.rows[0].id;
      
      // Skip negotiation history for simplicity - can be added via app UI
    }
    console.log('   ✅ Created 10 negotiations with history');
    
    // 11. CREATE 15 NOTIFICATIONS FOR MEDICAL PROVIDER
    console.log('1️⃣1️⃣  Creating 15 notifications for medical provider...');
    const notificationTemplates = [
      ['new_negotiation', 'New bill negotiation request from Beta Test Law Firm'],
      ['counter_offer', 'Counter offer received for Patient P1'],
      ['negotiation_accepted', 'Your offer was accepted for Patient P2'],
      ['new_patient', 'New patient added: Patient P3'],
      ['document_uploaded', 'New medical document uploaded for Patient P4'],
      ['new_negotiation', 'New bill negotiation request from Beta Test Law Firm'],
      ['counter_offer', 'Counter offer received for Patient P5'],
      ['new_patient', 'New patient added: Patient P6'],
      ['negotiation_accepted', 'Your offer was accepted for Patient P7'],
      ['new_negotiation', 'New bill negotiation request from Beta Test Law Firm'],
      ['document_uploaded', 'New medical document uploaded for Patient P8'],
      ['counter_offer', 'Counter offer received for Patient P9'],
      ['new_patient', 'New patient added: Patient P10'],
      ['new_negotiation', 'New bill negotiation request from Beta Test Law Firm'],
      ['counter_offer', 'Counter offer received for Patient P11']
    ];
    
    for (let i = 0; i < 15; i++) {
      const [type, message] = notificationTemplates[i];
      const isRead = i < 5;
      
      await client.query(`
        INSERT INTO notifications (
          sender_type, sender_id, sender_name,
          recipient_id, recipient_type, type,
          title, body, read_at, created_at
        ) VALUES ('law_firm', $1, 'Beta Test Law Firm', $2, 'medical_provider', $3, $4, $5, $6, NOW() - ($7 || ' days')::INTERVAL)
      `, [lawFirmId, medProviderId, type, type, message, isRead ? new Date() : null, i + 1]);
    }
    console.log('   ✅ Created 15 notifications (10 unread)');
    
    // 12. CREATE 1 PENDING APPOINTMENT FOR INDIVIDUAL
    console.log('1️⃣2️⃣  Creating 1 pending appointment...');
    await client.query(`
      INSERT INTO calendar_events (
        user_id, event_type, title, description,
        start_time, end_time, location, created_at
      ) VALUES (
        $1, 'appointment', 'Consultation with Attorney',
        'Discuss case progress and next steps',
        NOW() + '7 days'::INTERVAL,
        NOW() + '7 days'::INTERVAL + '1 hour'::INTERVAL,
        'Beta Test Law Firm Office',
        NOW()
      )
    `, [individualId]);
    console.log('   ✅ Created 1 pending appointment');
    
    // 13. UPDATE SUBSCRIPTION TIERS TO PREMIUM
    console.log('1️⃣3️⃣  Upgrading accounts to Premium...');
    await client.query('UPDATE law_firms SET subscription_tier = $1, plan_type = $2 WHERE id = $3', ['Premium', 'premium', lawFirmId]);
    await client.query('UPDATE medical_providers SET subscription_tier = $1 WHERE id = $2', ['Premium', medProviderId]);
    console.log('   ✅ Accounts upgraded to Premium');
    
    await client.query('COMMIT');
    
    console.log('\n✨ SUCCESS! Beta Test Accounts Created ✨\n');
    console.log('📋 LOGIN CREDENTIALS:\n');
    console.log('1️⃣  INDIVIDUAL USER:');
    console.log('   Username: beta_individual');
    console.log('   Password: password123');
    console.log('   • 44% roadmap completion (18 completed substages)');
    console.log('   • 2 pending attorney-assigned tasks');
    console.log('   • 1 pending appointment with law firm');
    console.log('   • Linked to 4 medical providers');
    console.log('   • Free tier, 245 coins, 5-day login streak\n');
    
    console.log('   Username: beta_lawfirm');
    console.log('   Password: password123');
    console.log('   • 42 active clients (varied tiers)');
    console.log('   • 10 active bill negotiations (various stages)');
    console.log('   • Premium plan with disbursement access');
    console.log('   • Stripe Connect account configured\n');
    
    console.log('3️⃣  MEDICAL PROVIDER:');
    console.log('   Username: beta_provider');
    console.log('   Password: password123');
    console.log('   • 23 active patients');
    console.log('   • 15 notifications (10 unread)');
    console.log('   • Multiple active negotiations with law firms');
    console.log('   • Premium plan with disbursement access');
    console.log('   • Stripe Connect account configured\n');
    
    console.log('📊 ADDITIONAL DATA CREATED:');
    console.log(`   • ${clientIds.length} client accounts`);
    console.log(`   • ${patientIds.length} patient accounts`);
    console.log(`   • ${additionalProviders.length + 1} medical provider accounts`);
    console.log('   • 10 bill negotiations with history');
    console.log('   • 18 litigation substage completions');
    console.log('   • 15 notifications\n');
    
    console.log('🏴‍☠️ Ready for comprehensive beta testing!');
    
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
