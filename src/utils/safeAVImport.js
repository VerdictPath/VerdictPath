import { Platform } from 'react-native';

let Video = null;
let ResizeMode = null;

if (Platform.OS !== 'web') {
  try {
    const expoAV = require('expo-av');
    Video = expoAV.Video;
    ResizeMode = expoAV.ResizeMode;
  } catch (e) {
    console.warn('expo-av not available:', e);
  }
}

if (!ResizeMode) {
  ResizeMode = {
    CONTAIN: 'contain',
    COVER: 'cover',
    STRETCH: 'stretch',
  };
}

export { Video, ResizeMode };
