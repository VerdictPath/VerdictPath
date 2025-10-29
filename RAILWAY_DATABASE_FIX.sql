-- Run this SQL on your Railway PostgreSQL database to add the missing column
-- This is required for the daily reward security fix to work in production

-- Add the last_daily_claim_at column to track when users last claimed daily rewards
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_daily_claim_at TIMESTAMP;

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'last_daily_claim_at';

-- Expected output: 
-- column_name           | data_type                   | is_nullable
-- last_daily_claim_at  | timestamp without time zone | YES
