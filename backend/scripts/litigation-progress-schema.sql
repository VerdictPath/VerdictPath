-- Litigation Progress Tracking for Individual Users
-- This tracks users' progress through the 9-stage litigation journey

-- Main litigation progress table - tracks which stage the user is on
CREATE TABLE IF NOT EXISTS user_litigation_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  current_stage_id INTEGER NOT NULL DEFAULT 1, -- 1-9 (Pre-Litigation through Case Resolution)
  current_stage_name VARCHAR(100) NOT NULL DEFAULT 'Pre-Litigation',
  total_coins_earned INTEGER DEFAULT 0,
  total_substages_completed INTEGER DEFAULT 0,
  progress_percentage DECIMAL(5, 2) DEFAULT 0.00,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

CREATE INDEX idx_user_litigation_progress_user_id ON user_litigation_progress(user_id);
CREATE INDEX idx_user_litigation_progress_current_stage ON user_litigation_progress(current_stage_id);

-- Substage completion tracking - tracks each individual substage completion
CREATE TABLE IF NOT EXISTS litigation_substage_completions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stage_id INTEGER NOT NULL, -- 1-9
  stage_name VARCHAR(100) NOT NULL,
  substage_id VARCHAR(50) NOT NULL, -- e.g. 'pre-1', 'pre-2', etc.
  substage_name VARCHAR(255) NOT NULL,
  substage_type VARCHAR(50) NOT NULL, -- 'upload', 'data_entry', 'video', 'automatic'
  coins_earned INTEGER DEFAULT 0,
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_value TEXT, -- for data entry substages
  file_ids INTEGER[], -- references to uploaded files (medical_records, evidence, etc.)
  notes TEXT,
  UNIQUE(user_id, stage_id, substage_id)
);

CREATE INDEX idx_litigation_substage_completions_user_id ON litigation_substage_completions(user_id);
CREATE INDEX idx_litigation_substage_completions_stage ON litigation_substage_completions(stage_id);
CREATE INDEX idx_litigation_substage_completions_unique ON litigation_substage_completions(user_id, stage_id, substage_id);

-- Stage completion tracking - tracks when main stages are completed
CREATE TABLE IF NOT EXISTS litigation_stage_completions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stage_id INTEGER NOT NULL, -- 1-9
  stage_name VARCHAR(100) NOT NULL,
  coins_earned INTEGER DEFAULT 0,
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  all_substages_completed BOOLEAN DEFAULT FALSE,
  completion_percentage DECIMAL(5, 2) DEFAULT 0.00,
  UNIQUE(user_id, stage_id)
);

CREATE INDEX idx_litigation_stage_completions_user_id ON litigation_stage_completions(user_id);
CREATE INDEX idx_litigation_stage_completions_stage ON litigation_stage_completions(stage_id);

-- Video purchases and completions
CREATE TABLE IF NOT EXISTS litigation_video_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id VARCHAR(50) NOT NULL,
  video_title VARCHAR(255) NOT NULL,
  stage_id INTEGER NOT NULL,
  purchased BOOLEAN DEFAULT FALSE,
  completed BOOLEAN DEFAULT FALSE,
  purchase_price DECIMAL(10, 2),
  purchased_at TIMESTAMP,
  completed_at TIMESTAMP,
  watch_duration_seconds INTEGER DEFAULT 0,
  UNIQUE(user_id, video_id)
);

CREATE INDEX idx_litigation_video_progress_user_id ON litigation_video_progress(user_id);
CREATE INDEX idx_litigation_video_progress_stage ON litigation_video_progress(stage_id);

-- Litigation milestones and achievements
CREATE TABLE IF NOT EXISTS litigation_milestones (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  milestone_type VARCHAR(100) NOT NULL, -- 'first_stage', 'halfway', 'all_videos', 'max_coins', etc.
  milestone_name VARCHAR(255) NOT NULL,
  coins_awarded INTEGER DEFAULT 0,
  achieved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  description TEXT
);

CREATE INDEX idx_litigation_milestones_user_id ON litigation_milestones(user_id);
CREATE INDEX idx_litigation_milestones_achieved_at ON litigation_milestones(achieved_at);

-- Comments to explain the system
COMMENT ON TABLE user_litigation_progress IS 'Tracks each users overall progress through the 9-stage litigation journey';
COMMENT ON TABLE litigation_substage_completions IS 'Tracks completion of individual substages (document uploads, data entries, etc.)';
COMMENT ON TABLE litigation_stage_completions IS 'Tracks completion of main stages in the litigation roadmap';
COMMENT ON TABLE litigation_video_progress IS 'Tracks video purchases and watch progress for tutorial videos';
COMMENT ON TABLE litigation_milestones IS 'Tracks achievements and milestones earned during the litigation journey';
