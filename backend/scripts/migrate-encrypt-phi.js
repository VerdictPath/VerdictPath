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
  
  // Build dynamic query based on which plaintext columns exist
  const plaintextColumns = columns.filter(c => !c.includes('_encrypted'));
  const encryptedColumns = columns.filter(c => c.includes('_encrypted'));
  
  if (plaintextColumns.length === 0) {
    console.log('  ℹ️  No plaintext columns to migrate (schema already uses encrypted-only columns)\n');
    return;
  }
  
  // Build WHERE clause dynamically
  const whereConditions = plaintextColumns
    .map(col => `(${col} IS NOT NULL AND ${col}_encrypted IS NULL)`)
    .join(' OR ');
  
  const query = `
    SELECT id, ${plaintextColumns.join(', ')}, ${encryptedColumns.join(', ')}
    FROM medical_records
    WHERE ${whereConditions}
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
      // Dynamically encrypt only columns that exist
      const updates = {};
      const values = [];
      let paramCount = 1;
      
      if (plaintextColumns.includes('description') && record.description) {
        updates['description_encrypted'] = `$${paramCount++}`;
        values.push(encryption.encrypt(record.description));
      }
      if (plaintextColumns.includes('facility_name') && record.facility_name) {
        updates['facility_name_encrypted'] = `$${paramCount++}`;
        values.push(encryption.encrypt(record.facility_name));
      }
      if (plaintextColumns.includes('provider_name') && record.provider_name) {
        updates['provider_name_encrypted'] = `$${paramCount++}`;
        values.push(encryption.encrypt(record.provider_name));
      }
      if (plaintextColumns.includes('diagnosis') && record.diagnosis) {
        updates['diagnosis_encrypted'] = `$${paramCount++}`;
        values.push(encryption.encrypt(record.diagnosis));
      }
      
      if (Object.keys(updates).length === 0) {
        continue; // Nothing to encrypt for this record
      }
      
      const setClause = Object.entries(updates)
        .map(([col, param]) => `${col} = ${param}`)
        .join(', ');
      
      const updateQuery = `
        UPDATE medical_records
        SET ${setClause}
        WHERE id = $${paramCount}
      `;
      
      values.push(record.id);
      await db.query(updateQuery, values);
      
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
                        'insurance_info_encrypted', 'billing_details_encrypted')
  `;
  
  const schemaResult = await db.query(schemaQuery);
  const columns = schemaResult.rows.map(r => r.column_name);
  
  // Only process if encrypted columns exist
  if (!columns.includes('description_encrypted')) {
    console.log('  ℹ️  Medical billing encrypted columns not yet added to schema\n');
    return;
  }
  
  // Build dynamic query based on which plaintext columns exist
  const plaintextColumns = columns.filter(c => !c.includes('_encrypted') && !c.includes('_details'));
  const encryptedColumns = columns.filter(c => c.includes('_encrypted') || c.includes('_details'));
  
  if (plaintextColumns.length === 0) {
    console.log('  ℹ️  No plaintext columns to migrate (schema already uses encrypted-only columns)\n');
    return;
  }
  
  // Build WHERE clause dynamically
  const whereConditions = plaintextColumns
    .map(col => `(${col} IS NOT NULL AND ${col}_encrypted IS NULL)`)
    .join(' OR ');
  
  const query = `
    SELECT id, ${plaintextColumns.join(', ')}, ${encryptedColumns.join(', ')}
    FROM medical_billing
    WHERE ${whereConditions}
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
      // Dynamically encrypt only columns that exist
      const updates = {};
      const values = [];
      let paramCount = 1;
      
      if (plaintextColumns.includes('description') && record.description) {
        updates['description_encrypted'] = `$${paramCount++}`;
        values.push(encryption.encrypt(record.description));
      }
      if (plaintextColumns.includes('provider_name') && record.provider_name) {
        updates['provider_name_encrypted'] = `$${paramCount++}`;
        values.push(encryption.encrypt(record.provider_name));
      }
      if (plaintextColumns.includes('insurance_info') && record.insurance_info) {
        updates['insurance_info_encrypted'] = `$${paramCount++}`;
        values.push(encryption.encrypt(record.insurance_info));
      }
      
      if (Object.keys(updates).length === 0) {
        continue; // Nothing to encrypt for this record
      }
      
      const setClause = Object.entries(updates)
        .map(([col, param]) => `${col} = ${param}`)
        .join(', ');
      
      const updateQuery = `
        UPDATE medical_billing
        SET ${setClause}
        WHERE id = $${paramCount}
      `;
      
      values.push(record.id);
      await db.query(updateQuery, values);
      
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
