import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Platform, Alert } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { commonStyles } from '../styles/commonStyles';
import { theme } from '../styles/theme';
import { API_ENDPOINTS, apiRequest } from '../config/api';

const MedicalProviderRegistrationScreen = ({ 
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  providerName,
  setProviderName,
  firstName,
  setFirstName,
  lastName,
  setLastName,
  onSelectSubscription,
  onNavigate,
  privacyAccepted,
  setPrivacyAccepted,
  onRegistrationComplete
}) => {
  const [mode, setMode] = useState(null);
  const [joinProviderCode, setJoinProviderCode] = useState('');
  const [joinFirstName, setJoinFirstName] = useState('');
  const [joinLastName, setJoinLastName] = useState('');
  const [requestedRole, setRequestedRole] = useState('staff');
  const [providerType, setProviderType] = useState('clinic');
  const [loading, setLoading] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playAsync();
    }
  }, []);

  const handleCreateNewProvider = async () => {
    if (!providerName.trim()) {
      alert('Please enter your medical provider/practice name');
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      alert('Please enter your first and last name');
      return;
    }
    if (!email.trim()) {
      alert('Please enter your email address');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('Please enter a valid email address');
      return;
    }
    if (!password || password.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    
    setLoading(true);
    try {
      const response = await apiRequest(API_ENDPOINTS.AUTH.REGISTER_MEDICALPROVIDER, {
        method: 'POST',
        body: JSON.stringify({
          providerName: providerName,
          email: email,
          password: password,
          firstName: firstName,
          lastName: lastName,
          subscriptionTier: 'free',
          providerType: providerType,
          privacyAccepted: privacyAccepted
        })
      });

      const userData = {
        id: response.medicalProvider.id,
        email: response.medicalProvider.email,
        type: 'medical_provider',
        providerName: response.medicalProvider.providerName,
        providerCode: response.medicalProvider.providerCode,
        token: response.token,
        subscription: 'free',
        coins: 0,
        streak: 0
      };

      if (onRegistrationComplete) {
        onRegistrationComplete(userData);
      }
    } catch (error) {
      console.error('Error registering medical provider:', error);
      const errorMsg = error.message || 'Failed to create account. Please try again.';
      if (Platform.OS === 'web') {
        alert('Registration Error: ' + errorMsg);
      } else {
        Alert.alert('Registration Error', errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleJoinExistingProvider = async () => {
    if (!joinProviderCode.trim()) {
      alert('Please enter the provider code');
      return;
    }
    if (!joinFirstName.trim() || !joinLastName.trim()) {
      alert('Please enter your first and last name');
      return;
    }
    if (!email.trim()) {
      alert('Please enter your email address');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert('Please enter a valid email address');
      return;
    }
    if (!password || password.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await apiRequest(API_ENDPOINTS.AUTH.JOIN_MEDICALPROVIDER, {
        method: 'POST',
        body: JSON.stringify({
          providerCode: joinProviderCode,
          firstName: joinFirstName,
          lastName: joinLastName,
          email: email,
          password: password,
          requestedRole: requestedRole
        })
      });

      const userData = {
        id: response.medicalProvider.id,
        email: response.medicalProvider.email,
        type: 'medical_provider',
        providerName: response.medicalProvider.providerName,
        providerCode: response.medicalProvider.providerCode,
        token: response.token,
        subscription: 'free',
        coins: 0,
        streak: 0,
        role: response.medicalProvider.role,
        userCode: response.medicalProvider.userCode
      };

      if (onRegistrationComplete) {
        onRegistrationComplete(userData);
      }
    } catch (error) {
      console.error('Error joining medical provider:', error);
      const errorMsg = error.message || 'Failed to join provider. Please check the provider code and try again.';
      if (Platform.OS === 'web') {
        alert('Join Error: ' + errorMsg);
      } else {
        Alert.alert('Join Error', errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const renderPricingCard = () => (
    <View style={styles.pricingSection}>
      <View style={styles.pricingHeader}>
        <Text style={styles.pricingBadge}>LIMITED TIME OFFER</Text>
      </View>
      
      <Text style={styles.pricingTitle}>Medical Provider Portal Pricing</Text>
      
      <View style={styles.tierContainer}>
        <View style={styles.tierCard}>
          <Text style={styles.tierName}>Solo Practitioners</Text>
          <Text style={styles.tierRange}>1-5 Patients</Text>
          <View style={styles.priceRow}>
            <Text style={styles.originalPrice}>$39/mo</Text>
            <Text style={styles.salePrice}>FREE</Text>
          </View>
        </View>

        <View style={styles.tierCard}>
          <Text style={styles.tierName}>Small Practices</Text>
          <Text style={styles.tierRange}>6-20 Patients</Text>
          <View style={styles.priceRow}>
            <Text style={styles.originalPrice}>$79/mo</Text>
            <Text style={styles.salePrice}>FREE</Text>
          </View>
        </View>

        <View style={styles.tierCard}>
          <Text style={styles.tierName}>Medium Practices</Text>
          <Text style={styles.tierRange}>21-50 Patients</Text>
          <View style={styles.priceRow}>
            <Text style={styles.originalPrice}>$149/mo</Text>
            <Text style={styles.salePrice}>FREE</Text>
          </View>
        </View>

        <View style={styles.tierCard}>
          <Text style={styles.tierName}>Large Clinics</Text>
          <Text style={styles.tierRange}>51-100 Patients</Text>
          <View style={styles.priceRow}>
            <Text style={styles.originalPrice}>$299/mo</Text>
            <Text style={styles.salePrice}>FREE</Text>
          </View>
        </View>

        <View style={styles.tierCard}>
          <Text style={styles.tierName}>Multi-Location</Text>
          <Text style={styles.tierRange}>101-250 Patients</Text>
          <View style={styles.priceRow}>
            <Text style={styles.originalPrice}>$499/mo</Text>
            <Text style={styles.salePrice}>FREE</Text>
          </View>
        </View>

        <View style={styles.tierCard}>
          <Text style={styles.tierName}>Hospital Networks</Text>
          <Text style={styles.tierRange}>251-500 Patients</Text>
          <View style={styles.priceRow}>
            <Text style={styles.originalPrice}>$799/mo</Text>
            <Text style={styles.salePrice}>FREE</Text>
          </View>
        </View>

        <View style={[styles.tierCard, styles.tierCardHighlight]}>
          <Text style={styles.tierName}>Healthcare Systems</Text>
          <Text style={styles.tierRange}>501+ Patients</Text>
          <View style={styles.priceRow}>
            <Text style={styles.originalPrice}>$1,299/mo</Text>
            <Text style={styles.salePrice}>FREE</Text>
          </View>
        </View>
      </View>

      <View style={styles.savingsBox}>
        <Text style={styles.savingsText}>SAVE UP TO $1,299/MONTH!</Text>
        <Text style={styles.savingsSubtext}>100% Free - Unlimited users - All features included</Text>
      </View>

      <View style={styles.featuresList}>
        <Text style={styles.featuresTitle}>What's Included:</Text>
        <Text style={styles.featureItem}>Unlimited staff members</Text>
        <Text style={styles.featureItem}>Patient management dashboard</Text>
        <Text style={styles.featureItem}>Billing & payment tracking</Text>
        <Text style={styles.featureItem}>HIPAA-compliant document storage</Text>
        <Text style={styles.featureItem}>Admin user controls</Text>
        <Text style={styles.featureItem}>Activity logging & reporting</Text>
        <Text style={styles.featureItem}>Secure consent management</Text>
        <Text style={styles.featureItem}>Law Firm Negotiations Portal</Text>
        <Text style={styles.featureItem}>Receive Disbursements Portal</Text>
      </View>
    </View>
  );

  if (!mode) {
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

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>Medical Provider Setup</Text>
          <Text style={styles.subtitle}>
            Are you registering a new provider or joining an existing one?
          </Text>

          {renderPricingCard()}

          <TouchableOpacity 
            style={styles.optionCard}
            onPress={() => setMode('create')}
          >
            <Text style={styles.optionTitle}>Register New Provider</Text>
            <Text style={styles.optionDescription}>
              Register your practice and become the administrator
            </Text>
            <Text style={styles.optionPrice}>100% FREE - Unlimited users</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.optionCard}
            onPress={() => setMode('join')}
          >
            <Text style={styles.optionTitle}>Join Existing Provider</Text>
            <Text style={styles.optionDescription}>
              Use a provider code to join your team
            </Text>
            <Text style={styles.optionPrice}>Free for team members</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => onNavigate('register')}>
            <Text style={styles.backLink}>Back to User Type Selection</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  if (mode === 'create') {
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

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setMode(null)}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Register New Provider</Text>
          <Text style={styles.subtitle}>
            You'll become the first administrator
          </Text>

          <View style={styles.priceCallout}>
            <Text style={styles.priceCalloutText}>
              100% FREE - No monthly fees ever!
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Provider/Practice Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Atlanta Medical Center"
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={providerName}
              onChangeText={setProviderName}
              autoCapitalize="words"
            />

            <Text style={styles.label}>Provider Type</Text>
            <View style={styles.roleButtons}>
              {['hospital', 'clinic', 'individual', 'chiropractor', 'imaging', 'orthopedic', 'physical therapy'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.roleButton,
                    providerType === type && styles.roleButtonActive
                  ]}
                  onPress={() => setProviderType(type)}
                >
                  <Text style={[
                    styles.roleButtonText,
                    providerType === type && styles.roleButtonTextActive
                  ]}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Your First Name</Text>
            <TextInput
              style={styles.input}
              placeholder="First Name"
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
            />

            <Text style={styles.label}>Your Last Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Last Name"
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
            />

            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="admin@medicalprovider.com"
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Password (min 6 characters)"
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
            />

            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoComplete="new-password"
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleCreateNewProvider}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Processing...' : 'Continue to Complete Registration'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

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

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setMode(null)}
        >
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Join Existing Provider</Text>
        <Text style={styles.subtitle}>
          Enter the provider code from your administrator
        </Text>

        <View style={styles.form}>
          <Text style={styles.label}>Provider Code</Text>
          <TextInput
            style={[styles.input, styles.codeInput]}
            placeholder="VPM-XXXX"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={joinProviderCode}
            onChangeText={(text) => setJoinProviderCode(text.toUpperCase())}
            autoCapitalize="characters"
            maxLength={8}
          />

          <Text style={styles.label}>Your First Name</Text>
          <TextInput
            style={styles.input}
            placeholder="First Name"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={joinFirstName}
            onChangeText={setJoinFirstName}
            autoCapitalize="words"
          />

          <Text style={styles.label}>Your Last Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Last Name"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={joinLastName}
            onChangeText={setJoinLastName}
            autoCapitalize="words"
          />

          <Text style={styles.label}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="your@email.com"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Password (min 6 characters)"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
          />

          <Text style={styles.label}>Confirm Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoComplete="new-password"
          />

          <Text style={styles.label}>Your Role</Text>
          <View style={styles.roleButtons}>
            {['physician', 'nurse', 'staff', 'billing'].map((role) => (
              <TouchableOpacity
                key={role}
                style={[
                  styles.roleButton,
                  requestedRole === role && styles.roleButtonActive
                ]}
                onPress={() => setRequestedRole(role)}
              >
                <Text style={[
                  styles.roleButtonText,
                  requestedRole === role && styles.roleButtonTextActive
                ]}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleJoinExistingProvider}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Sending Request...' : 'Request to Join Provider'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.note}>
            A provider administrator will review and approve your request
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
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  backButton: {
    marginBottom: 20,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  
  pricingSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 25,
    borderWidth: 2,
    borderColor: '#28A745',
  },
  pricingHeader: {
    alignItems: 'center',
    marginBottom: 15,
  },
  pricingBadge: {
    backgroundColor: '#28A745',
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  pricingTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.primary,
    textAlign: 'center',
    marginBottom: 20,
  },
  tierContainer: {
    marginBottom: 20,
  },
  tierCard: {
    backgroundColor: theme.colors.background,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#28A745',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tierCardHighlight: {
    backgroundColor: '#E8F5E9',
    borderWidth: 2,
    borderColor: '#28A745',
  },
  tierName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.primary,
    flex: 1,
  },
  tierRange: {
    fontSize: 12,
    color: '#666',
    flex: 1,
    textAlign: 'center',
  },
  priceRow: {
    flex: 1,
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  originalPrice: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  salePrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#28A745',
  },
  savingsBox: {
    backgroundColor: '#28A745',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
  },
  savingsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  savingsSubtext: {
    fontSize: 14,
    color: '#FFF',
    marginTop: 5,
  },
  featuresList: {
    backgroundColor: theme.colors.background,
    borderRadius: 10,
    padding: 15,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 10,
  },
  featureItem: {
    fontSize: 14,
    color: theme.colors.primary,
    marginBottom: 6,
    paddingLeft: 10,
  },

  optionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: '#28A745',
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  optionPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#28A745',
  },

  priceCallout: {
    backgroundColor: '#28A745',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    alignItems: 'center',
  },
  priceCalloutText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  
  form: {
    width: '100%',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    marginTop: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    color: theme.colors.primary,
    marginBottom: 5,
  },
  codeInput: {
    textAlign: 'center',
    fontSize: 20,
    letterSpacing: 2,
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#28A745',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  roleButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  roleButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  roleButtonActive: {
    backgroundColor: '#28A745',
    borderColor: '#1E7E34',
  },
  roleButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  roleButtonTextActive: {
    color: '#FFFFFF',
  },
  note: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 15,
    fontStyle: 'italic',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  backLink: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    textDecorationLine: 'underline',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
});

export default MedicalProviderRegistrationScreen;
