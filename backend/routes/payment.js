const express = require('express');
const Stripe = require('stripe');
const { authenticateToken } = require('../middleware/auth');
const db = require('../config/db');

const router = express.Router();

/**
 * PAYMENT ROUTES - For Subscription Management
 * 
 * These routes handle Premium tier subscriptions.
 * For coin purchases, see /api/coin-purchases routes.
 * 
 * Note: Currently deprecated in favor of coin-based system.
 * Kept for future subscription feature implementation.
 */

// Stripe is optional - if not configured, payment routes will return 503
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  console.log('✅ Stripe configured successfully');
} else {
  console.warn('⚠️  STRIPE_SECRET_KEY not found - payment routes will be disabled');
}

router.post('/create-payment-intent', authenticateToken, async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ 
      error: 'Payment service not configured. Please add STRIPE_SECRET_KEY to environment variables.' 
    });
  }
  
  try {
    const { amount, description } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      description: description || 'Verdict Path Payment',
      metadata: {
        userId: req.user.id,
        userEmail: req.user.email,
        userType: req.user.user_type
      }
    });

    res.json({ 
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: 'Failed to create payment. Please try again.' });
  }
});

router.post('/create-subscription', authenticateToken, async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ 
      error: 'Payment service not configured. Please add STRIPE_SECRET_KEY to environment variables.' 
    });
  }
  
  try {
    const { priceId, subscriptionTier } = req.body;
    const userId = req.user.id;

    if (!priceId) {
      return res.status(400).json({ error: 'Price ID is required' });
    }

    const userResult = await db.query(
      'SELECT email, stripe_customer_id FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    let customerId = user.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: userId
        }
      });
      customerId = customer.id;

      await db.query(
        'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
        [customerId, userId]
      );
    }

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        userId: userId,
        subscriptionTier: subscriptionTier
      }
    });

    await db.query(
      'UPDATE users SET stripe_subscription_id = $1 WHERE id = $2',
      [subscription.id, userId]
    );

    res.json({
      subscriptionId: subscription.id,
      clientSecret: subscription.latest_invoice.payment_intent.client_secret
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: 'Failed to create subscription. Please try again.' });
  }
});

