const express = require('express');
const router = express.Router();
const coinsController = require('../controllers/coinsController');
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../config/db');

/**
 * COINS API - Complete Coin Management System
 * 
 * Coin Earning:
 * - POST /claim-daily - Daily login rewards
 * - Substage completion - Via litigation endpoints
 * - Invite rewards - Via invite endpoints
 * 
 * Coin Purchasing (Treasure Chest):
 * - GET  /packages - Get available treasure chest packages
 * - POST /purchase - Credit coins after Stripe payment
 * - GET  /purchase-history - Get user's purchase history
 * 
 * Coin Usage:
 * - POST /convert - Convert coins to credits
 * - GET  /balance - Get current balance
 * - GET  /conversion-history - Get spending history
 */

// Coin packages configuration - Pirate treasure chests!
const COIN_PACKAGES = {
  small_chest: { coins: 4950, price: 99, name: 'Small Chest' }, // $0.99
  medium_chest: { coins: 9950, price: 199, name: 'Medium Chest' }, // $1.99
  large_chest: { coins: 14950, price: 299, name: 'Large Chest' }, // $2.99
  treasure_chest: { coins: 19950, price: 399, name: 'Treasure Chest' }, // $3.99
  pirates_bounty: { coins: 24950, price: 499, name: "Pirate's Bounty" } // $4.99
};

// ============================================================================
// COIN PURCHASING ENDPOINTS (Treasure Chest)
// ============================================================================

/**
 * GET /api/coins/packages
 * Get all available treasure chest packages
 */
router.get('/packages', authenticateToken, (req, res) => {
  try {
    const packages = Object.keys(COIN_PACKAGES).map(id => ({
      id,
      ...COIN_PACKAGES[id]
    }));
    res.json({ packages });
  } catch (error) {
    console.error('Error fetching coin packages:', error);
    res.status(500).json({ message: 'Error fetching coin packages' });
  }
});

/**
 * POST /api/coins/create-payment-intent
 * Create Stripe payment intent for coin purchase
 * Body: { packageId }
 * Returns: { clientSecret, amount, coins }
 */
router.post('/create-payment-intent', authenticateToken, async (req, res) => {
  try {
    const { packageId } = req.body;
    const userId = req.user.id;

    // Validate package
    if (!COIN_PACKAGES[packageId]) {
      return res.status(400).json({ message: 'Invalid package selected' });
    }

    const package = COIN_PACKAGES[packageId];

    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(503).json({ 
        message: 'Payment processing is not configured. Please contact support.' 
      });
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: package.price,
      currency: 'usd',
      metadata: {
        userId: userId.toString(),
        packageId,
        coinsToAward: package.coins.toString(),
        packageName: package.name
      },
      description: `Verdict Path - ${package.name} (${package.coins.toLocaleString()} coins)`
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      amount: package.price,
      coins: package.coins
    });
  } catch (error) {
    console.error('Error creating coin purchase payment intent:', error);
    res.status(500).json({ message: 'Error creating payment intent' });
  }
});

/**
 * POST /api/coins/purchase
 * Credit coins after successful Stripe payment
 * Body: { paymentIntentId, packageId, coins, amountPaid }
 */
router.post('/purchase', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { paymentIntentId, packageId, coins, amountPaid } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!paymentIntentId || !packageId || !coins || !amountPaid) {
      return res.status(400).json({ 
        message: 'Missing required fields: paymentIntentId, packageId, coins, amountPaid' 
      });
    }

    // Validate package
    if (!COIN_PACKAGES[packageId]) {
      return res.status(400).json({ message: 'Invalid package selected' });
    }

    // Verify package details match
    const expectedPackage = COIN_PACKAGES[packageId];
    if (expectedPackage.coins !== coins || expectedPackage.price !== amountPaid) {
      return res.status(400).json({ 
        message: 'Package details do not match expected values' 
      });
    }

    await client.query('BEGIN');

    // Check if this purchase was already processed (duplicate prevention)
    const existingPurchase = await client.query(
      'SELECT id FROM coin_purchases WHERE payment_intent_id = $1',
      [paymentIntentId]
    );

    if (existingPurchase.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'This purchase has already been processed' });
    }

    // Record the purchase
    await client.query(
      `INSERT INTO coin_purchases 
       (user_id, payment_intent_id, package_id, coins_purchased, amount_paid) 
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, paymentIntentId, packageId, coins, amountPaid]
    );

    // Award coins to user (with 25,000 cap)
    const userResult = await client.query(
      'SELECT total_coins FROM users WHERE id = $1',
      [userId]
    );

    const currentCoins = userResult.rows[0].total_coins || 0;
    const newTotal = Math.min(currentCoins + coins, 25000);
    const actualCoinsAwarded = newTotal - currentCoins;

    await client.query(
      'UPDATE users SET total_coins = $1 WHERE id = $2',
      [newTotal, userId]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Coins purchased successfully!',
      coinsAwarded: actualCoinsAwarded,
      totalCoins: newTotal,
      cappedAt25000: actualCoinsAwarded < coins
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing coin purchase:', error);
    res.status(500).json({ message: 'Error processing coin purchase' });
  } finally {
    client.release();
  }
});

/**
 * GET /api/coins/purchase-history
 * Get user's treasure chest purchase history
 */
router.get('/purchase-history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT 
        package_id,
        coins_purchased,
        amount_paid,
        purchased_at
       FROM coin_purchases
       WHERE user_id = $1
       ORDER BY purchased_at DESC
       LIMIT 50`,
      [userId]
    );

    res.json({ purchases: result.rows });
  } catch (error) {
    console.error('Error fetching coin purchase history:', error);
    res.status(500).json({ message: 'Error fetching purchase history' });
  }
});

// ============================================================================
// COIN USAGE ENDPOINTS (Original)
// ============================================================================

router.post('/convert', authenticateToken, coinsController.convertCoinsToCredits);

router.get('/balance', authenticateToken, coinsController.getBalance);

router.get('/conversion-history', authenticateToken, coinsController.getConversionHistory);

router.post('/claim-daily', authenticateToken, coinsController.claimDailyReward);

module.exports = router;
