-- Migration: Enhance Medical Provider System with HIPAA Features
-- Adds features from MongoDB specifications to PostgreSQL implementation

-- 1. Add HIPAA training fields to medical_provider_users
ALTER TABLE medical_provider_users
ADD COLUMN IF NOT EXISTS hipaa_training_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS hipaa_training_expiry TIMESTAMP,
ADD COLUMN IF NOT EXISTS credentials VARCHAR(50),
ADD COLUMN IF NOT EXISTS can_access_phi BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS can_view_medical_records BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS can_edit_medical_records BOOLEAN DEFAULT false;

-- 2. Enhance activity logs with HIPAA compliance fields
ALTER TABLE medical_provider_activity_logs
ADD COLUMN IF NOT EXISTS sensitivity_level VARCHAR(20) DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS patient_id INTEGER,
ADD COLUMN IF NOT EXISTS patient_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS user_role VARCHAR(50),
ADD COLUMN IF NOT EXISTS hipaa_compliant BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS audit_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS location VARCHAR(255),
ADD COLUMN IF NOT EXISTS device_info TEXT;

-- 3. Add check constraint for sensitivity levels
ALTER TABLE medical_provider_activity_logs
DROP CONSTRAINT IF EXISTS valid_sensitivity_level;

ALTER TABLE medical_provider_activity_logs
ADD CONSTRAINT valid_sensitivity_level 
CHECK (sensitivity_level IN ('low', 'medium', 'high', 'critical'));

-- 4. Update existing admin users to have all permissions
UPDATE medical_provider_users
SET 
  can_access_phi = true,
  can_view_medical_records = true,
  can_edit_medical_records = true,
  hipaa_training_date = CURRENT_TIMESTAMP,
  hipaa_training_expiry = CURRENT_TIMESTAMP + INTERVAL '1 year'
WHERE role = 'admin';

-- 5. Create indexes for HIPAA compliance queries
CREATE INDEX IF NOT EXISTS idx_mp_activity_sensitivity ON medical_provider_activity_logs(sensitivity_level);
CREATE INDEX IF NOT EXISTS idx_mp_activity_patient ON medical_provider_activity_logs(patient_id);
CREATE INDEX IF NOT EXISTS idx_mp_activity_audit_required ON medical_provider_activity_logs(audit_required);
CREATE INDEX IF NOT EXISTS idx_mp_activity_hipaa ON medical_provider_activity_logs(hipaa_compliant);
CREATE INDEX IF NOT EXISTS idx_mp_users_hipaa_expiry ON medical_provider_users(hipaa_training_expiry);

-- 6. Add expanded action types to support medical records
COMMENT ON COLUMN medical_provider_activity_logs.action IS 'Supported actions: user_created, user_updated, user_deactivated, user_reactivated, user_login, user_logout, patient_viewed, patient_updated, patient_created, patient_record_accessed, patient_phi_viewed, medical_record_created, medical_record_updated, medical_record_viewed, medical_record_deleted, document_uploaded, document_downloaded, document_deleted, xray_viewed, lab_result_viewed, billing_record_accessed, notification_sent, settings_updated, unauthorized_access_attempt, hipaa_audit_log_viewed';

-- 7. Create function to check HIPAA training expiry
CREATE OR REPLACE FUNCTION check_hipaa_training_valid(user_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  expiry_date TIMESTAMP;
BEGIN
  SELECT hipaa_training_expiry INTO expiry_date
  FROM medical_provider_users
  WHERE id = user_id;
  
  IF expiry_date IS NULL THEN
    RETURN true; -- Allow if no expiry set (legacy users)
  END IF;
  
  RETURN expiry_date > CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE medical_provider_users IS 'Medical provider multi-user system with HIPAA compliance tracking';
COMMENT ON TABLE medical_provider_activity_logs IS 'HIPAA-compliant audit trail with sensitivity levels and patient tracking';
