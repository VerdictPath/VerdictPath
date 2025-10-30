-- Phase 2: Smart Notifications & Action Dashboard
-- Database Schema Migration
-- October 30, 2025

-- =====================================================
-- 1. USER DEVICES TABLE (Expo Push Tokens)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_devices (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  law_firm_id INTEGER REFERENCES law_firms(id) ON DELETE CASCADE,
  medical_provider_id INTEGER REFERENCES medical_providers(id) ON DELETE CASCADE,
  device_type VARCHAR(20) NOT NULL CHECK (device_type IN ('user', 'law_firm', 'medical_provider')),
  expo_push_token VARCHAR(255) NOT NULL UNIQUE,
  device_name VARCHAR(255),
  platform VARCHAR(20) CHECK (platform IN ('ios', 'android', 'web')),
  app_version VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CHECK (
    (device_type = 'user' AND user_id IS NOT NULL AND law_firm_id IS NULL AND medical_provider_id IS NULL) OR
    (device_type = 'law_firm' AND law_firm_id IS NOT NULL AND user_id IS NULL AND medical_provider_id IS NULL) OR
    (device_type = 'medical_provider' AND medical_provider_id IS NOT NULL AND user_id IS NULL AND law_firm_id IS NULL)
  )
);

CREATE INDEX idx_user_devices_user ON user_devices(user_id);
CREATE INDEX idx_user_devices_law_firm ON user_devices(law_firm_id);
CREATE INDEX idx_user_devices_medical_provider ON user_devices(medical_provider_id);
CREATE INDEX idx_user_devices_token ON user_devices(expo_push_token);
CREATE INDEX idx_user_devices_active ON user_devices(is_active);

-- =====================================================
-- 2. NOTIFICATIONS TABLE (Notification History)
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  
  -- Sender information
  sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('system', 'law_firm', 'medical_provider')),
  sender_id INTEGER, -- ID of law firm or medical provider (NULL for system)
  sender_name VARCHAR(255), -- Cached name for display
  
  -- Recipient information
  recipient_type VARCHAR(20) NOT NULL CHECK (recipient_type IN ('user', 'law_firm', 'medical_provider')),
  recipient_id INTEGER NOT NULL,
  
  -- Notification content
  type VARCHAR(50) NOT NULL, -- task_assigned, document_request, stage_update, daily_streak, etc.
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  
  -- Actions and navigation
  action_url VARCHAR(500), -- Deep link URL (e.g., verdictpath://task/123)
  action_data JSONB, -- Additional structured data
  
  -- Delivery tracking
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'read')),
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,
  failed_reason TEXT,
  
  -- Metadata
  expo_receipt_id VARCHAR(255), -- Expo push notification receipt
  scheduled_for TIMESTAMP, -- For scheduled notifications
  expires_at TIMESTAMP, -- Optional expiration
  
  -- Analytics
  clicked BOOLEAN DEFAULT false,
  clicked_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_type, recipient_id);
CREATE INDEX idx_notifications_sender ON notifications(sender_type, sender_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_priority ON notifications(priority);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_notifications_read ON notifications(read_at);
CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_for) WHERE scheduled_for IS NOT NULL;

-- =====================================================
-- 3. NOTIFICATION TEMPLATES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_templates (
  id SERIAL PRIMARY KEY,
  
  -- Template owner
  owner_type VARCHAR(20) NOT NULL CHECK (owner_type IN ('system', 'law_firm', 'medical_provider')),
  owner_id INTEGER, -- NULL for system templates
  
  -- Template details
  template_name VARCHAR(255) NOT NULL,
  template_key VARCHAR(100) NOT NULL, -- Unique key for programmatic access
  description TEXT,
  
  -- Template content (supports variable substitution)
  title_template VARCHAR(255) NOT NULL,
  body_template TEXT NOT NULL,
  
  -- Configuration
  type VARCHAR(50) NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
  action_url_template VARCHAR(500),
  
  -- Activation
  is_active BOOLEAN DEFAULT true,
  trigger_conditions JSONB, -- Conditions when this template auto-triggers
  
  -- Usage tracking
  times_used INTEGER DEFAULT 0,
  last_used_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER, -- User who created the template
  
  UNIQUE(owner_type, owner_id, template_key)
);

CREATE INDEX idx_notification_templates_owner ON notification_templates(owner_type, owner_id);
CREATE INDEX idx_notification_templates_key ON notification_templates(template_key);
CREATE INDEX idx_notification_templates_active ON notification_templates(is_active);

