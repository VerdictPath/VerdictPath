import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { Video, ResizeMode } from "expo-av";
import { commonStyles } from "../styles/commonStyles";
import { theme } from "../styles/theme";

const LandingScreen = ({ onNavigate }) => {
  const videoRef = useRef(null);
  const { width, height } = useWindowDimensions();

  // Detect if it's a large screen (tablet/TV) or small screen (phone/Replit)
  const isLargeScreen = width >= 768; // Tablets and larger
  const isSmallScreen = width < 768; // Phones and small screens like Replit

  // For small screens, scale down the video (e.g., 80% of screen size)
  // For large screens, use full screen size
  const videoWidth = isSmallScreen ? width * 0.8 : width;
  const videoHeight = isSmallScreen ? height * 0.8 : height;
  const resizeMode = isLargeScreen ? ResizeMode.COVER : ResizeMode.CONTAIN;

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playAsync();
    }
  }, []);

  return (
    <View style={commonStyles.container}>
      <View style={styles.videoContainer}>
        <Video
          ref={videoRef}
          source={require("../../attached_assets/Ship in Medium Weather 10sec_1763359328620.mp4")}
          style={[
            styles.backgroundVideo,
            { width: videoWidth, height: videoHeight },
          ]}
          resizeMode={resizeMode}
          isLooping
          isMuted
          shouldPlay
        />
      </View>

      <ScrollView
        style={styles.overlay}
        contentContainerStyle={styles.overlayContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Verdict Path Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require("../../attached_assets/Nautical Pirate Logo with Foggy Sea Background_1762830868803.png")}
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
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  backgroundVideo: {
    alignSelf: "center",
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
