#!/usr/bin/env node

/**
 * Creates missing tables for production database
 * Run this script against your production DATABASE_URL
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function createMissingTables() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking for missing tables...\n');
    
    // Check if law_firm_users exists
    const lawFirmUsersCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'law_firm_users'
      );
    `);
    
    if (!lawFirmUsersCheck.rows[0].exists) {
      console.log('📦 Creating law_firm_users table...');
      await client.query(`
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
      console.log('✅ law_firm_users table created');
      
      // Create indexes
      await client.query(`CREATE INDEX IF NOT EXISTS idx_law_firm_users_law_firm_id ON law_firm_users(law_firm_id);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_law_firm_users_email ON law_firm_users(email);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_law_firm_users_status ON law_firm_users(status);`);
      console.log('✅ Indexes created for law_firm_users');
    } else {
      console.log('✓ law_firm_users table already exists');
    }
    
    // Check if medical_provider_users exists
    const medProviderUsersCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'medical_provider_users'
      );
    `);
    
    if (!medProviderUsersCheck.rows[0].exists) {
      console.log('📦 Creating medical_provider_users table...');
      await client.query(`
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
      console.log('✅ medical_provider_users table created');
      
      // Create indexes
      await client.query(`CREATE INDEX IF NOT EXISTS idx_medical_provider_users_provider_id ON medical_provider_users(medical_provider_id);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_medical_provider_users_email ON medical_provider_users(email);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_medical_provider_users_status ON medical_provider_users(status);`);
      console.log('✅ Indexes created for medical_provider_users');
    } else {
      console.log('✓ medical_provider_users table already exists');
    }
    
    console.log('\n✨ Database check complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createMissingTables().catch(console.error);
