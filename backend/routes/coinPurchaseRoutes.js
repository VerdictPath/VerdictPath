const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../config/db');

// Coin packages configuration - Pirate treasure chests!
const COIN_PACKAGES = {
  small_chest: { coins: 4950, price: 99 }, // $0.99
  medium_chest: { coins: 9950, price: 199 }, // $1.99
  large_chest: { coins: 14950, price: 299 }, // $2.99
  treasure_chest: { coins: 19950, price: 399 }, // $3.99
  pirates_bounty: { coins: 24950, price: 499 } // $4.99
};

// Get available coin packages
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

// Create payment intent for coin purchase
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
        coinsToAward: package.coins.toString()
      },
      description: `Verdict Path - ${package.coins} Coins`
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

// Confirm coin purchase and award coins
router.post('/confirm-purchase', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { paymentIntentId } = req.body;
    const userId = req.user.id;

    if (!paymentIntentId) {
      return res.status(400).json({ message: 'Payment intent ID is required' });
    }

    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(503).json({ 
        message: 'Payment processing is not configured. Please contact support.' 
      });
    }

    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

    // Verify payment with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ message: 'Payment not completed' });
    }

    // Verify this payment belongs to this user
    if (parseInt(paymentIntent.metadata.userId) !== userId) {
      return res.status(403).json({ message: 'Unauthorized payment access' });
    }

    await client.query('BEGIN');

    // Check if this purchase was already processed
    const existingPurchase = await client.query(
      'SELECT id FROM coin_purchases WHERE payment_intent_id = $1',
      [paymentIntentId]
    );

    if (existingPurchase.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'This purchase has already been processed' });
    }

    const packageId = paymentIntent.metadata.packageId;
    const coinsToAward = parseInt(paymentIntent.metadata.coinsToAward);
    const amountPaid = paymentIntent.amount;

    // Record the purchase
    await client.query(
      `INSERT INTO coin_purchases 
       (user_id, payment_intent_id, package_id, coins_purchased, amount_paid) 
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, paymentIntentId, packageId, coinsToAward, amountPaid]
    );

    // Award coins to user (with 25,000 cap)
    const userResult = await client.query(
      'SELECT total_coins FROM users WHERE id = $1',
      [userId]
    );

    const currentCoins = userResult.rows[0].total_coins || 0;
    const newTotal = Math.min(currentCoins + coinsToAward, 25000);
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
      cappedAt25000: actualCoinsAwarded < coinsToAward
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error confirming coin purchase:', error);
    res.status(500).json({ message: 'Error processing coin purchase' });
  } finally {
    client.release();
  }
});

// Get user's coin purchase history
router.get('/history', authenticateToken, async (req, res) => {
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

module.exports = router;
