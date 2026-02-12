import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Platform
} from 'react-native';
import { theme } from '../styles/theme';
import { API_BASE_URL } from '../config/api';
import { useMusic } from '../contexts/MusicContext';
import { MUSIC_PREFERENCES, AVATARS } from '../constants/avatars';

const Toast = ({ visible, message, type, onHide }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const timerRef = useRef(null);

  const animateOut = (callback) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (callback) callback();
    });
  };

  useEffect(() => {
    if (visible && message) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      
      fadeAnim.setValue(0);
      slideAnim.setValue(-100);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      timerRef.current = setTimeout(() => {
        animateOut(onHide);
      }, 4000);

      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
      };
    }
  }, [visible, message]);

  const handleDismiss = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    animateOut(onHide);
  };

  if (!visible) return null;

  const backgroundColor = type === 'error' ? '#e74c3c' : type === 'success' ? '#27ae60' : '#3498db';
  const icon = type === 'error' ? '⚠️' : type === 'success' ? '✓' : 'ℹ️';

  return (
    <Animated.View
      style={[
        toastStyles.container,
        { backgroundColor, opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <Text style={toastStyles.icon}>{icon}</Text>
      <Text style={toastStyles.message}>{message}</Text>
      <TouchableOpacity onPress={handleDismiss} style={toastStyles.closeButton}>
        <Text style={toastStyles.closeText}>×</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const toastStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  icon: {
    fontSize: 20,
    marginRight: 12,
  },
  message: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    marginLeft: 8,
    padding: 4,
  },
  closeText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
});

const MusicOption = ({ label, description, icon, isSelected, onPress, disabled }) => (
  <TouchableOpacity
    style={[
      musicStyles.option,
      isSelected && musicStyles.optionSelected,
      disabled && musicStyles.optionDisabled,
    ]}
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.7}
  >
    <View style={musicStyles.optionLeft}>
      <Text style={musicStyles.optionIcon}>{icon}</Text>
      <View style={musicStyles.optionTextWrap}>
        <Text style={[musicStyles.optionLabel, isSelected && musicStyles.optionLabelSelected]}>
          {label}
        </Text>
        {description ? (
          <Text style={musicStyles.optionDesc}>{description}</Text>
        ) : null}
      </View>
    </View>
    <View style={[musicStyles.radio, isSelected && musicStyles.radioSelected]}>
      {isSelected && <View style={musicStyles.radioDot} />}
    </View>
  </TouchableOpacity>
);

const VolumeSlider = ({ volume, onVolumeChange }) => {
  const sliderWidth = useRef(0);

  const handlePress = (evt) => {
    if (sliderWidth.current > 0) {
      const x = evt.nativeEvent.locationX || evt.nativeEvent.offsetX || 0;
      const newVolume = Math.max(0, Math.min(1, x / sliderWidth.current));
      onVolumeChange(newVolume);
    }
  };

  const getVolumeIcon = () => {
    if (volume === 0) return '🔇';
    if (volume < 0.3) return '🔈';
    if (volume < 0.7) return '🔉';
    return '🔊';
  };

  return (
    <View style={musicStyles.volumeContainer}>
      <Text style={musicStyles.volumeLabel}>{getVolumeIcon()} Volume</Text>
      <TouchableOpacity
        style={musicStyles.sliderTrack}
        onLayout={(e) => { sliderWidth.current = e.nativeEvent.layout.width; }}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <View style={[musicStyles.sliderFill, { width: `${volume * 100}%` }]} />
        <View style={[musicStyles.sliderThumb, { left: `${volume * 100}%` }]} />
      </TouchableOpacity>
      <Text style={musicStyles.volumeValue}>{Math.round(volume * 100)}%</Text>
    </View>
  );
};

const musicStyles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected: {
    borderColor: '#D4A574',
    backgroundColor: '#FFF8F0',
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIcon: {
    fontSize: 28,
    marginRight: 14,
  },
  optionTextWrap: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  optionLabelSelected: {
    color: '#8B6914',
  },
  optionDesc: {
    fontSize: 13,
    color: '#888',
    marginTop: 3,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CCC',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  radioSelected: {
    borderColor: '#D4A574',
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#D4A574',
  },
  volumeContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  volumeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 10,
  },
  sliderTrack: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    position: 'relative',
    justifyContent: 'center',
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#D4A574',
    borderRadius: 4,
  },
  sliderThumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#D4A574',
    marginLeft: -11,
    top: -7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  volumeValue: {
    fontSize: 13,
    color: '#888',
    textAlign: 'right',
    marginTop: 6,
  },
  nowPlaying: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FFF8F0',
    borderWidth: 1,
    borderColor: '#D4A574',
    flexDirection: 'row',
    alignItems: 'center',
  },
  nowPlayingText: {
    fontSize: 13,
    color: '#8B6914',
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  pauseButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: '#D4A574',
  },
  pauseButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