router.post('/cancel-subscription', authenticateToken, async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ 
      error: 'Payment service not configured. Please add STRIPE_SECRET_KEY to environment variables.' 
    });
  }
  
  try {
    const userId = req.user.id;

    const userResult = await db.query(
      'SELECT stripe_subscription_id FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const subscriptionId = userResult.rows[0].stripe_subscription_id;

    if (!subscriptionId) {
      return res.status(400).json({ error: 'No active subscription found' });
    }

    const subscription = await stripe.subscriptions.cancel(subscriptionId);

    await db.query(
      'UPDATE users SET stripe_subscription_id = NULL, subscription_tier = $1 WHERE id = $2',
      ['Free', userId]
    );

    res.json({ 
      message: 'Subscription cancelled successfully',
      subscription: subscription
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription. Please try again.' });
  }
});

router.get('/subscription-status', authenticateToken, async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ 
      error: 'Payment service not configured. Please add STRIPE_SECRET_KEY to environment variables.' 
    });
  }
  
  try {
    const userId = req.user.id;

    const userResult = await db.query(
      'SELECT stripe_subscription_id, subscription_tier FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    if (!user.stripe_subscription_id) {
      return res.json({
        hasSubscription: false,
        tier: user.subscription_tier || 'Free'
      });
    }

    const subscription = await stripe.subscriptions.retrieve(user.stripe_subscription_id);

    res.json({
      hasSubscription: true,
      tier: user.subscription_tier,
      status: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end
    });
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    res.status(500).json({ error: 'Failed to fetch subscription status' });
  }
});

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return res.status(400).send('Webhook secret not configured');
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send('Webhook signature verification failed');
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        const subscription = event.data.object;
        const subUserType = subscription.metadata.userType;
        
        if (subUserType === 'law_firm') {
          const lawFirmId = subscription.metadata.lawFirmId;
          const firmSize = subscription.metadata.firmSize;
          const subPlanType = subscription.metadata.planType;
          if (lawFirmId) {
            await db.query(
              `UPDATE law_firms SET subscription_tier = 'paid', firm_size = $1, plan_type = $2, stripe_subscription_id = $3 WHERE id = $4`,
              [firmSize, subPlanType, subscription.id, lawFirmId]
            );
          }
        } else {
          const userId = subscription.metadata.userId;
          const tier = subscription.metadata.subscriptionTier;
          if (userId && tier) {
            await db.query(
              'UPDATE users SET subscription_tier = $1, stripe_subscription_id = $2 WHERE id = $3',
              [tier, subscription.id, userId]
            );
          }
        }
        break;

      case 'customer.subscription.deleted':
        const deletedSub = event.data.object;
        const deletedUserType = deletedSub.metadata.userType;
        
        if (deletedUserType === 'law_firm') {
          const deletedLawFirmId = deletedSub.metadata.lawFirmId;
          if (deletedLawFirmId) {
            await db.query(
              `UPDATE law_firms SET subscription_tier = 'free', firm_size = NULL, plan_type = NULL, stripe_subscription_id = NULL WHERE id = $1`,
              [deletedLawFirmId]
            );
          }
        } else {
          const deletedUserId = deletedSub.metadata.userId;
          if (deletedUserId) {
            await db.query(
              'UPDATE users SET subscription_tier = $1, stripe_subscription_id = NULL WHERE id = $2',
              ['Free', deletedUserId]
            );
          }
        }
        break;
      
      case 'checkout.session.completed':
        const checkoutSession = event.data.object;
        const checkoutUserType = checkoutSession.metadata?.userType;
        if (checkoutUserType === 'law_firm') {
          const checkoutLawFirmId = checkoutSession.metadata.lawFirmId;
          const checkoutFirmSize = checkoutSession.metadata.firmSize;
          const checkoutPlanType = checkoutSession.metadata.planType;
          const checkoutSubId = checkoutSession.subscription;
          if (checkoutLawFirmId) {
            await db.query(
              `UPDATE law_firms SET subscription_tier = 'paid', firm_size = $1, plan_type = $2, stripe_subscription_id = $3 WHERE id = $4`,
              [checkoutFirmSize, checkoutPlanType, checkoutSubId, checkoutLawFirmId]
            );
          }
        }
        break;

      default:
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

router.post('/lawfirm/create-checkout-session', authenticateToken, async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ 
      error: 'Payment service not configured.' 
    });
  }
  
  try {
    const lawFirmId = req.user.id;
    const { firmSize, planType, billingPeriod, successUrl, cancelUrl } = req.body;

    if (!firmSize || !planType) {
      return res.status(400).json({ error: 'Firm size and plan type are required' });
    }

    const lawFirmResult = await db.query(
      'SELECT id, email, firm_name, stripe_customer_id FROM law_firms WHERE id = $1',
      [lawFirmId]
    );

    if (lawFirmResult.rows.length === 0) {
      return res.status(404).json({ error: 'Law firm not found' });
    }

    const lawFirm = lawFirmResult.rows[0];
    let customerId = lawFirm.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: lawFirm.email,
        name: lawFirm.firm_name,
        metadata: {
          lawFirmId: lawFirmId.toString(),
          userType: 'law_firm'
        }
      });
      customerId = customer.id;

      await db.query(
        'UPDATE law_firms SET stripe_customer_id = $1 WHERE id = $2',
        [customerId, lawFirmId]
      );
    }

    const LAUNCH_PROMO_PRICE_CENTS = 4000;
    const period = billingPeriod || 'monthly';

    const price = await stripe.prices.create({
      unit_amount: period === 'monthly' ? LAUNCH_PROMO_PRICE_CENTS : LAUNCH_PROMO_PRICE_CENTS * 10,
      currency: 'usd',
      recurring: {
        interval: period === 'monthly' ? 'month' : 'year'
      },
      product_data: {
        name: `Verdict Path Law Firm - ${firmSize} (${planType})`,
        metadata: {
          lawFirmId: lawFirmId.toString(),
          firmSize: firmSize,
          planType: planType,
          isLaunchPromo: 'true'
        }
      }
    });

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price: price.id,
        quantity: 1
      }],
      mode: 'subscription',
      success_url: successUrl || `${req.protocol}://${req.get('host')}/app/?subscription=success`,
      cancel_url: cancelUrl || `${req.protocol}://${req.get('host')}/app/?subscription=cancelled`,
      metadata: {
        lawFirmId: lawFirmId.toString(),
        firmSize: firmSize,
        planType: planType,
        userType: 'law_firm'
      },
      subscription_data: {
        metadata: {
          lawFirmId: lawFirmId.toString(),
          firmSize: firmSize,
          planType: planType,
          userType: 'law_firm'
        }
      }
    });

    res.json({
      sessionId: session.id,
      url: session.url
    });
  } catch (error) {
    console.error('Error creating law firm checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session. Please try again.' });
  }
});

