-- Professional Notification Templates for Law Firms and Medical Providers
-- Created: October 30, 2025
-- Purpose: Seed 16 professional notification templates (10 law firm + 6 medical provider)

-- =====================================================
-- LAW FIRM NOTIFICATION TEMPLATES (10 templates)
-- =====================================================

INSERT INTO notification_templates (owner_type, owner_id, template_name, template_key, description, title_template, body_template, type, priority, action_url_template) VALUES

-- 1. Court Reminder
('system', NULL, 'Court Date Reminder', 'court_reminder', 'Remind client of upcoming court appearance',
 '⚖️ Court Reminder: {{court_type}} on {{date}}',
 'You have a {{court_type}} scheduled for {{date}} at {{time}}. Please arrive 30 minutes early. Contact us if you have questions.',
 'court_reminder', 'urgent', 'verdictpath://roadmap'),

-- 2. Deposition Notice
('system', NULL, 'Deposition Notice', 'deposition_notice', 'Notify client of scheduled deposition',
 '📝 Deposition Scheduled',
 'Your deposition is scheduled for {{date}} at {{time}} at {{location}}. Please review the preparation materials we sent you.',
 'deposition_notice', 'urgent', 'verdictpath://dashboard'),

-- 3. Document Request
('system', NULL, 'Document Request', 'document_request', 'Request documents from client',
 '📄 Document Request: {{document_type}}',
 'We need your {{document_type}} by {{due_date}} to proceed with your case. Please upload through the app or contact our office.',
 'document_request', 'high', 'verdictpath://medical'),

-- 4. Settlement Update
('system', NULL, 'Settlement Update', 'settlement_update', 'Notify client of settlement developments',
 '💰 Settlement Update',
 '{{message}}. We recommend {{recommendation}}. Please call us to discuss next steps.',
 'settlement_update', 'high', 'verdictpath://dashboard'),

-- 5. Case Milestone
('system', NULL, 'Case Milestone Reached', 'case_milestone', 'Celebrate case progress milestone',
 '🎯 Great News! {{milestone}} Completed',
 'We''ve successfully completed {{milestone}} in your case. This brings us closer to {{next_step}}.',
 'case_milestone', 'medium', 'verdictpath://roadmap'),

-- 6. Deadline Reminder
('system', NULL, 'Important Deadline', 'deadline_reminder', 'Remind client of approaching deadline',
 '⏰ Deadline Approaching: {{item}}',
 'Reminder: {{item}} is due by {{due_date}}. Please complete this {{days_remaining}} to avoid delays.',
 'deadline_reminder', 'high', 'verdictpath://actions'),

-- 7. Appointment Confirmation
('system', NULL, 'Appointment Confirmation', 'appointment_confirmation', 'Confirm scheduled appointment',
 '📅 Appointment Confirmed',
 'Your appointment with {{attorney_name}} is confirmed for {{date}} at {{time}}. See you then!',
 'appointment_confirmation', 'medium', 'verdictpath://dashboard'),

-- 8. Task Reminder
('system', NULL, 'Task Reminder', 'task_reminder', 'Remind client of pending task',
 '✅ Task Reminder: {{task_name}}',
 'You have a pending task "{{task_name}}" due {{due_date}}. Complete it now to earn {{coins}} coins!',
 'task_reminder', 'medium', 'verdictpath://actions'),

-- 9. Status Update
('system', NULL, 'Case Status Update', 'status_update', 'General case status update',
 '📊 Case Status Update',
 '{{message}}. Your case is progressing well. {{next_action}}.',
 'status_update', 'medium', 'verdictpath://roadmap'),

-- 10. General Communication
('system', NULL, 'General Communication', 'general_communication', 'General message from law firm',
 '💼 Message from {{firm_name}}',
 '{{message}}',
 'general_communication', 'low', 'verdictpath://notifications')

ON CONFLICT (owner_type, owner_id, template_key) DO NOTHING;

-- =====================================================
-- MEDICAL PROVIDER NOTIFICATION TEMPLATES (6 templates)
-- =====================================================

INSERT INTO notification_templates (owner_type, owner_id, template_name, template_key, description, title_template, body_template, type, priority, action_url_template) VALUES

-- 1. Appointment Reminder
('system', NULL, 'Medical Appointment Reminder', 'appointment_reminder', 'Remind patient of upcoming appointment',
 '⚕️ Appointment Reminder',
 'You have an appointment with {{provider_name}} on {{date}} at {{time}}. Please arrive 15 minutes early.',
 'appointment_reminder', 'high', 'verdictpath://dashboard'),

-- 2. Test Results Available
('system', NULL, 'Test Results Available', 'test_results', 'Notify patient test results are ready',
 '🔬 Your Test Results Are Ready',
 'Your {{test_type}} results are now available. Please contact our office to discuss.',
 'test_results', 'high', 'verdictpath://medical'),

-- 3. Prescription Ready
('system', NULL, 'Prescription Ready', 'prescription_ready', 'Notify patient prescription is ready for pickup',
 '💊 Prescription Ready for Pickup',
 'Your prescription for {{medication}} is ready at {{pharmacy}}. Please pick up within {{days}} days.',
 'prescription_ready', 'medium', 'verdictpath://medical'),

-- 4. Billing Notice
('system', NULL, 'Billing Notice', 'billing_notice', 'Notify patient of billing matter',
 '💳 Billing Notice',
 '{{message}}. If you have questions, please contact our billing department.',
 'billing_notice', 'medium', 'verdictpath://dashboard'),

-- 5. Health Tip
('system', NULL, 'Health & Wellness Tip', 'health_tip', 'Share health and wellness tips',
 '🌟 Health Tip',
 '{{tip_content}}',
 'health_tip', 'low', 'verdictpath://medical'),

-- 6. General Update
('system', NULL, 'Medical Provider Update', 'general_update', 'General update from medical provider',
 '🏥 Update from {{provider_name}}',
 '{{message}}',
 'general_update', 'low', 'verdictpath://notifications')

ON CONFLICT (owner_type, owner_id, template_key) DO NOTHING;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Count templates
SELECT 
  owner_type,
  COUNT(*) as template_count
FROM notification_templates
GROUP BY owner_type
ORDER BY owner_type;

SELECT 'Professional notification templates seeded successfully!' as status;
