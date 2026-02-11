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
import { VideoView, useVideoPlayer } from "../utils/safeVideoImport";
import WebVideoBackground from "../components/WebVideoBackground";
import { commonStyles } from "../styles/commonStyles";
import { theme } from "../styles/theme";

const LandingScreen = ({ onNavigate }) => {
  const isWeb = Platform.OS === 'web';

  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [disclaimerChecked, setDisclaimerChecked] = useState(false);
  const [userAgreementChecked, setUserAgreementChecked] = useState(false);
  const [eulaChecked, setEulaChecked] = useState(false);

  const allChecked = privacyChecked && disclaimerChecked && userAgreementChecked && eulaChecked;

  const videoSource = useMemo(() => 
    isWeb ? null : require("../../attached_assets/Ship in Medium Weather 10sec_1763359328620.mp4"),
    []
  );

  const [enableVideo, setEnableVideo] = useState(!isWeb);

  const player = useVideoPlayer(enableVideo ? videoSource : null);

  useEffect(() => {
    if (isWeb || !player || !enableVideo) return;

    player.loop = true;
    player.muted = true;
    player.volume = 0;
    player.playbackRate = 0.95;

    const startPlayback = async () => {
      try {
        let attempts = 0;
        const maxAttempts = 20;
        while (attempts < maxAttempts && !(player && player.duration > 0)) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }

        if (player && !player.playing) {
          player.playbackRate = 0.95;
          await player.play();
          await new Promise(resolve => setTimeout(resolve, 200));
          
          if (!player.playing) {
            await player.play();
            await new Promise(resolve => setTimeout(resolve, 200));
          }
          
          if (!player.playing) {
            setTimeout(async () => {
              try { await player.play(); } catch (e) {}
            }, 500);
          }
        }
      } catch (error) {
        setTimeout(async () => {
          try {
            await new Promise(resolve => setTimeout(resolve, 500));
            if (player && !player.playing && player.duration > 0) {
              await player.play();
            }
          } catch (retryError) {
            setEnableVideo(false);
          }
        }, 1000);
      }
    };
    
    const startTimer = setTimeout(startPlayback, 1000);
    
    return () => {
      clearTimeout(startTimer);
    };
  }, [player, enableVideo]);

  return (
    <View style={[commonStyles.container, Platform.OS === 'web' && { backgroundColor: 'transparent' }]}>
      <View style={[styles.videoContainer, Platform.OS === 'web' && { backgroundColor: 'transparent' }]}>
        {Platform.OS === 'web' ? (
          <WebVideoBackground uri="/videos/ship.mp4" />
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
            source={require("../../attached_assets/verdict_path_logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[commonStyles.primaryButton, !allChecked && styles.buttonDisabled]}
            onPress={() => allChecked && onNavigate("register")}
            disabled={!allChecked}
          >
            <Text style={commonStyles.buttonText}>
              {allChecked ? 'Get Started' : 'Please Agree to All Terms'}
            </Text>
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

        <View style={styles.agreementsContainer}>
          <Text style={styles.agreementsTitle}>Please review and agree:</Text>

          <TouchableOpacity
            style={styles.agreementRow}
            onPress={() => setPrivacyChecked(!privacyChecked)}
            activeOpacity={0.7}
          >
            <View style={[styles.agreementCheckbox, privacyChecked && styles.agreementCheckboxChecked]}>
              {privacyChecked && <Text style={styles.agreementCheckmark}>✓</Text>}
            </View>
            <Text style={styles.agreementLabel}>
              I agree to the{' '}
              <Text
                style={styles.agreementLink}
                onPress={(e) => { e.stopPropagation && e.stopPropagation(); onNavigate('privacy-policy'); }}
              >
                Privacy Policy
              </Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.agreementRow}
            onPress={() => setDisclaimerChecked(!disclaimerChecked)}
            activeOpacity={0.7}
          >
            <View style={[styles.agreementCheckbox, disclaimerChecked && styles.agreementCheckboxChecked]}>
              {disclaimerChecked && <Text style={styles.agreementCheckmark}>✓</Text>}
            </View>
            <Text style={styles.agreementLabel}>
              I agree to the{' '}
              <Text
                style={styles.agreementLink}
                onPress={(e) => { e.stopPropagation && e.stopPropagation(); onNavigate('legal-disclaimer'); }}
              >
                Legal Disclaimer
              </Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.agreementRow}
            onPress={() => setUserAgreementChecked(!userAgreementChecked)}
            activeOpacity={0.7}
          >
            <View style={[styles.agreementCheckbox, userAgreementChecked && styles.agreementCheckboxChecked]}>
              {userAgreementChecked && <Text style={styles.agreementCheckmark}>✓</Text>}
            </View>
            <Text style={styles.agreementLabel}>
              I agree to the{' '}
              <Text
                style={styles.agreementLink}
                onPress={(e) => { e.stopPropagation && e.stopPropagation(); onNavigate('terms-of-service'); }}
              >
                User Agreement
              </Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.agreementRow}
            onPress={() => setEulaChecked(!eulaChecked)}
            activeOpacity={0.7}
          >
            <View style={[styles.agreementCheckbox, eulaChecked && styles.agreementCheckboxChecked]}>
              {eulaChecked && <Text style={styles.agreementCheckmark}>✓</Text>}
            </View>
            <Text style={styles.agreementLabel}>
              I agree to the{' '}
              <Text
                style={styles.agreementLink}
                onPress={(e) => { e.stopPropagation && e.stopPropagation(); onNavigate('eula'); }}
              >
                EULA
              </Text>
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
    width: 220,
    height: 130,
    borderRadius: 12,
  },
  agreementsContainer: {
    paddingHorizontal: 20,
    marginTop: 5,
    marginBottom: 5,
  },
  agreementsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  agreementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  agreementCheckbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: '#f5deb3',
    borderRadius: 4,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  agreementCheckboxChecked: {
    backgroundColor: '#27ae60',
    borderColor: '#27ae60',
  },
  agreementCheckmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  agreementLabel: {
    flex: 1,
    fontSize: 12,
    color: '#FFFFFF',
    lineHeight: 18,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  agreementLink: {
    color: '#5dade2',
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
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
