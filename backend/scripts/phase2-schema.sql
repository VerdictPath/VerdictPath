-- Phase 2: RBAC & Patient Consent Management
-- Database Schema Migration

-- =====================================================
-- 1. ROLES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  is_system_role BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 2. PERMISSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  category VARCHAR(50) NOT NULL, -- PHI_ACCESS, MEDICAL_RECORDS, BILLING, etc.
  description TEXT,
  is_sensitive BOOLEAN DEFAULT false, -- Requires extra logging
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 3. ROLE-PERMISSIONS JUNCTION TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS role_permissions (
  id SERIAL PRIMARY KEY,
  role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  granted_by INTEGER REFERENCES users(id),
  UNIQUE(role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);

-- =====================================================
-- 4. USER-ROLES JUNCTION TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_roles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assigned_by INTEGER REFERENCES users(id),
  expires_at TIMESTAMP, -- Optional role expiration
  UNIQUE(user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);

-- =====================================================
-- 5. CONSENT RECORDS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS consent_records (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  granted_to_type VARCHAR(20) NOT NULL, -- 'lawfirm' or 'medical_provider'
  granted_to_id INTEGER NOT NULL, -- ID of law firm or medical provider
  consent_type VARCHAR(50) NOT NULL, -- FULL_ACCESS, MEDICAL_RECORDS_ONLY, etc.
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, expired, revoked, pending
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP, -- NULL = no expiration
  revoked_at TIMESTAMP,
  revoked_reason TEXT,
  consent_method VARCHAR(50), -- electronic, written, verbal
  ip_address VARCHAR(45), -- IP when consent was granted
  signature_data TEXT, -- Electronic signature or confirmation
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_patient_consent ON consent_records(patient_id, granted_to_type, granted_to_id);
CREATE INDEX IF NOT EXISTS idx_consent_status ON consent_records(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_consent_granted_to ON consent_records(granted_to_type, granted_to_id);

-- =====================================================
-- 6. CONSENT SCOPE TABLE (for CUSTOM consent types)
-- =====================================================
CREATE TABLE IF NOT EXISTS consent_scope (
  id SERIAL PRIMARY KEY,
  consent_id INTEGER REFERENCES consent_records(id) ON DELETE CASCADE,
  data_type VARCHAR(50) NOT NULL, -- medical_records, billing, evidence, etc.
  can_view BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(consent_id, data_type)
);

CREATE INDEX IF NOT EXISTS idx_consent_scope_consent ON consent_scope(consent_id);

-- =====================================================
-- SEED DEFAULT ROLES
-- =====================================================
INSERT INTO roles (name, description, is_system_role) VALUES
  ('CLIENT', 'Individual patient/client with access to own PHI', true),
  ('LAW_FIRM_ADMIN', 'Law firm administrator with full client management access', true),
  ('LAW_FIRM_STAFF', 'Law firm staff member with read-only client access', true),
  ('MEDICAL_PROVIDER_ADMIN', 'Medical provider administrator with full patient access', true),
  ('MEDICAL_PROVIDER_STAFF', 'Medical provider staff with limited patient access', true),
  ('SYSTEM_ADMIN', 'System administrator with full platform access', true)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- SEED DEFAULT PERMISSIONS
-- =====================================================
INSERT INTO permissions (name, category, description, is_sensitive) VALUES
  -- PHI Access Permissions
  ('VIEW_OWN_PHI', 'PHI_ACCESS', 'View own protected health information', false),
  ('EDIT_OWN_PHI', 'PHI_ACCESS', 'Edit own protected health information', false),
  ('VIEW_CLIENT_PHI', 'PHI_ACCESS', 'View client protected health information', true),
  ('EDIT_CLIENT_PHI', 'PHI_ACCESS', 'Edit client protected health information', true),
  ('VIEW_PATIENT_PHI', 'PHI_ACCESS', 'View patient protected health information', true),
  ('EDIT_PATIENT_PHI', 'PHI_ACCESS', 'Edit patient protected health information', true),
  
  -- Medical Records Permissions
  ('VIEW_MEDICAL_RECORDS', 'MEDICAL_RECORDS', 'View medical records', true),
  ('EDIT_MEDICAL_RECORDS', 'MEDICAL_RECORDS', 'Edit medical records', true),
  ('UPLOAD_MEDICAL_RECORDS', 'MEDICAL_RECORDS', 'Upload new medical records', true),
  ('DELETE_MEDICAL_RECORDS', 'MEDICAL_RECORDS', 'Delete medical records', true),
  
  -- Billing Permissions
  ('VIEW_BILLING', 'BILLING', 'View billing information', true),
  ('EDIT_BILLING', 'BILLING', 'Edit billing information', true),
  ('UPLOAD_BILLING', 'BILLING', 'Upload billing documents', true),
  
  -- Litigation Permissions
  ('VIEW_LITIGATION', 'LITIGATION', 'View litigation stages and case information', false),
  ('EDIT_LITIGATION', 'LITIGATION', 'Edit litigation information', false),
  ('MANAGE_LITIGATION', 'LITIGATION', 'Full litigation case management', false),
  
  -- Consent Management
  ('MANAGE_CONSENT', 'CONSENT', 'Grant or revoke consent for PHI sharing', true),
  ('OVERRIDE_CONSENT', 'CONSENT', 'Override consent in emergency situations', true),
  
  -- Audit & Administration
  ('VIEW_AUDIT_LOGS', 'AUDIT', 'View own audit trail', false),
  ('VIEW_ALL_AUDIT_LOGS', 'AUDIT', 'View all system audit logs', true),
  ('MANAGE_FIRM_USERS', 'ADMINISTRATION', 'Manage law firm users and roles', false),
  ('MANAGE_PROVIDER_USERS', 'ADMINISTRATION', 'Manage medical provider users and roles', false),
  ('MANAGE_SYSTEM_USERS', 'ADMINISTRATION', 'Manage all system users', true)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- ASSIGN PERMISSIONS TO ROLES
-- =====================================================
-- CLIENT role permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'CLIENT' AND p.name IN (
  'VIEW_OWN_PHI',
  'EDIT_OWN_PHI',
  'MANAGE_CONSENT',
  'VIEW_AUDIT_LOGS'
)
ON CONFLICT DO NOTHING;

-- LAW_FIRM_ADMIN role permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'LAW_FIRM_ADMIN' AND p.name IN (
  'VIEW_CLIENT_PHI',
  'EDIT_CLIENT_PHI',
  'VIEW_MEDICAL_RECORDS',
  'EDIT_MEDICAL_RECORDS',
  'VIEW_BILLING',
  'EDIT_BILLING',
  'VIEW_LITIGATION',
  'EDIT_LITIGATION',
  'MANAGE_LITIGATION',
  'VIEW_AUDIT_LOGS',
  'MANAGE_FIRM_USERS'
)
ON CONFLICT DO NOTHING;

-- LAW_FIRM_STAFF role permissions (read-only)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'LAW_FIRM_STAFF' AND p.name IN (
  'VIEW_CLIENT_PHI',
  'VIEW_MEDICAL_RECORDS',
  'VIEW_BILLING',
  'VIEW_LITIGATION'
)
ON CONFLICT DO NOTHING;

-- MEDICAL_PROVIDER_ADMIN role permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'MEDICAL_PROVIDER_ADMIN' AND p.name IN (
  'VIEW_PATIENT_PHI',
  'EDIT_PATIENT_PHI',
  'VIEW_MEDICAL_RECORDS',
  'UPLOAD_MEDICAL_RECORDS',
  'EDIT_MEDICAL_RECORDS',
  'VIEW_BILLING',
  'UPLOAD_BILLING',
  'EDIT_BILLING',
  'VIEW_AUDIT_LOGS',
  'MANAGE_PROVIDER_USERS'
)
ON CONFLICT DO NOTHING;

-- MEDICAL_PROVIDER_STAFF role permissions (limited)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'MEDICAL_PROVIDER_STAFF' AND p.name IN (
  'VIEW_PATIENT_PHI',
  'VIEW_MEDICAL_RECORDS',
  'UPLOAD_MEDICAL_RECORDS',
  'VIEW_BILLING'
)
ON CONFLICT DO NOTHING;

-- SYSTEM_ADMIN role permissions (all)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'SYSTEM_ADMIN'
ON CONFLICT DO NOTHING;

-- =====================================================
-- AUTO-ASSIGN ROLES TO EXISTING USERS
-- =====================================================
-- Assign CLIENT role to all existing client users
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.user_type = 'client' AND r.name = 'CLIENT'
ON CONFLICT DO NOTHING;

-- Assign LAW_FIRM_ADMIN role to all existing law firm users
INSERT INTO user_roles (user_id, role_id)
SELECT lf.id, r.id
FROM law_firms lf, roles r
WHERE r.name = 'LAW_FIRM_ADMIN'
ON CONFLICT DO NOTHING;

-- Assign MEDICAL_PROVIDER_ADMIN role to all existing medical provider users
INSERT INTO user_roles (user_id, role_id)
SELECT mp.id, r.id
FROM medical_providers mp, roles r
WHERE r.name = 'MEDICAL_PROVIDER_ADMIN'
ON CONFLICT DO NOTHING;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Check roles created
SELECT 'Roles Created:' as info, COUNT(*) as count FROM roles;

-- Check permissions created
SELECT 'Permissions Created:' as info, COUNT(*) as count FROM permissions;

-- Check role-permission assignments
SELECT 'Role-Permission Mappings:' as info, COUNT(*) as count FROM role_permissions;

-- Check user-role assignments
SELECT 'User-Role Assignments:' as info, COUNT(*) as count FROM user_roles;

-- Show role-permission summary
SELECT 
  r.name as role,
  COUNT(rp.permission_id) as permission_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
GROUP BY r.id, r.name
ORDER BY r.name;
