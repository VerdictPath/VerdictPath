const db = require('../config/db');

async function ensureTablesExist() {
  try {
    console.log('🔍 Checking database schema...');
    
    const lawFirmUsersCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'law_firm_users'
      );
    `);
    
    if (!lawFirmUsersCheck.rows[0].exists) {
      console.log('📦 Creating law_firm_users table...');
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
      console.log('📦 Creating medical_provider_users table...');
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
    
    console.log('✅ Database schema check complete');
    
  } catch (error) {
    console.error('⚠️ Database migration warning:', error.message);
  }
}

module.exports = { ensureTablesExist };
