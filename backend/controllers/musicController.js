const pool = require('../config/db');

const VALID_PREFERENCES = ['avatar', 'ambient', 'off'];

const getMusicPreference = async (req, res) => {
  const userId = req.user.id;
  const userType = req.user.userType;

  try {
    if (userType !== 'individual' && userType !== 'client') {
      return res.status(403).json({
        error: 'Music preferences are only available for individual users'
      });
    }

    const result = await pool.query(
      'SELECT music_preference, avatar_type FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      musicPreference: result.rows[0].music_preference || 'off',
      avatarType: result.rows[0].avatar_type || 'captain'
    });
  } catch (error) {
    console.error('[Music] Error getting preference:', error);
    res.status(500).json({ error: 'Failed to get music preference' });
  }
};

const updateMusicPreference = async (req, res) => {
  const userId = req.user.id;
  const userType = req.user.userType;
  const { musicPreference } = req.body;

  try {
    if (userType !== 'individual' && userType !== 'client') {
      return res.status(403).json({
        error: 'Music preferences are only available for individual users'
      });
    }

    if (!musicPreference || !VALID_PREFERENCES.includes(musicPreference)) {
      return res.status(400).json({
        error: `Invalid music preference. Must be one of: ${VALID_PREFERENCES.join(', ')}`
      });
    }

    const result = await pool.query(
      'UPDATE users SET music_preference = $1 WHERE id = $2 RETURNING id, music_preference',
      [musicPreference, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      musicPreference: result.rows[0].music_preference,
      message: `Music preference updated to ${musicPreference}`
    });
  } catch (error) {
    console.error('[Music] Error updating preference:', error);
    res.status(500).json({ error: 'Failed to update music preference' });
  }
};

module.exports = {
  getMusicPreference,
  updateMusicPreference
};
