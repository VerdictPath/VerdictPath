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
    
    // Ensure gamification tables exist
    const achievementsCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'achievements'
      );
    `);

    if (!achievementsCheck.rows[0].exists) {
      await db.query(`
        CREATE TABLE IF NOT EXISTS achievements (
          id SERIAL PRIMARY KEY,
          achievement_key VARCHAR(100) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          category VARCHAR(50),
          icon VARCHAR(50),
          color VARCHAR(20),
          rarity VARCHAR(20) DEFAULT 'common',
          coin_reward INTEGER DEFAULT 0,
          requirement_value INTEGER DEFAULT 1,
          badge_id INTEGER,
          is_hidden BOOLEAN DEFAULT false,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ achievements table created');
    }

    const userAchievementsCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'user_achievements'
      );
    `);

    if (!userAchievementsCheck.rows[0].exists) {
      await db.query(`
        CREATE TABLE IF NOT EXISTS user_achievements (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          achievement_id INTEGER NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
          progress_current INTEGER DEFAULT 0,
          progress_required INTEGER DEFAULT 1,
          is_completed BOOLEAN DEFAULT false,
          completed_at TIMESTAMP,
          coins_awarded INTEGER DEFAULT 0,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, achievement_id)
        );
      `);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);`);
      console.log('✅ user_achievements table created');
    }

    const badgesCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'badges'
      );
    `);

    if (!badgesCheck.rows[0].exists) {
      await db.query(`
        CREATE TABLE IF NOT EXISTS badges (
          id SERIAL PRIMARY KEY,
          badge_key VARCHAR(100) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          icon VARCHAR(50),
          image_url VARCHAR(500),
          rarity VARCHAR(20) DEFAULT 'common',
          is_special BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ badges table created');
    }

    const userBadgesCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'user_badges'
      );
    `);

    if (!userBadgesCheck.rows[0].exists) {
      await db.query(`
        CREATE TABLE IF NOT EXISTS user_badges (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          badge_id INTEGER NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
          unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          is_displayed BOOLEAN DEFAULT false,
          unlocked_via VARCHAR(255),
          UNIQUE(user_id, badge_id)
        );
      `);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);`);
      console.log('✅ user_badges table created');
    }

    const dailyChallengesCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'daily_challenges'
      );
    `);

    if (!dailyChallengesCheck.rows[0].exists) {
      await db.query(`
        CREATE TABLE IF NOT EXISTS daily_challenges (
          id SERIAL PRIMARY KEY,
          challenge_key VARCHAR(100) NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          challenge_type VARCHAR(50),
          challenge_target INTEGER DEFAULT 1,
          coin_reward INTEGER DEFAULT 0,
          difficulty VARCHAR(20) DEFAULT 'easy',
          active_date DATE,
          expires_at TIMESTAMP,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ daily_challenges table created');
    }

    const userDailyChallengesCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'user_daily_challenges'
      );
    `);

    if (!userDailyChallengesCheck.rows[0].exists) {
      await db.query(`
        CREATE TABLE IF NOT EXISTS user_daily_challenges (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          challenge_id INTEGER NOT NULL REFERENCES daily_challenges(id) ON DELETE CASCADE,
          progress_current INTEGER DEFAULT 0,
          progress_target INTEGER DEFAULT 1,
          is_completed BOOLEAN DEFAULT false,
          completed_at TIMESTAMP,
          coins_awarded INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, challenge_id)
        );
      `);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_user_daily_challenges_user_id ON user_daily_challenges(user_id);`);
      console.log('✅ user_daily_challenges table created');
    }

    console.log('✅ Database schema check complete');

  } catch (error) {
    console.error('⚠️ Database migration warning:', error.message);
  }
}

module.exports = { ensureTablesExist };
