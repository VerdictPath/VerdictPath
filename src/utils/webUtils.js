import { Platform, Dimensions } from 'react-native';

export const isWeb = Platform.OS === 'web';

export const getResponsiveWidth = () => {
  const { width } = Dimensions.get('window');
  return width;
};

export const getResponsiveHeight = () => {
  const { height } = Dimensions.get('window');
  return height;
};

export const getBreakpoint = () => {
  const width = getResponsiveWidth();
  if (width < 480) return 'mobile';
  if (width < 768) return 'tablet';
  if (width < 1024) return 'desktop';
  return 'large';
};

export const isMobile = () => getBreakpoint() === 'mobile';
export const isTablet = () => getBreakpoint() === 'tablet';
export const isDesktop = () => ['desktop', 'large'].includes(getBreakpoint());

export const getMaxContentWidth = () => {
  const breakpoint = getBreakpoint();
  switch (breakpoint) {
    case 'mobile': return '100%';
    case 'tablet': return 600;
    case 'desktop': return 800;
    case 'large': return 1000;
    default: return '100%';
  }
};

export const getResponsiveFontSize = (baseSize) => {
  const breakpoint = getBreakpoint();
  const multipliers = {
    mobile: 1,
    tablet: 1.1,
    desktop: 1.15,
    large: 1.2,
  };
  return baseSize * (multipliers[breakpoint] || 1);
};

export const getResponsivePadding = (basePadding) => {
  const breakpoint = getBreakpoint();
  const multipliers = {
    mobile: 1,
    tablet: 1.5,
    desktop: 2,
    large: 2.5,
  };
  return basePadding * (multipliers[breakpoint] || 1);
};

export const webStyles = isWeb ? {
  container: {
    maxWidth: 1200,
    marginHorizontal: 'auto',
    width: '100%',
  },
  scrollContainer: {
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  clickable: {
    cursor: 'pointer',
  },
  noSelect: {
    userSelect: 'none',
  },
} : {};

export const applyWebFixes = () => {
  if (!isWeb) return;
  
  if (typeof document !== 'undefined') {
    const meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
      const newMeta = document.createElement('meta');
      newMeta.name = 'viewport';
      newMeta.content = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no';
      document.head.appendChild(newMeta);
    }
    
    const style = document.createElement('style');
    style.textContent = `
      * { box-sizing: border-box; }
      html, body, #root { 
        height: 100%; 
        margin: 0; 
        padding: 0; 
        overflow: hidden;
        background-color: #000;
      }
      body { 
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      input, textarea, button { font-family: inherit; }
      ::-webkit-scrollbar { width: 8px; }
      ::-webkit-scrollbar-track { background: #1a1a1a; }
      ::-webkit-scrollbar-thumb { background: #555; border-radius: 4px; }
      ::-webkit-scrollbar-thumb:hover { background: #777; }
    `;
    document.head.appendChild(style);
  }
};

export default {
  isWeb,
  getResponsiveWidth,
  getResponsiveHeight,
  getBreakpoint,
  isMobile,
  isTablet,
  isDesktop,
  getMaxContentWidth,
  getResponsiveFontSize,
  getResponsivePadding,
  webStyles,
  applyWebFixes,
};
