import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { useMusic } from '../contexts/MusicContext';
import { MUSIC_PREFERENCES, AVATARS } from '../constants/avatars';

const FloatingMusicControl = ({ user }) => {
  const music = useMusic();
  const [expanded, setExpanded] = useState(false);
  const expandAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!music.isIndividualUser) return;
    if (music.isPlaying) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: Platform.OS !== 'web',
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [music.isPlaying, music.isIndividualUser]);

  if (!music.isIndividualUser) return null;

  const toggleExpand = () => {
    const toValue = expanded ? 0 : 1;
    setExpanded(!expanded);
    Animated.spring(expandAnim, {
      toValue,
      friction: 8,
      tension: 40,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  const handleSelectOption = (pref) => {
    music.updatePreference(pref);
    setTimeout(() => {
      setExpanded(false);
      Animated.spring(expandAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    }, 300);
  };

  const getAvatarName = () => {
    const avatarType = user?.avatarType || 'captain';
    const avatar = Object.values(AVATARS).find(a => a.id === avatarType);
    return avatar?.musicTitle || 'Theme Song';
  };

  const getButtonIcon = () => {
    if (music.musicPreference === MUSIC_PREFERENCES.OFF) return '🔇';
    if (music.isPlaying) return '🎵';
    return '⏸️';
  };

  const panelTranslateY = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });

  const panelOpacity = expandAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.5, 1],
  });

  return (
    <View style={styles.container}>
      {expanded && (
        <Animated.View
          style={[
            styles.panel,
            {
              opacity: panelOpacity,
              transform: [{ translateY: panelTranslateY }],
            },
          ]}
        >
          <Text style={styles.panelTitle}>Background Music</Text>

          <TouchableOpacity
            style={[
              styles.optionRow,
              music.musicPreference === MUSIC_PREFERENCES.AVATAR && styles.optionRowActive,
            ]}
            onPress={() => handleSelectOption(MUSIC_PREFERENCES.AVATAR)}
            activeOpacity={0.7}
          >
            <Text style={styles.optionIcon}>🎶</Text>
            <View style={styles.optionTextWrap}>
              <Text style={[
                styles.optionLabel,
                music.musicPreference === MUSIC_PREFERENCES.AVATAR && styles.optionLabelActive,
              ]}>Avatar Theme</Text>
              <Text style={styles.optionSub}>{getAvatarName()}</Text>
            </View>
            {music.musicPreference === MUSIC_PREFERENCES.AVATAR && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionRow,
              music.musicPreference === MUSIC_PREFERENCES.AMBIENT && styles.optionRowActive,
            ]}
            onPress={() => handleSelectOption(MUSIC_PREFERENCES.AMBIENT)}
            activeOpacity={0.7}
          >
            <Text style={styles.optionIcon}>🌊</Text>
            <View style={styles.optionTextWrap}>
              <Text style={[
                styles.optionLabel,
                music.musicPreference === MUSIC_PREFERENCES.AMBIENT && styles.optionLabelActive,
              ]}>Ocean Voyage</Text>
              <Text style={styles.optionSub}>Waves & nautical winds</Text>
            </View>
            {music.musicPreference === MUSIC_PREFERENCES.AMBIENT && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionRow,
              music.musicPreference === MUSIC_PREFERENCES.OFF && styles.optionRowActive,
            ]}
            onPress={() => handleSelectOption(MUSIC_PREFERENCES.OFF)}
            activeOpacity={0.7}
          >
            <Text style={styles.optionIcon}>🔇</Text>
            <View style={styles.optionTextWrap}>
              <Text style={[
                styles.optionLabel,
                music.musicPreference === MUSIC_PREFERENCES.OFF && styles.optionLabelActive,
              ]}>Music Off</Text>
            </View>
            {music.musicPreference === MUSIC_PREFERENCES.OFF && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </TouchableOpacity>

          {music.isPlaying && (
            <TouchableOpacity
              style={styles.pauseButton}
              onPress={music.togglePlayPause}
              activeOpacity={0.7}
            >
              <Text style={styles.pauseIcon}>⏸</Text>
              <Text style={styles.pauseLabel}>Pause</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      )}

      <Animated.View style={{ transform: [{ scale: music.isPlaying ? pulseAnim : 1 }] }}>
        <TouchableOpacity
          style={[
            styles.floatingButton,
            music.isPlaying && styles.floatingButtonPlaying,
          ]}
          onPress={toggleExpand}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonIcon}>{getButtonIcon()}</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    zIndex: 999,
    alignItems: 'flex-start',
  },
  floatingButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(26, 35, 126, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.6)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  floatingButtonPlaying: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(26, 35, 126, 0.95)',
  },
  buttonIcon: {
    fontSize: 22,
  },
  panel: {
    backgroundColor: 'rgba(26, 35, 126, 0.95)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    width: 230,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },
  panelTitle: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 4,
  },
  optionRowActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
  },
  optionIcon: {
    fontSize: 18,
    marginRight: 10,
    width: 24,
    textAlign: 'center',
  },
  optionTextWrap: {
    flex: 1,
  },
  optionLabel: {
    color: '#E8E0D0',
    fontSize: 13,
    fontWeight: '600',
  },
  optionLabelActive: {
    color: '#FFD700',
  },
  optionSub: {
    color: 'rgba(232, 224, 208, 0.6)',
    fontSize: 11,
    marginTop: 1,
  },
  checkmark: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 6,
  },
  pauseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 215, 0, 0.2)',
  },
  pauseIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  pauseLabel: {
    color: '#E8E0D0',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default FloatingMusicControl;