const SettingsScreen = ({ user, onBack }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'error' });

  const music = useMusic();

  const showToast = (message, type = 'error') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ visible: false, message: '', type: 'error' });
  };

  const validatePassword = (password) => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return 'Password must contain at least one special character';
    }
    return null;
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      showToast('Please fill in all password fields', 'error');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }

    if (currentPassword === newPassword) {
      showToast('New password must be different from current password', 'error');
      return;
    }

    const validationError = validatePassword(newPassword);
    if (validationError) {
      showToast(validationError, 'error');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showToast('Password changed successfully! You will receive a confirmation email and SMS.', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      } else {
        showToast(data.message || 'Failed to change password', 'error');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      showToast('Network error. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getAvatarMusicTitle = () => {
    const key = (user?.avatarType || 'captain').toUpperCase();
    const avatar = AVATARS[key] || AVATARS.CAPTAIN;
    return avatar.musicTitle;
  };

  const getAvatarName = () => {
    const key = (user?.avatarType || 'captain').toUpperCase();
    const avatar = AVATARS[key] || AVATARS.CAPTAIN;
    return avatar.name;
  };

  return (
    <View style={styles.container}>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {music.isIndividualUser && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎵 Background Music</Text>
            <Text style={styles.sectionDescription}>
              Choose what plays while you navigate the app. Music loops continuously in the background.
            </Text>

            <MusicOption
              icon="🏴‍☠️"
              label={`Avatar Theme - ${getAvatarName()}`}
              description={getAvatarMusicTitle()}
              isSelected={music.musicPreference === MUSIC_PREFERENCES.AVATAR}
              onPress={() => music.updatePreference(MUSIC_PREFERENCES.AVATAR)}
              disabled={music.isLoading}
            />

            <MusicOption
              icon="🌊"
              label="Ambient Sounds"
              description="Ocean waves, creaking ship, nautical winds"
              isSelected={music.musicPreference === MUSIC_PREFERENCES.AMBIENT}
              onPress={() => music.updatePreference(MUSIC_PREFERENCES.AMBIENT)}
              disabled={music.isLoading}
            />

            <MusicOption
              icon="🔇"
              label="No Music"
              description="Turn off background music"
              isSelected={music.musicPreference === MUSIC_PREFERENCES.OFF}
              onPress={() => music.updatePreference(MUSIC_PREFERENCES.OFF)}
              disabled={music.isLoading}
            />

            {music.musicPreference !== MUSIC_PREFERENCES.OFF && (
              <VolumeSlider
                volume={music.volume}
                onVolumeChange={music.updateVolume}
              />
            )}

            {music.nowPlaying && (
              <View style={musicStyles.nowPlaying}>
                <Text style={{ fontSize: 16 }}>
                  {music.isPlaying ? '▶' : '⏸'}
                </Text>
                <Text style={musicStyles.nowPlayingText}>
                  {music.nowPlaying.title}
                </Text>
                <TouchableOpacity
                  style={musicStyles.pauseButton}
                  onPress={music.togglePlayPause}
                >
                  <Text style={musicStyles.pauseButtonText}>
                    {music.isPlaying ? 'Pause' : 'Play'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔐 Change Password</Text>
          <Text style={styles.sectionDescription}>
            Update your password to keep your account secure.
          </Text>

          <View style={styles.requirementsBox}>
            <Text style={styles.requirementsTitle}>Password Requirements:</Text>
            <Text style={styles.requirementItem}>• At least 8 characters long</Text>
            <Text style={styles.requirementItem}>• At least one uppercase letter (A-Z)</Text>
            <Text style={styles.requirementItem}>• At least one lowercase letter (a-z)</Text>
            <Text style={styles.requirementItem}>• At least one number (0-9)</Text>
            <Text style={styles.requirementItem}>• At least one special character (!@#$%^&*)</Text>
          </View>

          <Text style={styles.inputLabel}>Current Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter current password"
            placeholderTextColor={theme.colors.warmGray}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          <Text style={styles.inputLabel}>New Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter new password"
            placeholderTextColor={theme.colors.warmGray}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          <Text style={styles.inputLabel}>Confirm New Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Re-enter new password"
            placeholderTextColor={theme.colors.warmGray}
            value={confirmNewPassword}
            onChangeText={setConfirmNewPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={[styles.changePasswordButton, loading && styles.buttonDisabled]}
            onPress={handleChangePassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.changePasswordButtonText}>Change Password</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 Account Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name:</Text>
            <Text style={styles.infoValue}>{user.firstName} {user.lastName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoValue}>{user.email}</Text>
          </View>
          {user.userCode && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>User Code:</Text>
              <Text style={styles.infoValue}>{user.userCode}</Text>
            </View>
          )}
          {user.firmName && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Organization:</Text>
              <Text style={styles.infoValue}>{user.firmName}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Role:</Text>
            <Text style={styles.infoValue}>{user.role || 'N/A'}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: theme.colors.primary,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.accent
  },
  backButton: {
    padding: 5,
    minWidth: 60
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    padding: 20
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.darkGray,
    marginBottom: 10
  },
  sectionDescription: {
    fontSize: 14,
    color: theme.colors.warmGray,
    marginBottom: 20
  },
  requirementsBox: {
    backgroundColor: '#f0f8ff',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.accent,
    padding: 15,
    marginBottom: 20,
    borderRadius: 8
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.darkGray,
    marginBottom: 8
  },
  requirementItem: {
    fontSize: 12,
    color: theme.colors.warmGray,
    marginBottom: 4
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.darkGray,
    marginBottom: 8,
    marginTop: 10
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
    color: theme.colors.darkGray
  },
  changePasswordButton: {
    backgroundColor: theme.colors.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10
  },
  changePasswordButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold'
  },
  buttonDisabled: {
    opacity: 0.6
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.warmGray
  },
  infoValue: {
    fontSize: 14,
    color: theme.colors.darkGray,
    fontWeight: '500'
  }
});

export default SettingsScreen;
