-- Migration: Add Multi-User Support for Medical Providers
-- Similar to Law Firm multi-user system

-- 1. Add new columns to medical_providers table
ALTER TABLE medical_providers
ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS enable_activity_tracking BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS hipaa_compliance_mode BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS require_two_factor BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS data_retention_days INTEGER DEFAULT 2555,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 2. Create medical_provider_users table
CREATE TABLE IF NOT EXISTS medical_provider_users (
  id SERIAL PRIMARY KEY,
  medical_provider_id INTEGER NOT NULL REFERENCES medical_providers(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  user_code VARCHAR(50) NOT NULL UNIQUE,
  role VARCHAR(50) NOT NULL DEFAULT 'staff',
  
  -- Permissions
  can_manage_users BOOLEAN DEFAULT false,
  can_manage_patients BOOLEAN DEFAULT true,
  can_view_all_patients BOOLEAN DEFAULT true,
  can_send_notifications BOOLEAN DEFAULT true,
  can_manage_billing BOOLEAN DEFAULT false,
  can_view_analytics BOOLEAN DEFAULT true,
  can_manage_settings BOOLEAN DEFAULT false,
  
  -- Profile
  title VARCHAR(100),
  npi_number VARCHAR(100),
  license_number VARCHAR(100),
  specialty VARCHAR(255),
  phone_number VARCHAR(50),
  department VARCHAR(100),
  
  -- Status
  status VARCHAR(50) DEFAULT 'active',
  last_login TIMESTAMP,
  created_by INTEGER REFERENCES medical_provider_users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deactivated_at TIMESTAMP,
  deactivated_by INTEGER REFERENCES medical_provider_users(id),
  deactivation_reason TEXT,
  
  CONSTRAINT valid_role CHECK (role IN ('admin', 'physician', 'nurse', 'staff', 'billing')),
  CONSTRAINT valid_status CHECK (status IN ('active', 'deactivated', 'suspended'))
);

-- 3. Create activity logs table for medical providers
CREATE TABLE IF NOT EXISTS medical_provider_activity_logs (
  id SERIAL PRIMARY KEY,
  medical_provider_id INTEGER NOT NULL REFERENCES medical_providers(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES medical_provider_users(id) ON DELETE SET NULL,
  user_email VARCHAR(255),
  user_name VARCHAR(255),
  
  -- Action details
  action VARCHAR(100) NOT NULL,
  action_category VARCHAR(50) NOT NULL,
  
  -- Target information
  target_type VARCHAR(100),
  target_id INTEGER,
  target_name VARCHAR(255),
  
  -- Additional context
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address VARCHAR(45),
  user_agent TEXT,
  
  -- Status
  status VARCHAR(50) DEFAULT 'success',
  error_message TEXT,
  
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT valid_action_category CHECK (action_category IN (
    'user', 'patient', 'document', 'financial', 
    'communication', 'case', 'settings', 'security'
  )),
  CONSTRAINT valid_status CHECK (status IN ('success', 'failed', 'pending'))
);

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_mp_users_provider ON medical_provider_users(medical_provider_id);
CREATE INDEX IF NOT EXISTS idx_mp_users_email ON medical_provider_users(email);
CREATE INDEX IF NOT EXISTS idx_mp_users_code ON medical_provider_users(user_code);
CREATE INDEX IF NOT EXISTS idx_mp_users_status ON medical_provider_users(status);
CREATE INDEX IF NOT EXISTS idx_mp_users_role ON medical_provider_users(role);

CREATE INDEX IF NOT EXISTS idx_mp_activity_provider ON medical_provider_activity_logs(medical_provider_id);
CREATE INDEX IF NOT EXISTS idx_mp_activity_user ON medical_provider_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_mp_activity_action ON medical_provider_activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_mp_activity_category ON medical_provider_activity_logs(action_category);
CREATE INDEX IF NOT EXISTS idx_mp_activity_timestamp ON medical_provider_activity_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_mp_activity_status ON medical_provider_activity_logs(status);

-- 5. Create updated_at trigger for medical_providers
CREATE OR REPLACE FUNCTION update_medical_provider_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS medical_provider_updated_at ON medical_providers;
CREATE TRIGGER medical_provider_updated_at
  BEFORE UPDATE ON medical_providers
  FOR EACH ROW
  EXECUTE FUNCTION update_medical_provider_updated_at();

-- 6. Create updated_at trigger for medical_provider_users
DROP TRIGGER IF EXISTS medical_provider_users_updated_at ON medical_provider_users;
CREATE TRIGGER medical_provider_users_updated_at
  BEFORE UPDATE ON medical_provider_users
  FOR EACH ROW
  EXECUTE FUNCTION update_medical_provider_updated_at();

COMMENT ON TABLE medical_provider_users IS 'Multi-user support for medical providers with role-based permissions';
COMMENT ON TABLE medical_provider_activity_logs IS 'Audit trail for medical provider user actions (HIPAA compliance)';
