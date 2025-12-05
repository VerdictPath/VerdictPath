import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { Video, ResizeMode } from "expo-av";
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
  const videoRef = useRef(null);
  const { width, height } = useWindowDimensions();

  // Always use CONTAIN mode to prevent cropping and show full video
  // Video will scale down smoothly when screen size changes
  const resizeMode = ResizeMode.CONTAIN;

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playAsync();
    }
  }, []);

  return (
    <View style={commonStyles.container}>
      <View style={styles.videoContainer} pointerEvents="none">
        <Video
          ref={videoRef}
          source={require("../../attached_assets/Cat looking around 10sec_1763360910310.mp4")}
          style={styles.backgroundVideo}
          resizeMode={resizeMode}
          isLooping
          isMuted
          shouldPlay
        />
        <View style={styles.videoOverlay} />
      </View>

      <ScrollView
        style={styles.scrollContainer}
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
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={commonStyles.input}
            placeholder="Password"
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
    zIndex: -1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  backgroundVideo: {
    width: "100%",
    height: "100%",
    alignSelf: "center",
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
});

export default LoginScreen;
