// ============================================
// SUBSCRIPTION PRICING TIERS
// ============================================

// Law Firm Base Prices (based on number of clients)
const lawFirmBasePrices = {
  small: 100,      // Under 100 clients
  medium: 500,     // 101-500 clients
  large: 1200,     // 501-1,000 clients
  enterprise: 2500 // 1,000+ clients
};

// Premium multiplier for law firms (35% more than basic)
const premiumMultiplier = 1.35;

// Medical provider discount (30% less than law firm pricing)
const medicalProviderDiscount = 0.70;

export const SUBSCRIPTION_TIERS = {
  individual: {
    free: { 
      price: 0, 
      name: 'Free', 
      features: [
        'Basic roadmap access',
        'Limited video library',
        '100 coin limit',
        'Community support'
      ] 
    },
    basic: { 
      price: 4.99, 
      name: 'Basic', 
      features: [
        'Full roadmap access',
        'Standard video library',
        'Unlimited coins',
        'Email support',
        'Document templates'
      ] 
    },
    premium: { 
      price: 11.99, 
      name: 'Premium', 
      features: [
        'Everything in Basic',
        'Premium video library',
        'Priority support',
        'Advanced document templates',
        'Legal form templates',
        'Monthly Q&A sessions'
      ] 
    }
  },
  lawfirm: {
    free: { 
      price: 0, 
      name: 'Free Trial', 
      features: [
        'Limited features',
        '30-day trial period',
        'Up to 10 clients',
        'Basic analytics'
      ] 
    },
    basic: {
      small: { 
        price: lawFirmBasePrices.small, 
        name: 'Basic - Small Firm', 
        subtitle: 'Under 100 clients',
        features: [
          'Up to 100 active clients',
          'Client case management',
          'Basic analytics dashboard',
          'Email support',
          'Document storage (10GB)',
          'Standard templates'
        ] 
      },
      medium: { 
        price: lawFirmBasePrices.medium, 
        name: 'Basic - Medium Firm', 
        subtitle: '101-500 clients',
        features: [
          'Up to 500 active clients',
          'Advanced client management',
          'Team collaboration tools',
          'Priority email support',
          'Enhanced analytics',
          'Document storage (50GB)'
        ] 
      },
      large: { 
        price: lawFirmBasePrices.large, 
        name: 'Basic - Large Firm', 
        subtitle: '501-1,000 clients',
        features: [
          'Up to 1,000 active clients',
          'Enterprise features',
          'Advanced reporting',
          'Phone support',
          'Custom workflows',
          'Document storage (100GB)'
        ] 
      },
      enterprise: { 
        price: lawFirmBasePrices.enterprise, 
        name: 'Basic - Enterprise', 
        subtitle: '1,000+ clients',
        features: [
          'Unlimited active clients',
          'Custom integrations',
          'Dedicated account manager',
          '24/7 phone support',
          'API access',
          'Unlimited document storage'
        ] 
      }
    },
    premium: {
      small: { 
        price: Math.round(lawFirmBasePrices.small * premiumMultiplier), 
        name: 'Premium - Small Firm', 
        subtitle: 'Under 100 clients',
        features: [
          'Everything in Basic',
          'White-label option',
          'Advanced automation',
          'Priority support',
          'Custom branding',
          'Client portal access'
        ] 
      },
      medium: { 
        price: Math.round(lawFirmBasePrices.medium * premiumMultiplier), 
        name: 'Premium - Medium Firm', 
        subtitle: '101-500 clients',
        features: [
          'Everything in Basic',
          'AI-powered insights',
          'Custom integrations',
          'Dedicated support team',
          'Monthly training sessions',
          'Advanced security features'
        ] 
      },
      large: { 
        price: Math.round(lawFirmBasePrices.large * premiumMultiplier), 
        name: 'Premium - Large Firm', 
        subtitle: '501-1,000 clients',
        features: [
          'Everything in Basic',
          'Advanced security & compliance',
          'Compliance tools',
          'Dedicated account manager',
          'Quarterly business reviews',
          'Custom development hours'
        ] 
      },
      enterprise: { 
        price: Math.round(lawFirmBasePrices.enterprise * premiumMultiplier), 
        name: 'Premium - Enterprise', 
        subtitle: '1,000+ clients',
        features: [
          'Everything in Basic',
          'Custom development',
          'White-glove onboarding',
          'Unlimited training',
          'SLA guarantees',
          'Strategic consulting'
        ] 
      }
    }
  },
  medicalprovider: {
    free: { 
      price: 0, 
      name: 'Free Trial', 
      features: [
        'Limited features',
        '30-day trial period',
        'Up to 10 patients',
        'Basic tracking'
      ] 
    },
    basic: {
      small: { 
        price: Math.round(lawFirmBasePrices.small * medicalProviderDiscount), 
        name: 'Basic - Small Practice', 
        subtitle: 'Under 100 patients',
        features: [
          'Up to 100 active patients',
          'Basic patient case tracking',
          'Medical Hub access',
          'Upload medical bills & records',
          'HIPAA-compliant storage (10GB)',
          'Email support'
        ] 
      },
      medium: { 
        price: Math.round(lawFirmBasePrices.medium * medicalProviderDiscount), 
        name: 'Basic - Medium Practice', 
        subtitle: '101-500 patients',
        features: [
          'Up to 500 active patients',
          'Basic patient case tracking',
          'Medical Hub access',
          'Upload medical bills & records',
          'HIPAA-compliant storage (50GB)',
          'Priority email support'
        ] 
      },
      large: { 
        price: Math.round(lawFirmBasePrices.large * medicalProviderDiscount), 
        name: 'Basic - Large Practice', 
        subtitle: '501-1,000 patients',
        features: [
          'Up to 1,000 active patients',
          'Basic patient case tracking',
          'Medical Hub access',
          'Upload medical bills & records',
          'HIPAA-compliant storage (100GB)',
          'Phone support'
        ] 
      },
      enterprise: { 
        price: Math.round(lawFirmBasePrices.enterprise * medicalProviderDiscount), 
        name: 'Basic - Enterprise', 
        subtitle: '1,000+ patients',
        features: [
          'Unlimited active patients',
          'Basic patient case tracking',
          'Medical Hub access',
          'Upload medical bills & records',
          'HIPAA-compliant storage (unlimited)',
          '24/7 support'
        ] 
      }
    },
    premium: {
      small: { 
        price: Math.round(lawFirmBasePrices.small * premiumMultiplier * medicalProviderDiscount), 
        name: 'Premium - Small Practice', 
        subtitle: 'Under 100 patients',
        features: [
          'Up to 100 active patients',
          'Premium patient case tracking',
          'Advanced Medical Hub features',
          'Upload medical bills & records',
          'HIPAA-compliant storage (10GB)',
          'Priority support',
          'Custom medical reports',
          'Analytics dashboard'
        ] 
      },
      medium: { 
        price: Math.round(lawFirmBasePrices.medium * premiumMultiplier * medicalProviderDiscount), 
        name: 'Premium - Medium Practice', 
        subtitle: '101-500 patients',
        features: [
          'Up to 500 active patients',
          'Premium patient case tracking',
          'Advanced Medical Hub features',
          'Upload medical bills & records',
          'HIPAA-compliant storage (50GB)',
          'Priority support',
          'Custom medical reports',
          'Advanced analytics'
        ] 
      },
      large: { 
        price: Math.round(lawFirmBasePrices.large * premiumMultiplier * medicalProviderDiscount), 
        name: 'Premium - Large Practice', 
        subtitle: '501-1,000 patients',
        features: [
          'Up to 1,000 active patients',
          'Premium patient case tracking',
          'Advanced Medical Hub features',
          'Upload medical bills & records',
          'HIPAA-compliant storage (100GB)',
          'Dedicated support',
          'Custom workflows',
          'Quality metrics'
        ] 
      },
      enterprise: { 
        price: Math.round(lawFirmBasePrices.enterprise * premiumMultiplier * medicalProviderDiscount), 
        name: 'Premium - Enterprise', 
        subtitle: '1,000+ patients',
        features: [
          'Unlimited active patients',
          'Premium patient case tracking',
          'Advanced Medical Hub features',
          'Upload medical bills & records',
          'HIPAA-compliant storage (unlimited)',
          'White-glove support',
          'Custom integrations',
          'Research database access'
        ] 
      }
    }
  }
};

export const FIRM_SIZES = {
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
  ENTERPRISE: 'enterprise'
};

export const TIER_LEVELS = {
  FREE: 'free',
  BASIC: 'basic',
  PREMIUM: 'premium'
};
