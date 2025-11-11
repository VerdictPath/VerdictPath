-- ============================================================
-- COMPREHENSIVE BETA TEST ACCOUNTS SEEDING SCRIPT
-- ============================================================
-- Creates 3 fully-featured test accounts for beta testing:
-- 1. Individual User (beta_individual / password123)
-- 2. Law Firm (beta_lawfirm / password123)
-- 3. Medical Provider (beta_provider / password123)
-- ============================================================

BEGIN;

-- ============================================================
-- 1. CREATE MAIN LAW FIRM ACCOUNT (Premium Plan)
-- ============================================================

INSERT INTO law_firms (
  id, firm_name, firm_code, email, password, 
  bar_number, phone_number, street, city, state, zip_code,
  subscription_tier, plan_type, firm_size, 
  stripe_account_id, privacy_accepted_at, created_at
) VALUES (
  10001,
  'Beta Test Law Firm',
  'LAW-BETA01',
  'beta_lawfirm',
  '$2b$10$rN4qJZKqK7qH9yQxX5Z0aO5vC0xYjZ7VGZ8QW3Y5Z0aO5vC0xYjZ7V', -- password123
  'BAR123456',
  '(555) 100-2000',
  '123 Justice Street',
  'Los Angeles',
  'CA',
  '90001',
  'Premium',
  'premium',
  'medium',
  'acct_beta_lawfirm_12345', -- Disbursement account configured
  NOW(),
  NOW() - INTERVAL '90 days'
);

-- ============================================================
-- 2. CREATE MAIN MEDICAL PROVIDER ACCOUNT (Premium Plan)
-- ============================================================

INSERT INTO medical_providers (
  id, provider_name, provider_code, email, password,
  npi_number, specialty, phone_number, license_number,
  street, city, state, zip_code,
  subscription_tier, provider_size,
  stripe_account_id, privacy_accepted_at, created_at
) VALUES (
  20001,
  'Beta Medical Center',
  'MED-BETA01',
  'beta_provider',
  '$2b$10$rN4qJZKqK7qH9yQxX5Z0aO5vC0xYjZ7VGZ8QW3Y5Z0aO5vC0xYjZ7V', -- password123
  '1234567890',
  'Orthopedic Surgery',
  '(555) 200-3000',
  'MED-CA-123456',
  '456 Medical Plaza',
  'Los Angeles',
  'CA',
  '90002',
  'Premium',
  'large',
  'acct_beta_provider_67890', -- Disbursement account configured
  NOW(),
  NOW() - INTERVAL '120 days'
);

-- ============================================================
-- 3. CREATE 42 CLIENT ACCOUNTS FOR LAW FIRM
-- ============================================================
-- These will have varying levels of litigation progress (10%-90%)

INSERT INTO users (
  id, first_name, last_name, email, password, user_type,
  law_firm_code, connected_law_firm_id, subscription_tier,
  total_coins, login_streak, last_login_date, created_at,
  privacy_accepted_at
)
SELECT 
  30000 + n as id,
  'Client' as first_name,
  'Num' || n as last_name,
  'client' || n || '@beta.test' as email,
  '$2b$10$rN4qJZKqK7qH9yQxX5Z0aO5vC0xYjZ7VGZ8QW3Y5Z0aO5vC0xYjZ7V' as password,
  'client' as user_type,
  'LAW-BETA01' as law_firm_code,
  10001 as connected_law_firm_id,
  CASE 
    WHEN n % 3 = 0 THEN 'Basic'
    WHEN n % 5 = 0 THEN 'Premium'
    ELSE 'Free'
  END as subscription_tier,
  (50 + (n * 17)) as total_coins,
  (n % 7) + 1 as login_streak,
  CURRENT_DATE - ((n % 10) || ' days')::INTERVAL as last_login_date,
  NOW() - ((n * 2) || ' days')::INTERVAL as created_at,
  NOW() - ((n * 2) || ' days')::INTERVAL as privacy_accepted_at
FROM generate_series(1, 42) as n;

-- Link clients to law firm
INSERT INTO law_firm_clients (law_firm_id, client_id)
SELECT 
  10001,
  30000 + n
FROM generate_series(1, 42) as n;

-- ============================================================
-- 4. CREATE 23 PATIENT ACCOUNTS (for Medical Provider)
-- ============================================================
-- All connected to the same law firm

