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
  ActivityIndicator,
  Alert,
} from "react-native";
import { VideoView, useVideoPlayer } from "expo-video";
import { commonStyles } from "../styles/commonStyles";
import { USER_TYPES } from "../constants/mockData";
import { API_BASE_URL } from "../config/api";

const ForgotPasswordScreen = ({ onNavigate }) => {
  const { width, height } = useWindowDimensions();
  const [email, setEmail] = useState("");
  const [userType, setUserType] = useState(USER_TYPES.INDIVIDUAL);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const videoSource = useMemo(() => {
    if (width < 600) {
      return require("../../attached_assets/cat_mobile_2.mp4");
    } else if (width < 1024) {
      return require("../../attached_assets/cat_tab.mp4");
    } else {
      return require("../../attached_assets/Cat looking around 10sec_1763360910310.mp4");
    }
  }, [width]);

  const [enableVideo, setEnableVideo] = useState(true);
  const player = useVideoPlayer(enableVideo ? videoSource : null);

  useEffect(() => {
    if (!player || !enableVideo) return;
    player.loop = true;
    player.muted = true;
    player.volume = 0;
    player.playbackRate = 0.95;

    const timer = setTimeout(async () => {
      try {
        if (player && !player.playing) {
          const playPromise = player.play();
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {});
          }
        }
      } catch (error) {
        // Silently handle video play errors
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [player, enableVideo]);

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const userTypeMap = {
        [USER_TYPES.INDIVIDUAL]: "individual",
        [USER_TYPES.LAW_FIRM]: "lawfirm",
        [USER_TYPES.MEDICAL_PROVIDER]: "medicalprovider",
      };

      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          userType: userTypeMap[userType],
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitted(true);
      } else {
        setError(data.message || "Failed to send reset link");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formWidth = width < 500 ? "100%" : width < 768 ? "80%" : 400;

  if (submitted) {
    return (
      <View style={styles.container}>
        {enableVideo && (
          <View style={styles.videoContainer}>
            <VideoView
              player={player}
              style={styles.video}
              contentFit="contain"
              nativeControls={false}
            />
          </View>
        )}
        <View style={styles.overlay} />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.formContainer, { width: formWidth }]}>
            <Text style={styles.title}>Check Your Email</Text>
            <Text style={styles.subtitle}>
              If an account exists with that email, we've sent a password reset link.
            </Text>

            <View style={styles.successBox}>
              <Text style={styles.successText}>
                Please check your inbox and spam folder. The link will expire in 1 hour.
              </Text>
            </View>

            <TouchableOpacity
              style={commonStyles.primaryButton}
              onPress={() => onNavigate("login")}
            >
              <Text style={commonStyles.buttonText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {enableVideo && (
        <View style={styles.videoContainer}>
          <VideoView
            player={player}
            style={styles.video}
            contentFit="contain"
            nativeControls={false}
          />
        </View>
      )}
      <View style={styles.overlay} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.formContainer, { width: formWidth }]}>
          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>
            Enter your email and we'll send you a reset link
          </Text>

          <Text style={styles.sectionLabel}>Select Account Type</Text>
          <View style={styles.userTypeContainer}>
            <TouchableOpacity
              style={[
                styles.userTypeButton,
                userType === USER_TYPES.INDIVIDUAL && styles.userTypeButtonActive,
              ]}
              onPress={() => setUserType(USER_TYPES.INDIVIDUAL)}
            >
              <Text
                style={[
                  styles.userTypeText,
                  userType === USER_TYPES.INDIVIDUAL && styles.userTypeTextActive,
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
                userType === USER_TYPES.MEDICAL_PROVIDER && styles.userTypeButtonActive,
              ]}
              onPress={() => setUserType(USER_TYPES.MEDICAL_PROVIDER)}
            >
              <Text
                style={[
                  styles.userTypeText,
                  userType === USER_TYPES.MEDICAL_PROVIDER && styles.userTypeTextActive,
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
            onChangeText={(text) => {
              setEmail(text);
              setError("");
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[commonStyles.primaryButton, loading && styles.disabledButton]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#1e3a5f" />
            ) : (
              <Text style={commonStyles.buttonText}>Send Reset Link</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => onNavigate("login")}>
            <Text style={commonStyles.linkText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1e3a5f",
  },
  videoContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    zIndex: 0,
  },
  video: {
    width: "100%",
    height: "100%",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    zIndex: 1,
    pointerEvents: "none",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    zIndex: 2,
  },
  formContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 16,
    padding: 24,
    maxWidth: 400,
    borderWidth: 2,
    borderColor: "#d4af37",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#d4af37",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#333",
    textAlign: "center",
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    color: "#1e3a5f",
    marginBottom: 12,
    fontWeight: "600",
  },
  userTypeContainer: {
    flexDirection: "row",
    marginBottom: 20,
    gap: 8,
  },
  userTypeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#1e3a5f",
    backgroundColor: "#fff",
    alignItems: "center",
  },
  userTypeButtonActive: {
    backgroundColor: "#d4af37",
    borderColor: "#d4af37",
  },
  userTypeText: {
    color: "#1e3a5f",
    fontSize: 12,
    fontWeight: "500",
  },
  userTypeTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  disabledButton: {
    opacity: 0.6,
  },
  successBox: {
    backgroundColor: "rgba(76, 175, 80, 0.2)",
    borderLeftWidth: 4,
    borderLeftColor: "#4caf50",
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  successText: {
    color: "#2e7d32",
    fontSize: 14,
    lineHeight: 20,
  },
});

export default ForgotPasswordScreen;
