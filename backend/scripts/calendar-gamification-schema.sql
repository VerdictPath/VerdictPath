-- Calendar Integration & Enhanced Gamification Schema
-- Created: October 30, 2025
-- Features: Calendar events sync + Achievements/Badges system

-- =====================================================
-- CALENDAR INTEGRATION TABLES
-- =====================================================

-- Calendar Events Table
CREATE TABLE IF NOT EXISTS calendar_events (
  id SERIAL PRIMARY KEY,
  
  -- Ownership
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  law_firm_id INTEGER REFERENCES law_firms(id) ON DELETE CASCADE,
  medical_provider_id INTEGER REFERENCES medical_providers(id) ON DELETE CASCADE,
  
  -- Event details
  event_type VARCHAR(50) NOT NULL, -- court_date, appointment, deposition, deadline, reminder
  title VARCHAR(255) NOT NULL,
  description TEXT,
  location VARCHAR(500),
  
  -- Timing
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  all_day BOOLEAN DEFAULT false,
  timezone VARCHAR(50) DEFAULT 'America/New_York',
  
  -- Reminder settings
  reminder_enabled BOOLEAN DEFAULT true,
  reminder_minutes_before INTEGER DEFAULT 60, -- Default 1 hour before
  
  -- Device sync
  synced_to_device BOOLEAN DEFAULT false,
  device_event_id VARCHAR(255), -- ID from device calendar
  last_synced_at TIMESTAMP,
  
  -- Metadata
  created_by_type VARCHAR(20), -- user, law_firm, medical_provider, system
  created_by_id INTEGER,
  recurring BOOLEAN DEFAULT false,
  recurrence_rule TEXT, -- iCal RRULE format
  
  -- Case/Patient association
  case_related BOOLEAN DEFAULT false,
  litigation_stage_id INTEGER,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CHECK (
    (user_id IS NOT NULL AND law_firm_id IS NULL AND medical_provider_id IS NULL) OR
    (law_firm_id IS NOT NULL AND user_id IS NULL AND medical_provider_id IS NULL) OR
    (medical_provider_id IS NOT NULL AND user_id IS NULL AND law_firm_id IS NULL)
  )
);

CREATE INDEX idx_calendar_events_user ON calendar_events(user_id);
CREATE INDEX idx_calendar_events_law_firm ON calendar_events(law_firm_id);
CREATE INDEX idx_calendar_events_medical_provider ON calendar_events(medical_provider_id);
CREATE INDEX idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX idx_calendar_events_type ON calendar_events(event_type);
CREATE INDEX idx_calendar_events_synced ON calendar_events(synced_to_device);

-- Shared Calendar Events (for sharing between parties)
CREATE TABLE IF NOT EXISTS shared_calendar_events (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES calendar_events(id) ON DELETE CASCADE,
  
  -- Share with
  shared_with_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  shared_with_law_firm_id INTEGER REFERENCES law_firms(id) ON DELETE CASCADE,
  shared_with_medical_provider_id INTEGER REFERENCES medical_providers(id) ON DELETE CASCADE,
  
  -- Permissions
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  
  shared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  shared_by_type VARCHAR(20),
  shared_by_id INTEGER,
  
  UNIQUE(event_id, shared_with_user_id, shared_with_law_firm_id, shared_with_medical_provider_id)
);

CREATE INDEX idx_shared_events_event ON shared_calendar_events(event_id);
CREATE INDEX idx_shared_events_user ON shared_calendar_events(shared_with_user_id);

-- =====================================================
-- ENHANCED GAMIFICATION TABLES
-- =====================================================

