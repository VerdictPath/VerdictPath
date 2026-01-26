const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const IV_LENGTH = 16;

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32).padEnd(32, '0'));
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
  try {
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32).padEnd(32, '0'));
    const encryptedText = parts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    return null;
  }
}

router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await db.query(`
      SELECT 
        id,
        bank_name_encrypted,
        account_holder_encrypted,
        routing_number_encrypted,
        account_number_last4,
        account_type,
        is_verified,
        created_at,
        updated_at
      FROM user_bank_info
      WHERE user_id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return res.json({ bankInfo: null });
    }

    const row = result.rows[0];
    const bankName = decrypt(row.bank_name_encrypted);
    const accountHolder = decrypt(row.account_holder_encrypted);
    const routingNumber = decrypt(row.routing_number_encrypted);

    res.json({
      bankInfo: {
        id: row.id,
        bankName: bankName,
        accountHolder: accountHolder,
        routingNumberRedacted: routingNumber ? `****${routingNumber.slice(-4)}` : null,
        accountNumberRedacted: `****${row.account_number_last4}`,
        accountType: row.account_type,
        isVerified: row.is_verified,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bank information' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { bankName, accountHolder, routingNumber, accountNumber, accountType = 'checking' } = req.body;

    if (!bankName || !accountHolder || !routingNumber || !accountNumber) {
      return res.status(400).json({ error: 'All bank information fields are required' });
    }

    if (!/^\d{9}$/.test(routingNumber)) {
      return res.status(400).json({ error: 'Routing number must be 9 digits' });
    }

    if (!/^\d{4,17}$/.test(accountNumber)) {
      return res.status(400).json({ error: 'Account number must be between 4 and 17 digits' });
    }

    const bankNameEncrypted = encrypt(bankName);
    const accountHolderEncrypted = encrypt(accountHolder);
    const routingNumberEncrypted = encrypt(routingNumber);
    const accountNumberEncrypted = encrypt(accountNumber);
    const accountNumberLast4 = accountNumber.slice(-4);

    const result = await db.query(`
      INSERT INTO user_bank_info (
        user_id, 
        bank_name_encrypted, 
        account_holder_encrypted, 
        routing_number_encrypted, 
        account_number_encrypted,
        account_number_last4,
        account_type
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id) 
      DO UPDATE SET
        bank_name_encrypted = EXCLUDED.bank_name_encrypted,
        account_holder_encrypted = EXCLUDED.account_holder_encrypted,
        routing_number_encrypted = EXCLUDED.routing_number_encrypted,
        account_number_encrypted = EXCLUDED.account_number_encrypted,
        account_number_last4 = EXCLUDED.account_number_last4,
        account_type = EXCLUDED.account_type,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, account_number_last4, account_type, is_verified, created_at, updated_at
    `, [userId, bankNameEncrypted, accountHolderEncrypted, routingNumberEncrypted, accountNumberEncrypted, accountNumberLast4, accountType]);

    const row = result.rows[0];

    res.json({
      success: true,
      message: 'Bank information saved securely',
      bankInfo: {
        id: row.id,
        bankName: bankName,
        accountHolder: accountHolder,
        routingNumberRedacted: `****${routingNumber.slice(-4)}`,
        accountNumberRedacted: `****${row.account_number_last4}`,
        accountType: row.account_type,
        isVerified: row.is_verified,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save bank information' });
  }
});

router.delete('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    await db.query('DELETE FROM user_bank_info WHERE user_id = $1', [userId]);

    res.json({ success: true, message: 'Bank information deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete bank information' });
  }
});

module.exports = router;
