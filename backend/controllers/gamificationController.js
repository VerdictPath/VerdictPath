const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const gamificationController = {
  async getAchievements(req, res) {
    try {
      const userId = req.user.id;

      const achievementsQuery = `
        SELECT 
          a.*,
          ua.progress_current,
          ua.progress_required,
          ua.is_completed,
          ua.completed_at,
          ua.coins_awarded
        FROM achievements a
        LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = $1
        WHERE a.is_active = true
        ORDER BY 
          CASE a.rarity
            WHEN 'legendary' THEN 1
            WHEN 'epic' THEN 2
            WHEN 'rare' THEN 3
            ELSE 4
          END,
          a.category,
          a.id
      `;

      const result = await pool.query(achievementsQuery, [userId]);

      const achievements = result.rows.map(row => ({
        id: row.id,
        key: row.achievement_key,
        name: row.name,
        description: row.description,
        category: row.category,
        icon: row.icon,
        color: row.color,
        rarity: row.rarity,
        coinReward: row.coin_reward,
        isHidden: row.is_hidden,
        progress: {
          current: row.progress_current || 0,
          required: row.requirement_value || row.progress_required,
          isCompleted: row.is_completed || false,
          completedAt: row.completed_at
        },
        coinsAwarded: row.coins_awarded || 0
      }));

      res.json({
        success: true,
        achievements
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch achievements',
        details: error.message
      });
    }
  },

  async trackProgress(req, res) {
    try {
      const userId = req.user.id;
      const { achievementKey, progressIncrement = 1 } = req.body;

      const achievementResult = await pool.query(
        'SELECT * FROM achievements WHERE achievement_key = $1 AND is_active = true',
        [achievementKey]
      );

      if (achievementResult.rows.length === 0) {
        return res.status(404).json({ error: 'Achievement not found' });
      }

      const achievement = achievementResult.rows[0];

      const existingProgress = await pool.query(
        'SELECT * FROM user_achievements WHERE user_id = $1 AND achievement_id = $2',
        [userId, achievement.id]
      );

      let userAchievement;

      if (existingProgress.rows.length === 0) {
        const insertResult = await pool.query(
          `INSERT INTO user_achievements (user_id, achievement_id, progress_current, progress_required)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [userId, achievement.id, progressIncrement, achievement.requirement_value]
        );
        userAchievement = insertResult.rows[0];
      } else {
        const current = existingProgress.rows[0];
        if (current.is_completed) {
          return res.json({
            success: true,
            message: 'Achievement already completed',
            achievement: current
          });
        }

        const newProgress = current.progress_current + progressIncrement;
        const updateResult = await pool.query(
          `UPDATE user_achievements
           SET progress_current = $1, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $2 AND achievement_id = $3
           RETURNING *`,
          [newProgress, userId, achievement.id]
        );
        userAchievement = updateResult.rows[0];
      }

      if (userAchievement.progress_current >= achievement.requirement_value && !userAchievement.is_completed) {
        await pool.query('BEGIN');
        
        try {
          await pool.query(
            `UPDATE user_achievements
             SET is_completed = true, completed_at = CURRENT_TIMESTAMP, coins_awarded = $1
             WHERE user_id = $2 AND achievement_id = $3`,
            [achievement.coin_reward, userId, achievement.id]
          );

          const userResult = await pool.query(
            `UPDATE users SET coins = LEAST(coins + $1, 25000) WHERE id = $2 RETURNING coins`,
            [achievement.coin_reward, userId]
          );

          if (achievement.badge_id) {
            await pool.query(
              `INSERT INTO user_badges (user_id, badge_id, unlocked_via)
               VALUES ($1, $2, $3)
               ON CONFLICT (user_id, badge_id) DO NOTHING`,
              [userId, achievement.badge_id, `achievement:${achievementKey}`]
            );
          }

          await pool.query('COMMIT');

          return res.json({
            success: true,
            message: 'Achievement completed!',
            completed: true,
            coinsAwarded: achievement.coin_reward,
            totalCoins: userResult.rows[0]?.coins || 0,
            achievement: {
              ...achievement,
              completed: true,
              coinsAwarded: achievement.coin_reward
            }
          });
        } catch (error) {
          await pool.query('ROLLBACK');
          throw error;
        }
      }

      res.json({
        success: true,
        progress: {
          current: userAchievement.progress_current,
          required: achievement.requirement_value
        }
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to track achievement progress',
        details: error.message
      });
    }
  },

  async getBadges(req, res) {
    try {
      const userId = req.user.id;

      const badgesQuery = `
        SELECT 
          b.*,
          ub.unlocked_at,
          ub.is_displayed,
          ub.unlocked_via
        FROM badges b
        LEFT JOIN user_badges ub ON b.id = ub.badge_id AND ub.user_id = $1
        ORDER BY 
          CASE b.rarity
            WHEN 'legendary' THEN 1
            WHEN 'epic' THEN 2
            WHEN 'rare' THEN 3
            ELSE 4
          END,
          b.id
      `;

      const result = await pool.query(badgesQuery, [userId]);

      const badges = result.rows.map(row => ({
        id: row.id,
        key: row.badge_key,
        name: row.name,
        description: row.description,
        icon: row.icon,
        imageUrl: row.image_url,
        rarity: row.rarity,
        isSpecial: row.is_special,
        unlocked: !!row.unlocked_at,
        unlockedAt: row.unlocked_at,
        isDisplayed: row.is_displayed || false,
        unlockedVia: row.unlocked_via
      }));

      res.json({
        success: true,
        badges
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch badges',
        details: error.message
      });
    }
  },

  async getDailyChallenges(req, res) {
    try {
      const userId = req.user.id;
      const today = new Date().toISOString().split('T')[0];

      const challengesQuery = `
        SELECT 
          dc.*,
          udc.progress_current,
          udc.progress_target,
          udc.is_completed,
          udc.completed_at,
          udc.coins_awarded
        FROM daily_challenges dc
        LEFT JOIN user_daily_challenges udc ON dc.id = udc.challenge_id AND udc.user_id = $1
        WHERE dc.active_date = $2 AND dc.is_active = true
        ORDER BY dc.difficulty, dc.id
      `;

      const result = await pool.query(challengesQuery, [userId, today]);

      const challenges = result.rows.map(row => ({
        id: row.id,
        key: row.challenge_key,
        name: row.name,
        description: row.description,
        type: row.challenge_type,
        target: row.challenge_target,
        coinReward: row.coin_reward,
        difficulty: row.difficulty,
        expiresAt: row.expires_at,
        progress: {
          current: row.progress_current || 0,
          target: row.challenge_target,
          isCompleted: row.is_completed || false,
          completedAt: row.completed_at
        },
        coinsAwarded: row.coins_awarded || 0
      }));

      res.json({
        success: true,
        challenges
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch daily challenges',
        details: error.message
      });
    }
  },

  async getLeaderboard(req, res) {
    try {
      const { type = 'total_coins', period = 'all_time', limit = 50 } = req.query;
      const userId = req.user.id;

      let query;
      const params = [];

      if (type === 'total_coins') {
        query = `
          SELECT 
            u.id,
            CONCAT(u.first_name, ' ', u.last_name) as user_name,
            u.coins as score,
            ROW_NUMBER() OVER (ORDER BY u.coins DESC) as rank
          FROM users u
          WHERE u.user_type = 'individual'
          ORDER BY u.coins DESC
          LIMIT $1
        `;
        params.push(limit);
      } else if (type === 'achievements') {
        query = `
          SELECT 
            u.id,
            CONCAT(u.first_name, ' ', u.last_name) as user_name,
            COUNT(ua.id) as score,
            ROW_NUMBER() OVER (ORDER BY COUNT(ua.id) DESC) as rank
          FROM users u
          LEFT JOIN user_achievements ua ON u.id = ua.user_id AND ua.is_completed = true
          WHERE u.user_type = 'individual'
          GROUP BY u.id, u.first_name, u.last_name
          ORDER BY score DESC
          LIMIT $1
        `;
        params.push(limit);
      } else if (type === 'streak') {
        query = `
          SELECT 
            u.id,
            CONCAT(u.first_name, ' ', u.last_name) as user_name,
            u.login_streak as score,
            ROW_NUMBER() OVER (ORDER BY u.login_streak DESC) as rank
          FROM users u
          WHERE u.user_type = 'individual'
          ORDER BY u.login_streak DESC
          LIMIT $1
        `;
        params.push(limit);
      } else {
        return res.status(400).json({ error: 'Invalid leaderboard type' });
      }

      const result = await pool.query(query, params);

      const userRankQuery = `
        WITH ranked_users AS (
          ${query.replace('LIMIT $1', '')}
        )
        SELECT rank, score FROM ranked_users WHERE id = $${params.length + 1}
      `;
      const userRankResult = await pool.query(userRankQuery, [...params.slice(0, -1), userId]);

      res.json({
        success: true,
        leaderboard: result.rows.map(row => ({
          rank: parseInt(row.rank),
          userId: row.id,
          userName: row.user_name,
          score: parseInt(row.score) || 0
        })),
        userRank: userRankResult.rows.length > 0 ? {
          rank: parseInt(userRankResult.rows[0].rank),
          score: parseInt(userRankResult.rows[0].score) || 0
        } : null,
        type,
        period
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch leaderboard',
        details: error.message
      });
    }
  },

  async getUserStats(req, res) {
    try {
      const userId = req.user.id;

      const statsQuery = `
        SELECT 
          u.coins,
          u.login_streak,
          (SELECT COUNT(*) FROM user_achievements WHERE user_id = u.id AND is_completed = true) as achievements_completed,
          (SELECT COUNT(*) FROM achievements WHERE is_active = true) as total_achievements,
          (SELECT COUNT(*) FROM user_badges WHERE user_id = u.id) as badges_earned,
          (SELECT COUNT(*) FROM badges) as total_badges,
          (SELECT COUNT(*) FROM user_daily_challenges WHERE user_id = u.id AND is_completed = true) as daily_challenges_completed
        FROM users u
        WHERE u.id = $1
      `;

      const result = await pool.query(statsQuery, [userId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const stats = result.rows[0];

      res.json({
        success: true,
        stats: {
          coins: parseInt(stats.coins) || 0,
          loginStreak: parseInt(stats.login_streak) || 0,
          achievementsCompleted: parseInt(stats.achievements_completed) || 0,
          totalAchievements: parseInt(stats.total_achievements) || 0,
          badgesEarned: parseInt(stats.badges_earned) || 0,
          totalBadges: parseInt(stats.total_badges) || 0,
          dailyChallengesCompleted: parseInt(stats.daily_challenges_completed) || 0,
          completionRate: stats.total_achievements > 0 
            ? Math.round((stats.achievements_completed / stats.total_achievements) * 100)
            : 0
        }
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to fetch user stats',
        details: error.message
      });
    }
  }
};

module.exports = gamificationController;
