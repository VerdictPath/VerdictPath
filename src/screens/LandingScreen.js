import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Dimensions,
} from "react-native";
import { Video, ResizeMode } from "expo-av";
import { commonStyles } from "../styles/commonStyles";
import { theme } from "../styles/theme";

const { height: screenHeight } = Dimensions.get("window");

const LandingScreen = ({ onNavigate }) => {
  const videoRef = useRef(null);

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
          style={styles.backgroundVideo}
          resizeMode={ResizeMode.CONTAIN}
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
    justifyContent: "center",
    alignItems: "center",
  },
  backgroundVideo: {
    width: "100%",
    height: "100%",
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
