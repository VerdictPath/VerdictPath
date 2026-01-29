// Backend: routes/stripe-connect.js
// Handles Stripe payment setup for law firms (as Customers) and 
// Stripe Connect accounts for clients/medical providers (as recipients)

const express = require('express');
const router = express.Router();
const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;
const { authenticateToken } = require('../middleware/auth');
const db = require('../config/db');

// Warn if Stripe is not configured
if (!stripe) {
  console.warn('⚠️  STRIPE_SECRET_KEY not found - Stripe Connect routes will be disabled');
}

// Get base URL for redirects
const getBaseUrl = () => {
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  }
  return 'http://localhost:5000';
};

// Helper to get law firm ID for law firm users
const getLawFirmId = async (userId, userType) => {
  if (userType === 'lawfirm') {
    return userId;
  }
  if (userType === 'lawfirm_user') {
    const result = await db.query(
      'SELECT law_firm_id FROM law_firm_users WHERE id = $1',
      [userId]
    );
    return result.rows[0]?.law_firm_id;
  }
  return null;
};

// Check if user is a law firm or law firm user
const isLawFirmRole = (userType) => {
  return userType === 'lawfirm' || userType === 'lawfirm_user';
};

// ============================================================
// LAW FIRM ENDPOINTS (Stripe Customer - they PAY money)
// ============================================================

/**
 * POST /api/stripe-connect/create-customer
 * Create a Stripe Customer for law firm to make payments
 */
router.post('/create-customer', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.userType;

    if (!isLawFirmRole(userType)) {
      return res.status(403).json({ error: 'Only law firms can create customer accounts' });
    }

    // Get the law firm ID (for law firm users, look up parent firm)
    const lawFirmId = await getLawFirmId(userId, userType);
    if (!lawFirmId) {
      return res.status(404).json({ error: 'Law firm not found' });
    }

    // Get law firm details
    const lawFirmResult = await db.query(
      'SELECT id, firm_name, email, stripe_customer_id FROM law_firms WHERE id = $1',
      [lawFirmId]
    );

    if (lawFirmResult.rows.length === 0) {
      return res.status(404).json({ error: 'Law firm not found' });
    }

    const lawFirm = lawFirmResult.rows[0];
    let customerId = lawFirm.stripe_customer_id;

    // Create customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: lawFirm.email,
        name: lawFirm.firm_name,
        metadata: {
          law_firm_id: lawFirm.id,
          type: 'law_firm'
        }
      });

      customerId = customer.id;

      // Save customer ID to database
      await db.query(
        'UPDATE law_firms SET stripe_customer_id = $1 WHERE id = $2',
        [customerId, lawFirmId]
      );
    }

    res.json({
      success: true,
      customerId: customerId
    });

  } catch (error) {
    console.error('Error creating Stripe customer:', error);
    res.status(500).json({ error: 'Failed to create customer account' });
  }
});

/**
 * POST /api/stripe-connect/create-setup-intent
 * Create a SetupIntent to save a payment method for law firm
 */
router.post('/create-setup-intent', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.userType;

    if (!isLawFirmRole(userType)) {
      return res.status(403).json({ error: 'Only law firms can set up payment methods' });
    }

    const lawFirmId = await getLawFirmId(userId, userType);
    if (!lawFirmId) {
      return res.status(404).json({ error: 'Law firm not found' });
    }

    // Get or create customer first
    let lawFirmResult = await db.query(
      'SELECT stripe_customer_id, firm_name, email FROM law_firms WHERE id = $1',
      [lawFirmId]
    );

    let customerId = lawFirmResult.rows[0]?.stripe_customer_id;

    if (!customerId) {
      // Create customer first
      const customer = await stripe.customers.create({
        email: lawFirmResult.rows[0].email,
        name: lawFirmResult.rows[0].firm_name,
        metadata: {
          law_firm_id: lawFirmId,
          type: 'law_firm'
        }
      });

      customerId = customer.id;

      await db.query(
        'UPDATE law_firms SET stripe_customer_id = $1 WHERE id = $2',
        [customerId, lawFirmId]
      );
    }

    // Create SetupIntent
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session',
      metadata: {
        law_firm_id: lawFirmId
      }
    });

    res.json({
      success: true,
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id
    });

  } catch (error) {
    console.error('Error creating setup intent:', error);
    res.status(500).json({ error: 'Failed to create payment setup' });
  }
});

/**
 * POST /api/stripe-connect/create-billing-portal
 * Create a Stripe Billing Portal session for law firm to manage payment methods
 */
