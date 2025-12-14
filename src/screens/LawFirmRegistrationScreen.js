import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { commonStyles } from '../styles/commonStyles';
import { theme } from '../styles/theme';

const LawFirmRegistrationScreen = ({ 
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  firmName,
  setFirmName,
  firstName,
  setFirstName,
  lastName,
  setLastName,
  onSelectSubscription,
  onNavigate,
  privacyAccepted,
  setPrivacyAccepted
}) => {
  const [mode, setMode] = useState(null);
  const [joinFirmCode, setJoinFirmCode] = useState('');
  const [joinFirstName, setJoinFirstName] = useState('');
  const [joinLastName, setJoinLastName] = useState('');
  const [requestedRole, setRequestedRole] = useState('attorney');
  const [loading, setLoading] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playAsync();
    }
  }, []);

  const handleCreateNewFirm = () => {
    if (!firmName.trim()) {
      alert('Please enter your law firm name');
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
    
    onNavigate('lawfirm-subscription-selection');
  };

  const handleJoinExistingFirm = async () => {
    if (!joinFirmCode.trim()) {
      alert('Please enter the firm code');
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

    alert('Join Existing Firm feature is coming soon! For now, please contact your firm administrator to add you as a staff member after you create your own account.');
  };

  const renderPricingCard = () => (
    <View style={styles.pricingSection}>
      <View style={styles.pricingHeader}>
        <Text style={styles.pricingBadge}>LIMITED TIME OFFER</Text>
      </View>
      
      <Text style={styles.pricingTitle}>Law Firm Portal Pricing</Text>
      
      <View style={styles.tierContainer}>
        <View style={styles.tierCard}>
          <Text style={styles.tierName}>Solo/Shingle</Text>
          <Text style={styles.tierRange}>1-24 Clients</Text>
          <View style={styles.priceRow}>
            <Text style={styles.originalPrice}>$45/mo</Text>
            <Text style={styles.salePrice}>$40/mo</Text>
          </View>
        </View>

        <View style={styles.tierCard}>
          <Text style={styles.tierName}>Boutique</Text>
          <Text style={styles.tierRange}>25-49 Clients</Text>
          <View style={styles.priceRow}>
            <Text style={styles.originalPrice}>$80/mo</Text>
            <Text style={styles.salePrice}>$40/mo</Text>
          </View>
        </View>

        <View style={styles.tierCard}>
          <Text style={styles.tierName}>Small Firm</Text>
          <Text style={styles.tierRange}>50-99 Clients</Text>
          <View style={styles.priceRow}>
            <Text style={styles.originalPrice}>$140/mo</Text>
            <Text style={styles.salePrice}>$40/mo</Text>
          </View>
        </View>

        <View style={styles.tierCard}>
          <Text style={styles.tierName}>Medium-Small</Text>
          <Text style={styles.tierRange}>100-199 Clients</Text>
          <View style={styles.priceRow}>
            <Text style={styles.originalPrice}>$250/mo</Text>
            <Text style={styles.salePrice}>$40/mo</Text>
          </View>
        </View>

        <View style={styles.tierCard}>
          <Text style={styles.tierName}>Medium-Large</Text>
          <Text style={styles.tierRange}>200-299 Clients</Text>
          <View style={styles.priceRow}>
            <Text style={styles.originalPrice}>$420/mo</Text>
            <Text style={styles.salePrice}>$40/mo</Text>
          </View>
        </View>

        <View style={styles.tierCard}>
          <Text style={styles.tierName}>Large</Text>
          <Text style={styles.tierRange}>300-499 Clients</Text>
          <View style={styles.priceRow}>
            <Text style={styles.originalPrice}>$660/mo</Text>
            <Text style={styles.salePrice}>$40/mo</Text>
          </View>
        </View>

        <View style={styles.tierCard}>
          <Text style={styles.tierName}>Enterprise</Text>
          <Text style={styles.tierRange}>500-999 Clients</Text>
          <View style={styles.priceRow}>
            <Text style={styles.originalPrice}>$1,000/mo</Text>
            <Text style={styles.salePrice}>$40/mo</Text>
          </View>
        </View>

        <View style={[styles.tierCard, styles.tierCardHighlight]}>
          <Text style={styles.tierName}>Mega Firm</Text>
          <Text style={styles.tierRange}>1000+ Clients</Text>
          <View style={styles.priceRow}>
            <Text style={styles.originalPrice}>$1,500/mo</Text>
            <Text style={styles.salePrice}>$40/mo</Text>
          </View>
        </View>
      </View>

      <View style={styles.savingsBox}>
        <Text style={styles.savingsText}>SAVE UP TO $1,460/MONTH!</Text>
        <Text style={styles.savingsSubtext}>Launch Special - Only $40/month for ALL tiers!</Text>
      </View>

      <View style={styles.featuresList}>
        <Text style={styles.featuresTitle}>What's Included:</Text>
        <Text style={styles.featureItem}>Unlimited team members</Text>
        <Text style={styles.featureItem}>Client management dashboard</Text>
        <Text style={styles.featureItem}>Real-time case tracking</Text>
        <Text style={styles.featureItem}>Secure document access</Text>
        <Text style={styles.featureItem}>Admin user controls</Text>
        <Text style={styles.featureItem}>Activity logging & reporting</Text>
        <Text style={styles.featureItem}>Med Provider Negotiation Portal</Text>
        <Text style={styles.featureItem}>Disbursements Portal</Text>
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
          <Text style={styles.title}>Law Firm Setup</Text>
          <Text style={styles.subtitle}>
            Are you creating a new firm or joining an existing one?
          </Text>

          {renderPricingCard()}

          <TouchableOpacity 
            style={styles.optionCard}
            onPress={() => setMode('create')}
          >
            <Text style={styles.optionTitle}>Create New Firm</Text>
            <Text style={styles.optionDescription}>
              Start your own firm and become the administrator
            </Text>
            <Text style={styles.optionPrice}>Launch Special: Only $40/month!</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.optionCard}
            onPress={() => setMode('join')}
          >
            <Text style={styles.optionTitle}>Join Existing Firm</Text>
            <Text style={styles.optionDescription}>
              Use a firm code to join your team
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

          <Text style={styles.title}>Create New Firm</Text>
          <Text style={styles.subtitle}>
            You'll become the first administrator
          </Text>

          <View style={styles.form}>
            <Text style={styles.label}>Law Firm Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Smith & Associates"
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={firmName}
              onChangeText={setFirmName}
              autoCapitalize="words"
            />

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
              placeholder="admin@lawfirm.com"
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
              onPress={handleCreateNewFirm}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Processing...' : 'Continue to Select Plan'}
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

        <Text style={styles.title}>Join Existing Firm</Text>
        <Text style={styles.subtitle}>
          Enter the firm code provided by your administrator
        </Text>

        <View style={styles.form}>
          <Text style={styles.label}>Firm Code</Text>
          <TextInput
            style={[styles.input, styles.codeInput]}
            placeholder="VPL-XXXX"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={joinFirmCode}
            onChangeText={(text) => setJoinFirmCode(text.toUpperCase())}
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
            {['attorney', 'paralegal', 'staff'].map((role) => (
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
            onPress={handleJoinExistingFirm}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Sending Request...' : 'Request to Join Firm'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.note}>
            A firm administrator will review and approve your request
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
    borderColor: theme.colors.gold,
  },
  pricingHeader: {
    alignItems: 'center',
    marginBottom: 15,
  },
  pricingBadge: {
    backgroundColor: theme.colors.primary,
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
    borderColor: theme.colors.gold,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tierCardHighlight: {
    backgroundColor: '#FFF9E6',
    borderWidth: 2,
    borderColor: theme.colors.gold,
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
    borderColor: theme.colors.gold,
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
    backgroundColor: theme.colors.primary,
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
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  roleButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  roleButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.gold,
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

export default LawFirmRegistrationScreen;
