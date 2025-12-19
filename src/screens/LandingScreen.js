import React, { useMemo, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Platform,
} from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { commonStyles } from "../styles/commonStyles";
import { theme } from "../styles/theme";

const LandingScreen = ({ onNavigate }) => {
  // Video source - memoized to prevent recreation
  const videoSource = useMemo(() => 
    require("../../attached_assets/Ship in Medium Weather 10sec_1763359328620.mp4"),
    []
  );

  // Enable video with performance optimizations
  const [enableVideo, setEnableVideo] = useState(true);

  // Create video player only if video is enabled
  const player = useVideoPlayer(enableVideo ? videoSource : null);

  // Configure player once on mount with aggressive performance optimizations
  useEffect(() => {
    if (!player || !enableVideo) return;

    // Set all player properties for maximum performance
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
          console.warn('[LandingScreen] Video did not load after waiting, attempting to play anyway');
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
            console.log('[LandingScreen] Play did not start, retrying...');
            await player.play();
            await new Promise(resolve => setTimeout(resolve, 200));
          }
          
          console.log('[LandingScreen] Video playback started on', Platform.OS);
          console.log('[LandingScreen] Player state:', {
            playing: player.playing,
            currentTime: player.currentTime,
            duration: player.duration,
          });
          
          // If still not playing after retry, try once more with a delay
          if (!player.playing && Platform.OS !== 'web') {
            console.log('[LandingScreen] Still not playing, final retry...');
            setTimeout(async () => {
              try {
                await player.play();
                console.log('[LandingScreen] Final retry - playing:', player.playing);
              } catch (e) {
                console.error('[LandingScreen] Final retry error:', e);
              }
            }, 500);
          }
        }
      } catch (error) {
        console.error('[LandingScreen] Play error:', error);
        // Retry once on mobile if it fails
        if (Platform.OS !== 'web') {
          setTimeout(async () => {
            try {
              // Wait a bit more for video to load
              await new Promise(resolve => setTimeout(resolve, 500));
              if (player && !player.playing && waitForVideoLoad()) {
                await player.play();
                console.log('[LandingScreen] Video playback retry successful');
              } else {
                console.warn('[LandingScreen] Video still not loaded on retry');
              }
            } catch (retryError) {
              console.error('[LandingScreen] Retry failed:', retryError);
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
    <View style={commonStyles.container}>
      <View style={styles.videoContainer}>
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
      </View>

      <ScrollView
        style={styles.overlay}
        contentContainerStyle={styles.overlayContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        scrollEventThrottle={16}
      >
        {/* Verdict Path Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require("../../attached_assets/Nautical_Pirate_Logo_with_Foggy_Sea_Background_1762830868803.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={commonStyles.primaryButton}
            onPress={() => onNavigate("register")}
          >
            <Text style={commonStyles.buttonText}>Get Started</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={commonStyles.secondaryButton}
            onPress={() => onNavigate("login")}
          >
            <Text style={commonStyles.secondaryButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.featuresContainer}>
          <Text style={styles.featureTitle}>What You'll Get:</Text>
          <View style={styles.featuresGrid}>
            <View style={styles.featureRow}>
              <View style={styles.iconBadge}>
                <Image
                  source={require("../../attached_assets/MAP_1763356928680.png")}
                  style={styles.iconThumbnail}
                  resizeMode="cover"
                />
              </View>
              <Text style={styles.featureItem}>Case roadmap</Text>
            </View>
            <View style={styles.featureRow}>
              <View style={styles.iconBadge}>
                <Image
                  source={require("../../attached_assets/_a_pirates_treasure_chest_of_gold_1763356815342.png")}
                  style={styles.iconThumbnail}
                  resizeMode="cover"
                />
              </View>
              <Text style={styles.featureItem}>Earn treasure</Text>
            </View>
          </View>
          <View style={styles.featuresGrid}>
            <View style={styles.featureRow}>
              <View style={styles.iconBadge}>
                <Image
                  source={require("../../attached_assets/Old Camera Closeup_1764040319335.png")}
                  style={styles.iconThumbnail}
                  resizeMode="cover"
                />
              </View>
              <Text style={styles.featureItem}>Video tutorials</Text>
            </View>
            <View style={styles.featureRow}>
              <View style={styles.iconBadge}>
                <Image
                  source={require("../../attached_assets/Medical Symbol Pirate_1764039521695.png")}
                  style={styles.iconThumbnail}
                  resizeMode="cover"
                />
              </View>
              <Text style={styles.featureItem}>Medical Hub</Text>
            </View>
          </View>
          <View style={styles.featuresGrid}>
            <View style={styles.featureRow}>
              <View style={styles.iconBadge}>
                <Image
                  source={require("../../attached_assets/Evidence Vault_1764037430801.png")}
                  style={styles.iconThumbnail}
                  resizeMode="cover"
                />
              </View>
              <Text style={styles.featureItem}>Evidence Vault</Text>
            </View>
          </View>
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
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "#000",
    overflow: "hidden",
  },
  backgroundVideo: {
    width: "100%",
    height: "100%",
    minWidth: "100%",
    minHeight: "100%",
  },
  backgroundVideoMobile: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  staticBackground: {
    backgroundColor: "#0a0a1a",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    zIndex: 1,
    overflow: "scroll",
  },
  overlayContent: {
    minHeight: "100%",
    paddingBottom: 20,
  },
  logoContainer: {
    alignItems: "center",
    marginTop: 5,
    marginBottom: 0,
  },
  logo: {
    width: 120,
    height: 120,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    marginTop: 0,
  },
  featuresContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginTop: 5,
  },
  featuresGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 8,
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "48%",
  },
  featureItem: {
    fontSize: 13,
    color: "#FFFFFF",
    flex: 1,
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.charcoal,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
    overflow: "hidden",
  },
  iconThumbnail: {
    width: 28,
    height: 28,
  },
});

export default LandingScreen;