INSERT INTO users (
  id, first_name, last_name, email, password, user_type,
  law_firm_code, connected_law_firm_id, subscription_tier,
  total_coins, login_streak, last_login_date, created_at,
  privacy_accepted_at
)
SELECT 
  40000 + n as id,
  'Patient' as first_name,
  'P' || n as last_name,
  'patient' || n || '@beta.test' as email,
  '$2b$10$rN4qJZKqK7qH9yQxX5Z0aO5vC0xYjZ7VGZ8QW3Y5Z0aO5vC0xYjZ7V' as password,
  'client' as user_type,
  'LAW-BETA01' as law_firm_code,
  10001 as connected_law_firm_id,
  'Free' as subscription_tier,
  (30 + (n * 12)) as total_coins,
  (n % 5) + 1 as login_streak,
  CURRENT_DATE - ((n % 8) || ' days')::INTERVAL as last_login_date,
  NOW() - ((n * 3) || ' days')::INTERVAL as created_at,
  NOW() - ((n * 3) || ' days')::INTERVAL as privacy_accepted_at
FROM generate_series(1, 23) as n;

-- Link patients to law firm
INSERT INTO law_firm_clients (law_firm_id, client_id)
SELECT 
  10001,
  40000 + n
FROM generate_series(1, 23) as n;

-- Link patients to medical provider
INSERT INTO medical_provider_patients (medical_provider_id, patient_id)
SELECT 
  20001 as medical_provider_id,
  40000 + n as patient_id
FROM generate_series(1, 23) as n;

-- ============================================================
-- 5. CREATE ADDITIONAL MEDICAL PROVIDERS (for linking to clients)
-- ============================================================

