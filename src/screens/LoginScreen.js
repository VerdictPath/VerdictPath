import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  Platform,
} from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { commonStyles } from "../styles/commonStyles";
import { USER_TYPES } from "../constants/mockData";

const LoginScreen = ({
  email,
  setEmail,
  password,
  setPassword,
  onLogin,
  onNavigate,
  userType,
  setUserType,
  firmCode,
  setFirmCode,
}) => {
  const { width, height } = useWindowDimensions();

  // Select video source based on screen width (matching your settings)
  // Breakpoints: < 600px = mobile, 600-1024px = tablet, >= 1024px = desktop
  const videoSource = useMemo(() => {
    if (width < 600) {
      return require("../../attached_assets/cat_mobile_2.mp4");
    } else if (width < 1024) {
      return require("../../attached_assets/cat_tab.mp4");
    } else {
      // Use default desktop video (you can rename/create cat_desktop.mp4 if needed)
      return require("../../attached_assets/Cat looking around 10sec_1763360910310.mp4");
    }
  }, [width]);

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
          console.warn('[LoginScreen] Video did not load after waiting, attempting to play anyway');
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
            console.log('[LoginScreen] Play did not start, retrying...');
            await player.play();
            await new Promise(resolve => setTimeout(resolve, 200));
          }
          
          console.log('[LoginScreen] Video playback started on', Platform.OS);
          console.log('[LoginScreen] Player state:', {
            playing: player.playing,
            currentTime: player.currentTime,
            duration: player.duration,
          });
          
          // If still not playing after retry, try once more with a delay
          if (!player.playing && Platform.OS !== 'web') {
            console.log('[LoginScreen] Still not playing, final retry...');
            setTimeout(async () => {
              try {
                await player.play();
                console.log('[LoginScreen] Final retry - playing:', player.playing);
              } catch (e) {
                console.error('[LoginScreen] Final retry error:', e);
              }
            }, 500);
          }
        }
      } catch (error) {
        console.error("[LoginScreen] Play error:", error);
        // Retry once on mobile if it fails
        if (Platform.OS !== 'web') {
          setTimeout(async () => {
            try {
              // Wait a bit more for video to load
              await new Promise(resolve => setTimeout(resolve, 500));
              if (player && !player.playing && waitForVideoLoad()) {
                await player.play();
                console.log('[LoginScreen] Video playback retry successful');
              } else {
                console.warn('[LoginScreen] Video still not loaded on retry');
              }
            } catch (retryError) {
              console.error("[LoginScreen] Retry failed:", retryError);
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
  }, [player, videoSource, enableVideo]);

  return (
    <View style={commonStyles.container}>
      <View 
        style={[
          styles.videoContainer,
          Platform.OS !== 'web' && { width, height }
        ]} 
        pointerEvents="none"
      >
        {enableVideo && player ? (
          <VideoView
            player={player}
            style={[
              styles.backgroundVideo,
              Platform.OS !== 'web' && styles.backgroundVideoMobile
            ]}
            contentFit="cover"
            nativeControls={false}
            allowsFullscreen={false}
            allowsPictureInPicture={false}
            requiresLinearPlayback={false}
            pointerEvents="none"
            // Performance optimizations
            allowsExternalPlayback={false}
            // Ensure video fills on mobile
            {...(Platform.OS !== 'web' && { 
              entersFullscreenWhenPlayerEntersFullscreen: false,
            })}
          />
        ) : (
          <View style={[styles.backgroundVideo, styles.staticBackground]} />
        )}
        <View style={styles.videoOverlay} />
      </View>

      <ScrollView
        style={[styles.scrollContainer, { backgroundColor: 'transparent' }]}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Welcome Back</Text>

          <Text style={styles.sectionLabel}>I am a:</Text>
          <View style={styles.userTypeContainer}>
            <TouchableOpacity
              style={[
                styles.userTypeButton,
                userType === USER_TYPES.INDIVIDUAL &&
                  styles.userTypeButtonActive,
              ]}
              onPress={() => setUserType(USER_TYPES.INDIVIDUAL)}
            >
              <Text
                style={[
                  styles.userTypeText,
                  userType === USER_TYPES.INDIVIDUAL &&
                    styles.userTypeTextActive,
                ]}
              >
                Individual
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.userTypeButton,
                userType === USER_TYPES.LAW_FIRM && styles.userTypeButtonActive,
              ]}
              onPress={() => setUserType(USER_TYPES.LAW_FIRM)}
            >
              <Text
                style={[
                  styles.userTypeText,
                  userType === USER_TYPES.LAW_FIRM && styles.userTypeTextActive,
                ]}
              >
                Law Firm
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.userTypeButton,
                userType === USER_TYPES.MEDICAL_PROVIDER &&
                  styles.userTypeButtonActive,
              ]}
              onPress={() => setUserType(USER_TYPES.MEDICAL_PROVIDER)}
            >
              <Text
                style={[
                  styles.userTypeText,
                  userType === USER_TYPES.MEDICAL_PROVIDER &&
                    styles.userTypeTextActive,
                ]}
              >
                Medical Provider
              </Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={commonStyles.input}
            placeholder="Email Address"
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={commonStyles.input}
            placeholder="Password"
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={commonStyles.primaryButton}
            onPress={onLogin}
          >
            <Text style={commonStyles.buttonText}>Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => onNavigate("forgotPassword")}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => onNavigate("register")}>
            <Text style={commonStyles.linkText}>
              Don't have an account? Sign Up
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  videoContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    width: "100%",
    height: "100%",
    zIndex: Platform.OS === 'web' ? -1 : 0,
    backgroundColor: "#000",
    overflow: "hidden",
  },
  backgroundVideo: {
    width: "100%",
    height: "100%",
    minWidth: "100%",
    minHeight: "100%",
    backgroundColor: "#000",
  },
  backgroundVideoMobile: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#000",
  },
  staticBackground: {
    backgroundColor: "#0a0a1a",
  },
  videoOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 40,
  },
  formContainer: {
    padding: 20,
  },
  formTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 30,
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 12,
    marginTop: 10,
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  userTypeContainer: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  userTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.4)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
  },
  userTypeButtonActive: {
    backgroundColor: "rgba(212, 165, 116, 0.7)",
    borderColor: "#d4a574",
  },
  userTypeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
  },
  userTypeTextActive: {
    color: "#FFFFFF",
  },
  forgotPasswordText: {
    color: "#d4af37",
    fontSize: 14,
    textAlign: "center",
    marginTop: 12,
    marginBottom: 8,
    textDecorationLine: "underline",
  },
});

export default LoginScreen;
