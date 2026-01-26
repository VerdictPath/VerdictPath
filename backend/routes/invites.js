const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { checkTreasureChestCapacity, MAX_TOTAL_COINS } = require('../controllers/coinsController');

// Generate a random invite code
function generateInviteCode() {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}

// Get or create user's invite code
router.get('/my-code', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.userType;

    // Get the domain from request headers or environment
    const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host || process.env.REPLIT_DEV_DOMAIN || 'localhost:5000';
    const baseUrl = `${protocol}://${host}`;

    // For law firms and medical providers, use their unique codes
    if (userType === 'lawfirm') {
      const firmCode = req.user.firmCode;
      return res.json({
        success: true,
        inviteCode: firmCode,
        shareText: `Join our law firm on Verdict Path! Use our firm code: ${firmCode}`,
        shareUrl: `${baseUrl}/?lawfirm=${firmCode}`
      });
    }

    if (userType === 'medical_provider') {
      const providerCode = req.user.providerCode;
      return res.json({
        success: true,
        inviteCode: providerCode,
        shareText: `Connect with our medical practice on Verdict Path! Use our provider code: ${providerCode}`,
        shareUrl: `${baseUrl}/?provider=${providerCode}`
      });
    }

    // For individual users, use the traditional invite system
    // Check if user already has an active invite code
    let result = await db.query(
      `SELECT invite_code FROM user_invites 
       WHERE referrer_user_id = $1 
       AND status = 'pending' 
       AND expires_at > NOW() 
       LIMIT 1`,
      [userId]
    );

    let inviteCode;
    if (result.rows.length > 0) {
      inviteCode = result.rows[0].invite_code;
    } else {
      // Generate a new unique invite code
      let codeExists = true;
      while (codeExists) {
        inviteCode = generateInviteCode();
        const check = await db.query(
          'SELECT id FROM user_invites WHERE invite_code = $1',
          [inviteCode]
        );
        codeExists = check.rows.length > 0;
      }

      // Create new invite record
      await db.query(
        `INSERT INTO user_invites (referrer_user_id, invite_code) 
         VALUES ($1, $2)`,
        [userId, inviteCode]
      );
    }

    res.json({
      success: true,
      inviteCode,
      shareText: `Join Verdict Path and chart your course to justice! Use my invite code: ${inviteCode}`,
      shareUrl: `${baseUrl}/?invite=${inviteCode}`
    });
  } catch (error) {
    console.error('Error generating invite code:', error);
    res.status(500).json({ error: 'Failed to generate invite code' });
  }
});

// Get user's invite statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get total invites sent, accepted, and coins earned
    const stats = await db.query(
      `SELECT 
        COUNT(*) as total_invites_sent,
        COUNT(CASE WHEN status = 'accepted' THEN 1 END) as total_accepted,
        COALESCE(SUM(coins_awarded), 0) as total_coins_earned
       FROM user_invites 
       WHERE referrer_user_id = $1`,
      [userId]
    );

    // Get recent invites
    const recentInvites = await db.query(
      `SELECT 
        invite_code,
        status,
        coins_awarded,
        created_at,
        accepted_at
       FROM user_invites 
       WHERE referrer_user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 10`,
      [userId]
    );

    res.json({
      success: true,
      stats: stats.rows[0],
      recentInvites: recentInvites.rows
    });
  } catch (error) {
    console.error('Error fetching invite stats:', error);
    res.status(500).json({ error: 'Failed to fetch invite statistics' });
  }
});