router.post('/create-billing-portal', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.userType;

    if (!isLawFirmRole(userType)) {
      return res.status(403).json({ error: 'Only law firms can access billing portal' });
    }

    const lawFirmId = await getLawFirmId(userId, userType);
    if (!lawFirmId) {
      return res.status(404).json({ error: 'Law firm not found' });
    }

    const lawFirmResult = await db.query(
      'SELECT stripe_customer_id FROM law_firms WHERE id = $1',
      [lawFirmId]
    );

    const customerId = lawFirmResult.rows[0]?.stripe_customer_id;

    if (!customerId) {
      return res.status(400).json({ error: 'No payment account found. Please set up payment first.' });
    }

    const baseUrl = getBaseUrl();
    
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/stripe/complete?type=billing`
    });

    res.json({
      success: true,
      url: session.url
    });

  } catch (error) {
    console.error('Error creating billing portal:', error);
    res.status(500).json({ error: 'Failed to access billing portal' });
  }
});

/**
 * GET /api/stripe-connect/customer-status
 * Check law firm's Stripe Customer status and payment methods
 */
router.get('/customer-status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.userType;

    if (!isLawFirmRole(userType)) {
      return res.status(403).json({ error: 'Only law firms can check customer status' });
    }

    const lawFirmId = await getLawFirmId(userId, userType);
    if (!lawFirmId) {
      return res.status(404).json({ error: 'Law firm not found' });
    }

    const lawFirmResult = await db.query(
      'SELECT stripe_customer_id FROM law_firms WHERE id = $1',
      [lawFirmId]
    );

    const customerId = lawFirmResult.rows[0]?.stripe_customer_id;

    if (!customerId) {
      return res.json({
        hasCustomer: false,
        hasPaymentMethod: false,
        paymentMethods: [],
        flow: 'customer'
      });
    }

    // Get customer and their payment methods
    const customer = await stripe.customers.retrieve(customerId);
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card'
    });

    const hasDefaultPayment = customer.invoice_settings?.default_payment_method || 
                              paymentMethods.data.length > 0;

    res.json({
      hasCustomer: true,
      hasPaymentMethod: hasDefaultPayment,
      defaultPaymentMethodId: customer.invoice_settings?.default_payment_method,
      paymentMethods: paymentMethods.data.map(pm => ({
        id: pm.id,
        brand: pm.card.brand,
        last4: pm.card.last4,
        expMonth: pm.card.exp_month,
        expYear: pm.card.exp_year
      })),
      flow: 'customer'
    });

  } catch (error) {
    console.error('Error checking customer status:', error);
    res.status(500).json({ error: 'Failed to check payment status' });
  }
});

/**
 * POST /api/stripe-connect/set-default-payment-method
 * Set the default payment method for a law firm customer
 */
router.post('/set-default-payment-method', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.userType;
    const { paymentMethodId } = req.body;

    if (!isLawFirmRole(userType)) {
      return res.status(403).json({ error: 'Only law firms can set payment methods' });
    }

    const lawFirmId = await getLawFirmId(userId, userType);
    if (!lawFirmId) {
      return res.status(404).json({ error: 'Law firm not found' });
    }

    const lawFirmResult = await db.query(
      'SELECT stripe_customer_id FROM law_firms WHERE id = $1',
      [lawFirmId]
    );

    const customerId = lawFirmResult.rows[0]?.stripe_customer_id;

    if (!customerId) {
      return res.status(400).json({ error: 'No customer account found' });
    }

    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId
      }
    });

    res.json({ success: true });

  } catch (error) {
    console.error('Error setting default payment method:', error);
    res.status(500).json({ error: 'Failed to set default payment method' });
  }
});

// ============================================================
// RECIPIENT ENDPOINTS (Stripe Connect - they RECEIVE money)
// For clients and medical providers
// ============================================================

/**
 * POST /api/stripe-connect/create-account
 * Create a Stripe Connect Express account for receiving payments
 */
router.post('/create-account', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.userType;

    // Law firms should use customer endpoints, not connect
    if (isLawFirmRole(userType)) {
      return res.status(400).json({ 
        error: 'Law firms should use /create-customer endpoint instead',
        redirect: 'customer',
        flow: 'customer'
      });
    }

    // Get user email from database (security: don't trust client-provided email)
    let userQuery;
    let emailField = 'email';
    if (userType === 'individual' || userType === 'client') {
      userQuery = 'SELECT email, stripe_account_id FROM users WHERE id = $1';
    } else if (userType === 'medical_provider') {
      userQuery = 'SELECT email, stripe_account_id FROM medical_providers WHERE id = $1';
    } else {
      return res.status(400).json({ error: `Unsupported account type: ${userType}`, flow: 'unknown' });
    }

    const existingResult = await db.query(userQuery, [userId]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userEmail = existingResult.rows[0].email;
    let accountId = existingResult.rows[0]?.stripe_account_id;

    // Only create a new account if one doesn't exist
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: userEmail,
        capabilities: {
          transfers: { requested: true }
        },
        business_type: 'individual',
        metadata: {
          user_id: userId,
          user_type: userType
        }
      });

      accountId = account.id;

      // Store Stripe account ID in database
      let updateQuery;
      if (userType === 'individual' || userType === 'client') {
        updateQuery = 'UPDATE users SET stripe_account_id = $1 WHERE id = $2';
      } else if (userType === 'medical_provider') {
        updateQuery = 'UPDATE medical_providers SET stripe_account_id = $1 WHERE id = $2';
      }

      await db.query(updateQuery, [accountId, userId]);
    }

    const baseUrl = getBaseUrl();

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/stripe/reauth`,
      return_url: `${baseUrl}/stripe/complete`,
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
 * Check user's Stripe account status (role-aware)
 */
router.get('/account-status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.userType;

    // For law firms and law firm users, check customer status
    if (isLawFirmRole(userType)) {
      const lawFirmId = await getLawFirmId(userId, userType);
      if (!lawFirmId) {
        return res.status(404).json({ error: 'Law firm not found' });
      }

      const lawFirmResult = await db.query(
        'SELECT stripe_customer_id FROM law_firms WHERE id = $1',
        [lawFirmId]
      );

      const customerId = lawFirmResult.rows[0]?.stripe_customer_id;

      if (!customerId) {
        return res.json({
          hasAccount: false,
          onboardingComplete: false,
          isCustomer: true,
          flow: 'customer'
        });
      }

      // Get customer and payment methods
      const customer = await stripe.customers.retrieve(customerId);
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card'
      });

      const hasPaymentMethod = customer.invoice_settings?.default_payment_method || 
                               paymentMethods.data.length > 0;

      return res.json({
        hasAccount: true,
        onboardingComplete: hasPaymentMethod,
        isCustomer: true,
        flow: 'customer',
        customerId: customerId,
        hasPaymentMethod: hasPaymentMethod,
        paymentMethods: paymentMethods.data.map(pm => ({
          id: pm.id,
          brand: pm.card.brand,
          last4: pm.card.last4
        }))
      });
    }

    // For clients and medical providers (Connect accounts)
    let query;
    if (userType === 'individual' || userType === 'client') {
      query = 'SELECT stripe_account_id FROM users WHERE id = $1';
    } else if (userType === 'medical_provider') {
      query = 'SELECT stripe_account_id FROM medical_providers WHERE id = $1';
    } else {
      return res.status(400).json({ error: `Unsupported account type: ${userType}`, flow: 'unknown' });
    }

    const result = await db.query(query, [userId]);
    const stripeAccountId = result.rows[0]?.stripe_account_id;

    if (!stripeAccountId) {
      return res.json({
        hasAccount: false,
        onboardingComplete: false,
        isCustomer: false,
        flow: 'connect'
      });
    }

    // Check account status with Stripe
    const account = await stripe.accounts.retrieve(stripeAccountId);

    // For recipients, payouts_enabled is the key indicator
    res.json({
      hasAccount: true,
      onboardingComplete: account.details_submitted && account.payouts_enabled,
      isCustomer: false,
      flow: 'connect',
      accountId: stripeAccountId,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted
    });

  } catch (error) {
    console.error('Error checking account status:', error);
    res.status(500).json({ error: 'Failed to check account status' });
  }
});

