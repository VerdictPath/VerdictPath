-- Extend Event Requests to Support Medical Providers
-- Allows medical providers to request treatment dates from patients
-- Created: October 30, 2025

-- Add medical provider columns to event_requests
ALTER TABLE event_requests 
  ADD COLUMN IF NOT EXISTS medical_provider_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS patient_id INTEGER REFERENCES users(id) ON DELETE CASCADE;

-- Add index for medical provider queries
CREATE INDEX IF NOT EXISTS idx_event_requests_medical_provider ON event_requests(medical_provider_id);
CREATE INDEX IF NOT EXISTS idx_event_requests_patient ON event_requests(patient_id);

-- Add constraint to ensure exactly one provider type is set
-- Either (law_firm_id AND client_id) OR (medical_provider_id AND patient_id)
ALTER TABLE event_requests 
  DROP CONSTRAINT IF EXISTS check_request_type;

ALTER TABLE event_requests 
  ADD CONSTRAINT check_request_type CHECK (
    (law_firm_id IS NOT NULL AND client_id IS NOT NULL AND medical_provider_id IS NULL AND patient_id IS NULL) OR
    (medical_provider_id IS NOT NULL AND patient_id IS NOT NULL AND law_firm_id IS NULL AND client_id IS NULL)
  );

SELECT 'Medical provider event requests support added successfully!' as status;
