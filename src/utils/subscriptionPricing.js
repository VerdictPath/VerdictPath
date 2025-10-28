import { TIER_LEVELS, FIRM_SIZES, PRICING } from '../constants/subscriptionPricing';

export const getPrice = (userType, tier, firmSize) => {
  if (tier === TIER_LEVELS.FREE) {
    return 0;
  }

  if (userType === 'lawfirm') {
    return PRICING.lawfirm[tier]?.[firmSize] || 0;
  }

  if (userType === 'medicalprovider') {
    return PRICING.medicalprovider[tier]?.small || 0;
  }

  return 0;
};

export const getFeatures = (userType, tier) => {
  const features = {
    lawfirm: {
      [TIER_LEVELS.FREE]: [
        '10 clients maximum',
        'Basic litigation roadmap',
        'Client document storage',
        'Email support'
      ],
      [TIER_LEVELS.BASIC]: [
        'Based on firm size',
        'Full litigation roadmap',
        'HIPAA-compliant storage',
        'Priority email support',
        'Client progress tracking'
      ],
      [TIER_LEVELS.PREMIUM]: [
        'Based on firm size',
        'Everything in Basic',
        'Advanced analytics',
        'White-label options',
        'Dedicated support',
        'API access'
      ]
    },
    medicalprovider: {
      [TIER_LEVELS.FREE]: [
        '10 patients maximum',
        'Basic patient records',
        'Secure document storage',
        'Email support'
      ],
      [TIER_LEVELS.BASIC]: [
        'Up to 99 patients',
        'HIPAA-compliant storage',
        'Patient consent management',
        'Priority email support',
        'Evidence sharing with law firms'
      ],
      [TIER_LEVELS.PREMIUM]: [
        'Up to 99 patients',
        'Everything in Basic',
        'Advanced patient analytics',
        'Automated HIPAA forms',
        'Dedicated support',
        'API access'
      ]
    }
  };

  return features[userType]?.[tier] || [];
};
