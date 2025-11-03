const pool = require('../config/db');
const auditLogger = require('../services/auditLogger');

const COINS_PER_CREDIT = 5000; // 5,000 coins = $1
const MAX_LIFETIME_CREDITS = 5; // $5 lifetime cap per user account
const MAX_TOTAL_COINS = 25000; // Maximum coins a user can accumulate (treasure chest capacity)
const DAILY_BONUSES = [5, 7, 10, 12, 15, 20, 30]; // Daily streak bonus tiers

// Helper function to check if user's treasure chest is full and calculate coins that can be awarded
// IMPORTANT: The 25,000 coin cap ONLY applies to FREE coins earned (not purchased coins)
const checkTreasureChestCapacity = async (userId, coinsToAward) => {
  const userResult = await pool.query(
    'SELECT total_coins, purchased_coins, purchased_coins_spent, coins_spent FROM users WHERE id = $1',
    [userId]
  );
  
  if (userResult.rows.length === 0) {
    return { canAward: 0, isFull: false, currentCoins: 0, currentFreeCoins: 0 };
  }
  
  const currentTotalCoins = userResult.rows[0].total_coins || 0;
  const currentPurchasedCoins = userResult.rows[0].purchased_coins || 0;
  const purchasedCoinsSpent = userResult.rows[0].purchased_coins_spent || 0;
  const coinsSpent = userResult.rows[0].coins_spent || 0;
  
  // Calculate AVAILABLE free coins (not total free coins)
  const totalFreeCoins = currentTotalCoins - currentPurchasedCoins;
  const freeCoinsSpent = Math.max(0, coinsSpent - purchasedCoinsSpent);
  const availableFreeCoins = Math.max(0, totalFreeCoins - freeCoinsSpent);
  
  // Check if AVAILABLE FREE coins have reached the cap (purchased coins don't count toward cap)
  if (availableFreeCoins >= MAX_TOTAL_COINS) {
    return { 
      canAward: 0, 
      isFull: true, 
      currentCoins: currentTotalCoins,
      currentFreeCoins: availableFreeCoins,
      message: '🏴‍☠️ Your treasure chest is full! (Maximum 25,000 free coins reached). You can still purchase more coins!'
    };
  }
  
  const availableSpace = MAX_TOTAL_COINS - availableFreeCoins;
  const actualCoinsToAward = Math.min(coinsToAward, availableSpace);
  const willBeFull = (availableFreeCoins + actualCoinsToAward) >= MAX_TOTAL_COINS;
  
  return {
    canAward: actualCoinsToAward,
    isFull: willBeFull,
    currentCoins: currentTotalCoins,
    currentFreeCoins: availableFreeCoins,
    message: willBeFull ? '🏴‍☠️ Your treasure chest is now full! (Maximum 25,000 free coins reached). You can still purchase more coins!' : null
  };
};

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
        'SELECT total_coins, coins_spent, purchased_coins, purchased_coins_spent FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'User not found' });
      }

      const totalCoins = userResult.rows[0].total_coins || 0;
      const coinsSpent = userResult.rows[0].coins_spent || 0;
      const purchasedCoins = userResult.rows[0].purchased_coins || 0;
      const purchasedCoinsSpent = userResult.rows[0].purchased_coins_spent || 0;
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

      // Check lifetime conversion limit ($5 cap)
      const lifetimeResult = await client.query(
        'SELECT COALESCE(SUM(credit_amount), 0) as lifetime_credits FROM coin_conversions WHERE user_id = $1',
        [userId]
      );
      
      const lifetimeCredits = parseFloat(lifetimeResult.rows[0].lifetime_credits) || 0;
      const creditsToAdd = Math.floor(coinsToConvert / COINS_PER_CREDIT);
      const remainingLifetimeCredits = MAX_LIFETIME_CREDITS - lifetimeCredits;
      
      if (lifetimeCredits >= MAX_LIFETIME_CREDITS) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          message: `You've reached the lifetime conversion cap of $${MAX_LIFETIME_CREDITS}`,
          lifetimeCredits: lifetimeCredits,
          maxLifetimeCredits: MAX_LIFETIME_CREDITS,
          remainingCredits: 0
        });
      }

      if (creditsToAdd > remainingLifetimeCredits) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          message: `This conversion would exceed your lifetime cap of $${MAX_LIFETIME_CREDITS}. You can only convert $${remainingLifetimeCredits.toFixed(2)} more.`,
          lifetimeCredits: lifetimeCredits,
          maxLifetimeCredits: MAX_LIFETIME_CREDITS,
          remainingCredits: remainingLifetimeCredits,
          requestedCredits: creditsToAdd
        });
      }

      const cappedCredits = Math.min(creditsToAdd, remainingLifetimeCredits);
      const actualCoinsUsed = cappedCredits * COINS_PER_CREDIT;
      const creditAmount = cappedCredits;

      const newCoinsSpent = coinsSpent + actualCoinsUsed;
      
      // Calculate how many purchased vs free coins are being spent
      // Spend purchased coins first, then free coins
      const availablePurchasedCoins = purchasedCoins - purchasedCoinsSpent;
      const purchasedCoinsToSpend = Math.min(actualCoinsUsed, availablePurchasedCoins);
      const newPurchasedCoinsSpent = purchasedCoinsSpent + purchasedCoinsToSpend;

      await client.query(
        'UPDATE users SET coins_spent = $1, purchased_coins_spent = $2 WHERE id = $3',
        [newCoinsSpent, newPurchasedCoinsSpent, userId]
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

      const newLifetimeCredits = lifetimeCredits + creditAmount;
      const newRemainingCredits = MAX_LIFETIME_CREDITS - newLifetimeCredits;

      res.json({ 
        success: true,
        coinsConverted: actualCoinsUsed,
        creditAmount: creditAmount,
        totalCoins: totalCoins,
        coinsSpent: newCoinsSpent,
        availableCoins: totalCoins - newCoinsSpent,
        lifetimeCredits: newLifetimeCredits,
        maxLifetimeCredits: MAX_LIFETIME_CREDITS,
        remainingLifetimeCredits: newRemainingCredits
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

    const userResult = await pool.query(
      'SELECT total_coins, coins_spent, purchased_coins, purchased_coins_spent FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const totalCoins = userResult.rows[0].total_coins || 0;
    const coinsSpent = userResult.rows[0].coins_spent || 0;
    const purchasedCoins = userResult.rows[0].purchased_coins || 0;
    const purchasedCoinsSpent = userResult.rows[0].purchased_coins_spent || 0;
    
    // Calculate actual available coins by type
    const totalFreeCoins = totalCoins - purchasedCoins;
    const totalPurchasedCoins = purchasedCoins;
    
    // Available purchased coins (what's left after spending purchased coins)
    const availablePurchasedCoins = purchasedCoins - purchasedCoinsSpent;
    
    // Free coins spent = total spent - purchased spent
    const freeCoinsSpent = Math.max(0, coinsSpent - purchasedCoinsSpent);
    
    // Available free coins (what's left after spending free coins)
    const availableFreeCoins = Math.max(0, totalFreeCoins - freeCoinsSpent);
    
    // Total available
    const availableCoins = availablePurchasedCoins + availableFreeCoins;

    // Get lifetime conversions
    const lifetimeResult = await pool.query(
      'SELECT COALESCE(SUM(credit_amount), 0) as lifetime_credits FROM coin_conversions WHERE user_id = $1',
      [userId]
    );
    
    const lifetimeCredits = parseFloat(lifetimeResult.rows[0].lifetime_credits) || 0;
    const remainingLifetimeCredits = Math.max(0, MAX_LIFETIME_CREDITS - lifetimeCredits);

    res.json({
      totalCoins,
      coinsSpent,
      availableCoins,
      purchasedCoins: totalPurchasedCoins,
      freeCoins: totalFreeCoins,
      availablePurchasedCoins,
      availableFreeCoins,
      purchasedCoinsSpent,
      freeCoinsSpent,
      treasureChestCapacity: MAX_TOTAL_COINS,
      freeCoinsCapRemaining: Math.max(0, MAX_TOTAL_COINS - availableFreeCoins),
      lifetimeCredits,
      maxLifetimeCredits: MAX_LIFETIME_CREDITS,
      remainingLifetimeCredits
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

const claimDailyReward = async (req, res) => {
  try {
    const userId = req.user.id;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get user's current streak and last claim time
      const userResult = await client.query(
        'SELECT total_coins, login_streak, last_daily_claim_at FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'User not found' });
      }

      const user = userResult.rows[0];
      const lastClaimAt = user.last_daily_claim_at;
      const currentCoins = user.total_coins || 0;
      let currentStreak = user.login_streak || 0;

      // Check if user already claimed today
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      if (lastClaimAt) {
        const lastClaimDate = new Date(lastClaimAt);
        const lastClaimDay = new Date(lastClaimDate.getFullYear(), lastClaimDate.getMonth(), lastClaimDate.getDate());

        // Check if already claimed today
        if (lastClaimDay.getTime() === today.getTime()) {
          await client.query('ROLLBACK');
          return res.status(400).json({ 
            message: 'Daily reward already claimed today',
            alreadyClaimed: true,
            nextClaimAvailable: new Date(today.getTime() + 24 * 60 * 60 * 1000),
            currentStreak: currentStreak
          });
        }

        // Check if streak continues (claimed yesterday)
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        if (lastClaimDay.getTime() === yesterday.getTime()) {
          // Streak continues
          currentStreak++;
        } else {
          // Streak broken - reset to 1
          currentStreak = 1;
        }
      } else {
        // First time claiming
        currentStreak = 1;
      }

      // Calculate bonus based on streak (max out at 7 days)
      const streakIndex = Math.min(currentStreak - 1, DAILY_BONUSES.length - 1);
      const baseBonus = DAILY_BONUSES[streakIndex];
      
      // Check treasure chest capacity for FREE coins only (inline to avoid connection pool issues within transaction)
      // Get purchased coins and spending to calculate AVAILABLE free coins
      const purchasedCoinsResult = await client.query(
        'SELECT purchased_coins, purchased_coins_spent, coins_spent FROM users WHERE id = $1',
        [userId]
      );
      const purchasedCoins = purchasedCoinsResult.rows[0].purchased_coins || 0;
      const purchasedCoinsSpent = purchasedCoinsResult.rows[0].purchased_coins_spent || 0;
      const coinsSpentTotal = purchasedCoinsResult.rows[0].coins_spent || 0;
      
      const totalFreeCoins = currentCoins - purchasedCoins;
      const freeCoinsSpent = Math.max(0, coinsSpentTotal - purchasedCoinsSpent);
      const availableFreeCoins = Math.max(0, totalFreeCoins - freeCoinsSpent);
      
      let bonus = baseBonus;
      let treasureChestFull = false;
      let treasureChestMessage = null;
      
      // Check cap against AVAILABLE free coins (not total free coins)
      if (availableFreeCoins >= MAX_TOTAL_COINS) {
        bonus = 0;
        treasureChestFull = true;
        treasureChestMessage = '🏴‍☠️ Your treasure chest is full! (Maximum 25,000 free coins reached). You can still purchase more coins!';
      } else {
        const availableSpace = MAX_TOTAL_COINS - availableFreeCoins;
        bonus = Math.min(baseBonus, availableSpace);
        const willBeFull = (availableFreeCoins + bonus) >= MAX_TOTAL_COINS;
        treasureChestFull = willBeFull;
        treasureChestMessage = willBeFull ? '🏴‍☠️ Your treasure chest is now full! (Maximum 25,000 free coins reached). You can still purchase more coins!' : null;
      }
      
      const newCoinTotal = currentCoins + bonus;

      // Update user with new coins, streak, and last claim time
      await client.query(
        `UPDATE users 
         SET total_coins = $1, 
             login_streak = $2, 
             last_daily_claim_at = CURRENT_TIMESTAMP 
         WHERE id = $3`,
        [newCoinTotal, currentStreak, userId]
      );

      // Log the daily reward claim
      await auditLogger.log({
        actorId: userId,
        actorType: req.user.userType || 'client',
        action: 'DAILY_REWARD_CLAIMED',
        entityType: 'UserCoins',
        entityId: userId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: { 
          bonus: bonus,
          streak: currentStreak,
          previousCoins: currentCoins,
          newCoins: newCoinTotal
        }
      });

      await client.query('COMMIT');

      let message;
      if (treasureChestFull) {
        if (bonus === 0) {
          message = `${treasureChestMessage} You have ${currentStreak} day streak but cannot earn more coins.`;
        } else {
          message = `Daily bonus claimed! You earned ${bonus} coins! ${currentStreak} day streak! 🎉\n${treasureChestMessage}`;
        }
      } else {
        message = `Daily bonus claimed! You earned ${bonus} coins! ${currentStreak} day streak! 🎉`;
      }

      res.json({ 
        success: true,
        bonus: bonus,
        newStreak: currentStreak,
        totalCoins: newCoinTotal,
        treasureChestFull: treasureChestFull,
        maxCoins: MAX_TOTAL_COINS,
        message: message
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error claiming daily reward:', error);
    res.status(500).json({ message: 'Failed to claim daily reward' });
  }
};

// NOTE: updateCoins function is kept for internal use only but not exported
// to prevent arbitrary coin manipulation via API

module.exports = {
  // updateCoins - REMOVED from exports to prevent coin farming
  convertCoinsToCredits,
  getBalance,
  getConversionHistory,
  claimDailyReward,
  checkTreasureChestCapacity, // Export for use in other controllers
  MAX_TOTAL_COINS // Export constant for use in other controllers
};
