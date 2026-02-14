const db = require('../config/db');

async function ensureTablesExist() {
  try {
    
    const lawFirmUsersCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'law_firm_users'
      );
    `);
    
    if (!lawFirmUsersCheck.rows[0].exists) {
      await db.query(`
        CREATE TABLE IF NOT EXISTS law_firm_users (
          id SERIAL PRIMARY KEY,
          law_firm_id INTEGER NOT NULL REFERENCES law_firms(id) ON DELETE CASCADE,
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          user_code VARCHAR(50) NOT NULL UNIQUE,
          role VARCHAR(50) NOT NULL DEFAULT 'attorney',
          can_manage_users BOOLEAN DEFAULT false,
          can_manage_clients BOOLEAN DEFAULT true,
          can_view_all_clients BOOLEAN DEFAULT true,
          can_send_notifications BOOLEAN DEFAULT true,
          can_manage_disbursements BOOLEAN DEFAULT false,
          can_view_analytics BOOLEAN DEFAULT true,
          can_manage_settings BOOLEAN DEFAULT false,
          status VARCHAR(20) NOT NULL DEFAULT 'active',
          last_login TIMESTAMP,
          last_activity TIMESTAMP,
          profile_image VARCHAR(500),
          phone_number VARCHAR(20),
          title VARCHAR(100),
          bar_number VARCHAR(50),
          department VARCHAR(100),
          created_by INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          deactivated_at TIMESTAMP,
          deactivated_by INTEGER,
          deactivation_reason TEXT,
          must_change_password BOOLEAN DEFAULT false,
          temporary_password_expires_at TIMESTAMP,
          notification_preference VARCHAR(20) DEFAULT 'email'
        );
      `);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_law_firm_users_law_firm_id ON law_firm_users(law_firm_id);`);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_law_firm_users_email ON law_firm_users(email);`);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_law_firm_users_status ON law_firm_users(status);`);
      console.log('✅ law_firm_users table created');
    }
    
    const medProviderUsersCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'medical_provider_users'
      );
    `);
    
    if (!medProviderUsersCheck.rows[0].exists) {
      await db.query(`
        CREATE TABLE IF NOT EXISTS medical_provider_users (
          id SERIAL PRIMARY KEY,
          medical_provider_id INTEGER NOT NULL REFERENCES medical_providers(id) ON DELETE CASCADE,
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          user_code VARCHAR(50) NOT NULL UNIQUE,
          role VARCHAR(50) NOT NULL DEFAULT 'staff',
          can_manage_users BOOLEAN DEFAULT false,
          can_manage_patients BOOLEAN DEFAULT true,
          can_view_all_patients BOOLEAN DEFAULT true,
          can_send_notifications BOOLEAN DEFAULT true,
          can_manage_billing BOOLEAN DEFAULT false,
          can_view_analytics BOOLEAN DEFAULT true,
          can_manage_settings BOOLEAN DEFAULT false,
          status VARCHAR(20) NOT NULL DEFAULT 'active',
          last_login TIMESTAMP,
          last_activity TIMESTAMP,
          profile_image VARCHAR(500),
          phone_number VARCHAR(20),
          title VARCHAR(100),
          npi_number VARCHAR(20),
          department VARCHAR(100),
          hipaa_training_completed BOOLEAN DEFAULT false,
          hipaa_training_date DATE,
          created_by INTEGER,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          deactivated_at TIMESTAMP,
          deactivated_by INTEGER,
          deactivation_reason TEXT,
          must_change_password BOOLEAN DEFAULT false,
          temporary_password_expires_at TIMESTAMP,
          notification_preference VARCHAR(20) DEFAULT 'email'
        );
      `);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_medical_provider_users_provider_id ON medical_provider_users(medical_provider_id);`);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_medical_provider_users_email ON medical_provider_users(email);`);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_medical_provider_users_status ON medical_provider_users(status);`);
      console.log('✅ medical_provider_users table created');
    }
    
    const passwordResetCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'password_reset_tokens'
      );
    `);
    
    if (!passwordResetCheck.rows[0].exists) {
      await db.query(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) NOT NULL,
          token VARCHAR(255) NOT NULL UNIQUE,
          user_type VARCHAR(50) NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          used BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_email ON password_reset_tokens(email);`);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);`);
      console.log('✅ password_reset_tokens table created');
    }
    
    await seedRolePermissions();
    await seedMissingConsentRecords();
    
    console.log('✅ Database schema check complete');
    
  } catch (error) {
    console.error('⚠️ Database migration warning:', error.message);
  }
}

async function seedRolePermissions() {
  try {
    const existing = await db.query('SELECT COUNT(*) as count FROM role_permissions');
    if (parseInt(existing.rows[0].count) > 0) return;

    const rolePermissions = {
      'LAW_FIRM_ADMIN': [
        'VIEW_CLIENT_PHI', 'EDIT_CLIENT_PHI',
        'VIEW_LITIGATION', 'EDIT_LITIGATION', 'MANAGE_LITIGATION',
        'VIEW_MEDICAL_RECORDS', 'EDIT_MEDICAL_RECORDS', 'UPLOAD_MEDICAL_RECORDS', 'DELETE_MEDICAL_RECORDS',
        'VIEW_BILLING', 'EDIT_BILLING', 'UPLOAD_BILLING',
        'MANAGE_CONSENT', 'OVERRIDE_CONSENT',
        'VIEW_AUDIT_LOGS', 'VIEW_ALL_AUDIT_LOGS',
        'MANAGE_FIRM_USERS',
        'SEND_NOTIFICATIONS', 'VIEW_NOTIFICATION_HISTORY', 'MANAGE_NOTIFICATION_TEMPLATES', 'VIEW_NOTIFICATION_ANALYTICS',
        'CREATE_TASKS', 'ASSIGN_TASKS', 'VIEW_TASKS', 'COMPLETE_TASKS', 'MANAGE_TASK_TEMPLATES', 'VIEW_TASK_ANALYTICS'
      ],
      'LAW_FIRM_STAFF': [
        'VIEW_CLIENT_PHI', 'VIEW_LITIGATION', 'VIEW_MEDICAL_RECORDS', 'VIEW_BILLING',
        'VIEW_AUDIT_LOGS', 'VIEW_NOTIFICATION_HISTORY', 'VIEW_TASKS', 'COMPLETE_TASKS'
      ],
      'MEDICAL_PROVIDER_ADMIN': [
        'VIEW_PATIENT_PHI', 'EDIT_PATIENT_PHI',
        'VIEW_MEDICAL_RECORDS', 'EDIT_MEDICAL_RECORDS', 'UPLOAD_MEDICAL_RECORDS', 'DELETE_MEDICAL_RECORDS',
        'VIEW_BILLING', 'EDIT_BILLING', 'UPLOAD_BILLING',
        'MANAGE_CONSENT',
        'VIEW_AUDIT_LOGS', 'VIEW_ALL_AUDIT_LOGS',
        'MANAGE_PROVIDER_USERS',
        'SEND_NOTIFICATIONS', 'VIEW_NOTIFICATION_HISTORY', 'MANAGE_NOTIFICATION_TEMPLATES', 'VIEW_NOTIFICATION_ANALYTICS',
        'VIEW_TASKS'
      ],
      'MEDICAL_PROVIDER_STAFF': [
        'VIEW_PATIENT_PHI', 'VIEW_MEDICAL_RECORDS', 'VIEW_BILLING',
        'VIEW_AUDIT_LOGS', 'VIEW_NOTIFICATION_HISTORY', 'VIEW_TASKS'
      ],
      'CLIENT': [
        'VIEW_OWN_PHI', 'EDIT_OWN_PHI',
        'VIEW_MEDICAL_RECORDS', 'UPLOAD_MEDICAL_RECORDS',
        'VIEW_BILLING', 'VIEW_LITIGATION', 'MANAGE_CONSENT',
        'VIEW_AUDIT_LOGS', 'VIEW_TASKS', 'COMPLETE_TASKS'
      ],
      'SYSTEM_ADMIN': [
        'VIEW_CLIENT_PHI', 'EDIT_CLIENT_PHI', 'VIEW_PATIENT_PHI', 'EDIT_PATIENT_PHI',
        'VIEW_OWN_PHI', 'EDIT_OWN_PHI',
        'VIEW_LITIGATION', 'EDIT_LITIGATION', 'MANAGE_LITIGATION',
        'VIEW_MEDICAL_RECORDS', 'EDIT_MEDICAL_RECORDS', 'UPLOAD_MEDICAL_RECORDS', 'DELETE_MEDICAL_RECORDS',
        'VIEW_BILLING', 'EDIT_BILLING', 'UPLOAD_BILLING',
        'MANAGE_CONSENT', 'OVERRIDE_CONSENT',
        'VIEW_AUDIT_LOGS', 'VIEW_ALL_AUDIT_LOGS',
        'MANAGE_FIRM_USERS', 'MANAGE_PROVIDER_USERS', 'MANAGE_SYSTEM_USERS',
        'SEND_NOTIFICATIONS', 'VIEW_NOTIFICATION_HISTORY', 'MANAGE_NOTIFICATION_TEMPLATES', 'VIEW_NOTIFICATION_ANALYTICS',
        'CREATE_TASKS', 'ASSIGN_TASKS', 'VIEW_TASKS', 'COMPLETE_TASKS', 'MANAGE_TASK_TEMPLATES', 'VIEW_TASK_ANALYTICS'
      ]
    };

    for (const [roleName, permissions] of Object.entries(rolePermissions)) {
      await db.query(
        `INSERT INTO role_permissions (role_id, permission_id)
         SELECT r.id, p.id FROM roles r, permissions p
         WHERE r.name = $1 AND p.name = ANY($2::text[])
         ON CONFLICT DO NOTHING`,
        [roleName, permissions]
      );
    }
    console.log('✅ Role permissions seeded');
  } catch (error) {
    console.error('⚠️ Role permissions seeding warning:', error.message);
  }
}

async function seedMissingConsentRecords() {
  try {
    const lfResult = await db.query(
      `INSERT INTO consent_records (patient_id, granted_to_type, granted_to_id, consent_type, status, consent_method)
       SELECT lfc.client_id, 'lawfirm', lfc.law_firm_id, 'FULL_ACCESS', 'active', 'connection_grant'
       FROM law_firm_clients lfc
       WHERE NOT EXISTS (
         SELECT 1 FROM consent_records cr 
         WHERE cr.patient_id = lfc.client_id 
         AND cr.granted_to_type = 'lawfirm' 
         AND cr.granted_to_id = lfc.law_firm_id 
         AND cr.status = 'active'
       )`
    );
    const mpResult = await db.query(
      `INSERT INTO consent_records (patient_id, granted_to_type, granted_to_id, consent_type, status, consent_method)
       SELECT mpp.patient_id, 'medical_provider', mpp.medical_provider_id, 'FULL_ACCESS', 'active', 'connection_grant'
       FROM medical_provider_patients mpp
       WHERE NOT EXISTS (
         SELECT 1 FROM consent_records cr 
         WHERE cr.patient_id = mpp.patient_id 
         AND cr.granted_to_type = 'medical_provider' 
         AND cr.granted_to_id = mpp.medical_provider_id 
         AND cr.status = 'active'
       )`
    );
    const total = (lfResult.rowCount || 0) + (mpResult.rowCount || 0);
    if (total > 0) {
      console.log(`✅ Created ${total} missing consent records`);
    }
  } catch (error) {
    console.error('⚠️ Consent records seeding warning:', error.message);
  }
}

module.exports = { ensureTablesExist };
