import { Platform } from 'react-native';

let VideoView = null;
let useVideoPlayer = () => null;

if (Platform.OS !== 'web') {
  try {
    const expoVideo = require('expo-video');
    VideoView = expoVideo.VideoView;
    useVideoPlayer = expoVideo.useVideoPlayer;
  } catch (e) {
    console.warn('expo-video not available:', e);
  }
}

export { VideoView, useVideoPlayer };