INSERT INTO medical_providers (
  id, provider_name, provider_code, email, password,
  npi_number, specialty, phone_number,
  subscription_tier, created_at, privacy_accepted_at
)
VALUES
  (20002, 'Orthopedic Associates', 'MED-ORTHO1', 'ortho1@beta.test', '$2b$10$rN4qJZKqK7qH9yQxX5Z0aO5vC0xYjZ7VGZ8QW3Y5Z0aO5vC0xYjZ7V', '2234567890', 'Orthopedics', '(555) 201-3001', 'Basic', NOW() - INTERVAL '80 days', NOW() - INTERVAL '80 days'),
  (20003, 'Neurological Clinic', 'MED-NEURO1', 'neuro1@beta.test', '$2b$10$rN4qJZKqK7qH9yQxX5Z0aO5vC0xYjZ7VGZ8QW3Y5Z0aO5vC0xYjZ7V', '3234567890', 'Neurology', '(555) 202-3002', 'Basic', NOW() - INTERVAL '75 days', NOW() - INTERVAL '75 days'),
  (20004, 'Physical Therapy Center', 'MED-PT001', 'pt1@beta.test', '$2b$10$rN4qJZKqK7qH9yQxX5Z0aO5vC0xYjZ7VGZ8QW3Y5Z0aO5vC0xYjZ7V', '4234567890', 'Physical Therapy', '(555) 203-3003', 'Free', NOW() - INTERVAL '70 days', NOW() - INTERVAL '70 days'),
  (20005, 'Radiology Specialists', 'MED-RAD01', 'rad1@beta.test', '$2b$10$rN4qJZKqK7qH9yQxX5Z0aO5vC0xYjZ7VGZ8QW3Y5Z0aO5vC0xYjZ7V', '5234567890', 'Radiology', '(555) 204-3004', 'Free', NOW() - INTERVAL '65 days', NOW() - INTERVAL '65 days'),
  (20006, 'Emergency Medical Group', 'MED-ER001', 'er1@beta.test', '$2b$10$rN4qJZKqK7qH9yQxX5Z0aO5vC0xYjZ7VGZ8QW3Y5Z0aO5vC0xYjZ7V', '6234567890', 'Emergency Medicine', '(555) 205-3005', 'Basic', NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days'),
  (20007, 'Spine & Joint Center', 'MED-SPINE1', 'spine1@beta.test', '$2b$10$rN4qJZKqK7qH9yQxX5Z0aO5vC0xYjZ7VGZ8QW3Y5Z0aO5vC0xYjZ7V', '7234567890', 'Spine Surgery', '(555) 206-3006', 'Premium', NOW() - INTERVAL '55 days', NOW() - INTERVAL '55 days'),
  (20008, 'Pain Management Clinic', 'MED-PAIN1', 'pain1@beta.test', '$2b$10$rN4qJZKqK7qH9yQxX5Z0aO5vC0xYjZ7VGZ8QW3Y5Z0aO5vC0xYjZ7V', '8234567890', 'Pain Management', '(555) 207-3007', 'Free', NOW() - INTERVAL '50 days', NOW() - INTERVAL '50 days'),
  (20009, 'Chiropractic Wellness', 'MED-CHIRO1', 'chiro1@beta.test', '$2b$10$rN4qJZKqK7qH9yQxX5Z0aO5vC0xYjZ7VGZ8QW3Y5Z0aO5vC0xYjZ7V', '9234567890', 'Chiropractic', '(555) 208-3008', 'Basic', NOW() - INTERVAL '45 days', NOW() - INTERVAL '45 days'),
  (20010, 'Imaging & Diagnostics', 'MED-IMG01', 'img1@beta.test', '$2b$10$rN4qJZKqK7qH9yQxX5Z0aO5vC0xYjZ7VGZ8QW3Y5Z0aO5vC0xYjZ7V', '1334567890', 'Diagnostic Imaging', '(555) 209-3009', 'Free', NOW() - INTERVAL '40 days', NOW() - INTERVAL '40 days'),
  (20011, 'Sports Medicine Clinic', 'MED-SPORT1', 'sport1@beta.test', '$2b$10$rN4qJZKqK7qH9yQxX5Z0aO5vC0xYjZ7VGZ8QW3Y5Z0aO5vC0xYjZ7V', '1434567890', 'Sports Medicine', '(555) 210-3010', 'Basic', NOW() - INTERVAL '35 days', NOW() - INTERVAL '35 days'),
  (20012, 'Rehabilitation Center', 'MED-REHAB1', 'rehab1@beta.test', '$2b$10$rN4qJZKqK7qH9yQxX5Z0aO5vC0xYjZ7VGZ8QW3Y5Z0aO5vC0xYjZ7V', '1534567890', 'Rehabilitation', '(555) 211-3011', 'Premium', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'),
  (20013, 'Mental Health Associates', 'MED-MH001', 'mh1@beta.test', '$2b$10$rN4qJZKqK7qH9yQxX5Z0aO5vC0xYjZ7VGZ8QW3Y5Z0aO5vC0xYjZ7V', '1634567890', 'Psychology', '(555) 212-3012', 'Basic', NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days'),
  (20014, 'General Surgery Clinic', 'MED-SURG1', 'surg1@beta.test', '$2b$10$rN4qJZKqK7qH9yQxX5Z0aO5vC0xYjZ7VGZ8QW3Y5Z0aO5vC0xYjZ7V', '1734567890', 'General Surgery', '(555) 213-3013', 'Premium', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'),
  (20015, 'Primary Care Network', 'MED-PC001', 'pc1@beta.test', '$2b$10$rN4qJZKqK7qH9yQxX5Z0aO5vC0xYjZ7VGZ8QW3Y5Z0aO5vC0xYjZ7V', '1834567890', 'Primary Care', '(555) 214-3014', 'Free', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days');

-- ============================================================
-- 6. LINK MEDICAL PROVIDERS TO CLIENTS (~3 providers per client)
-- ============================================================

INSERT INTO client_medical_providers (client_id, medical_provider_id, relationship_type)
SELECT 
  client_id,
  provider_id,
  'active' as relationship_type
FROM (
  SELECT 
    30000 + c.n as client_id,
    20001 + ((c.n + p.provider_offset) % 15) as provider_id
  FROM 
    generate_series(1, 42) as c(n)
    CROSS JOIN (VALUES (0), (3), (7)) as p(provider_offset)
) as links;

-- ============================================================
-- 7. CREATE MAIN INDIVIDUAL USER ACCOUNT (44% completion)
-- ============================================================

INSERT INTO users (
  id, first_name, last_name, email, password, user_type,
  law_firm_code, connected_law_firm_id, subscription_tier,
  total_coins, login_streak, last_login_date, created_at,
  privacy_accepted_at
) VALUES (
  50001,
  'Beta',
  'Individual',
  'beta_individual',
  '$2b$10$rN4qJZKqK7qH9yQxX5Z0aO5vC0xYjZ7VGZ8QW3Y5Z0aO5vC0xYjZ7V', -- password123
  'individual',
  'LAW-BETA01',
  10001,
  'Free',
  245, -- From 18 substage completions
  5,
  CURRENT_DATE,
  NOW() - INTERVAL '60 days',
  NOW() - INTERVAL '60 days'
);

-- Link to law firm
INSERT INTO law_firm_clients (law_firm_id, client_id)
VALUES (10001, 50001);

-- Link 4 medical providers to individual user
INSERT INTO client_medical_providers (client_id, medical_provider_id, relationship_type)
VALUES 
  (50001, 20001, 'primary'),
  (50001, 20002, 'active'),
  (50001, 20003, 'active'),
  (50001, 20007, 'active');

-- ============================================================
-- 8. CREATE LITIGATION PROGRESS (44% = 18 substages completed)
-- ============================================================
-- Complete first 18 substages for beta_individual

INSERT INTO litigation_substage_completions (
  user_id, stage_id, stage_name, substage_id, substage_name,
  substage_type, coins_earned, completed_at
)
VALUES
  -- Pre-Litigation (11 substages - complete all)
  (50001, 1, 'Pre-Litigation', 'pre-1', 'Police Report', 'upload', 10, NOW() - INTERVAL '55 days'),
  (50001, 1, 'Pre-Litigation', 'pre-2', 'Body Cam Footage', 'upload', 10, NOW() - INTERVAL '54 days'),
  (50001, 1, 'Pre-Litigation', 'pre-3', 'Dash Cam Footage', 'upload', 10, NOW() - INTERVAL '53 days'),
  (50001, 1, 'Pre-Litigation', 'pre-4', 'Pictures', 'upload', 5, NOW() - INTERVAL '52 days'),
  (50001, 1, 'Pre-Litigation', 'pre-5', 'Health Insurance Card', 'upload', 5, NOW() - INTERVAL '51 days'),
  (50001, 1, 'Pre-Litigation', 'pre-6', 'Auto Insurance Company', 'data_entry', 5, NOW() - INTERVAL '50 days'),
  (50001, 1, 'Pre-Litigation', 'pre-7', 'Auto Insurance Policy Number', 'data_entry', 5, NOW() - INTERVAL '49 days'),
  (50001, 1, 'Pre-Litigation', 'pre-8', 'Medical Bills', 'upload', 15, NOW() - INTERVAL '48 days'),
  (50001, 1, 'Pre-Litigation', 'pre-9', 'Medical Records', 'upload', 35, NOW() - INTERVAL '47 days'),
  (50001, 1, 'Pre-Litigation', 'pre-10', 'Demand Sent', 'data_entry', 15, NOW() - INTERVAL '46 days'),
  (50001, 1, 'Pre-Litigation', 'pre-11', 'Demand Rejected', 'data_entry', 10, NOW() - INTERVAL '45 days'),
  
  -- Complaint Filed (4 substages - complete all)
  (50001, 2, 'Complaint Filed', 'cf-1', 'Draft Complaint', 'upload', 8, NOW() - INTERVAL '40 days'),
  (50001, 2, 'Complaint Filed', 'cf-2', 'File with Court', 'data_entry', 10, NOW() - INTERVAL '39 days'),
  (50001, 2, 'Complaint Filed', 'cf-3', 'Serve Defendant', 'data_entry', 7, NOW() - INTERVAL '38 days'),
  (50001, 2, 'Complaint Filed', 'cf-4', 'Answer Filed', 'upload', 7, NOW() - INTERVAL '37 days'),
  
  -- Discovery (5 substages - complete 3)
  (50001, 3, 'Discovery', 'disc-1', 'Interrogatories', 'upload', 10, NOW() - INTERVAL '30 days'),
  (50001, 3, 'Discovery', 'disc-2', 'Request for Production', 'upload', 10, NOW() - INTERVAL '28 days'),
  (50001, 3, 'Discovery', 'disc-3', 'Depositions', 'data_entry', 10, NOW() - INTERVAL '25 days');

-- Mark stage completions
INSERT INTO litigation_stage_completions (user_id, stage_id, stage_name, coins_earned, completed_at)
VALUES
  (50001, 1, 'Pre-Litigation', 100, NOW() - INTERVAL '45 days'),
  (50001, 2, 'Complaint Filed', 32, NOW() - INTERVAL '37 days');

-- ============================================================
-- 9. CREATE VARYING LITIGATION PROGRESS FOR 42 CLIENTS
-- ============================================================
-- Each client gets 10%-90% completion (4-38 substages)

INSERT INTO litigation_substage_completions (
  user_id, stage_id, stage_name, substage_id, substage_name,
  substage_type, coins_earned, completed_at
)
SELECT 
  user_id,
  stage_id,
  stage_name,
  substage_id,
  substage_name,
  'data_entry' as substage_type,
  CASE substage_id
    WHEN 'pre-1' THEN 10 WHEN 'pre-2' THEN 10 WHEN 'pre-3' THEN 10
    WHEN 'pre-4' THEN 5 WHEN 'pre-5' THEN 5 WHEN 'pre-6' THEN 5
    WHEN 'pre-7' THEN 5 WHEN 'pre-8' THEN 15 WHEN 'pre-9' THEN 35
    WHEN 'pre-10' THEN 15 WHEN 'pre-11' THEN 10
    WHEN 'cf-1' THEN 8 WHEN 'cf-2' THEN 10 WHEN 'cf-3' THEN 7 WHEN 'cf-4' THEN 7
    WHEN 'disc-1' THEN 10 WHEN 'disc-2' THEN 10 WHEN 'disc-3' THEN 10
    WHEN 'disc-4' THEN 10 WHEN 'disc-5' THEN 10
    WHEN 'med-1' THEN 8 WHEN 'med-2' THEN 10 WHEN 'med-3' THEN 7
    WHEN 'pt-1' THEN 8 WHEN 'pt-2' THEN 10 WHEN 'pt-3' THEN 7
    WHEN 'pt-4' THEN 8 WHEN 'pt-5' THEN 7
    ELSE 10
  END as coins_earned,
  NOW() - ((30 + substage_num) || ' days')::INTERVAL as completed_at
FROM (
  SELECT 
    30000 + client_num as user_id,
    client_num,
    substage_num,
    CASE 
      WHEN substage_num <= 11 THEN 1
      WHEN substage_num <= 15 THEN 2
      WHEN substage_num <= 20 THEN 3
      WHEN substage_num <= 23 THEN 4
      WHEN substage_num <= 28 THEN 5
      ELSE 6
    END as stage_id,
    CASE 
      WHEN substage_num <= 11 THEN 'Pre-Litigation'
      WHEN substage_num <= 15 THEN 'Complaint Filed'
      WHEN substage_num <= 20 THEN 'Discovery'
      WHEN substage_num <= 23 THEN 'Mediation'
      WHEN substage_num <= 28 THEN 'Pre-Trial'
      ELSE 'Trial'
    END as stage_name,
    CASE 
      WHEN substage_num = 1 THEN 'pre-1' WHEN substage_num = 2 THEN 'pre-2'
      WHEN substage_num = 3 THEN 'pre-3' WHEN substage_num = 4 THEN 'pre-4'
      WHEN substage_num = 5 THEN 'pre-5' WHEN substage_num = 6 THEN 'pre-6'
      WHEN substage_num = 7 THEN 'pre-7' WHEN substage_num = 8 THEN 'pre-8'
      WHEN substage_num = 9 THEN 'pre-9' WHEN substage_num = 10 THEN 'pre-10'
      WHEN substage_num = 11 THEN 'pre-11' WHEN substage_num = 12 THEN 'cf-1'
      WHEN substage_num = 13 THEN 'cf-2' WHEN substage_num = 14 THEN 'cf-3'
      WHEN substage_num = 15 THEN 'cf-4' WHEN substage_num = 16 THEN 'disc-1'
      WHEN substage_num = 17 THEN 'disc-2' WHEN substage_num = 18 THEN 'disc-3'
      WHEN substage_num = 19 THEN 'disc-4' WHEN substage_num = 20 THEN 'disc-5'
      WHEN substage_num = 21 THEN 'med-1' WHEN substage_num = 22 THEN 'med-2'
      WHEN substage_num = 23 THEN 'med-3' WHEN substage_num = 24 THEN 'pt-1'
      WHEN substage_num = 25 THEN 'pt-2' WHEN substage_num = 26 THEN 'pt-3'
      WHEN substage_num = 27 THEN 'pt-4' WHEN substage_num = 28 THEN 'pt-5'
      ELSE 'tr-1'
    END as substage_id,
    CASE 
      WHEN substage_num = 1 THEN 'Police Report' WHEN substage_num = 2 THEN 'Body Cam'
      WHEN substage_num = 3 THEN 'Dash Cam' WHEN substage_num = 4 THEN 'Pictures'
      WHEN substage_num = 5 THEN 'Health Insurance' WHEN substage_num = 6 THEN 'Auto Insurance'
      WHEN substage_num = 7 THEN 'Policy Number' WHEN substage_num = 8 THEN 'Medical Bills'
      WHEN substage_num = 9 THEN 'Medical Records' WHEN substage_num = 10 THEN 'Demand Sent'
      WHEN substage_num = 11 THEN 'Demand Rejected' WHEN substage_num = 12 THEN 'Draft Complaint'
      WHEN substage_num = 13 THEN 'File with Court' WHEN substage_num = 14 THEN 'Serve Defendant'
      WHEN substage_num = 15 THEN 'Answer Filed' WHEN substage_num = 16 THEN 'Interrogatories'
      WHEN substage_num = 17 THEN 'Request Production' WHEN substage_num = 18 THEN 'Depositions'
      WHEN substage_num = 19 THEN 'Request Admissions' WHEN substage_num = 20 THEN 'Expert Disclosures'
      WHEN substage_num = 21 THEN 'Mediation Scheduled' WHEN substage_num = 22 THEN 'Attend Mediation'
      WHEN substage_num = 23 THEN 'Outcome Documented' WHEN substage_num = 24 THEN 'Pretrial Motions'
      WHEN substage_num = 25 THEN 'Summary Judgment' WHEN substage_num = 26 THEN 'Pretrial Conference'
      WHEN substage_num = 27 THEN 'Jury Selection' WHEN substage_num = 28 THEN 'Trial Brief'
      ELSE 'Opening Statements'
    END as substage_name
  FROM 
    generate_series(1, 42) as client_num
    CROSS JOIN generate_series(1, 28) as substage_num
  WHERE 
    substage_num <= (4 + (client_num * 34 / 42))::int
) as progress_data;

-- ============================================================
-- 10. CREATE 2 PENDING TASKS FOR INDIVIDUAL USER
-- ============================================================

INSERT INTO law_firm_tasks (
  id, law_firm_id, client_id, task_title, task_description,
  priority, due_date, coins_reward, status, created_at
)
VALUES
  (1001, 10001, 50001, 'Submit Updated Medical Records', 'Please upload your most recent medical records from Dr. Johnson visit on November 1st', 'high', CURRENT_DATE + INTERVAL '5 days', 25, 'pending', NOW() - INTERVAL '3 days'),
  (1002, 10001, 50001, 'Review Settlement Offer', 'Please review the settlement offer document we sent via email and provide your feedback', 'medium', CURRENT_DATE + INTERVAL '7 days', 15, 'pending', NOW() - INTERVAL '2 days');

-- ============================================================
-- 11. CREATE 1 PENDING APPOINTMENT FOR INDIVIDUAL USER
-- ============================================================

INSERT INTO event_requests (
  id, law_firm_id, medical_provider_id, client_patient_id,
  requested_by, event_title, event_description, event_type,
  preferred_duration_minutes, status, created_at
)
VALUES
  (2001, NULL, 20001, 50001, 'medical_provider', 'Follow-up Physical Therapy Session', 'Scheduled follow-up appointment to assess progress and adjust treatment plan', 'Medical Appointment', 60, 'pending', NOW() - INTERVAL '4 days');

-- Add proposed date options
INSERT INTO event_request_proposed_dates (
  event_request_id, proposed_date, proposed_time, is_selected
)
VALUES
  (2001, CURRENT_DATE + INTERVAL '3 days', '10:00 AM', false),
  (2001, CURRENT_DATE + INTERVAL '4 days', '2:00 PM', false),
  (2001, CURRENT_DATE + INTERVAL '5 days', '11:00 AM', false);

-- ============================================================
-- 12. CREATE 14 NEGOTIATIONS (Law Firm vs Medical Providers)
-- ============================================================
-- Different stages: pending, countered, accepted

-- Negotiations in various stages
INSERT INTO negotiations (
  client_id, law_firm_id, medical_provider_id,
  bill_description, bill_amount, current_offer, status,
  initiated_by, last_responded_by, created_at, updated_at
)
VALUES
  -- Pending (waiting for response) - 4 negotiations
  (30005, 10001, 20002, 'Orthopedic Surgery - Knee Replacement', 45000.00, 32000.00, 'pending', 'law_firm', 'law_firm', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
  (30012, 10001, 20003, 'Neurological Consultation & Tests', 12500.00, 9000.00, 'pending', 'law_firm', 'law_firm', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
  (30018, 10001, 20005, 'Emergency Room Treatment', 8750.00, 6500.00, 'pending', 'law_firm', 'law_firm', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
  (30025, 10001, 20007, 'Spine Surgery & Rehabilitation', 67000.00, 50000.00, 'pending', 'law_firm', 'law_firm', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
  
  -- Countered (active negotiation) - 6 negotiations
  (30008, 10001, 20004, 'Physical Therapy - 12 Sessions', 4800.00, 3200.00, 'countered', 'law_firm', 'medical_provider', NOW() - INTERVAL '7 days', NOW() - INTERVAL '1 day'),
  (30015, 10001, 20006, 'Emergency Medical Services', 15200.00, 11000.00, 'countered', 'law_firm', 'medical_provider', NOW() - INTERVAL '6 days', NOW() - INTERVAL '2 days'),
  (30021, 10001, 20008, 'Pain Management Injections', 5400.00, 4000.00, 'countered', 'law_firm', 'law_firm', NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 day'),
  (30028, 10001, 20009, 'Chiropractic Treatment - 8 Weeks', 3200.00, 2400.00, 'countered', 'law_firm', 'medical_provider', NOW() - INTERVAL '4 days', NOW() - INTERVAL '1 day'),
  (30033, 10001, 20011, 'Sports Medicine Consultation', 2800.00, 2100.00, 'countered', 'law_firm', 'law_firm', NOW() - INTERVAL '3 days', NOW() - INTERVAL '6 hours'),
  (30037, 10001, 20013, 'Mental Health Counseling - 10 Sessions', 1800.00, 1400.00, 'countered', 'law_firm', 'medical_provider', NOW() - INTERVAL '2 days', NOW() - INTERVAL '12 hours'),
  
  -- Accepted (completed) - 4 negotiations
  (30003, 10001, 20001, 'Orthopedic Consultation & X-Rays', 2500.00, 2000.00, 'accepted', 'law_firm', 'medical_provider', NOW() - INTERVAL '15 days', NOW() - INTERVAL '10 days'),
  (30010, 10001, 20012, 'Rehabilitation Services - 6 Weeks', 7200.00, 6000.00, 'accepted', 'law_firm', 'medical_provider', NOW() - INTERVAL '12 days', NOW() - INTERVAL '8 days'),
  (30022, 10001, 20014, 'General Surgery Procedure', 28000.00, 24000.00, 'accepted', 'law_firm', 'medical_provider', NOW() - INTERVAL '10 days', NOW() - INTERVAL '6 days'),
  (30040, 10001, 20015, 'Primary Care Follow-ups', 1200.00, 1000.00, 'accepted', 'law_firm', 'medical_provider', NOW() - INTERVAL '8 days', NOW() - INTERVAL '5 days');

-- Add negotiation history for countered negotiations
INSERT INTO negotiation_history (
  negotiation_id, actor_type, actor_id, action_type,
  previous_amount, new_amount, notes, created_at
)
SELECT 
  n.id,
  'law_firm' as actor_type,
  10001 as actor_id,
  'initial_offer' as action_type,
  n.bill_amount,
  n.current_offer,
  'Initial negotiation offer submitted' as notes,
  n.created_at
FROM negotiations n
WHERE n.law_firm_id = 10001 AND n.status IN ('countered', 'pending')

UNION ALL

SELECT 
  n.id,
  'medical_provider' as actor_type,
  n.medical_provider_id as actor_id,
  'counter_offer' as action_type,
  n.current_offer,
  n.current_offer * 1.15,
  'Counter offer - provider requesting higher amount' as notes,
  n.updated_at
FROM negotiations n
WHERE n.law_firm_id = 10001 AND n.status = 'countered' AND n.last_responded_by = 'medical_provider';

-- ============================================================
-- 13. CREATE 3 ACTIVE NEGOTIATIONS FOR MEDICAL PROVIDER
-- ============================================================
-- These are with 3 different patients from the 23 patients

INSERT INTO negotiations (
  client_id, law_firm_id, medical_provider_id,
  bill_description, bill_amount, current_offer, status,
  initiated_by, last_responded_by, created_at, updated_at
)
VALUES
  (40003, 10001, 20001, 'Orthopedic Surgery - Shoulder Repair', 38000.00, 30000.00, 'countered', 'law_firm', 'law_firm', NOW() - INTERVAL '6 days', NOW() - INTERVAL '1 day'),
  (40007, 10001, 20001, 'Post-Surgery Physical Therapy', 6400.00, 5000.00, 'pending', 'law_firm', 'law_firm', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),
  (40015, 10001, 20001, 'Follow-up Consultations & X-Rays', 3200.00, 2600.00, 'countered', 'law_firm', 'medical_provider', NOW() - INTERVAL '3 days', NOW() - INTERVAL '8 hours');

-- ============================================================
-- 14. CREATE 15 NOTIFICATIONS FOR MEDICAL PROVIDER
-- ============================================================

INSERT INTO notifications (
  recipient_id, recipient_type, type, title, body,
  read_at, created_at
)
VALUES
  -- Negotiation notifications (unread)
  (20001, 'medical_provider', 'negotiation_initiated', 'New Bill Negotiation Request', 'Beta Test Law Firm has initiated a negotiation for Patient P3', NULL, NOW() - INTERVAL '6 days'),
  (20001, 'medical_provider', 'negotiation_initiated', 'New Bill Negotiation Request', 'Beta Test Law Firm has initiated a negotiation for Patient P7', NULL, NOW() - INTERVAL '4 days'),
  (20001, 'medical_provider', 'negotiation_countered', 'Negotiation Counter Offer', 'Beta Test Law Firm has countered your offer for Patient P15', NULL, NOW() - INTERVAL '8 hours'),
  
  -- Calendar event request notifications
  (20001, 'medical_provider', 'calendar_event_request', 'Patient Declined Event', 'Patient P5 has declined the proposed appointment dates', NULL, NOW() - INTERVAL '3 days'),
  (20001, 'medical_provider', 'calendar_event_confirmed', 'New Event Request Response', 'Patient P12 has confirmed an appointment date', NOW() - INTERVAL '6 days', NOW() - INTERVAL '7 days'),
  
  -- Document upload notifications
  (20001, 'medical_provider', 'document_uploaded', 'New Medical Record Uploaded', 'Patient P9 has uploaded new medical documentation', NULL, NOW() - INTERVAL '2 days'),
  (20001, 'medical_provider', 'payment_confirmation', 'Bill Payment Confirmation', 'Law firm has uploaded payment confirmation for Patient P18', NOW() - INTERVAL '4 days', NOW() - INTERVAL '5 days'),
  
  -- Patient relationship notifications
  (20001, 'medical_provider', 'patient_linked', 'New Patient Linked', 'Law firm Beta Test Law Firm has linked Patient P22 to your practice', NULL, NOW() - INTERVAL '1 day'),
  (20001, 'medical_provider', 'patient_linked', 'New Patient Linked', 'Law firm Beta Test Law Firm has linked Patient P23 to your practice', NULL, NOW() - INTERVAL '1 day'),
  (20001, 'medical_provider', 'case_status_update', 'Patient Case Updated', 'Patient P14 litigation status updated to Discovery phase', NOW() - INTERVAL '5 days', NOW() - INTERVAL '6 days'),
  
  -- Task notifications
  (20001, 'medical_provider', 'task_assigned', 'Documentation Request', 'Law firm has requested treatment records for Patient P11', NULL, NOW() - INTERVAL '4 days'),
  (20001, 'medical_provider', 'task_completed', 'Task Completed', 'Patient P8 has completed the requested health questionnaire', NOW() - INTERVAL '7 days', NOW() - INTERVAL '8 days'),
  
  -- System notifications
  (20001, 'medical_provider', 'subscription_renewal', 'Subscription Renewal', 'Your Premium plan will renew on December 1, 2025', NOW() - INTERVAL '9 days', NOW() - INTERVAL '10 days'),
  (20001, 'medical_provider', 'system_announcement', 'New Feature Available', 'Settlement disbursement tracking is now available in your portal', NULL, NOW() - INTERVAL '5 days'),
  (20001, 'medical_provider', 'payment_received', 'Payment Received', 'Disbursement of $24,000 received for Patient Num22', NOW() - INTERVAL '5 days', NOW() - INTERVAL '6 days');

-- ============================================================
-- 15. UPDATE COIN TOTALS BASED ON COMPLETIONS
-- ============================================================

UPDATE users 
SET total_coins = (
  SELECT COALESCE(SUM(coins_earned), 0)
  FROM litigation_substage_completions lsc
  WHERE lsc.user_id = users.id
) + users.total_coins
WHERE id IN (SELECT id FROM users WHERE id >= 30000);

COMMIT;

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Verify law firm
SELECT 'Law Firm Account:' as info, firm_name, email, subscription_tier, plan_type, stripe_account_id FROM law_firms WHERE id = 10001;

-- Verify medical provider
SELECT 'Medical Provider Account:' as info, provider_name, email, subscription_tier, stripe_account_id FROM medical_providers WHERE id = 20001;

-- Verify individual user
SELECT 'Individual User Account:' as info, first_name, last_name, email, subscription_tier, total_coins FROM users WHERE id = 50001;

-- Count clients
SELECT 'Law Firm Clients:' as info, COUNT(*) as count FROM law_firm_clients WHERE law_firm_id = 10001;

-- Count patients
SELECT 'Medical Provider Patients:' as info, COUNT(*) as count FROM medical_provider_patients WHERE medical_provider_id = 20001;

-- Count negotiations
SELECT 'Total Negotiations:' as info, COUNT(*) as total, status, COUNT(*) as count FROM negotiations WHERE law_firm_id = 10001 GROUP BY status;

-- Count notifications
SELECT 'Medical Provider Notifications:' as info, COUNT(*) as total, SUM(CASE WHEN read_at IS NULL THEN 1 ELSE 0 END) as unread FROM notifications WHERE recipient_id = 20001;

-- Individual user progress
SELECT 'Individual User Progress:' as info, 
       COUNT(*) as substages_completed,
       ROUND(COUNT(*) * 100.0 / 42, 1) as completion_percentage,
       SUM(coins_earned) as total_coins_from_substages
FROM litigation_substage_completions 
WHERE user_id = 50001;
