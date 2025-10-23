const pool = require('../config/db');
const auditLogger = require('../services/auditLogger');

const COINS_PER_CREDIT = 10;
const MAX_MONTHLY_CREDITS = 100;

const updateCoins = async (req, res) => {
  try {
    const userId = req.user.id;
    const { coinsDelta, source } = req.body;

    if (!coinsDelta || isNaN(coinsDelta)) {
      return res.status(400).json({ message: 'Invalid coins value' });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const userResult = await client.query(
        'SELECT total_coins, coins_spent FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'User not found' });
      }

      const currentCoins = userResult.rows[0].total_coins || 0;
      const coinsSpent = userResult.rows[0].coins_spent || 0;
      
      let newCoinTotal = currentCoins + coinsDelta;

      if (coinsDelta < 0) {
        const availableCoins = currentCoins - coinsSpent;
        
        if (availableCoins + coinsDelta < 0) {
          const refundAmount = Math.max(0, currentCoins - coinsSpent);
          newCoinTotal = Math.max(0, currentCoins + refundAmount);
          
          await client.query('ROLLBACK');
          return res.status(400).json({ 
            message: 'Cannot refund all coins - some were already converted to credits',
            maxRefund: refundAmount,
            coinsSpent: coinsSpent,
            availableCoins: availableCoins
          });
        }
        
        newCoinTotal = Math.max(0, newCoinTotal);
      }

      await client.query(
        'UPDATE users SET total_coins = $1 WHERE id = $2',
        [newCoinTotal, userId]
      );

      await auditLogger.log({
        actorId: userId,
        actorType: req.user.userType || 'client',
        action: coinsDelta > 0 ? 'COINS_EARNED' : 'COINS_REFUNDED',
        entityType: 'UserCoins',
        entityId: userId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: { 
          coinsDelta, 
          source: source || 'unknown',
          previousTotal: currentCoins,
          newTotal: newCoinTotal,
          coinsSpent: coinsSpent
        }
      });

      await client.query('COMMIT');

      res.json({ 
        success: true, 
        totalCoins: newCoinTotal,
        coinsSpent: coinsSpent,
        availableCoins: newCoinTotal - coinsSpent
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error updating coins:', error);
    res.status(500).json({ message: 'Failed to update coins' });
  }
};

const convertCoinsToCredits = async (req, res) => {
  try {
    const userId = req.user.id;
    const { coinsToConvert } = req.body;

    if (!coinsToConvert || isNaN(coinsToConvert) || coinsToConvert <= 0) {
      return res.status(400).json({ message: 'Invalid coins amount' });
    }

    if (coinsToConvert % COINS_PER_CREDIT !== 0) {
      return res.status(400).json({ 
        message: `Coins must be in multiples of ${COINS_PER_CREDIT}` 
      });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const userResult = await client.query(
        'SELECT total_coins, coins_spent FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'User not found' });
      }

      const totalCoins = userResult.rows[0].total_coins || 0;
      const coinsSpent = userResult.rows[0].coins_spent || 0;
      const availableCoins = totalCoins - coinsSpent;

      if (availableCoins < coinsToConvert) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          message: 'Insufficient available coins',
          availableCoins: availableCoins,
          totalCoins: totalCoins,
          coinsSpent: coinsSpent
        });
      }

      const creditsToAdd = Math.floor(coinsToConvert / COINS_PER_CREDIT);
      const cappedCredits = Math.min(creditsToAdd, MAX_MONTHLY_CREDITS);
      const actualCoinsUsed = cappedCredits * COINS_PER_CREDIT;
      const creditAmount = cappedCredits;

      const newCoinsSpent = coinsSpent + actualCoinsUsed;

      await client.query(
        'UPDATE users SET coins_spent = $1 WHERE id = $2',
        [newCoinsSpent, userId]
      );

      await client.query(
        `INSERT INTO coin_conversions 
         (user_id, coins_converted, credit_amount, conversion_rate, ip_address, notes) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          userId,
          actualCoinsUsed,
          creditAmount,
          COINS_PER_CREDIT,
          req.ip,
          `Converted ${actualCoinsUsed} coins to $${creditAmount} credit`
        ]
      );

      await auditLogger.log({
        actorId: userId,
        actorType: req.user.userType || 'client',
        action: 'COINS_CONVERTED',
        entityType: 'CoinConversion',
        entityId: userId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: { 
          coinsConverted: actualCoinsUsed,
          creditAmount: creditAmount,
          conversionRate: COINS_PER_CREDIT,
          newCoinsSpent: newCoinsSpent
        }
      });

      await client.query('COMMIT');

      res.json({ 
        success: true,
        coinsConverted: actualCoinsUsed,
        creditAmount: creditAmount,
        totalCoins: totalCoins,
        coinsSpent: newCoinsSpent,
        availableCoins: totalCoins - newCoinsSpent
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error converting coins:', error);
    res.status(500).json({ message: 'Failed to convert coins' });
  }
};

const getBalance = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      'SELECT total_coins, coins_spent FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const totalCoins = result.rows[0].total_coins || 0;
    const coinsSpent = result.rows[0].coins_spent || 0;
    const availableCoins = totalCoins - coinsSpent;

    res.json({
      totalCoins,
      coinsSpent,
      availableCoins
    });

  } catch (error) {
    console.error('Error getting coin balance:', error);
    res.status(500).json({ message: 'Failed to get coin balance' });
  }
};

const getConversionHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT 
        id,
        coins_converted,
        credit_amount,
        conversion_rate,
        converted_at,
        notes
       FROM coin_conversions
       WHERE user_id = $1
       ORDER BY converted_at DESC
       LIMIT 50`,
      [userId]
    );

    res.json({
      conversions: result.rows
    });

  } catch (error) {
    console.error('Error getting conversion history:', error);
    res.status(500).json({ message: 'Failed to get conversion history' });
  }
};

module.exports = {
  updateCoins,
  convertCoinsToCredits,
  getBalance,
  getConversionHistory
};
