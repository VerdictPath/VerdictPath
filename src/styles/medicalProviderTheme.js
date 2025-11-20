// Medical Provider Theme - HIPAA-compliant clinical design system

export const medicalProviderTheme = {
  colors: {
    // Primary medical colors
    deepTeal: '#006B7D',
    clinicalTeal: '#008C9E',
    medicalTeal: '#00A8C8',
    accentTeal: '#00BCD4',
    lightTeal: '#B2EBF2',
    
    // Clinical whites and grays
    clinicalWhite: '#FFFFFF',
    offWhite: '#FAFAFA',
    lightGray: '#F5F5F5',
    mediumGray: '#9E9E9E',
    darkGray: '#616161',
    charcoal: '#37474F',
    
    // Medical status colors
    healthy: '#4CAF50',
    stable: '#8BC34A',
    warning: '#FF9800',
    critical: '#F44336',
    emergencyRed: '#D32F2F',
    
    // Healthcare accents
    prescriptionGreen: '#66BB6A',
    medicalBlue: '#42A5F5',
    mintGreen: '#80CBC4',
    
    // Professional neutrals
    steel: '#607D8B',
    slate: '#455A64',
    
    // Transparency overlays
    overlayLight: 'rgba(255, 255, 255, 0.85)',
    overlayDark: 'rgba(0, 0, 0, 0.3)',
    glassOverlay: 'rgba(255, 255, 255, 0.6)',
  },
  
  gradients: {
    primary: ['#006B7D', '#00A8C8'],
    clinical: ['#FFFFFF', '#F5F5F5'],
    success: ['#4CAF50', '#66BB6A'],
    alert: ['#FF9800', '#F57C00'],
    critical: ['#F44336', '#D32F2F'],
    mint: ['#80CBC4', '#B2DFDB'],
  },
  
  shadows: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    elevated: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 5,
    },
    header: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
  },
  
  borderRadius: {
    small: 8,
    medium: 12,
    large: 16,
    xlarge: 20,
    round: 50,
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  
  typography: {
    h1: {
      fontSize: 32,
      fontWeight: '700',
      lineHeight: 40,
    },
    h2: {
      fontSize: 24,
      fontWeight: '700',
      lineHeight: 32,
    },
    h3: {
      fontSize: 20,
      fontWeight: '700',
      lineHeight: 28,
    },
    body: {
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 24,
    },
    caption: {
      fontSize: 14,
      fontWeight: '600',
      lineHeight: 20,
    },
    small: {
      fontSize: 12,
      fontWeight: '400',
      lineHeight: 16,
    },
  },
};
