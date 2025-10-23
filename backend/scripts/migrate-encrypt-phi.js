const db = require('../config/db');
const encryption = require('../services/encryption');

/**
 * HIPAA PHI Encryption Migration Script
 * 
 * This script encrypts existing plaintext PHI data in the database.
 * 
 * IMPORTANT:
 * - Make sure ENCRYPTION_KEY is set in environment variables
 * - Backup your database before running this script
 * - This script is idempotent (safe to run multiple times)
 * - It only encrypts records that haven't been encrypted yet
 */

async function migratePHI() {
  console.log('\n🔐 Starting HIPAA PHI Encryption Migration...\n');
  
  try {
    // Verify encryption service is working
    console.log('✓ Testing encryption service...');
    const testEncrypt = encryption.encrypt('test');
    const testDecrypt = encryption.decrypt(testEncrypt);
    if (testDecrypt !== 'test') {
      throw new Error('Encryption service test failed!');
    }
    console.log('✓ Encryption service is working\n');
    
    // Migrate Users table
    await migrateUsers();
    
    // Migrate Medical Records
    await migrateMedicalRecords();
    
    // Migrate Medical Billing
    await migrateMedicalBilling();
    
    console.log('\n✅ Migration completed successfully!\n');
    console.log('NEXT STEPS:');
    console.log('1. Verify encrypted data with: SELECT id, first_name_encrypted FROM users LIMIT 5;');
    console.log('2. Test decryption in your controllers');
    console.log('3. After verification, you can drop plaintext columns (CAREFUL!)');
    console.log('4. Update controllers to use encrypted fields\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    throw error;
  }
}

async function migrateUsers() {
  console.log('📋 Migrating Users table...');
  
  // Get all user data including potential PHI fields
  const query = `
    SELECT id, first_name, last_name, email, 
           first_name_encrypted, last_name_encrypted, email_hash
    FROM users
    WHERE first_name_encrypted IS NULL OR last_name_encrypted IS NULL
  `;
  
  const result = await db.query(query);
  const users = result.rows;
  
  if (users.length === 0) {
    console.log('  ℹ️  No users need encryption (already encrypted or no data)');
    return;
  }
  
  console.log(`  Found ${users.length} users to encrypt`);
  
  let encrypted = 0;
  let failed = 0;
  
  for (const user of users) {
    try {
      // Encrypt all PHI fields
      const encryptedFirstName = user.first_name ? encryption.encrypt(user.first_name) : null;
      const encryptedLastName = user.last_name ? encryption.encrypt(user.last_name) : null;
      const emailHash = user.email ? encryption.hash(user.email.toLowerCase()) : null;
      
      // Note: phone, dob, ssn, address fields would be encrypted here if they had data
      // For now, we only encrypt fields that exist in the current schema
      
      // Update the user record
      const updateQuery = `
        UPDATE users
        SET 
          first_name_encrypted = $1,
          last_name_encrypted = $2,
          email_hash = $3
        WHERE id = $4
      `;
      
      await db.query(updateQuery, [
        encryptedFirstName,
        encryptedLastName,
        emailHash,
        user.id
      ]);
      
      encrypted++;
      
      // Progress indicator
      if (encrypted % 10 === 0) {
        console.log(`  Encrypted ${encrypted}/${users.length} users...`);
      }
    } catch (error) {
      console.error(`  ⚠️  Failed to encrypt user ${user.id}:`, error.message);
      failed++;
    }
  }
  
  console.log(`  ✓ Encrypted ${encrypted} users (${failed} failed)\n`);
}

async function migrateMedicalRecords() {
  console.log('📋 Migrating Medical Records table...');
  
  // Check which columns actually exist in the table
  const schemaQuery = `
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'medical_records'
    AND column_name IN ('description', 'facility_name', 'provider_name', 'diagnosis',
                        'description_encrypted', 'facility_name_encrypted', 
                        'provider_name_encrypted', 'diagnosis_encrypted')
  `;
  
  const schemaResult = await db.query(schemaQuery);
  const columns = schemaResult.rows.map(r => r.column_name);
  
  // Only process if encrypted columns exist
  if (!columns.includes('description_encrypted')) {
    console.log('  ℹ️  Medical records encrypted columns not yet added to schema\n');
    return;
  }
  
  // Check which columns exist to encrypt
  const checkColumns = await db.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'medical_records'
    AND column_name IN ('description', 'facility_name', 'provider_name', 'diagnosis')
  `);
  const availableColumns = checkColumns.rows.map(r => r.column_name);
  
  const query = `
    SELECT id, description, facility_name, provider_name, diagnosis,
           description_encrypted, facility_name_encrypted, provider_name_encrypted, diagnosis_encrypted
    FROM medical_records
    WHERE (description IS NOT NULL AND description_encrypted IS NULL)
       OR (facility_name IS NOT NULL AND facility_name_encrypted IS NULL)
       OR (provider_name IS NOT NULL AND provider_name_encrypted IS NULL)
       OR (diagnosis IS NOT NULL AND diagnosis_encrypted IS NULL)
  `;
  
  const result = await db.query(query);
  const records = result.rows;
  
  if (records.length === 0) {
    console.log('  ℹ️  No medical records need encryption\n');
    return;
  }
  
  console.log(`  Found ${records.length} medical records to encrypt`);
  
  let encrypted = 0;
  let failed = 0;
  
  for (const record of records) {
    try {
      const encryptedDescription = record.description ? 
        encryption.encrypt(record.description) : null;
      const encryptedFacility = record.facility_name ? 
        encryption.encrypt(record.facility_name) : null;
      const encryptedProvider = record.provider_name ? 
        encryption.encrypt(record.provider_name) : null;
      const encryptedDiagnosis = record.diagnosis ? 
        encryption.encrypt(record.diagnosis) : null;
      
      const updateQuery = `
        UPDATE medical_records
        SET 
          description_encrypted = $1,
          facility_name_encrypted = $2,
          provider_name_encrypted = $3,
          diagnosis_encrypted = $4
        WHERE id = $5
      `;
      
      await db.query(updateQuery, [
        encryptedDescription,
        encryptedFacility,
        encryptedProvider,
        encryptedDiagnosis,
        record.id
      ]);
      
      encrypted++;
      
      if (encrypted % 10 === 0) {
        console.log(`  Encrypted ${encrypted}/${records.length} records...`);
      }
    } catch (error) {
      console.error(`  ⚠️  Failed to encrypt record ${record.id}:`, error.message);
      failed++;
    }
  }
  
  console.log(`  ✓ Encrypted ${encrypted} medical records (${failed} failed)\n`);
}

async function migrateMedicalBilling() {
  console.log('📋 Migrating Medical Billing table...');
  
  // Check which columns exist
  const schemaQuery = `
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'medical_billing'
    AND column_name IN ('description', 'provider_name', 'insurance_info',
                        'description_encrypted', 'provider_name_encrypted', 
                        'insurance_info_encrypted')
  `;
  
  const schemaResult = await db.query(schemaQuery);
  const columns = schemaResult.rows.map(r => r.column_name);
  
  // Only process if encrypted columns exist
  if (!columns.includes('description_encrypted')) {
    console.log('  ℹ️  Medical billing encrypted columns not yet added to schema\n');
    return;
  }
  
  // Check which columns exist to encrypt
  const checkColumns = await db.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'medical_billing'
    AND column_name IN ('description', 'provider_name', 'insurance_info')
  `);
  const availableColumns = checkColumns.rows.map(r => r.column_name);
  
  const query = `
    SELECT id, description, provider_name, insurance_info,
           description_encrypted, provider_name_encrypted, insurance_info_encrypted,
           billing_details_encrypted
    FROM medical_billing
    WHERE (description IS NOT NULL AND description_encrypted IS NULL)
       OR (provider_name IS NOT NULL AND provider_name_encrypted IS NULL)
       OR (insurance_info IS NOT NULL AND insurance_info_encrypted IS NULL)
  `;
  
  const result = await db.query(query);
  const records = result.rows;
  
  if (records.length === 0) {
    console.log('  ℹ️  No billing records need encryption\n');
    return;
  }
  
  console.log(`  Found ${records.length} billing records to encrypt`);
  
  let encrypted = 0;
  let failed = 0;
  
  for (const record of records) {
    try {
      const encryptedDescription = record.description ? 
        encryption.encrypt(record.description) : null;
      const encryptedProvider = record.provider_name ? 
        encryption.encrypt(record.provider_name) : null;
      const encryptedInsurance = record.insurance_info ? 
        encryption.encrypt(record.insurance_info) : null;
      
      const updateQuery = `
        UPDATE medical_billing
        SET 
          description_encrypted = $1,
          provider_name_encrypted = $2,
          insurance_info_encrypted = $3
        WHERE id = $4
      `;
      
      await db.query(updateQuery, [
        encryptedDescription,
        encryptedProvider,
        encryptedInsurance,
        record.id
      ]);
      
      encrypted++;
      
      if (encrypted % 10 === 0) {
        console.log(`  Encrypted ${encrypted}/${records.length} records...`);
      }
    } catch (error) {
      console.error(`  ⚠️  Failed to encrypt record ${record.id}:`, error.message);
      failed++;
    }
  }
  
  console.log(`  ✓ Encrypted ${encrypted} billing records (${failed} failed)\n`);
}

// Run migration
if (require.main === module) {
  migratePHI()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migratePHI };
