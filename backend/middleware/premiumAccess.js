const db = require('../config/db');

/**
 * Middleware to require premium law firm plan for protected features
 * Returns 403 Forbidden for non-premium firms with upgrade messaging
 */
const requirePremiumLawFirm = async (req, res, next) => {
  try {
    // Only apply to law firms
    if (req.user.userType !== 'lawfirm') {
      return res.status(400).json({ 
        error: 'This endpoint is only accessible to law firms'
      });
    }

    const lawFirmId = req.user.id;
    
    // Fetch law firm's subscription details
    const result = await db.query(
      'SELECT plan_type, subscription_tier, firm_size FROM law_firms WHERE id = $1',
      [lawFirmId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Law firm not found' });
    }

    const lawFirm = result.rows[0];
    const planType = lawFirm.plan_type || 'standard';

    // Check if law firm has premium plan
    if (planType !== 'premium') {
      return res.status(403).json({ 
        error: 'Premium subscription required',
        message: 'Settlement disbursements are only available with a Premium plan. Upgrade your subscription to unlock this feature.',
        requiresUpgrade: true,
        currentPlan: planType
      });
    }

    // Cache law firm metadata on request for downstream handlers
    req.lawFirm = {
      id: lawFirmId,
      planType: planType,
      tier: lawFirm.subscription_tier,
      firmSize: lawFirm.firm_size
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
