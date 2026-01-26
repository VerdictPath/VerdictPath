// backend/scripts/migrateLawFirms.js
// PostgreSQL Migration Script - Bootstrap admin users for existing law firms

const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { generateUniqueCode } = require('../utils/codeGenerator');
require('dotenv').config();

async function migrateLawFirms() {
  try {

    // Find all existing law firms
    const lawFirmsResult = await db.query(`
      SELECT id, firm_name, email, password, firm_code, subscription_tier
      FROM law_firms
      ORDER BY created_at ASC
    `);

    const lawFirms = lawFirmsResult.rows;

    let migrated = 0;
    let skipped = 0;

    for (const firm of lawFirms) {

      // Check if admin user already exists
      const existingAdminResult = await db.query(
        `SELECT id FROM law_firm_users 
         WHERE law_firm_id = $1 AND role = 'admin' AND status = 'active'
         LIMIT 1`,
        [firm.id]
      );

      if (existingAdminResult.rows.length > 0) {
        skipped++;
        continue;
      }

      // Generate unique user code
      let userCode = '';
      let isUnique = false;
      while (!isUnique) {
        const randomCode = generateUniqueCode(4);
        userCode = `${firm.firm_code}-USER-${randomCode}`;
        const codeCheck = await db.query(
          'SELECT id FROM law_firm_users WHERE user_code = $1',
          [userCode]
        );
        isUnique = codeCheck.rows.length === 0;
      }

      // Split firm name for first/last name (simple approach)
      const nameParts = firm.firm_name.split(' ');
      const firstName = nameParts[0] || 'Admin';
      const lastName = nameParts.slice(1).join(' ') || 'User';

      // Create admin user
      const adminUserResult = await db.query(
        `INSERT INTO law_firm_users (
          law_firm_id, first_name, last_name, email, password, user_code, role,
          can_manage_users, can_manage_clients, can_view_all_clients, 
          can_send_notifications, can_manage_disbursements, can_view_analytics, 
          can_manage_settings, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
        RETURNING id, user_code`,
        [
          firm.id,
          firstName,
          lastName,
          firm.email,
          firm.password, // Already hashed from law_firms table
          userCode,
          'admin',
          true, // can_manage_users
          true, // can_manage_clients
          true, // can_view_all_clients
          true, // can_send_notifications
          true, // can_manage_disbursements
          true, // can_view_analytics
          true, // can_manage_settings
          'active'
        ]
      );

      const adminUser = adminUserResult.rows[0];

      // Update law firm settings
      const maxUsers = getMaxUsersByTier(firm.subscription_tier);
      await db.query(
        `UPDATE law_firms 
         SET max_users = $1, enable_activity_tracking = true
         WHERE id = $2`,
        [maxUsers, firm.id]
      );

      migrated++;
    }


    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
}

function getMaxUsersByTier(tier) {
  const limits = {
    free: 1,
    basic: 5,
    premium: 25,
    enterprise: 100,
  };
  return limits[tier?.toLowerCase()] || 5;
}

// Run migration

migrateLawFirms();
