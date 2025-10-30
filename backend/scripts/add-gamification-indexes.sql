-- Add Missing Indexes for Gamification Performance
-- Created: October 30, 2025

-- User Achievements Indexes
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement ON user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_completed_at ON user_achievements(completed_at DESC);

-- User Badges Indexes
CREATE INDEX IF NOT EXISTS idx_user_badges_badge ON user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_unlocked_at ON user_badges(unlocked_at DESC);

-- Unique Constraints (prevent duplicate seeds)
ALTER TABLE achievements 
  ADD CONSTRAINT IF NOT EXISTS unique_achievement_key UNIQUE (achievement_key);

ALTER TABLE badges 
  ADD CONSTRAINT IF NOT EXISTS unique_badge_key UNIQUE (badge_key);

-- Add coin balance constraint to users table
ALTER TABLE users
  ADD CONSTRAINT IF NOT EXISTS check_coins_cap CHECK (coins >= 0 AND coins <= 25000);

SELECT 'Gamification indexes and constraints added successfully!' as status;
