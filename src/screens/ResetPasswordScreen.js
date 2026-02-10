import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  ActivityIndicator,
  Platform,
} from "react-native";
import { VideoView, useVideoPlayer } from "../utils/safeVideoImport";
import WebVideoBackground from "../components/WebVideoBackground";
import { commonStyles } from "../styles/commonStyles";
import { API_BASE_URL } from "../config/api";

const ResetPasswordScreen = ({ onNavigate, resetToken }) => {
  const { width } = useWindowDimensions();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenEmail, setTokenEmail] = useState("");
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

    const timer = setTimeout(() => {
      if (player && !player.playing) {
        player.play().catch(() => {});
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [player, enableVideo]);

  useEffect(() => {
    verifyToken();
  }, [resetToken]);

  const verifyToken = async () => {
    if (!resetToken) {
      setVerifying(false);
      setTokenValid(false);
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/verify-reset-token?token=${resetToken}`
      );
      const data = await response.json();

      if (data.valid) {
        setTokenValid(true);
        setTokenEmail(data.email);
      } else {
        setTokenValid(false);
        setError(data.message || "Invalid or expired reset link");
      }
    } catch (err) {
      setTokenValid(false);
      setError("Network error. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async () => {
    if (!newPassword || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: resetToken,
          newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitted(true);
      } else {
        setError(data.message || "Failed to reset password");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formWidth = width < 500 ? "100%" : width < 768 ? "80%" : 400;

  const renderContent = () => {
    if (verifying) {
      return (
        <View style={[styles.formContainer, { width: formWidth }]}>
          <ActivityIndicator size="large" color="#d4af37" />
          <Text style={styles.loadingText}>Verifying reset link...</Text>
        </View>
      );
    }

    if (!tokenValid) {
      return (
        <View style={[styles.formContainer, { width: formWidth }]}>
          <Text style={styles.title}>Invalid Link</Text>
          <View style={styles.errorBox}>
            <Text style={styles.errorBoxText}>
              {error || "This password reset link is invalid or has expired."}
            </Text>
          </View>
          <Text style={styles.subtitle}>
            Please request a new password reset link.
          </Text>
          <TouchableOpacity
            style={commonStyles.primaryButton}
            onPress={() => onNavigate("forgotPassword")}
          >
            <Text style={commonStyles.buttonText}>Request New Link</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onNavigate("login")}>
            <Text style={commonStyles.linkText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (submitted) {
      return (
        <View style={[styles.formContainer, { width: formWidth }]}>
          <Text style={styles.title}>Password Reset!</Text>
          <View style={styles.successBox}>
            <Text style={styles.successText}>
              Your password has been successfully changed. You can now log in with your new password.
            </Text>
          </View>
          <TouchableOpacity
            style={commonStyles.primaryButton}
            onPress={() => onNavigate("login")}
          >
            <Text style={commonStyles.buttonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={[styles.formContainer, { width: formWidth }]}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>
          Enter a new password for {tokenEmail}
        </Text>

        <TextInput
          style={commonStyles.input}
          placeholder="New Password"
          placeholderTextColor="rgba(255, 255, 255, 0.5)"
          value={newPassword}
          onChangeText={(text) => {
            setNewPassword(text);
            setError("");
          }}
          secureTextEntry
          editable={!loading}
        />

        <TextInput
          style={commonStyles.input}
          placeholder="Confirm New Password"
          placeholderTextColor="rgba(255, 255, 255, 0.5)"
          value={confirmPassword}
          onChangeText={(text) => {
            setConfirmPassword(text);
            setError("");
          }}
          secureTextEntry
          editable={!loading}
        />

        <Text style={styles.requirements}>
          Password must be at least 8 characters
        </Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[commonStyles.primaryButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#1e3a5f" />
          ) : (
            <Text style={commonStyles.buttonText}>Reset Password</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => onNavigate("login")}>
          <Text style={commonStyles.linkText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' ? (
        <View style={styles.videoContainer}>
          <WebVideoBackground uri={width < 600 ? "/videos/cat_mobile.mp4" : width < 1024 ? "/videos/cat_tab.mp4" : "/videos/cat_desktop.mp4"} />
        </View>
      ) : enableVideo && player && VideoView ? (
        <View style={styles.videoContainer}>
          <VideoView
            player={player}
            style={styles.video}
            contentFit="contain"
            nativeControls={false}
          />
        </View>
      ) : null}
      <View style={styles.overlay} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderContent()}
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
    backgroundColor: "rgba(30, 58, 95, 0.7)",
    zIndex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    zIndex: 2,
  },
  formContainer: {
    backgroundColor: "rgba(20, 30, 50, 0.9)",
    borderRadius: 16,
    padding: 24,
    maxWidth: 400,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
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
    color: "#fff",
    textAlign: "center",
    marginBottom: 24,
    opacity: 0.8,
  },
  loadingText: {
    color: "#fff",
    fontSize: 16,
    marginTop: 16,
    textAlign: "center",
  },
  requirements: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 12,
    marginBottom: 16,
    textAlign: "center",
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
    width: "100%",
  },
  successText: {
    color: "#fff",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  errorBox: {
    backgroundColor: "rgba(244, 67, 54, 0.2)",
    borderLeftWidth: 4,
    borderLeftColor: "#f44336",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    width: "100%",
  },
  errorBoxText: {
    color: "#fff",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
});

export default ResetPasswordScreen;