router.post('/lawfirm/create-payment-intent', authenticateToken, async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ 
      error: 'Payment service not configured.' 
    });
  }
  
  try {
    const lawFirmId = req.user.id;
    const { firmSize, planType, billingPeriod } = req.body;

    if (!firmSize || !planType) {
      return res.status(400).json({ error: 'Firm size and plan type are required' });
    }

    const lawFirmResult = await db.query(
      'SELECT id, email, firm_name, stripe_customer_id FROM law_firms WHERE id = $1',
      [lawFirmId]
    );

    if (lawFirmResult.rows.length === 0) {
      return res.status(404).json({ error: 'Law firm not found' });
    }

    const lawFirm = lawFirmResult.rows[0];
    let customerId = lawFirm.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: lawFirm.email,
        name: lawFirm.firm_name,
        metadata: {
          lawFirmId: lawFirmId.toString(),
          userType: 'law_firm'
        }
      });
      customerId = customer.id;

      await db.query(
        'UPDATE law_firms SET stripe_customer_id = $1 WHERE id = $2',
        [customerId, lawFirmId]
      );
    }

    const LAUNCH_PROMO_PRICE_CENTS = 4000;
    const period = billingPeriod || 'monthly';

    const price = await stripe.prices.create({
      unit_amount: period === 'monthly' ? LAUNCH_PROMO_PRICE_CENTS : LAUNCH_PROMO_PRICE_CENTS * 10,
      currency: 'usd',
      recurring: {
        interval: period === 'monthly' ? 'month' : 'year'
      },
      product_data: {
        name: `Verdict Path Law Firm - ${firmSize} (${planType})`,
      }
    });

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: price.id }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        lawFirmId: lawFirmId.toString(),
        firmSize: firmSize,
        planType: planType,
        userType: 'law_firm'
      }
    });

    await db.query(
      'UPDATE law_firms SET stripe_subscription_id = $1 WHERE id = $2',
      [subscription.id, lawFirmId]
    );

    res.json({
      subscriptionId: subscription.id,
      clientSecret: subscription.latest_invoice.payment_intent.client_secret
    });
  } catch (error) {
    console.error('Error creating law firm payment intent:', error);
    res.status(500).json({ error: 'Failed to create payment. Please try again.' });
  }
});

router.post('/lawfirm/confirm-subscription', authenticateToken, async (req, res) => {
  try {
    const lawFirmId = req.user.id;
    const { subscriptionId, firmSize, planType } = req.body;

    if (!firmSize || !planType) {
      return res.status(400).json({ error: 'Firm size and plan type are required' });
    }

    await db.query(
      `UPDATE law_firms SET subscription_tier = 'paid', firm_size = $1, plan_type = $2, stripe_subscription_id = $3 WHERE id = $4`,
      [firmSize, planType, subscriptionId || null, lawFirmId]
    );

    const { getLawFirmClientLimit } = require('../utils/subscriptionLimits');
    const newLimit = getLawFirmClientLimit('paid', firmSize);

    res.json({
      success: true,
      message: 'Subscription activated successfully!',
      subscription: {
        tier: 'paid',
        firmSize: firmSize,
        planType: planType,
        clientLimit: newLimit
      }
    });
  } catch (error) {
    console.error('Error confirming law firm subscription:', error);
    res.status(500).json({ error: 'Failed to confirm subscription' });
  }
});

router.get('/prices', async (req, res) => {
  try {
    const prices = await stripe.prices.list({
      active: true,
      expand: ['data.product']
    });

    res.json({ prices: prices.data });
  } catch (error) {
    console.error('Error fetching prices:', error);
    res.status(500).json({ error: 'Failed to fetch pricing information' });
  }
});

module.exports = router;