-- Achievements Definitions
CREATE TABLE IF NOT EXISTS achievements (
  id SERIAL PRIMARY KEY,
  
  -- Achievement details
  achievement_key VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL, -- progress, consistency, engagement, milestones, special
  
  -- Icon/Visual
  icon VARCHAR(50), -- emoji or icon name
  color VARCHAR(20) DEFAULT '#FFD700',
  
  -- Requirements
  requirement_type VARCHAR(50) NOT NULL, -- stage_completion, login_streak, coin_collection, task_completion, etc.
  requirement_value INTEGER, -- e.g., 7 for 7-day streak
  requirement_data JSONB, -- Additional requirement details
  
  -- Rewards
  coin_reward INTEGER DEFAULT 0,
  badge_id INTEGER, -- Optional badge unlock
  
  -- Availability
  is_active BOOLEAN DEFAULT true,
  is_hidden BOOLEAN DEFAULT false, -- Hidden until unlocked
  
  -- Rarity
  rarity VARCHAR(20) DEFAULT 'common', -- common, rare, epic, legendary
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_achievements_category ON achievements(category);
CREATE INDEX idx_achievements_active ON achievements(is_active);
CREATE INDEX idx_achievements_rarity ON achievements(rarity);

-- User Achievements (tracking)
CREATE TABLE IF NOT EXISTS user_achievements (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id INTEGER NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  
  -- Progress tracking
  progress_current INTEGER DEFAULT 0,
  progress_required INTEGER,
  is_completed BOOLEAN DEFAULT false,
  
  -- Completion
  completed_at TIMESTAMP,
  coins_awarded INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_completed ON user_achievements(is_completed);
CREATE INDEX idx_user_achievements_user_completed ON user_achievements(user_id, is_completed);

-- Badges Definitions
CREATE TABLE IF NOT EXISTS badges (
  id SERIAL PRIMARY KEY,
  
  -- Badge details
  badge_key VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Visual
  icon VARCHAR(50), -- emoji or icon name
  image_url VARCHAR(500),
  
  -- Unlock requirements
  unlock_type VARCHAR(50), -- achievement, purchase, special_event, milestone
  unlock_requirement_id INTEGER, -- achievement_id or other
  unlock_data JSONB,
  
  -- Rarity
  rarity VARCHAR(20) DEFAULT 'common',
  is_special BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_badges_rarity ON badges(rarity);

-- User Badges (ownership)
CREATE TABLE IF NOT EXISTS user_badges (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id INTEGER NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  
  -- Display
  is_displayed BOOLEAN DEFAULT false, -- Show on profile
  display_order INTEGER,
  
  unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  unlocked_via VARCHAR(100), -- achievement, purchase, event, etc.
  
  UNIQUE(user_id, badge_id)
);

CREATE INDEX idx_user_badges_user ON user_badges(user_id);
CREATE INDEX idx_user_badges_displayed ON user_badges(user_id, is_displayed);

-- Daily Challenges
CREATE TABLE IF NOT EXISTS daily_challenges (
  id SERIAL PRIMARY KEY,
  
  -- Challenge details
  challenge_key VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Requirements
  challenge_type VARCHAR(50) NOT NULL, -- login, complete_substage, watch_video, etc.
  challenge_target INTEGER DEFAULT 1,
  
  -- Rewards
  coin_reward INTEGER DEFAULT 100,
  
  -- Timing
  active_date DATE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  
  -- Availability
  difficulty VARCHAR(20) DEFAULT 'easy', -- easy, medium, hard
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_daily_challenges_active ON daily_challenges(active_date, is_active);

-- User Daily Challenge Progress
CREATE TABLE IF NOT EXISTS user_daily_challenges (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_id INTEGER NOT NULL REFERENCES daily_challenges(id) ON DELETE CASCADE,
  
  -- Progress
  progress_current INTEGER DEFAULT 0,
  progress_target INTEGER NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  
  -- Completion
  completed_at TIMESTAMP,
  coins_awarded INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id, challenge_id)
);

CREATE INDEX idx_user_daily_challenges_user ON user_daily_challenges(user_id);
CREATE INDEX idx_user_daily_challenges_completed ON user_daily_challenges(user_id, is_completed);

-- Leaderboards
CREATE TABLE IF NOT EXISTS leaderboards (
  id SERIAL PRIMARY KEY,
  
  -- Leaderboard type
  leaderboard_type VARCHAR(50) NOT NULL, -- total_coins, monthly_coins, achievements, streak, etc.
  time_period VARCHAR(20) NOT NULL, -- all_time, monthly, weekly, daily
  
  -- Period
  period_start DATE,
  period_end DATE,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Leaderboard Entries
CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id SERIAL PRIMARY KEY,
  leaderboard_id INTEGER NOT NULL REFERENCES leaderboards(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Ranking
  rank INTEGER NOT NULL,
  score INTEGER NOT NULL,
  
  -- User snapshot (for display)
  user_name VARCHAR(255),
  user_avatar VARCHAR(500),
  
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(leaderboard_id, user_id)
);

CREATE INDEX idx_leaderboard_entries_leaderboard ON leaderboard_entries(leaderboard_id, rank);
CREATE INDEX idx_leaderboard_entries_user ON leaderboard_entries(user_id);

-- =====================================================
-- SEED INITIAL ACHIEVEMENTS
-- =====================================================

INSERT INTO achievements (achievement_key, name, description, category, icon, requirement_type, requirement_value, coin_reward, rarity) VALUES
  -- Progress Achievements
  ('first_substage', 'First Step', 'Complete your first litigation substage', 'progress', '🎯', 'substage_completion', 1, 100, 'common'),
  ('first_stage', 'Stage Master', 'Complete your first full litigation stage', 'progress', '⭐', 'stage_completion', 1, 500, 'rare'),
  ('halfway_hero', 'Halfway Hero', 'Reach the halfway point (Stage 5)', 'progress', '🏆', 'stage_completion', 5, 1000, 'epic'),
  ('case_champion', 'Case Champion', 'Complete all 9 litigation stages', 'progress', '👑', 'stage_completion', 9, 5000, 'legendary'),
  
  -- Consistency Achievements
  ('week_warrior', 'Week Warrior', 'Maintain a 7-day login streak', 'consistency', '🔥', 'login_streak', 7, 500, 'common'),
  ('month_master', 'Month Master', 'Maintain a 30-day login streak', 'consistency', '⚡', 'login_streak', 30, 2000, 'epic'),
  ('hundred_days', 'Centurion', 'Maintain a 100-day login streak', 'consistency', '💎', 'login_streak', 100, 10000, 'legendary'),
  
  -- Coin Collection
  ('coin_collector', 'Coin Collector', 'Earn 1,000 total coins', 'engagement', '🪙', 'total_coins', 1000, 100, 'common'),
  ('treasure_hunter', 'Treasure Hunter', 'Earn 10,000 total coins', 'engagement', '💰', 'total_coins', 10000, 1000, 'rare'),
  ('gold_hoarder', 'Gold Hoarder', 'Reach max coin capacity (25,000)', 'engagement', '⛏️', 'total_coins', 25000, 2500, 'legendary'),
  
  -- Video Learning
  ('eager_learner', 'Eager Learner', 'Watch your first educational video', 'engagement', '📚', 'video_watched', 1, 50, 'common'),
  ('knowledge_seeker', 'Knowledge Seeker', 'Watch 10 educational videos', 'engagement', '🎓', 'video_watched', 10, 500, 'rare'),
  
  -- Tasks
  ('task_starter', 'Task Starter', 'Complete your first attorney-assigned task', 'engagement', '✅', 'task_completion', 1, 100, 'common'),
  ('task_master', 'Task Master', 'Complete 25 attorney-assigned tasks', 'engagement', '🎖️', 'task_completion', 25, 2000, 'epic'),
  
  -- Social
  ('connector', 'Connector', 'Connect with a law firm', 'milestones', '🤝', 'connection_made', 1, 250, 'common'),
  ('networker', 'Networker', 'Invite 5 friends to Verdict Path', 'milestones', '👥', 'referral_count', 5, 1000, 'rare')

ON CONFLICT (achievement_key) DO NOTHING;

-- =====================================================
-- SEED INITIAL BADGES
-- =====================================================

INSERT INTO badges (badge_key, name, description, icon, unlock_type, rarity, is_special) VALUES
  -- Pirate Theme Badges
  ('captain_badge', 'Captain''s Badge', 'Awarded to case completion champions', '⚓', 'achievement', 'legendary', true),
  ('treasure_map_badge', 'Treasure Map Master', 'Complete all litigation stages', '🗺️', 'achievement', 'epic', true),
  ('ship_wheel_badge', 'Navigator Badge', 'For those who chart their course', '⚓', 'achievement', 'rare', false),
  ('pirate_flag_badge', 'Jolly Roger', 'Claim victory in your case', '🏴‍☠️', 'achievement', 'epic', true),
  ('compass_badge', 'True North', 'Never miss a daily login for 30 days', '🧭', 'achievement', 'rare', false),
  ('anchor_badge', 'Steadfast', 'Maintain consistency in your journey', '⚓', 'achievement', 'common', false),
  ('sword_badge', 'Legal Sword', 'Fight for justice', '⚔️', 'achievement', 'rare', false),
  ('crown_badge', 'Victory Crown', 'Ultimate achievement unlocked', '👑', 'achievement', 'legendary', true)

ON CONFLICT (badge_key) DO NOTHING;

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT 'Calendar & Gamification schema created successfully!' as status;
SELECT COUNT(*) as achievements_count FROM achievements;
SELECT COUNT(*) as badges_count FROM badges;
