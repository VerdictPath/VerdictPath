import React, { useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
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
  firmName,
  setFirmName,
  providerName,
  setProviderName,
  privacyAccepted,
  setPrivacyAccepted,
  onRegister, 
  onNavigate 
}) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playAsync();
    }
  }, []);

  console.log('RegisterScreen rendering - privacyAccepted:', privacyAccepted);
  console.log('RegisterScreen rendering - userType:', userType);
  
  return (
    <View style={commonStyles.container}>
      <View style={styles.videoWrapper} pointerEvents="none">
        <Video
          ref={videoRef}
          source={require('../../attached_assets/Stationary Breathing 10sec_1763360411263.mp4')}
          style={styles.backgroundVideo}
          resizeMode={ResizeMode.CONTAIN}
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
            onPress={() => setUserType(USER_TYPES.LAW_FIRM)}
          >
            <Text style={[styles.toggleText, userType === USER_TYPES.LAW_FIRM && styles.toggleTextActive]}>
              Law Firm
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.toggleButton, userType === USER_TYPES.MEDICAL_PROVIDER && styles.toggleButtonActive]}
            onPress={() => setUserType(USER_TYPES.MEDICAL_PROVIDER)}
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
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
            />
            <TextInput
              style={commonStyles.input}
              placeholder="Last Name"
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
            />
          </>
        )}

        {userType === USER_TYPES.LAW_FIRM && (
          <TextInput
            style={commonStyles.input}
            placeholder="Law Firm Name"
            value={firmName}
            onChangeText={setFirmName}
            autoCapitalize="words"
          />
        )}

        {userType === USER_TYPES.MEDICAL_PROVIDER && (
          <TextInput
            style={commonStyles.input}
            placeholder="Medical Provider/Practice Name"
            value={providerName}
            onChangeText={setProviderName}
            autoCapitalize="words"
          />
        )}

        <TextInput
          style={commonStyles.input}
          placeholder="Email Address"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />

        <TextInput
          style={commonStyles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
        />

        <TextInput
          style={commonStyles.input}
          placeholder="Confirm Password"
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
              value={firmCode}
              onChangeText={setFirmCode}
            />
            <TextInput
              style={commonStyles.input}
              placeholder="Friend's Invite Code (Optional)"
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
          <Text style={commonStyles.buttonText}>Create Account</Text>
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
    zIndex: -1,
  },
  backgroundVideo: {
    width: '100%',
    height: '100%',
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
    borderColor: 'rgba(255, 255, 255, 0.4)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 5,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleButtonActive: {
    borderColor: '#3498db',
    backgroundColor: 'rgba(52, 152, 219, 0.7)',
  },
  toggleText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#FFFFFF',
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
    color: '#27ae60',
    fontWeight: '600',
    marginTop: -10,
    marginBottom: 10,
    textAlign: 'center',
  },
});

export default RegisterScreen;
