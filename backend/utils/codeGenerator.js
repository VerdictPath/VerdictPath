const db = require('../config/db');

/**
 * Generates a unique code for law firms or medical providers
 * Format: PREFIX-XXXXX (e.g., LAW-ABC12, MED-XYZ89)
 */
async function generateUniqueCode(type) {
  const prefix = type === 'lawfirm' ? 'LAW' : 'MED';
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const codeLength = 6;
  let code;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 10;

  while (!isUnique && attempts < maxAttempts) {
    let randomPart = '';
    for (let i = 0; i < codeLength; i++) {
      randomPart += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    code = `${prefix}-${randomPart}`;

    const table = type === 'lawfirm' ? 'law_firms' : 'medical_providers';
    const column = type === 'lawfirm' ? 'firm_code' : 'provider_code';
    
    const result = await db.query(
      `SELECT id FROM ${table} WHERE ${column} = $1`,
      [code]
    );

    if (result.rows.length === 0) {
      isUnique = true;
    }
    attempts++;
  }

  if (!isUnique) {
    throw new Error('Failed to generate unique code after maximum attempts');
  }

  return code;
}

module.exports = {
  generateUniqueCode
};
