import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { VideoView, useVideoPlayer } from '../utils/safeVideoImport';
import WebVideoBackground from '../components/WebVideoBackground';
import { commonStyles } from '../styles/commonStyles';
import { USER_TYPES } from '../constants/mockData';

const RegisterScreen = ({ 
  email, 
  setEmail, 
  password, 
  setPassword, 
  confirmPassword, 
  setConfirmPassword,
  userType,
  setUserType,
  firmCode,
  setFirmCode,
  inviteCode,
  setInviteCode,
  firstName,
  setFirstName,
  lastName,
  setLastName,
  phoneNumber,
  setPhoneNumber,
  firmName,
  setFirmName,
  providerName,
  setProviderName,
  privacyAccepted,
  setPrivacyAccepted,
  onRegister, 
  onNavigate 
}) => {
  const { width, height } = useWindowDimensions();
  
  // Video source - memoized to prevent recreation
  const videoSource = useMemo(() => 
    require('../../attached_assets/Stationary Breathing 10sec_1763360411263.mp4'),
    []
  );

  // Enable video with performance optimizations
  const [enableVideo, setEnableVideo] = useState(true);

  // Create video player only if video is enabled
  const player = useVideoPlayer(enableVideo ? videoSource : null);

  // Configure player settings with aggressive performance optimizations
  useEffect(() => {
    if (!player || !enableVideo) return;

    // Configure player for maximum performance
    player.loop = true;
    player.muted = true;
    player.volume = 0;
    // Slightly reduce playback rate to reduce lag (0.95 = 95% speed)
    player.playbackRate = 0.95;
    
    // Longer delay to let UI fully render and settle before starting video
    // Mobile may need more time
    const delay = Platform.OS === 'web' ? 800 : 1000;
    
    const waitForVideoLoad = () => {
      // Check if video is loaded (duration > 0 means video metadata is loaded)
      if (player && player.duration > 0) {
        return true;
      }
      return false;
    };

    const startPlayback = async () => {
      try {
        // Wait for video to load on mobile - check multiple times
        let attempts = 0;
        const maxAttempts = Platform.OS === 'web' ? 5 : 20; // More attempts on mobile
        const checkInterval = 100; // Check every 100ms

        while (attempts < maxAttempts && !waitForVideoLoad()) {
          await new Promise(resolve => setTimeout(resolve, checkInterval));
          attempts++;
        }

        if (!waitForVideoLoad()) {
        }

        if (player && !player.playing) {
          // Start playback with reduced rate for smoother playback
          player.playbackRate = 0.95;
          
          // Try to play
          await player.play();
          
          // On Android, play() may resolve but not actually start playing
          // Wait a moment and check if it's actually playing
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // If still not playing, try again (Android sometimes needs this)
          if (!player.playing && Platform.OS !== 'web') {
            await player.play();
            await new Promise(resolve => setTimeout(resolve, 200));
          }
          
          // If still not playing after retry, try once more with a delay
          if (!player.playing && Platform.OS !== 'web') {
            setTimeout(async () => {
              try {
                await player.play();
              } catch (e) {
                console.error('[RegisterScreen] Final retry error:', e);
              }
            }, 500);
          }
        }
      } catch (error) {
        console.error("[RegisterScreen] Play error:", error);
        // Retry once on mobile if it fails
        if (Platform.OS !== 'web') {
          setTimeout(async () => {
            try {
              // Wait a bit more for video to load
              await new Promise(resolve => setTimeout(resolve, 500));
              if (player && !player.playing && waitForVideoLoad()) {
                await player.play();
              } else {
              }
            } catch (retryError) {
              console.error("[RegisterScreen] Retry failed:", retryError);
              setEnableVideo(false);
            }
          }, 1000);
        } else {
          setEnableVideo(false);
        }
      }
    };
    
    const startTimer = setTimeout(startPlayback, delay);
    
    return () => {
      clearTimeout(startTimer);
    };
  }, [player, enableVideo]);

  
  return (
    <View style={[commonStyles.container, Platform.OS === 'web' && { backgroundColor: 'transparent' }]}>
      <View 
        style={[
          styles.videoWrapper,
          Platform.OS === 'web' && { backgroundColor: 'transparent' },
          Platform.OS !== 'web' && { width, height }
        ]} 
        pointerEvents="none"
      >
        {Platform.OS === 'web' ? (
          <WebVideoBackground uri="/videos/breathing.mp4" />
        ) : enableVideo && player && VideoView ? (
          <VideoView
            player={player}
            style={[
              styles.backgroundVideo,
              styles.backgroundVideoMobile
            ]}
            contentFit="contain"
            nativeControls={false}
            allowsFullscreen={false}
            allowsPictureInPicture={false}
            requiresLinearPlayback={false}
            pointerEvents="none"
            allowsExternalPlayback={false}
            entersFullscreenWhenPlayerEntersFullscreen={false}
          />
        ) : (
          <View style={[styles.backgroundVideo, styles.staticBackground]} />
        )}
        <View style={styles.videoOverlay} />
      </View>
      
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.formContainer}>
        <Text style={styles.formTitle}>Create Your Account</Text>
        
        <Text style={styles.label}>I am a:</Text>
        <View style={styles.toggleContainer}>
          <TouchableOpacity 
            style={[styles.toggleButton, userType === USER_TYPES.INDIVIDUAL && styles.toggleButtonActive]}
            onPress={() => setUserType(USER_TYPES.INDIVIDUAL)}
          >
            <Text style={[styles.toggleText, userType === USER_TYPES.INDIVIDUAL && styles.toggleTextActive]}>
              Individual
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.toggleButton, userType === USER_TYPES.LAW_FIRM && styles.toggleButtonActive]}
            onPress={() => {
              setUserType(USER_TYPES.LAW_FIRM);
              onNavigate('lawfirm-registration');
            }}
          >
            <Text style={[styles.toggleText, userType === USER_TYPES.LAW_FIRM && styles.toggleTextActive]}>
              Law Firm
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.toggleButton, userType === USER_TYPES.MEDICAL_PROVIDER && styles.toggleButtonActive]}
            onPress={() => {
              setUserType(USER_TYPES.MEDICAL_PROVIDER);
              onNavigate('medicalprovider-registration');
            }}
          >
            <Text style={[styles.toggleText, userType === USER_TYPES.MEDICAL_PROVIDER && styles.toggleTextActive]}>
              Medical Provider
            </Text>
          </TouchableOpacity>
        </View>

        {userType === USER_TYPES.INDIVIDUAL && (
          <>
            <TextInput
              style={commonStyles.input}
              placeholder="First Name"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
            />
            <TextInput
              style={commonStyles.input}
              placeholder="Last Name"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
            />
            <TextInput
              style={commonStyles.input}
              placeholder="Cell Phone Number"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              autoComplete="tel"
            />
          </>
        )}

        {userType === USER_TYPES.LAW_FIRM && (
          <TextInput
            style={commonStyles.input}
            placeholder="Law Firm Name"
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            value={firmName}
            onChangeText={setFirmName}
            autoCapitalize="words"
          />
        )}

        {userType === USER_TYPES.MEDICAL_PROVIDER && (
          <TextInput
            style={commonStyles.input}
            placeholder="Medical Provider/Practice Name"
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            value={providerName}
            onChangeText={setProviderName}
            autoCapitalize="words"
          />
        )}

        <TextInput
          style={commonStyles.input}
          placeholder="Email Address"
          placeholderTextColor="rgba(255, 255, 255, 0.5)"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />

        <TextInput
          style={commonStyles.input}
          placeholder="Password"
          placeholderTextColor="rgba(255, 255, 255, 0.5)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
        />

        <TextInput
          style={commonStyles.input}
          placeholder="Confirm Password"
          placeholderTextColor="rgba(255, 255, 255, 0.5)"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoComplete="new-password"
        />

        {userType === USER_TYPES.INDIVIDUAL && (
          <>
            <TextInput
              style={commonStyles.input}
              placeholder="Law Firm or Provider Code (Optional)"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={firmCode}
              onChangeText={setFirmCode}
            />
            <TextInput
              style={commonStyles.input}
              placeholder="Friend's Invite Code (Optional)"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={inviteCode}
              onChangeText={(text) => setInviteCode(text.toUpperCase())}
              autoCapitalize="characters"
              maxLength={8}
            />
            {inviteCode && (
              <Text style={styles.inviteHint}>
                💰 You'll help your friend earn 500 coins!
              </Text>
            )}
          </>
        )}

        {(userType === USER_TYPES.LAW_FIRM || userType === USER_TYPES.MEDICAL_PROVIDER) && (
          <>
            <TextInput
              style={commonStyles.input}
              placeholder="Referral/Invite Code (Optional)"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              value={inviteCode}
              onChangeText={(text) => setInviteCode(text.toUpperCase())}
              autoCapitalize="characters"
              maxLength={8}
            />
            {inviteCode && (
              <Text style={styles.inviteHint}>
                💰 You'll help your referrer earn rewards!
              </Text>
            )}
          </>
        )}

        <TouchableOpacity 
          style={commonStyles.primaryButton} 
          onPress={onRegister}
        >
          <Text style={commonStyles.buttonText}>Create Free Account</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => onNavigate('login')}>
          <Text style={commonStyles.linkText}>Already have an account? Sign In</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          By creating an account, you agree to our Terms of Service and Privacy Policy. 
          This app provides educational information, not legal advice.
        </Text>
      </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  videoWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    width: '100%',
    height: '100%',
    zIndex: Platform.OS === 'web' ? -1 : 0,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  backgroundVideo: {
    width: '100%',
    height: '100%',
    minWidth: '100%',
    minHeight: '100%',
    backgroundColor: '#000',
  },
  backgroundVideoMobile: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
  },
  staticBackground: {
    backgroundColor: '#0a0a1a',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  scrollContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  formContainer: {
    padding: 20,
  },
  formTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 30,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  toggleContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  toggleButton: {
    flex: 1,
    padding: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    backgroundColor: 'rgba(30, 30, 50, 0.8)',
    marginHorizontal: 5,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleButtonActive: {
    borderColor: '#3498db',
    backgroundColor: 'rgba(52, 152, 219, 0.9)',
  },
  toggleText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  freeTierBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  freeTierBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#fff',
  },
  disclaimer: {
    fontSize: 12,
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 18,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  inviteHint: {
    fontSize: 14,
    color: '#5dff7f',
    fontWeight: '600',
    marginTop: -10,
    marginBottom: 10,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
});

export default RegisterScreen;
