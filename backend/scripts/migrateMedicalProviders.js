const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

function generateUserCode(providerCode) {
  const timestamp = Date.now().toString().slice(-4);
  return `${providerCode}-USER-${timestamp}`;
}

async function migrateMedicalProviders() {
  const client = await pool.connect();
  
  try {
    console.log('\n' + '='.repeat(60));
    console.log('🔄 Medical Provider Multi-User Migration Script');
    console.log('   Converting providers to multi-user system');
    console.log('='.repeat(60) + '\n');

    await client.query('BEGIN');

    // Get all medical providers
    const providersResult = await client.query(`
      SELECT 
        id, 
        provider_name, 
        provider_code, 
        email, 
        password,
        subscription_tier
      FROM medical_providers
      WHERE is_active = true
      ORDER BY created_at ASC
    `);

    const providers = providersResult.rows;
    console.log(`🚀 Starting medical provider migration...\n`);
    console.log(`📊 Found ${providers.length} medical providers to migrate\n\n`);

    let migrated = 0;
    let skipped = 0;

    for (const provider of providers) {
      console.log(`🏥 Processing: ${provider.provider_name} (${provider.provider_code})`);

      // Check if admin user already exists
      const existingAdmin = await client.query(`
        SELECT id FROM medical_provider_users
        WHERE medical_provider_id = $1 AND role = 'admin'
        LIMIT 1
      `, [provider.id]);

      if (existingAdmin.rows.length > 0) {
        console.log(`   ⏭️  Admin already exists, skipping...\n`);
        skipped++;
        continue;
      }

      // Create admin user
      const userCode = generateUserCode(provider.provider_code);
      
      const adminResult = await client.query(`
        INSERT INTO medical_provider_users (
          medical_provider_id,
          first_name,
          last_name,
          email,
          password,
          user_code,
          role,
          title,
          credentials,
          can_manage_users,
          can_manage_patients,
          can_view_all_patients,
          can_send_notifications,
          can_manage_billing,
          can_view_analytics,
          can_manage_settings,
          can_access_phi,
          can_view_medical_records,
          can_edit_medical_records,
          hipaa_training_date,
          hipaa_training_expiry,
          status,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, CURRENT_TIMESTAMP)
        RETURNING id
      `, [
        provider.id,
        provider.provider_name.split(' ')[0] || 'Admin',
        provider.provider_name.split(' ').slice(1).join(' ') || 'User',
        provider.email,
        provider.password, // Keep existing hashed password
        userCode,
        'admin',
        'Administrator',
        'Administrator', // credentials
        true,  // can_manage_users
        true,  // can_manage_patients
        true,  // can_view_all_patients
        true,  // can_send_notifications
        true,  // can_manage_billing
        true,  // can_view_analytics
        true,  // can_manage_settings
        true,  // can_access_phi
        true,  // can_view_medical_records
        true,  // can_edit_medical_records
        new Date(),  // hipaa_training_date
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // hipaa_training_expiry (1 year)
        'active'
      ]);

      // Set max_users based on subscription tier
      let maxUsers = 5; // Default for free/basic
      if (provider.subscription_tier === 'professional') maxUsers = 15;
      if (provider.subscription_tier === 'enterprise') maxUsers = 50;

      // Update provider settings
      await client.query(`
        UPDATE medical_providers
        SET 
          max_users = $1,
          enable_activity_tracking = true,
          hipaa_compliance_mode = true,
          require_two_factor = false,
          data_retention_days = 2555,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [maxUsers, provider.id]);

      console.log(`   ✅ Admin created: ${userCode}`);
      console.log(`   📊 Max users set to: ${maxUsers}`);
      console.log(`   🏥 HIPAA training set (expires in 1 year)`);
      console.log(`   📋 Data retention: 2555 days (7 years HIPAA compliant)\n`);
      migrated++;
    }

    await client.query('COMMIT');

    console.log('\n' + '='.repeat(60));
    console.log('✅ Migration complete!');
    console.log(`   📊 Total providers: ${providers.length}`);
    console.log(`   ✅ Migrated: ${migrated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
migrateMedicalProviders().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