/**
 * POST /api/stripe-connect/create-dashboard-link
 * Create a login link to Stripe Express Dashboard (for recipients)
 */
router.post('/create-dashboard-link', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.userType;

    // Law firms should use billing portal
    if (isLawFirmRole(userType)) {
      return res.status(400).json({ 
        error: 'Law firms should use /create-billing-portal endpoint instead',
        redirect: 'billing-portal'
      });
    }

    let query;
    if (userType === 'individual' || userType === 'client') {
      query = 'SELECT stripe_account_id FROM users WHERE id = $1';
    } else if (userType === 'medical_provider') {
      query = 'SELECT stripe_account_id FROM medical_providers WHERE id = $1';
    } else {
      return res.status(400).json({ error: `Unsupported account type: ${userType}` });
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

/**
 * POST /api/stripe-connect/create-onboarding-link
 * Create a new onboarding link for incomplete accounts
 */
router.post('/create-onboarding-link', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.userType;

    if (isLawFirmRole(userType)) {
      return res.status(400).json({ 
        error: 'Law firms do not use Connect onboarding',
        redirect: 'customer'
      });
    }

    let query;
    if (userType === 'individual' || userType === 'client') {
      query = 'SELECT stripe_account_id FROM users WHERE id = $1';
    } else if (userType === 'medical_provider') {
      query = 'SELECT stripe_account_id FROM medical_providers WHERE id = $1';
    } else {
      return res.status(400).json({ error: `Unsupported account type: ${userType}` });
    }

    const result = await db.query(query, [userId]);
    const stripeAccountId = result.rows[0]?.stripe_account_id;

    if (!stripeAccountId) {
      return res.status(400).json({ error: 'No Stripe account found. Create one first.' });
    }

    const baseUrl = getBaseUrl();

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${baseUrl}/stripe/reauth`,
      return_url: `${baseUrl}/stripe/complete`,
      type: 'account_onboarding'
    });

    res.json({
      success: true,
      onboardingUrl: accountLink.url
    });

  } catch (error) {
    console.error('Error creating onboarding link:', error);
    res.status(500).json({ error: 'Failed to create onboarding link' });
  }
});

module.exports = router;
