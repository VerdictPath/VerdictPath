import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import backgroundMusicService from '../services/BackgroundMusicService';
import { MUSIC_PREFERENCES } from '../constants/avatars';
import { apiRequest, API_ENDPOINTS } from '../config/api';

const MusicContext = createContext(null);

const MUSIC_PREF_STORAGE_KEY = '@verdict_path_music_pref';
const MUSIC_VOLUME_STORAGE_KEY = '@verdict_path_music_volume';

export const MusicProvider = ({ children, user }) => {
  const [musicPreference, setMusicPreference] = useState(MUSIC_PREFERENCES.OFF);
  const [volume, setVolume] = useState(0.3);
  const [isPlaying, setIsPlaying] = useState(false);
  const [nowPlaying, setNowPlaying] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const appStateRef = useRef(AppState.currentState);
  const userRef = useRef(user);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const isIndividualUser = user?.userType === 'individual' || user?.userType === 'client';

  useEffect(() => {
    if (user && isIndividualUser) {
      loadPreferences();
    } else {
      backgroundMusicService.stop();
      setIsPlaying(false);
      setNowPlaying(null);
      setMusicPreference(MUSIC_PREFERENCES.OFF);
    }

    return () => {
      if (!userRef.current) {
        backgroundMusicService.stop();
      }
    };
  }, [user?.id, isIndividualUser]);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appStateRef.current.match(/active/) && nextAppState.match(/inactive|background/)) {
        // App going to background - keep playing (staysActiveInBackground is set)
      } else if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        if (musicPreference !== MUSIC_PREFERENCES.OFF && isIndividualUser) {
          backgroundMusicService.resume();
          setIsPlaying(true);
        }
      }
      appStateRef.current = nextAppState;
    });

    return () => subscription?.remove();
  }, [musicPreference, isIndividualUser]);

  const loadPreferences = async () => {
    try {
      const [storedPref, storedVolume] = await Promise.all([
        AsyncStorage.getItem(MUSIC_PREF_STORAGE_KEY),
        AsyncStorage.getItem(MUSIC_VOLUME_STORAGE_KEY),
      ]);

      const pref = user?.musicPreference || storedPref || MUSIC_PREFERENCES.OFF;
      const vol = storedVolume ? parseFloat(storedVolume) : 0.3;

      setMusicPreference(pref);
      setVolume(vol);
      backgroundMusicService.volume = vol;

      if (pref !== MUSIC_PREFERENCES.OFF) {
        await backgroundMusicService.play(pref, user?.avatarType || 'captain');
        setIsPlaying(true);
        setNowPlaying(backgroundMusicService.getNowPlaying());
      }
    } catch (error) {
      console.error('[MusicContext] Error loading preferences:', error);
    }
  };

  const updatePreference = useCallback(async (newPreference) => {
    if (!isIndividualUser) return;

    setIsLoading(true);
    try {
      setMusicPreference(newPreference);
      await AsyncStorage.setItem(MUSIC_PREF_STORAGE_KEY, newPreference);

      if (newPreference === MUSIC_PREFERENCES.OFF) {
        await backgroundMusicService.fadeOut(500);
        setIsPlaying(false);
        setNowPlaying(null);
      } else {
        await backgroundMusicService.fadeIn(
          newPreference,
          user?.avatarType || 'captain',
          500
        );
        setIsPlaying(true);
        setNowPlaying(backgroundMusicService.getNowPlaying());
      }

      if (user?.token) {
        apiRequest(API_ENDPOINTS.MUSIC.PREFERENCE, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${user.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ musicPreference: newPreference }),
        }).catch(err => {
          console.warn('[MusicContext] Failed to save preference to server:', err);
        });
      }
    } catch (error) {
      console.error('[MusicContext] Error updating preference:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, isIndividualUser]);

  const updateVolume = useCallback(async (newVolume) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolume(clampedVolume);
    await backgroundMusicService.setVolume(clampedVolume);
    await AsyncStorage.setItem(MUSIC_VOLUME_STORAGE_KEY, String(clampedVolume));
  }, []);

  const onAvatarChanged = useCallback(async (newAvatarType) => {
    if (musicPreference === MUSIC_PREFERENCES.AVATAR) {
      await backgroundMusicService.switchAvatar(newAvatarType);
      setNowPlaying(backgroundMusicService.getNowPlaying());
    }
  }, [musicPreference]);

  const togglePlayPause = useCallback(async () => {
    if (isPlaying) {
      await backgroundMusicService.pause();
      setIsPlaying(false);
    } else {
      await backgroundMusicService.resume();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const value = {
    musicPreference,
    volume,
    isPlaying,
    nowPlaying,
    isLoading,
    isIndividualUser,
    updatePreference,
    updateVolume,
    onAvatarChanged,
    togglePlayPause,
  };

  return (
    <MusicContext.Provider value={value}>
      {children}
    </MusicContext.Provider>
  );
};

export const useMusic = () => {
  const context = useContext(MusicContext);
  if (!context) {
    return {
      musicPreference: MUSIC_PREFERENCES.OFF,
      volume: 0.3,
      isPlaying: false,
      nowPlaying: null,
      isLoading: false,
      isIndividualUser: false,
      updatePreference: () => {},
      updateVolume: () => {},
      onAvatarChanged: () => {},
      togglePlayPause: () => {},
    };
  }
  return context;
};