-- =====================================================
-- 4. LAW FIRM TASKS TABLE (Attorney-Assigned Tasks)
-- =====================================================
CREATE TABLE IF NOT EXISTS law_firm_tasks (
  id SERIAL PRIMARY KEY,
  
  -- Relationships
  law_firm_id INTEGER NOT NULL REFERENCES law_firms(id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by_user_id INTEGER, -- Which attorney/staff created it
  
  -- Task details
  task_title VARCHAR(255) NOT NULL,
  task_description TEXT,
  task_type VARCHAR(50) NOT NULL, -- document_review, upload_required, meeting_scheduled, etc.
  
  -- Priority and status
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  
  -- Deadlines
  due_date TIMESTAMP,
  completed_at TIMESTAMP,
  
  -- Actions and rewards
  action_url VARCHAR(500), -- Deep link to where task is completed
  coins_reward INTEGER DEFAULT 0,
  
  -- Attachments and data
  attachments JSONB, -- Array of document references
  task_data JSONB, -- Additional structured data
  
  -- Completion tracking
  completed_by_user_id INTEGER REFERENCES users(id),
  completion_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_law_firm_tasks_law_firm ON law_firm_tasks(law_firm_id);
CREATE INDEX idx_law_firm_tasks_client ON law_firm_tasks(client_id);
CREATE INDEX idx_law_firm_tasks_status ON law_firm_tasks(status);
CREATE INDEX idx_law_firm_tasks_priority ON law_firm_tasks(priority);
CREATE INDEX idx_law_firm_tasks_due_date ON law_firm_tasks(due_date);
CREATE INDEX idx_law_firm_tasks_created ON law_firm_tasks(created_at DESC);

-- =====================================================
-- 5. TASK TEMPLATES TABLE (Reusable Task Templates)
-- =====================================================
CREATE TABLE IF NOT EXISTS task_templates (
  id SERIAL PRIMARY KEY,
  
  -- Template owner
  owner_type VARCHAR(20) NOT NULL CHECK (owner_type IN ('system', 'law_firm')),
  owner_id INTEGER, -- law_firm_id or NULL for system templates
  
  -- Template details
  template_name VARCHAR(255) NOT NULL,
  template_key VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Template content
  task_title_template VARCHAR(255) NOT NULL,
  task_description_template TEXT,
  task_type VARCHAR(50) NOT NULL,
  
  -- Default configuration
  default_priority VARCHAR(20) DEFAULT 'medium',
  default_coins_reward INTEGER DEFAULT 0,
  default_due_days INTEGER, -- Days from assignment to due date
  
  -- Trigger configuration (for auto-assignment)
  trigger_conditions JSONB,
  auto_assign BOOLEAN DEFAULT false,
  
  -- Usage tracking
  is_active BOOLEAN DEFAULT true,
  times_used INTEGER DEFAULT 0,
  last_used_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  
  UNIQUE(owner_type, owner_id, template_key)
);

CREATE INDEX idx_task_templates_owner ON task_templates(owner_type, owner_id);
CREATE INDEX idx_task_templates_key ON task_templates(template_key);
CREATE INDEX idx_task_templates_active ON task_templates(is_active);
CREATE INDEX idx_task_templates_auto_assign ON task_templates(auto_assign) WHERE auto_assign = true;

-- =====================================================
-- 6. TASK AUDIT TABLE (Task Completion Tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS task_audit (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES law_firm_tasks(id) ON DELETE CASCADE,
  
  -- Change tracking
  action VARCHAR(50) NOT NULL, -- created, assigned, started, completed, cancelled, updated
  previous_status VARCHAR(20),
  new_status VARCHAR(20),
  
  -- Actor
  performed_by_type VARCHAR(20), -- user, law_firm, system
  performed_by_id INTEGER,
  performed_by_name VARCHAR(255),
  
  -- Details
  notes TEXT,
  metadata JSONB,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_task_audit_task ON task_audit(task_id);
CREATE INDEX idx_task_audit_action ON task_audit(action);
CREATE INDEX idx_task_audit_created ON task_audit(created_at DESC);

-- =====================================================
-- 7. MEDICAL PROVIDER TASKS TABLE (Provider-Assigned Tasks to Patients)
-- =====================================================
CREATE TABLE IF NOT EXISTS medical_provider_tasks (
  id SERIAL PRIMARY KEY,
  
  -- Relationships
  medical_provider_id INTEGER NOT NULL REFERENCES medical_providers(id) ON DELETE CASCADE,
  patient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by_user_id INTEGER, -- Which provider staff created it
  
  -- Task details
  task_title VARCHAR(255) NOT NULL,
  task_description TEXT,
  task_type VARCHAR(50) NOT NULL, -- authorization_needed, appointment_scheduled, test_results, etc.
  
  -- Priority and status
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  
  -- Deadlines
  due_date TIMESTAMP,
  completed_at TIMESTAMP,
  
  -- Actions
  action_url VARCHAR(500),
  
  -- Attachments and data
  attachments JSONB,
  task_data JSONB,
  
  -- Completion tracking
  completed_by_user_id INTEGER REFERENCES users(id),
  completion_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_medical_provider_tasks_provider ON medical_provider_tasks(medical_provider_id);
CREATE INDEX idx_medical_provider_tasks_patient ON medical_provider_tasks(patient_id);
CREATE INDEX idx_medical_provider_tasks_status ON medical_provider_tasks(status);
CREATE INDEX idx_medical_provider_tasks_due_date ON medical_provider_tasks(due_date);

-- =====================================================
-- 8. NOTIFICATION PREFERENCES TABLE (User Preferences)
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  law_firm_id INTEGER UNIQUE REFERENCES law_firms(id) ON DELETE CASCADE,
  medical_provider_id INTEGER UNIQUE REFERENCES medical_providers(id) ON DELETE CASCADE,
  
  -- Global settings
  push_notifications_enabled BOOLEAN DEFAULT true,
  email_notifications_enabled BOOLEAN DEFAULT true,
  
  -- Quiet hours
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME DEFAULT '22:00:00',
  quiet_hours_end TIME DEFAULT '08:00:00',
  timezone VARCHAR(50) DEFAULT 'America/New_York',
  
  -- Notification type preferences
  urgent_notifications BOOLEAN DEFAULT true,
  task_notifications BOOLEAN DEFAULT true,
  system_notifications BOOLEAN DEFAULT true,
  marketing_notifications BOOLEAN DEFAULT false,
  
  -- Frequency limits
  max_daily_notifications INTEGER DEFAULT 20,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CHECK (
    (user_id IS NOT NULL AND law_firm_id IS NULL AND medical_provider_id IS NULL) OR
    (law_firm_id IS NOT NULL AND user_id IS NULL AND medical_provider_id IS NULL) OR
    (medical_provider_id IS NOT NULL AND user_id IS NULL AND law_firm_id IS NULL)
  )
);

-- =====================================================
-- ADD JUNCTION TABLE FOR MEDICAL PROVIDER-PATIENT RELATIONSHIPS
-- (if not already exists from previous migration)
-- =====================================================
CREATE TABLE IF NOT EXISTS medical_provider_patients (
  id SERIAL PRIMARY KEY,
  medical_provider_id INTEGER NOT NULL REFERENCES medical_providers(id) ON DELETE CASCADE,
  patient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(medical_provider_id, patient_id)
);

CREATE INDEX IF NOT EXISTS idx_medical_provider_patients_provider ON medical_provider_patients(medical_provider_id);
CREATE INDEX IF NOT EXISTS idx_medical_provider_patients_patient ON medical_provider_patients(patient_id);

-- =====================================================
-- ADD NEW PERMISSIONS FOR NOTIFICATIONS & TASKS
-- =====================================================
INSERT INTO permissions (name, category, description, is_sensitive) VALUES
  -- Notification Permissions
  ('SEND_NOTIFICATIONS', 'NOTIFICATIONS', 'Send notifications to clients/patients', false),
  ('VIEW_NOTIFICATION_HISTORY', 'NOTIFICATIONS', 'View notification history', false),
  ('MANAGE_NOTIFICATION_TEMPLATES', 'NOTIFICATIONS', 'Create and manage notification templates', false),
  ('VIEW_NOTIFICATION_ANALYTICS', 'NOTIFICATIONS', 'View notification analytics and metrics', false),
  
  -- Task Management Permissions
  ('CREATE_TASKS', 'TASKS', 'Create tasks for clients/patients', false),
  ('ASSIGN_TASKS', 'TASKS', 'Assign tasks to clients/patients', false),
  ('VIEW_TASKS', 'TASKS', 'View tasks', false),
  ('COMPLETE_TASKS', 'TASKS', 'Mark tasks as complete', false),
  ('MANAGE_TASK_TEMPLATES', 'TASKS', 'Create and manage task templates', false),
  ('VIEW_TASK_ANALYTICS', 'TASKS', 'View task completion analytics', false)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- ASSIGN NEW PERMISSIONS TO ROLES
-- =====================================================

-- LAW_FIRM_ADMIN gets all notification and task permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'LAW_FIRM_ADMIN' AND p.name IN (
  'SEND_NOTIFICATIONS',
  'VIEW_NOTIFICATION_HISTORY',
  'MANAGE_NOTIFICATION_TEMPLATES',
  'VIEW_NOTIFICATION_ANALYTICS',
  'CREATE_TASKS',
  'ASSIGN_TASKS',
  'VIEW_TASKS',
  'MANAGE_TASK_TEMPLATES',
  'VIEW_TASK_ANALYTICS'
)
ON CONFLICT DO NOTHING;

-- LAW_FIRM_STAFF gets limited notification and task permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'LAW_FIRM_STAFF' AND p.name IN (
  'VIEW_NOTIFICATION_HISTORY',
  'VIEW_TASKS'
)
ON CONFLICT DO NOTHING;

-- MEDICAL_PROVIDER_ADMIN gets notification and task permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'MEDICAL_PROVIDER_ADMIN' AND p.name IN (
  'SEND_NOTIFICATIONS',
  'VIEW_NOTIFICATION_HISTORY',
  'MANAGE_NOTIFICATION_TEMPLATES',
  'VIEW_NOTIFICATION_ANALYTICS',
  'CREATE_TASKS',
  'ASSIGN_TASKS',
  'VIEW_TASKS'
)
ON CONFLICT DO NOTHING;

-- MEDICAL_PROVIDER_STAFF gets limited permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'MEDICAL_PROVIDER_STAFF' AND p.name IN (
  'VIEW_NOTIFICATION_HISTORY',
  'VIEW_TASKS'
)
ON CONFLICT DO NOTHING;

-- CLIENT gets task viewing and completion permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'CLIENT' AND p.name IN (
  'VIEW_TASKS',
  'COMPLETE_TASKS'
)
ON CONFLICT DO NOTHING;

-- =====================================================
-- SEED SYSTEM NOTIFICATION TEMPLATES
-- =====================================================
INSERT INTO notification_templates (owner_type, owner_id, template_name, template_key, description, title_template, body_template, type, priority) VALUES
  -- Daily Streak Templates
  ('system', NULL, 'Daily Streak Reminder', 'daily_streak_reminder', 'Remind user to claim daily streak bonus', 
   '⚓ Day {{streak}} Streak! Don''t break the chain!', 
   'Log in now to claim your {{coins}} bonus coins and keep your streak alive!', 
   'daily_streak', 'low'),
  
  -- Milestone Proximity Templates
  ('system', NULL, 'Milestone Proximity', 'milestone_proximity', 'User is close to completing a milestone',
   '🗺️ Almost there! You''re {{steps}} step(s) away from completing {{milestone}}',
   'Finish now to earn {{coins}} coins and move forward in your case!',
   'milestone_proximity', 'medium'),
  
  -- Stage Completion Templates
  ('system', NULL, 'Stage Completion Celebration', 'stage_completion', 'Celebrate user completing a litigation stage',
   '🎉 Congratulations! You''ve completed {{stage}}!',
   '{{coins}} bonus coins awarded. Tap to see what''s next on your journey!',
   'stage_completion', 'low'),
  
  -- Inactive User Re-engagement
  ('system', NULL, 'Inactive User Re-engagement', 'inactive_user', 'Re-engage users who haven''t logged in recently',
   'We miss you! Your case is still active.',
   'Your attorney added an update {{days}} days ago. Tap to view and stay informed about your case.',
   'inactive_user', 'medium'),
  
  -- Connection Notifications
  ('system', NULL, 'Law Firm Connected', 'law_firm_connected', 'Law firm successfully connected to user',
   '🤝 {{firm_name}} is now connected to your case',
   'They can now track your progress and send updates. Your legal journey just got easier!',
   'connection', 'medium'),
  
  ('system', NULL, 'Medical Provider Connected', 'medical_provider_connected', 'Medical provider connected to user',
   '⚕️ {{provider_name}} has joined your care team',
   'They can now securely share your medical records with your attorney.',
   'connection', 'medium')
ON CONFLICT (owner_type, owner_id, template_key) DO NOTHING;

-- =====================================================
-- SEED SYSTEM TASK TEMPLATES
-- =====================================================
INSERT INTO task_templates (owner_type, owner_id, template_name, template_key, description, task_title_template, task_description_template, task_type, default_priority, default_coins_reward, default_due_days) VALUES
  ('system', NULL, 'Complete Profile', 'complete_profile', 'Prompt user to complete their profile',
   'Complete Your Profile',
   'Help us serve you better by completing your profile information. This will only take a few minutes.',
   'profile_completion', 'low', 100, 7),
  
  ('system', NULL, 'Upload Insurance Card', 'upload_insurance', 'Prompt user to upload insurance card',
   'Upload Insurance Card',
   'Please upload a photo or scan of your insurance card. This helps us process your case more efficiently.',
   'document_upload', 'medium', 150, 14)
ON CONFLICT (owner_type, owner_id, template_key) DO NOTHING;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
SELECT 'User Devices Table Created' as info;
SELECT 'Notifications Table Created' as info;
SELECT 'Notification Templates Table Created' as info;
SELECT 'Law Firm Tasks Table Created' as info;
SELECT 'Task Templates Table Created' as info;
SELECT 'Task Audit Table Created' as info;
SELECT 'Medical Provider Tasks Table Created' as info;
SELECT 'Notification Preferences Table Created' as info;
SELECT 'New Permissions Added' as info;
SELECT 'Permissions Assigned to Roles' as info;
SELECT 'System Templates Seeded' as info;
