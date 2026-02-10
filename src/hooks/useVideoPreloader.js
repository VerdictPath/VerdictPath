import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { Video } from '../utils/safeAVImport';
import { AVATARS } from '../constants/avatars';

export const useVideoPreloader = (avatarType = 'captain') => {
  const [videosLoaded, setVideosLoaded] = useState(false);
  const [calmVideoRef, setCalmVideoRef] = useState(null);

  useEffect(() => {
    if (Platform.OS === 'web' || !Video) {
      setVideosLoaded(true);
      return;
    }
    preloadVideos();
  }, [avatarType]);

  const preloadVideos = async () => {
    const avatar = AVATARS[avatarType.toUpperCase()];
    if (!avatar) return;

    try {
      const { sound: calmVideo } = await Video.createAsync(
        avatar.calmVideo,
        { shouldPlay: false },
        null,
        false
      );
      setCalmVideoRef(calmVideo);

      setVideosLoaded(true);
    } catch (error) {
      console.error('[VideoPreloader] Error preloading videos:', error);
      setVideosLoaded(true);
    }
  };

  return { videosLoaded, calmVideoRef };
};