// Validate an invite code (public endpoint for registration)
router.get('/validate/:code', async (req, res) => {
  try {
    const { code } = req.params;

    const result = await db.query(
      `SELECT ui.id, ui.referrer_user_id, u.first_name, u.last_name
       FROM user_invites ui
       JOIN users u ON ui.referrer_user_id = u.id
       WHERE ui.invite_code = $1 
       AND ui.status = 'pending' 
       AND ui.expires_at > NOW()`,
      [code.toUpperCase()]
    );

    if (result.rows.length === 0) {
      return res.json({ 
        valid: false, 
        message: 'Invalid or expired invite code' 
      });
    }

    const invite = result.rows[0];
    res.json({
      valid: true,
      referrerName: `${invite.first_name} ${invite.last_name}`
    });
  } catch (error) {
    console.error('Error validating invite code:', error);
    res.status(500).json({ error: 'Failed to validate invite code' });
  }
});

// Process an invite (called during registration)
router.post('/process', async (req, res) => {
  try {
    const { inviteCode, newUserId } = req.body;

    if (!inviteCode || !newUserId) {
      return res.status(400).json({ error: 'Missing invite code or user ID' });
    }

    // Find the pending invite and check referrer's user type
    const inviteResult = await db.query(
      `SELECT ui.id, ui.referrer_user_id, u.user_type
       FROM user_invites ui
       JOIN users u ON ui.referrer_user_id = u.id
       WHERE ui.invite_code = $1 
       AND ui.status = 'pending' 
       AND ui.expires_at > NOW()`,
      [inviteCode.toUpperCase()]
    );

    if (inviteResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired invite code' });
    }

    const invite = inviteResult.rows[0];
    
    // Make sure referrer isn't inviting themselves
    if (invite.referrer_user_id === newUserId) {
      return res.status(400).json({ error: 'Cannot use your own invite code' });
    }

    // Only award coins to individual users, not law firms or medical providers
    const REFERRAL_REWARD_COINS = 500;
    const shouldAwardCoins = invite.user_type === 'individual';
    let coinsToAward = 0;
    let treasureChestFull = false;
    let treasureChestMessage = null;
    
    // Check treasure chest capacity before awarding coins
    if (shouldAwardCoins) {
      const capacity = await checkTreasureChestCapacity(invite.referrer_user_id, REFERRAL_REWARD_COINS);
      coinsToAward = capacity.canAward;
      treasureChestFull = capacity.isFull;
      treasureChestMessage = capacity.message;
    }

    // Update invite status
    await db.query(
      `UPDATE user_invites 
       SET status = 'accepted', 
           referee_user_id = $1, 
           accepted_at = NOW(),
           coins_awarded = $2
       WHERE id = $3`,
      [newUserId, coinsToAward, invite.id]
    );

    // Award coins only to individual users and only if treasure chest has space
    if (shouldAwardCoins && coinsToAward > 0) {
      await db.query(
        'UPDATE users SET total_coins = total_coins + $1 WHERE id = $2',
        [coinsToAward, invite.referrer_user_id]
      );
      console.log(`✅ Invite processed: User ${newUserId} accepted invite from User ${invite.referrer_user_id}. ${coinsToAward} coins awarded.`);
    } else if (shouldAwardCoins && coinsToAward === 0) {
      console.log(`⚠️ Invite processed: User ${newUserId} accepted invite from User ${invite.referrer_user_id}. No coins awarded - treasure chest is full!`);
    } else {
      console.log(`✅ Invite processed: User ${newUserId} accepted invite from ${invite.user_type} User ${invite.referrer_user_id}. No coins awarded (business account).`);
    }

    let message = shouldAwardCoins 
      ? (coinsToAward > 0 
        ? `Your friend earned ${coinsToAward} coins for inviting you!${treasureChestMessage ? ' ' + treasureChestMessage : ''}` 
        : treasureChestMessage || 'Invite accepted successfully!')
      : 'Invite accepted successfully!';

    res.json({
      success: true,
      coinsAwarded: coinsToAward,
      treasureChestFull: treasureChestFull,
      maxCoins: MAX_TOTAL_COINS,
      message: message
    });
  } catch (error) {
    console.error('Error processing invite:', error);
    res.status(500).json({ error: 'Failed to process invite' });
  }
});

module.exports = router;
