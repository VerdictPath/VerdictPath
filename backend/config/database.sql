-- VerdictPath Law Firm Portal Database Schema
-- PostgreSQL Implementation

-- Users table (both clients and regular users)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  user_type VARCHAR(50) NOT NULL CHECK (user_type IN ('individual', 'client')),
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

-- Law Firms table
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

-- Medical Records table
CREATE TABLE IF NOT EXISTS medical_records (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  record_type VARCHAR(100) NOT NULL CHECK (record_type IN ('visit_summary', 'lab_results', 'imaging', 'prescription', 'diagnosis', 'treatment_plan', 'other')),
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

-- Medical Billing table
CREATE TABLE IF NOT EXISTS medical_billing (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  billing_type VARCHAR(100) NOT NULL CHECK (billing_type IN ('invoice', 'statement', 'insurance_eob', 'payment_receipt', 'itemized_bill')),
  facility_name VARCHAR(255),
  bill_number VARCHAR(100),
  date_of_service DATE,
  bill_date DATE,
  due_date DATE,
  total_amount DECIMAL(10, 2) NOT NULL,
  amount_paid DECIMAL(10, 2) DEFAULT 0,
  amount_due DECIMAL(10, 2) NOT NULL,
  insurance_claim_number VARCHAR(100),
  procedure_codes TEXT[], -- Array of CPT codes
  diagnosis_codes TEXT[], -- Array of ICD-10 codes
  description TEXT,
  document_url TEXT,
  file_name VARCHAR(255),
  file_size BIGINT,
  mime_type VARCHAR(100),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  accessible_by_law_firm BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_medical_billing_user_id ON medical_billing(user_id);

-- Evidence Documents table
CREATE TABLE IF NOT EXISTS evidence (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  evidence_type VARCHAR(100) NOT NULL CHECK (evidence_type IN ('photo', 'video', 'audio', 'document', 'correspondence', 'witness_statement', 'police_report', 'insurance_document', 'other')),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  date_of_incident DATE,
  location VARCHAR(255),
  tags TEXT[], -- Array of tags
  document_url TEXT,
  file_name VARCHAR(255),
  file_size BIGINT,
  mime_type VARCHAR(100),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  accessible_by_law_firm BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_evidence_user_id ON evidence(user_id);

-- Litigation Stages table
CREATE TABLE IF NOT EXISTS litigation_stages (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  law_firm_id INTEGER NOT NULL REFERENCES law_firms(id) ON DELETE CASCADE,
  case_number VARCHAR(100),
  current_stage VARCHAR(100) NOT NULL CHECK (current_stage IN (
    'initial_consultation', 'client_intake', 'investigation', 'demand_letter',
    'negotiation', 'pre_litigation', 'complaint_filed', 'discovery',
    'mediation', 'trial_preparation', 'trial', 'settlement', 'appeal', 'closed'
  )) DEFAULT 'initial_consultation',
  next_step_due_date DATE,
  next_step_description TEXT,
  case_value DECIMAL(12, 2),
  settlement_amount DECIMAL(12, 2),
  status VARCHAR(50) CHECK (status IN ('active', 'pending', 'settled', 'closed')) DEFAULT 'active',
  notes TEXT,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_litigation_stages_user_id ON litigation_stages(user_id);
CREATE INDEX idx_litigation_stages_law_firm_id ON litigation_stages(law_firm_id);

-- Litigation Stage History table (separate table for history tracking)
CREATE TABLE IF NOT EXISTS litigation_stage_history (
  id SERIAL PRIMARY KEY,
  litigation_stage_id INTEGER NOT NULL REFERENCES litigation_stages(id) ON DELETE CASCADE,
  stage VARCHAR(100) NOT NULL,
  completed_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_by INTEGER REFERENCES law_firms(id),
  notes TEXT
);

CREATE INDEX idx_litigation_stage_history_litigation_stage_id ON litigation_stage_history(litigation_stage_id);

-- Law Firm - Client relationship table (many-to-many)
CREATE TABLE IF NOT EXISTS law_firm_clients (
  id SERIAL PRIMARY KEY,
  law_firm_id INTEGER NOT NULL REFERENCES law_firms(id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  registered_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(law_firm_id, client_id)
);

CREATE INDEX idx_law_firm_clients_law_firm_id ON law_firm_clients(law_firm_id);
CREATE INDEX idx_law_firm_clients_client_id ON law_firm_clients(client_id);
