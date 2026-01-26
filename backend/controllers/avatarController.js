const pool = require('../config/db');

const VALID_AVATARS = ['captain', 'navigator', 'strategist', 'advocate', 'polly'];

const selectAvatar = async (req, res) => {
  const { avatarType } = req.body;
  const userId = req.user.id;
  const userType = req.user.userType;

  try {
    if (userType !== 'individual' && userType !== 'client') {
      return res.status(403).json({ 
        error: 'Avatar selection is only available for individual users' 
      });
    }

    if (!avatarType || !VALID_AVATARS.includes(avatarType.toLowerCase())) {
      return res.status(400).json({ 
        error: 'Invalid avatar type. Must be one of: captain, navigator, strategist, advocate, polly' 
      });
    }

    const updateQuery = `
      UPDATE users 
      SET avatar_type = $1
      WHERE id = $2
      RETURNING id, avatar_type
    `;

    const result = await pool.query(updateQuery, [avatarType.toLowerCase(), userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }


    res.json({
      success: true,
      avatarType: result.rows[0].avatar_type,
      message: `Avatar updated to ${avatarType}`
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to update avatar' });
  }
};

const getCurrentAvatar = async (req, res) => {
  const userId = req.user.id;
  const userType = req.user.userType;

  try {
    if (userType !== 'individual' && userType !== 'client') {
      return res.status(403).json({ 
        error: 'Avatar features are only available for individual users' 
      });
    }

    const query = `
      SELECT avatar_type 
      FROM users 
      WHERE id = $1
    `;

    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const avatarType = result.rows[0].avatar_type || 'captain';

    res.json({
      avatarType,
      validAvatars: VALID_AVATARS
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to get avatar' });
  }
};

module.exports = {
  selectAvatar,
  getCurrentAvatar
};
