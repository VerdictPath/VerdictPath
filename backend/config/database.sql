-- VerdictPath Law Firm Portal Database Schema
-- PostgreSQL Implementation
-- IMPORTANT: Tables are ordered to satisfy foreign key dependencies

-- Step 1: Law Firms table (no dependencies)
CREATE TABLE IF NOT EXISTS law_firms (
  id SERIAL PRIMARY KEY,
  firm_name VARCHAR(255) NOT NULL,
  firm_code VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  bar_number VARCHAR(100),
  phone_number VARCHAR(50),
  street VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(50),
  zip_code VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Users table (depends on law_firms)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  user_type VARCHAR(50) NOT NULL CHECK (user_type IN ('individual', 'client', 'lawfirm')),
  law_firm_code VARCHAR(50),
  connected_law_firm_id INTEGER REFERENCES law_firms(id) ON DELETE SET NULL,
  avatar_type VARCHAR(50),
  subscription_tier VARCHAR(50) DEFAULT 'free',
  subscription_price DECIMAL(10, 2) DEFAULT 0,
  total_coins INTEGER DEFAULT 0,
  login_streak INTEGER DEFAULT 0,
  last_login_date DATE,
  current_tier VARCHAR(50) DEFAULT 'bronze',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 3: Medical Records table (depends on users)
CREATE TABLE IF NOT EXISTS medical_records (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  record_type VARCHAR(100) NOT NULL,
  facility_name VARCHAR(255),
  provider_name VARCHAR(255),
  date_of_service DATE,
  description TEXT,
  document_url TEXT,
  file_name VARCHAR(255),
  file_size BIGINT,
  mime_type VARCHAR(100),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  accessible_by_law_firm BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_medical_records_user_id ON medical_records(user_id);

-- Step 4: Medical Billing table (depends on users)
CREATE TABLE IF NOT EXISTS medical_billing (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  billing_type VARCHAR(100) NOT NULL,
  facility_name VARCHAR(255),
  bill_number VARCHAR(100),
  date_of_service DATE,
  bill_date DATE,
  due_date DATE,
  total_amount DECIMAL(10, 2) NOT NULL,
  amount_paid DECIMAL(10, 2) DEFAULT 0,
  amount_due DECIMAL(10, 2) NOT NULL,
  insurance_claim_number VARCHAR(100),
  procedure_codes TEXT[],
  diagnosis_codes TEXT[],
  description TEXT,
  document_url TEXT,
  file_name VARCHAR(255),
  file_size BIGINT,
  mime_type VARCHAR(100),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  accessible_by_law_firm BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_medical_billing_user_id ON medical_billing(user_id);

-- Step 5: Evidence Documents table (depends on users)
CREATE TABLE IF NOT EXISTS evidence (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  evidence_type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  date_of_incident DATE,
  location VARCHAR(255),
  tags TEXT[],
  document_url TEXT,
  file_name VARCHAR(255),
  file_size BIGINT,
  mime_type VARCHAR(100),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  accessible_by_law_firm BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_evidence_user_id ON evidence(user_id);

-- Step 6: Litigation Stages table (depends on users and law_firms)
CREATE TABLE IF NOT EXISTS litigation_stages (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  law_firm_id INTEGER NOT NULL REFERENCES law_firms(id) ON DELETE CASCADE,
  case_number VARCHAR(100),
  current_stage VARCHAR(100) NOT NULL DEFAULT 'initial_consultation',
  next_step_due_date DATE,
  next_step_description TEXT,
  case_value DECIMAL(12, 2),
  settlement_amount DECIMAL(12, 2),
  status VARCHAR(50) DEFAULT 'active',
  notes TEXT,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_litigation_stages_user_id ON litigation_stages(user_id);
CREATE INDEX idx_litigation_stages_law_firm_id ON litigation_stages(law_firm_id);

-- Step 7: Litigation Stage History table (depends on litigation_stages)
CREATE TABLE IF NOT EXISTS litigation_stage_history (
  id SERIAL PRIMARY KEY,
  litigation_stage_id INTEGER NOT NULL REFERENCES litigation_stages(id) ON DELETE CASCADE,
  stage VARCHAR(100) NOT NULL,
  completed_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_by INTEGER REFERENCES law_firms(id),
  notes TEXT
);

CREATE INDEX idx_litigation_stage_history_litigation_stage_id ON litigation_stage_history(litigation_stage_id);

-- Step 8: Law Firm - Client relationship table (depends on law_firms and users)
CREATE TABLE IF NOT EXISTS law_firm_clients (
  id SERIAL PRIMARY KEY,
  law_firm_id INTEGER NOT NULL REFERENCES law_firms(id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  registered_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(law_firm_id, client_id)
);

CREATE INDEX idx_law_firm_clients_law_firm_id ON law_firm_clients(law_firm_id);
CREATE INDEX idx_law_firm_clients_client_id ON law_firm_clients(client_id);
