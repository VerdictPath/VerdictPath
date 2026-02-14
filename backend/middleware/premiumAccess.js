const db = require('../config/db');

const IS_LAUNCH_PROMO = true;

const requirePremiumLawFirm = async (req, res, next) => {
  try {
    if (req.user.userType !== 'lawfirm') {
      return res.status(400).json({ 
        error: 'This endpoint is only accessible to law firms'
      });
    }

    const lawFirmId = req.user.id;
    
    const result = await db.query(
      'SELECT plan_type, subscription_tier, firm_size, stripe_customer_id FROM law_firms WHERE id = $1',
      [lawFirmId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Law firm not found' });
    }

    const lawFirm = result.rows[0];
    const planType = lawFirm.plan_type || 'standard';

    if (!IS_LAUNCH_PROMO && planType !== 'premium') {
      return res.status(403).json({ 
        error: 'Premium subscription required',
        message: 'Settlement disbursements are only available with a Premium plan. Upgrade your subscription to unlock this feature.',
        requiresUpgrade: true,
        currentPlan: planType
      });
    }

    req.lawFirm = {
      id: lawFirmId,
      planType: IS_LAUNCH_PROMO ? 'premium' : planType,
      tier: lawFirm.subscription_tier,
      firmSize: lawFirm.firm_size,
      stripeCustomerId: lawFirm.stripe_customer_id
    };

    next();
  } catch (error) {
    console.error('Error checking premium access:', error);
    res.status(500).json({ error: 'Failed to verify subscription access' });
  }
};

module.exports = {
  requirePremiumLawFirm
};
