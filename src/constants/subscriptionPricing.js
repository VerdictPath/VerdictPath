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
        '🗺️ Roadmap access',
        '🏥 Medical Hub',
        '🗃️ Evidence Locker',
        '💰 Free daily coins'
      ] 
    },
    basic: { 
      price: 2.99, 
      name: 'Basic', 
      features: [
        '✅ Everything in Free',
        '🎧 Audio library access',
        '📢 Ads included'
      ] 
    },
    premium: { 
      price: 4.99, 
      name: 'Premium', 
      features: [
        '✅ Everything in Basic',
        '🎥 Video library access',
        '🚫 No ads'
      ] 
    }
  },
  lawfirm: {
    free: { 
      price: 0, 
      name: 'Free', 
      features: [
        'Limited features',
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
          'Client roadmap access',
          'Evidence Locker',
          'Document storage for your clients',
          'Basic analytics dashboard'
        ] 
      },
      boutique: { 
        price: lawFirmBasePrices.boutique, 
        name: 'Basic - Boutique Firm', 
        subtitle: '25-49 clients',
        features: [
          'Client roadmap access',
          'Evidence Locker',
          'Document storage for your clients',
          'Basic analytics dashboard'
        ] 
      },
      small: { 
        price: lawFirmBasePrices.small, 
        name: 'Basic - Small Firm', 
        subtitle: '50-99 clients',
        features: [
          'Client roadmap access',
          'Evidence Locker',
          'Document storage for your clients',
          'Basic analytics dashboard'
        ] 
      },
      medium: { 
        price: lawFirmBasePrices.medium, 
        name: 'Basic - Medium Firm', 
        subtitle: '100-499 clients',
        features: [
          'Client roadmap access',
          'Evidence Locker',
          'Document storage for your clients',
          'Basic analytics dashboard'
        ] 
      },
      large: { 
        price: lawFirmBasePrices.large, 
        name: 'Basic - Large Firm', 
        subtitle: '500-999 clients',
        features: [
          'Client roadmap access',
          'Evidence Locker',
          'Document storage for your clients',
          'Basic analytics dashboard'
        ] 
      },
      enterprise: { 
        price: lawFirmBasePrices.enterprise, 
        name: 'Basic - Enterprise', 
        subtitle: '1,000+ clients',
        features: [
          'Client roadmap access',
          'Evidence Locker',
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
          'Medical Hub (COMING SOON)',
          'Premium analytics',
          'HIPAA-Compliant Storage (COMING SOON)'
        ] 
      },
      boutique: { 
        price: Math.round(lawFirmBasePrices.boutique * premiumMultiplier), 
        name: 'Premium - Boutique Firm', 
        subtitle: '25-49 clients',
        features: [
          'Everything in Basic',
          'Custom branding',
          'Medical Hub (COMING SOON)',
          'Premium analytics',
          'HIPAA-Compliant Storage (COMING SOON)'
        ] 
      },
      small: { 
        price: Math.round(lawFirmBasePrices.small * premiumMultiplier), 
        name: 'Premium - Small Firm', 
        subtitle: '50-99 clients',
        features: [
          'Everything in Basic',
          'Custom branding',
          'Medical Hub (COMING SOON)',
          'Premium analytics',
          'HIPAA-Compliant Storage (COMING SOON)'
        ] 
      },
      medium: { 
        price: Math.round(lawFirmBasePrices.medium * premiumMultiplier), 
        name: 'Premium - Medium Firm', 
        subtitle: '100-499 clients',
        features: [
          'Everything in Basic',
          'Custom branding',
          'Medical Hub (COMING SOON)',
          'Premium analytics',
          'HIPAA-Compliant Storage (COMING SOON)'
        ] 
      },
      large: { 
        price: Math.round(lawFirmBasePrices.large * premiumMultiplier), 
        name: 'Premium - Large Firm', 
        subtitle: '500-999 clients',
        features: [
          'Everything in Basic',
          'Custom branding',
          'Medical Hub (COMING SOON)',
          'Premium analytics',
          'HIPAA-Compliant Storage (COMING SOON)'
        ] 
      },
      enterprise: { 
        price: Math.round(lawFirmBasePrices.enterprise * premiumMultiplier), 
        name: 'Premium - Enterprise', 
        subtitle: '1,000+ clients',
        features: [
          'Everything in Basic',
          'Custom branding',
          'Medical Hub (COMING SOON)',
          'Premium analytics',
          'HIPAA-Compliant Storage (COMING SOON)'
        ] 
      }
    }
  },
  medicalprovider: {
    free: { 
      price: 0, 
      name: 'Free', 
      features: [
        'Limited features',
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
          'Client Roadmap Access',
          'Evidence Locker',
          'Document storage for your patients',
          'Basic analytics dashboard'
        ] 
      },
      medium: { 
        price: Math.round(lawFirmBasePrices.medium * medicalProviderDiscount), 
        name: 'Basic - Medium Practice', 
        subtitle: '101-500 patients',
        features: [
          'Client Roadmap Access',
          'Evidence Locker',
          'Document storage for your patients',
          'Basic analytics dashboard'
        ] 
      },
      large: { 
        price: Math.round(lawFirmBasePrices.large * medicalProviderDiscount), 
        name: 'Basic - Large Practice', 
        subtitle: '501-1,000 patients',
        features: [
          'Client Roadmap Access',
          'Evidence Locker',
          'Document storage for your patients',
          'Basic analytics dashboard'
        ] 
      },
      enterprise: { 
        price: Math.round(lawFirmBasePrices.enterprise * medicalProviderDiscount), 
        name: 'Basic - Enterprise', 
        subtitle: '1,000+ patients',
        features: [
          'Client Roadmap Access',
          'Evidence Locker',
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

export const PROVIDER_SIZES = {
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

// Export simplified pricing structure for easy lookup
export const PRICING = {
  lawfirm: {
    basic: {
      shingle: lawFirmBasePrices.shingle,
      boutique: lawFirmBasePrices.boutique,
      small: lawFirmBasePrices.small,
      medium: lawFirmBasePrices.medium,
      large: lawFirmBasePrices.large,
      enterprise: lawFirmBasePrices.enterprise
    },
    premium: {
      shingle: Math.round(lawFirmBasePrices.shingle * premiumMultiplier),
      boutique: Math.round(lawFirmBasePrices.boutique * premiumMultiplier),
      small: Math.round(lawFirmBasePrices.small * premiumMultiplier),
      medium: Math.round(lawFirmBasePrices.medium * premiumMultiplier),
      large: Math.round(lawFirmBasePrices.large * premiumMultiplier),
      enterprise: Math.round(lawFirmBasePrices.enterprise * premiumMultiplier)
    }
  },
  medicalprovider: {
    basic: {
      small: Math.round(lawFirmBasePrices.small * medicalProviderDiscount),
      medium: Math.round(lawFirmBasePrices.medium * medicalProviderDiscount),
      large: Math.round(lawFirmBasePrices.large * medicalProviderDiscount),
      enterprise: Math.round(lawFirmBasePrices.enterprise * medicalProviderDiscount)
    },
    premium: {
      small: Math.round(lawFirmBasePrices.small * premiumMultiplier * medicalProviderDiscount),
      medium: Math.round(lawFirmBasePrices.medium * premiumMultiplier * medicalProviderDiscount),
      large: Math.round(lawFirmBasePrices.large * premiumMultiplier * medicalProviderDiscount),
      enterprise: Math.round(lawFirmBasePrices.enterprise * premiumMultiplier * medicalProviderDiscount)
    }
  }
};
