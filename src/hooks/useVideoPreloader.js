import { useState, useEffect } from 'react';
import { Video } from 'expo-av';
import { AVATARS } from '../constants/avatars';

export const useVideoPreloader = (avatarType = 'captain') => {
  const [videosLoaded, setVideosLoaded] = useState(false);
  const [calmVideoRef, setCalmVideoRef] = useState(null);
  const [actionVideoRef, setActionVideoRef] = useState(null);

  useEffect(() => {
    preloadVideos();
  }, [avatarType]);

  const preloadVideos = async () => {
    const avatar = AVATARS[avatarType.toUpperCase()];
    if (!avatar) return;

    try {
      console.log('[VideoPreloader] Starting preload for', avatarType);

      const { sound: calmVideo } = await Video.createAsync(
        avatar.calmVideo,
        { shouldPlay: false },
        null,
        false
      );
      setCalmVideoRef(calmVideo);

      const { sound: actionVideo } = await Video.createAsync(
        avatar.actionVideo,
        { shouldPlay: false },
        null,
        false
      );
      setActionVideoRef(actionVideo);

      setVideosLoaded(true);
      console.log('[VideoPreloader] ✓ Videos preloaded successfully');
    } catch (error) {
      console.error('[VideoPreloader] Error preloading videos:', error);
      setVideosLoaded(true);
    }
  };

  return { videosLoaded, calmVideoRef, actionVideoRef };
};
