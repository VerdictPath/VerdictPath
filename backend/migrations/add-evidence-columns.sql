-- Add missing encrypted columns to evidence table
ALTER TABLE evidence 
ADD COLUMN IF NOT EXISTS title_encrypted TEXT,
ADD COLUMN IF NOT EXISTS description_encrypted TEXT,
ADD COLUMN IF NOT EXISTS location_encrypted TEXT,
ADD COLUMN IF NOT EXISTS s3_bucket VARCHAR(255),
ADD COLUMN IF NOT EXISTS s3_key TEXT,
ADD COLUMN IF NOT EXISTS s3_region VARCHAR(50),
ADD COLUMN IF NOT EXISTS s3_etag VARCHAR(255),
ADD COLUMN IF NOT EXISTS storage_type VARCHAR(20) DEFAULT 'local';
