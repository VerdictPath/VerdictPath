// ============================================
// SUBSCRIPTION PRICING TIERS
// ============================================

// Law Firm Base Prices (based on number of clients)
const lawFirmBasePrices = {
  shingle: 40,     // 1-24 clients
  boutique: 70,    // 25-49 clients
  small: 100,      // 50-99 clients
  medium: 500,     // 100-499 clients
  large: 1200,     // 500-999 clients
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
      shingle: { 
        price: lawFirmBasePrices.shingle, 
        name: 'Basic - Shingle Firm', 
        subtitle: '1-24 clients',
        features: [
          'Basic package for your clients',
          'Document storage for your clients',
          'Basic analytics dashboard'
        ] 
      },
      boutique: { 
        price: lawFirmBasePrices.boutique, 
        name: 'Basic - Boutique Firm', 
        subtitle: '25-49 clients',
        features: [
          'Basic package for your clients',
          'Document storage for your clients',
          'Basic analytics dashboard'
        ] 
      },
      small: { 
        price: lawFirmBasePrices.small, 
        name: 'Basic - Small Firm', 
        subtitle: '50-99 clients',
        features: [
          'Basic package for your clients',
          'Document storage for your clients',
          'Basic analytics dashboard'
        ] 
      },
      medium: { 
        price: lawFirmBasePrices.medium, 
        name: 'Basic - Medium Firm', 
        subtitle: '100-499 clients',
        features: [
          'Basic package for your clients',
          'Document storage for your clients',
          'Basic analytics dashboard'
        ] 
      },
      large: { 
        price: lawFirmBasePrices.large, 
        name: 'Basic - Large Firm', 
        subtitle: '500-999 clients',
        features: [
          'Basic package for your clients',
          'Document storage for your clients',
          'Basic analytics dashboard'
        ] 
      },
      enterprise: { 
        price: lawFirmBasePrices.enterprise, 
        name: 'Basic - Enterprise', 
        subtitle: '1,000+ clients',
        features: [
          'Basic package for your clients',
          'Document storage for your clients',
          'Basic analytics dashboard'
        ] 
      }
    },
    premium: {
      shingle: { 
        price: Math.round(lawFirmBasePrices.shingle * premiumMultiplier), 
        name: 'Premium - Shingle Firm', 
        subtitle: '1-24 clients',
        features: [
          'Everything in Basic',
          'Custom branding',
          'Medical Hub',
          'Premium analytics',
          'HIPAA-Compliant Storage',
          'Download medical bills and records from patient and medical providers accounts'
        ] 
      },
      boutique: { 
        price: Math.round(lawFirmBasePrices.boutique * premiumMultiplier), 
        name: 'Premium - Boutique Firm', 
        subtitle: '25-49 clients',
        features: [
          'Everything in Basic',
          'Custom branding',
          'Medical Hub',
          'Premium analytics',
          'HIPAA-Compliant Storage',
          'Download medical bills and records from patient and medical providers accounts'
        ] 
      },
      small: { 
        price: Math.round(lawFirmBasePrices.small * premiumMultiplier), 
        name: 'Premium - Small Firm', 
        subtitle: '50-99 clients',
        features: [
          'Everything in Basic',
          'Custom branding',
          'Medical Hub',
          'Premium analytics',
          'HIPAA-Compliant Storage',
          'Download medical bills and records from patient and medical providers accounts'
        ] 
      },
      medium: { 
        price: Math.round(lawFirmBasePrices.medium * premiumMultiplier), 
        name: 'Premium - Medium Firm', 
        subtitle: '100-499 clients',
        features: [
          'Everything in Basic',
          'Custom branding',
          'Medical Hub',
          'Premium analytics',
          'HIPAA-Compliant Storage',
          'Download medical bills and records from patient and medical providers accounts'
        ] 
      },
      large: { 
        price: Math.round(lawFirmBasePrices.large * premiumMultiplier), 
        name: 'Premium - Large Firm', 
        subtitle: '500-999 clients',
        features: [
          'Everything in Basic',
          'Custom branding',
          'Medical Hub',
          'Premium analytics',
          'HIPAA-Compliant Storage',
          'Download medical bills and records from patient and medical providers accounts'
        ] 
      },
      enterprise: { 
        price: Math.round(lawFirmBasePrices.enterprise * premiumMultiplier), 
        name: 'Premium - Enterprise', 
        subtitle: '1,000+ clients',
        features: [
          'Everything in Basic',
          'Custom branding',
          'Medical Hub',
          'Premium analytics',
          'HIPAA-Compliant Storage',
          'Download medical bills and records from patient and medical providers accounts'
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
          'Basic package for your patients',
          'Document storage for your patients',
          'Basic analytics dashboard'
        ] 
      },
      medium: { 
        price: Math.round(lawFirmBasePrices.medium * medicalProviderDiscount), 
        name: 'Basic - Medium Practice', 
        subtitle: '101-500 patients',
        features: [
          'Basic package for your patients',
          'Document storage for your patients',
          'Basic analytics dashboard'
        ] 
      },
      large: { 
        price: Math.round(lawFirmBasePrices.large * medicalProviderDiscount), 
        name: 'Basic - Large Practice', 
        subtitle: '501-1,000 patients',
        features: [
          'Basic package for your patients',
          'Document storage for your patients',
          'Basic analytics dashboard'
        ] 
      },
      enterprise: { 
        price: Math.round(lawFirmBasePrices.enterprise * medicalProviderDiscount), 
        name: 'Basic - Enterprise', 
        subtitle: '1,000+ patients',
        features: [
          'Basic package for your patients',
          'Document storage for your patients',
          'Basic analytics dashboard'
        ] 
      }
    },
    premium: {
      small: { 
        price: Math.round(lawFirmBasePrices.small * premiumMultiplier * medicalProviderDiscount), 
        name: 'Premium - Small Practice', 
        subtitle: 'Under 100 patients',
        features: [
          'Everything in Basic',
          'Custom branding',
          'Medical Hub',
          'HIPAA-compliant storage',
          'Upload medical bills and records to patient account'
        ] 
      },
      medium: { 
        price: Math.round(lawFirmBasePrices.medium * premiumMultiplier * medicalProviderDiscount), 
        name: 'Premium - Medium Practice', 
        subtitle: '101-500 patients',
        features: [
          'Everything in Basic',
          'Custom branding',
          'Medical Hub',
          'HIPAA-compliant storage',
          'Upload medical bills and records to patient account'
        ] 
      },
      large: { 
        price: Math.round(lawFirmBasePrices.large * premiumMultiplier * medicalProviderDiscount), 
        name: 'Premium - Large Practice', 
        subtitle: '501-1,000 patients',
        features: [
          'Everything in Basic',
          'Custom branding',
          'Medical Hub',
          'HIPAA-compliant storage',
          'Upload medical bills and records to patient account'
        ] 
      },
      enterprise: { 
        price: Math.round(lawFirmBasePrices.enterprise * premiumMultiplier * medicalProviderDiscount), 
        name: 'Premium - Enterprise', 
        subtitle: '1,000+ patients',
        features: [
          'Everything in Basic',
          'Custom branding',
          'Medical Hub',
          'HIPAA-compliant storage',
          'Upload medical bills and records to patient account'
        ] 
      }
    }
  }
};

export const FIRM_SIZES = {
  SHINGLE: 'shingle',
  BOUTIQUE: 'boutique',
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
