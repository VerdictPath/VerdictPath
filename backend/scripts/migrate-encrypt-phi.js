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
  
  try {
    // Verify encryption service is working
    const testEncrypt = encryption.encrypt('test');
    const testDecrypt = encryption.decrypt(testEncrypt);
    if (testDecrypt !== 'test') {
      throw new Error('Encryption service test failed!');
    }
    
    // Migrate Users table
    await migrateUsers();
    
    // Migrate Medical Records
    await migrateMedicalRecords();
    
    // Migrate Medical Billing
    await migrateMedicalBilling();
    
    
  } catch (error) {
    throw error;
  }
}

async function migrateUsers() {
  
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
    return;
  }
  
  
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
      }
    } catch (error) {
      failed++;
    }
  }
  
}

async function migrateMedicalRecords() {
  
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
    return;
  }
  
  // Build dynamic query based on which plaintext columns exist
  const plaintextColumns = columns.filter(c => !c.includes('_encrypted'));
  const encryptedColumns = columns.filter(c => c.includes('_encrypted'));
  
  if (plaintextColumns.length === 0) {
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
    return;
  }
  
  
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
      }
    } catch (error) {
      failed++;
    }
  }
  
}

async function migrateMedicalBilling() {
  
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
    return;
  }
  
  // Build dynamic query based on which plaintext columns exist
  const plaintextColumns = columns.filter(c => !c.includes('_encrypted') && !c.includes('_details'));
  const encryptedColumns = columns.filter(c => c.includes('_encrypted') || c.includes('_details'));
  
  if (plaintextColumns.length === 0) {
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
    return;
  }
  
  
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
      }
    } catch (error) {
      failed++;
    }
  }
  
}

// Run migration
if (require.main === module) {
  migratePHI()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      process.exit(1);
    });
}

module.exports = { migratePHI };
