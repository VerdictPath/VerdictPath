const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts.push('cjs');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    if (moduleName === 'react-native') {
      return context.resolveRequest(context, 'react-native-web', platform);
    }
    
    const mobileOnlyModules = [
      '@stripe/stripe-react-native',
      'expo-notifications',
      'expo-document-picker',
      'expo-image-picker',
      'expo-calendar',
      '@react-native-community/datetimepicker'
    ];
    
    if (mobileOnlyModules.some(mod => moduleName.startsWith(mod))) {
      return {
        type: 'empty',
      };
    }
  }
  
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
