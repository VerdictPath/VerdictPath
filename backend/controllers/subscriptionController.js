const db = require('../config/db');
const { getLawFirmClientLimit, getMedicalProviderPatientLimit } = require('../utils/subscriptionLimits');

// Individual subscription pricing
const INDIVIDUAL_PRICING = {
  free: { monthly: 0, annual: 0 },
  basic: { monthly: 9.99, annual: 99.99 },
  premium: { monthly: 19.99, annual: 199.99 }
};

const updateLawFirmSubscription = async (req, res) => {
  try {
    const lawFirmId = req.user.id;
    const { subscriptionTier, firmSize, planType: topLevelPlanType } = req.body;

    if (!subscriptionTier) {
      return res.status(400).json({ error: 'Subscription tier is required' });
    }

    // Extract planType from either top level or firmSize object
    const planType = topLevelPlanType || (firmSize && firmSize.planType);

    // Validate plan type if provided
    if (planType && !['standard', 'premium'].includes(planType)) {
      return res.status(400).json({ error: 'Invalid plan type. Must be "standard" or "premium"' });
    }

    const lawFirmResult = await db.query(
      'SELECT id, subscription_tier, firm_size, plan_type FROM law_firms WHERE id = $1',
      [lawFirmId]
    );

    if (lawFirmResult.rows.length === 0) {
      return res.status(404).json({ error: 'Law firm not found' });
    }

    const lawFirm = lawFirmResult.rows[0];
    
    // Parse compound tiers (e.g., "soloshingle", "basicpremium", etc.)
    // Expected format: either "free" or compound tiers like "soloshingle"
    // Convert to canonical format: tier="free"|"paid" + firmSize
    let canonicalTier, canonicalSize;
    
    if (subscriptionTier === 'free') {
      canonicalTier = 'free';
      canonicalSize = null;
    } else {
      // Compound tier - extract size from the tier name
      // Common patterns: "soloshingle", "basicshingle", "standardboutique", etc.
      canonicalTier = 'paid';
      
      // Map display tier names to database values (same as registration)
      const tierNameMapping = {
        'Solo/Shingle': 'shingle',
        'Boutique': 'boutique',
        'Small Firm': 'small',
        'Medium-Small': 'medium',
        'Medium': 'medium',
        'Medium-Large': 'medium',
        'Large': 'large',
        'Regional': 'large',
        'Enterprise': 'enterprise'
      };
      
      // Extract firm size - handle both string and object formats (same as registration)
      if (firmSize) {
        if (typeof firmSize === 'string') {
          // Direct string: normalize using mapping or lowercase
          canonicalSize = (tierNameMapping[firmSize] || firmSize).toLowerCase();
        } else if (firmSize.tierName) {
          // Object with tierName property
          canonicalSize = (tierNameMapping[firmSize.tierName] || firmSize.tierName).toLowerCase();
        }
      } 
      
      // If size not found from firmSize, try to extract from compound tier name
      if (!canonicalSize) {
        // Try to extract size from tier name (shingle, boutique, small, medium, large, enterprise)
        const sizeMatch = subscriptionTier.match(/(shingle|boutique|small|medium|large|enterprise)$/i);
        if (sizeMatch) {
          canonicalSize = sizeMatch[1].toLowerCase();
        } else {
          return res.status(400).json({ 
            error: 'Invalid subscription tier format. Expected format: "free" or tier with size (e.g., "soloshingle")',
            receivedTier: subscriptionTier
          });
        }
      }
      
      // Validate that the extracted size is recognized
      const validSizes = ['shingle', 'boutique', 'small', 'medium', 'large', 'enterprise'];
      if (!validSizes.includes(canonicalSize)) {
        return res.status(400).json({ 
          error: 'Invalid firm size. Must be one of: shingle, boutique, small, medium, large, enterprise',
          receivedSize: canonicalSize
        });
      }
    }

    const clientCountResult = await db.query(
      'SELECT COUNT(*) as count FROM law_firm_clients WHERE law_firm_id = $1',
      [lawFirmId]
    );

    const currentClientCount = parseInt(clientCountResult.rows[0].count);
    const newLimit = getLawFirmClientLimit(canonicalTier, canonicalSize);

    if (currentClientCount > newLimit) {
      return res.status(400).json({ 
        error: `Avast! Ye cannot downgrade to this tier, matey! You currently have ${currentClientCount} clients, but this tier only allows ${newLimit}. Ye must reduce yer crew before changing course!`,
        currentCount: currentClientCount,
        newLimit: newLimit
      });
    }

    // Store canonical tier, size, and plan type for consistent limit calculations
    const updatePlanType = planType || lawFirm.plan_type || 'standard';
    await db.query(
      'UPDATE law_firms SET subscription_tier = $1, firm_size = $2, plan_type = $3 WHERE id = $4',
      [canonicalTier, canonicalSize, updatePlanType, lawFirmId]
    );

    res.json({
      success: true,
      message: 'Ahoy! Your subscription has been updated successfully!',
      subscription: {
        tier: canonicalTier,
        firmSize: canonicalSize,
        planType: updatePlanType,
        clientLimit: newLimit,
        currentClientCount: currentClientCount
      }
    });
  } catch (error) {
    console.error('Error updating law firm subscription:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
};

const updateMedicalProviderSubscription = async (req, res) => {
  try {
    const providerId = req.user.id;
    const { subscriptionTier, providerSize } = req.body;

    if (!subscriptionTier) {
      return res.status(400).json({ error: 'Subscription tier is required' });
    }

    const providerResult = await db.query(
      'SELECT id, subscription_tier, provider_size FROM medical_providers WHERE id = $1',
      [providerId]
    );

    if (providerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Medical provider not found' });
    }

    const provider = providerResult.rows[0];
    const newTier = subscriptionTier;
    
    let newSize = null;
    let planType = null;
    let billingPeriod = null;
    
    if (newTier !== 'free' && providerSize) {
      if (typeof providerSize === 'object') {
        newSize = newTier;
        planType = providerSize.planType || null;
        billingPeriod = providerSize.billingPeriod || null;
      } else {
        newSize = providerSize;
      }
    }

    const patientCountResult = await db.query(
      'SELECT COUNT(*) as count FROM medical_provider_patients WHERE medical_provider_id = $1',
      [providerId]
    );

    const currentPatientCount = parseInt(patientCountResult.rows[0].count);
    const newLimit = getMedicalProviderPatientLimit(newTier, newSize);

    if (currentPatientCount > newLimit) {
      return res.status(400).json({ 
        error: `Avast! Ye cannot downgrade to this tier! You currently have ${currentPatientCount} patients, but this tier only allows ${newLimit}. Reduce your patient roster before changing course!`,
        currentCount: currentPatientCount,
        newLimit: newLimit
      });
    }

    await db.query(
      'UPDATE medical_providers SET subscription_tier = $1, provider_size = $2 WHERE id = $3',
      [newTier, newSize, providerId]
    );

    res.json({
      success: true,
      message: 'Your subscription has been updated successfully!',
      subscription: {
        tier: newTier,
        providerSize: newSize,
        patientLimit: newLimit,
        currentPatientCount: currentPatientCount,
        planType: planType,
        billingPeriod: billingPeriod
      }
    });
  } catch (error) {
    console.error('Error updating medical provider subscription:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
};

const getLawFirmSubscription = async (req, res) => {
  try {
    const lawFirmId = req.user.id;

    const lawFirmResult = await db.query(
      'SELECT id, firm_name, email, subscription_tier, firm_size, plan_type FROM law_firms WHERE id = $1',
      [lawFirmId]
    );

    if (lawFirmResult.rows.length === 0) {
      return res.status(404).json({ error: 'Law firm not found' });
    }

    const lawFirm = lawFirmResult.rows[0];
    
    // Defensive parsing for legacy compound tiers (e.g., "soloshingle")
    let canonicalTier, canonicalSize;
    
    if (lawFirm.subscription_tier === 'free') {
      canonicalTier = 'free';
      canonicalSize = lawFirm.firm_size || null;
    } else if (lawFirm.subscription_tier === 'paid') {
      // Already canonical
      canonicalTier = 'paid';
      canonicalSize = lawFirm.firm_size;
    } else {
      // Legacy compound tier - extract size and convert
      canonicalTier = 'paid';
      const sizeMatch = lawFirm.subscription_tier.match(/(shingle|boutique|small|medium|large|enterprise)$/i);
      canonicalSize = sizeMatch ? sizeMatch[1].toLowerCase() : (lawFirm.firm_size || null);
    }

    const clientCountResult = await db.query(
      'SELECT COUNT(*) as count FROM law_firm_clients WHERE law_firm_id = $1',
      [lawFirmId]
    );

    const currentClientCount = parseInt(clientCountResult.rows[0].count);
    const currentLimit = getLawFirmClientLimit(canonicalTier, canonicalSize);
    const planType = lawFirm.plan_type || 'standard';

    res.json({
      subscription: {
        tier: canonicalTier,
        firmSize: canonicalSize,
        planType: planType,
        clientLimit: currentLimit,
        currentClientCount: currentClientCount,
        firmName: lawFirm.firm_name,
        email: lawFirm.email
      }
    });
  } catch (error) {
    console.error('Error fetching law firm subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription details' });
  }
};

const getMedicalProviderSubscription = async (req, res) => {
  try {
    const providerId = req.user.id;

    const providerResult = await db.query(
      'SELECT id, provider_name, email, subscription_tier, provider_size FROM medical_providers WHERE id = $1',
      [providerId]
    );

    if (providerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Medical provider not found' });
    }

    const provider = providerResult.rows[0];

    const patientCountResult = await db.query(
      'SELECT COUNT(*) as count FROM medical_provider_patients WHERE medical_provider_id = $1',
      [providerId]
    );

    const currentPatientCount = parseInt(patientCountResult.rows[0].count);
    const currentLimit = getMedicalProviderPatientLimit(provider.subscription_tier, provider.provider_size);

    res.json({
      subscription: {
        tier: provider.subscription_tier,
        providerSize: provider.provider_size,
        patientLimit: currentLimit,
        currentPatientCount: currentPatientCount,
        providerName: provider.provider_name,
        email: provider.email
      }
    });
  } catch (error) {
    console.error('Error fetching medical provider subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription details' });
  }
};

const getIndividualSubscription = async (req, res) => {
  try {
    const userId = req.user.id;

    const userResult = await db.query(
      'SELECT id, first_name, last_name, email, subscription_tier, subscription_price FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];
    const tier = user.subscription_tier || 'free';
    const pricing = INDIVIDUAL_PRICING[tier.toLowerCase()] || INDIVIDUAL_PRICING.free;

    res.json({
      subscription: {
        tier: tier,
        pricing: pricing,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Error fetching individual subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription details' });
  }
};

const updateIndividualSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const { subscriptionTier, billingCycle } = req.body;

    if (!subscriptionTier) {
      return res.status(400).json({ error: 'Subscription tier is required' });
    }

    const normalizedTier = subscriptionTier.toLowerCase();
    const validTiers = ['free', 'basic', 'premium'];

    if (!validTiers.includes(normalizedTier)) {
      return res.status(400).json({ 
        error: `Invalid subscription tier. Must be one of: ${validTiers.join(', ')}`,
        receivedTier: subscriptionTier
      });
    }

    const userResult = await db.query(
      'SELECT id, subscription_tier FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const pricing = INDIVIDUAL_PRICING[normalizedTier];
    const cycle = billingCycle && billingCycle.toLowerCase() === 'annual' ? 'annual' : 'monthly';
    const subscriptionPrice = pricing[cycle];

    await db.query(
      'UPDATE users SET subscription_tier = $1, subscription_price = $2 WHERE id = $3',
      [normalizedTier, subscriptionPrice, userId]
    );

    res.json({
      success: true,
      message: 'Your subscription has been updated successfully!',
      subscription: {
        tier: normalizedTier,
        billingCycle: cycle,
        price: subscriptionPrice,
        pricing: pricing
      }
    });
  } catch (error) {
    console.error('Error updating individual subscription:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
};

module.exports = {
  updateLawFirmSubscription,
  updateMedicalProviderSubscription,
  getLawFirmSubscription,
  getMedicalProviderSubscription,
  getIndividualSubscription,
  updateIndividualSubscription
};
