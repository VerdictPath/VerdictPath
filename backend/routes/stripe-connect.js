// Backend: routes/stripe-connect.js
// Handles Stripe Connect account creation for law firms, clients, and medical providers

const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { authenticateToken } = require('../middleware/auth');
const db = require('../config/db');

// Get frontend URL for redirects
const getFrontendUrl = () => {
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  }
  if (process.env.RAILWAY_STATIC_URL) {
    return process.env.RAILWAY_STATIC_URL;
  }
  return 'http://localhost:5000';
};

/**
 * POST /api/stripe-connect/create-account
 * Create a Stripe Connect Express account for receiving payments
 */
router.post('/create-account', authenticateToken, async (req, res) => {
  try {
    const { accountType, email } = req.body; // accountType: 'client', 'medical_provider', 'law_firm'
    const userId = req.user.id;
    const userType = req.user.userType;

    // Check if user already has a Stripe account
    let checkQuery;
    if (userType === 'individual') {
      checkQuery = 'SELECT stripe_account_id FROM users WHERE id = $1';
    } else if (userType === 'medical_provider') {
      checkQuery = 'SELECT stripe_account_id FROM medical_providers WHERE id = $1';
    } else if (userType === 'lawfirm') {
      checkQuery = 'SELECT stripe_account_id FROM law_firms WHERE id = $1';
    }

    const existingResult = await db.query(checkQuery, [userId]);
    let accountId = existingResult.rows[0]?.stripe_account_id;

    // Only create a new account if one doesn't exist
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true }
        },
        business_type: accountType === 'law_firm' ? 'company' : 'individual'
      });

      accountId = account.id;

      // Store Stripe account ID in database
      let updateQuery;
      let updateParams;

      if (userType === 'individual') {
        updateQuery = 'UPDATE users SET stripe_account_id = $1 WHERE id = $2';
        updateParams = [accountId, userId];
      } else if (userType === 'medical_provider') {
        updateQuery = 'UPDATE medical_providers SET stripe_account_id = $1 WHERE id = $2';
        updateParams = [accountId, userId];
      } else if (userType === 'lawfirm') {
        updateQuery = 'UPDATE law_firms SET stripe_account_id = $1 WHERE id = $2';
        updateParams = [accountId, userId];
      }

      await db.query(updateQuery, updateParams);
    }

    const frontendUrl = getFrontendUrl();

    // Create account link for onboarding (works for both new and existing accounts)
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${frontendUrl}/stripe/reauth`,
      return_url: `${frontendUrl}/stripe/complete`,
      type: 'account_onboarding'
    });

    res.json({
      success: true,
      accountId: accountId,
      onboardingUrl: accountLink.url
    });

  } catch (error) {
    console.error('Error creating Stripe Connect account:', error);
    res.status(500).json({ error: 'Failed to create payment account' });
  }
});

/**
 * GET /api/stripe-connect/account-status
 * Check if user has completed Stripe onboarding
 */
router.get('/account-status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.userType;

    let query;
    let params = [userId];

    if (userType === 'individual') {
      query = 'SELECT stripe_account_id FROM users WHERE id = $1';
    } else if (userType === 'medical_provider') {
      query = 'SELECT stripe_account_id FROM medical_providers WHERE id = $1';
    } else if (userType === 'lawfirm') {
      query = 'SELECT stripe_account_id FROM law_firms WHERE id = $1';
    }

    const result = await db.query(query, params);
    const stripeAccountId = result.rows[0]?.stripe_account_id;

    if (!stripeAccountId) {
      return res.json({
        hasAccount: false,
        onboardingComplete: false
      });
    }

    // Check account status with Stripe
    const account = await stripe.accounts.retrieve(stripeAccountId);

    res.json({
      hasAccount: true,
      onboardingComplete: account.details_submitted && account.charges_enabled,
      accountId: stripeAccountId,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled
    });

  } catch (error) {
    console.error('Error checking account status:', error);
    res.status(500).json({ error: 'Failed to check account status' });
  }
});

/**
 * POST /api/stripe-connect/create-dashboard-link
 * Create a login link to Stripe Express Dashboard
 */
router.post('/create-dashboard-link', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.userType;

    let query;
    if (userType === 'individual') {
      query = 'SELECT stripe_account_id FROM users WHERE id = $1';
    } else if (userType === 'medical_provider') {
      query = 'SELECT stripe_account_id FROM medical_providers WHERE id = $1';
    } else if (userType === 'lawfirm') {
      query = 'SELECT stripe_account_id FROM law_firms WHERE id = $1';
    }

    const result = await db.query(query, [userId]);
    const stripeAccountId = result.rows[0]?.stripe_account_id;

    if (!stripeAccountId) {
      return res.status(400).json({ error: 'No Stripe account found' });
    }

    const loginLink = await stripe.accounts.createLoginLink(stripeAccountId);

    res.json({
      url: loginLink.url
    });

  } catch (error) {
    console.error('Error creating dashboard link:', error);
    res.status(500).json({ error: 'Failed to create dashboard link' });
  }
});

module.exports = router;
