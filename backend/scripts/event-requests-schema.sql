-- Event Requests Schema
-- Allows law firms to request calendar events from clients
-- Clients can propose 3 available dates/times
-- Created: October 30, 2025

-- Event Requests Table
CREATE TABLE IF NOT EXISTS event_requests (
  id SERIAL PRIMARY KEY,
  law_firm_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  client_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- deposition, mediation, consultation, court_date, etc.
  title VARCHAR(255) NOT NULL,
  description TEXT,
  location VARCHAR(255),
  duration_minutes INTEGER DEFAULT 60,
  status VARCHAR(50) DEFAULT 'pending', -- pending, dates_submitted, confirmed, cancelled
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP,
  confirmed_event_id INTEGER REFERENCES calendar_events(id) ON DELETE SET NULL,
  notes TEXT
);

-- Proposed Dates Table (stores multiple proposed dates from client)
CREATE TABLE IF NOT EXISTS event_request_proposed_dates (
  id SERIAL PRIMARY KEY,
  event_request_id INTEGER REFERENCES event_requests(id) ON DELETE CASCADE,
  proposed_start_time TIMESTAMP NOT NULL,
  proposed_end_time TIMESTAMP NOT NULL,
  is_selected BOOLEAN DEFAULT false, -- true when law firm selects this date
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_requests_law_firm ON event_requests(law_firm_id);
CREATE INDEX IF NOT EXISTS idx_event_requests_client ON event_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_event_requests_status ON event_requests(status);
CREATE INDEX IF NOT EXISTS idx_event_request_proposed_dates_request ON event_request_proposed_dates(event_request_id);

-- Seed some event types for reference
INSERT INTO event_requests (id, law_firm_id, client_id, event_type, title, description, status)
VALUES (0, 1, 1, 'system', 'System Event Request', 'Initial seed data', 'cancelled')
ON CONFLICT (id) DO NOTHING;

SELECT 'Event requests schema created successfully!' as status;
