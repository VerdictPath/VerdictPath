// Medical Provider Theme - Deep Teal & Silver Professional Design System
// Color Scheme: Deep Teal (#115E59), Medical Silver (#A8A8A8), Clean White (#F5F7FA), Charcoal (#374151)

export const medicalProviderTheme = {
  colors: {
    // Primary Deep Teal palette
    primary: '#115E59',
    primaryDark: '#0D4F4A',
    primaryLight: '#1A7A73',
    primaryMuted: '#2D8A84',
    
    // Medical Silver palette
    silver: '#A8A8A8',
    silverLight: '#C0C0C0',
    silverDark: '#8A8A8A',
    
    // Background colors
    background: '#F5F7FA',
    backgroundDark: '#E8EAED',
    cardBackground: '#FFFFFF',
    
    // Accent colors
    accent: '#374151',
    accentLight: '#4B5563',
    accentDark: '#1F2937',
    
    // Clinical whites and grays
    clinicalWhite: '#FFFFFF',
    offWhite: '#FAFAFA',
    lightGray: '#F5F5F5',
    mediumGray: '#9E9E9E',
    darkGray: '#616161',
    charcoal: '#374151',
    
    // Text colors
    textPrimary: '#1F2937',
    textSecondary: '#4B5563',
    textMuted: '#6B7280',
    textLight: '#9CA3AF',
    textOnPrimary: '#FFFFFF',
    
    // Medical status colors
    healthy: '#10B981',
    stable: '#34D399',
    warning: '#F59E0B',
    critical: '#EF4444',
    emergencyRed: '#DC2626',
    
    // Healthcare accents
    prescriptionGreen: '#10B981',
    medicalBlue: '#3B82F6',
    mintGreen: '#5EEAD4',
    
    // Professional neutrals
    steel: '#64748B',
    slate: '#475569',
    
    // Legacy colors for compatibility
    deepTeal: '#115E59',
    clinicalTeal: '#115E59',
    medicalTeal: '#1A7A73',
    accentTeal: '#2D8A84',
    lightTeal: '#CCFBF1',
    
    // Transparency overlays
    overlayLight: 'rgba(255, 255, 255, 0.95)',
    overlayDark: 'rgba(0, 0, 0, 0.3)',
    glassOverlay: 'rgba(255, 255, 255, 0.8)',
    cardOverlay: 'rgba(255, 255, 255, 0.98)',
  },
  
  gradients: {
    primary: ['#115E59', '#1A7A73'],
    header: ['#115E59', '#0D4F4A'],
    clinical: ['#FFFFFF', '#F5F7FA'],
    success: ['#10B981', '#34D399'],
    alert: ['#F59E0B', '#D97706'],
    critical: ['#EF4444', '#DC2626'],
    mint: ['#5EEAD4', '#99F6E4'],
    silver: ['#A8A8A8', '#C0C0C0'],
  },
  
  shadows: {
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 3,
    },
    elevated: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 5,
    },
    header: {
      shadowColor: '#115E59',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 4,
    },
    subtle: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
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
      fontWeight: '600',
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
