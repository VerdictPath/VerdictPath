import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Animated, Platform } from 'react-native';
import { Video, ResizeMode } from '../utils/safeAVImport';
import { commonStyles } from '../styles/commonStyles';
import { API_BASE_URL } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import WebVideoBackground from '../components/WebVideoBackground';

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

const ChangePasswordScreen = ({ route, navigation }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'error' });
  const videoRef = useRef(null);

  const { changePasswordToken, email, firstName, lastName } = route.params || {};

  const showToast = (message, type = 'error') => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast({ visible: false, message: '', type: 'error' });
  };

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playAsync();
    }
  }, []);

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
    if (!newPassword || !confirmPassword) {
      showToast('Please fill in all fields', 'error');
      return;
    }

    const validationError = validatePassword(newPassword);
    if (validationError) {
      showToast(validationError, 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/change-password/first-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          changePasswordToken,
          newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        await AsyncStorage.setItem('token', data.token);
        await AsyncStorage.setItem('user', JSON.stringify(data.user));
        
        showToast('Password changed successfully! Redirecting to login...', 'success');
        
        setTimeout(() => {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        }, 2000);
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

  return (
    <View style={[commonStyles.container, Platform.OS === 'web' && { backgroundColor: 'transparent' }]}>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
      <View style={[styles.videoWrapper, Platform.OS === 'web' && { backgroundColor: 'transparent' }]} pointerEvents="none">
        {Platform.OS === 'web' ? (
          <WebVideoBackground uri="/videos/breathing.mp4" />
        ) : Video ? (
          <Video
            ref={videoRef}
            source={require('../../attached_assets/Cat looking around 10sec_1763360910310.mp4')}
            style={styles.backgroundVideo}
            resizeMode={ResizeMode.CONTAIN}
            isLooping
            isMuted
            shouldPlay
          />
        ) : null}
        <View style={styles.videoOverlay} />
      </View>
      
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Change Your Password</Text>
          <Text style={styles.subtitle}>
            Welcome, {firstName} {lastName}! For security, you must change your temporary password.
          </Text>
          
          <View style={styles.requirementsBox}>
            <Text style={styles.requirementsTitle}>Password Requirements:</Text>
            <Text style={styles.requirementItem}>• At least 8 characters long</Text>
            <Text style={styles.requirementItem}>• At least one uppercase letter (A-Z)</Text>
            <Text style={styles.requirementItem}>• At least one lowercase letter (a-z)</Text>
            <Text style={styles.requirementItem}>• At least one number (0-9)</Text>
            <Text style={styles.requirementItem}>• At least one special character (!@#$%^&*)</Text>
          </View>

          <TextInput
            style={commonStyles.input}
            placeholder="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          <TextInput
            style={commonStyles.input}
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          <TouchableOpacity 
            style={[commonStyles.primaryButton, loading && styles.buttonDisabled]} 
            onPress={handleChangePassword}
            disabled={loading}
          >
            <Text style={commonStyles.buttonText}>
              {loading ? 'Changing Password...' : 'Change Password'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.emailText}>Logged in as: {email}</Text>
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
    zIndex: -1,
  },
  backgroundVideo: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 30,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  formTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#555',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  requirementsBox: {
    backgroundColor: '#f0f8ff',
    borderLeftWidth: 4,
    borderLeftColor: '#4a90e2',
    padding: 15,
    marginBottom: 20,
    borderRadius: 8,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  requirementItem: {
    fontSize: 12,
    color: '#555',
    marginBottom: 4,
  },
  emailText: {
    fontSize: 12,
    color: '#777',
    marginTop: 15,
    textAlign: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default ChangePasswordScreen;
