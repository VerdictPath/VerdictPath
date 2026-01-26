require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('./config/db');

async function fixEvidenceTable() {
  try {
    
    await db.query(`
      ALTER TABLE evidence 
      ADD COLUMN IF NOT EXISTS title_encrypted TEXT,
      ADD COLUMN IF NOT EXISTS description_encrypted TEXT,
      ADD COLUMN IF NOT EXISTS location_encrypted TEXT,
      ADD COLUMN IF NOT EXISTS s3_bucket VARCHAR(255),
      ADD COLUMN IF NOT EXISTS s3_key TEXT,
      ADD COLUMN IF NOT EXISTS s3_region VARCHAR(50),
      ADD COLUMN IF NOT EXISTS s3_etag VARCHAR(255),
      ADD COLUMN IF NOT EXISTS storage_type VARCHAR(20) DEFAULT 'local'
    `);
    
    
    const result = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'evidence' 
      ORDER BY ordinal_position
    `);
    
    result.rows.forEach(col => console.log('  -', col.column_name));
    
    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
}

fixEvidenceTable();

