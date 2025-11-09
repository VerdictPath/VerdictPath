import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Linking
} from 'react-native';
import { theme } from '../styles/theme';
import { apiRequest, API_ENDPOINTS } from '../config/api';

const StripeConnectOnboardingScreen = ({ user, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [accountStatus, setAccountStatus] = useState(null);
  const [settingUpAccount, setSettingUpAccount] = useState(false);

  useEffect(() => {
    checkAccountStatus();
  }, []);

  const checkAccountStatus = async () => {
    try {
      setLoading(true);
      const response = await apiRequest(API_ENDPOINTS.STRIPE_CONNECT.ACCOUNT_STATUS, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });

      setAccountStatus(response);
    } catch (error) {
      console.error('Error checking account status:', error);
      Alert.alert('Error', 'Failed to check payment account status');
    } finally {
      setLoading(false);
    }
  };

  const handleSetupAccount = async () => {
    try {
      setSettingUpAccount(true);

      const accountType = user.userType === 'lawfirm' ? 'law_firm' : 
                         user.userType === 'medical_provider' ? 'medical_provider' : 'client';

      const response = await apiRequest(API_ENDPOINTS.STRIPE_CONNECT.CREATE_ACCOUNT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          accountType: accountType,
          email: user.email
        })
      });

      if (response.onboardingUrl) {
        if (Platform.OS === 'web') {
          window.open(response.onboardingUrl, '_blank');
          Alert.alert(
            'Account Setup',
            'A new window has opened with your Stripe onboarding. Complete the setup and return here to continue.',
            [
              {
                text: 'I Completed Setup',
                onPress: () => checkAccountStatus()
              },
              {
                text: 'Cancel',
                style: 'cancel'
              }
            ]
          );
        } else {
          await Linking.openURL(response.onboardingUrl);
          Alert.alert(
            'Account Setup',
            'Please complete the Stripe setup in your browser and return to the app.',
            [
              {
                text: 'I Completed Setup',
                onPress: () => checkAccountStatus()
              }
            ]
          );
        }
      }
    } catch (error) {
      console.error('Error setting up account:', error);
      Alert.alert('Error', error.message || 'Failed to set up payment account');
    } finally {
      setSettingUpAccount(false);
    }
  };

  const handleAccessDashboard = async () => {
    try {
      const response = await apiRequest(API_ENDPOINTS.STRIPE_CONNECT.DASHBOARD_LINK, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });

      if (response.url) {
        if (Platform.OS === 'web') {
          window.open(response.url, '_blank');
        } else {
          await Linking.openURL(response.url);
        }
      }
    } catch (error) {
      console.error('Error accessing dashboard:', error);
      Alert.alert('Error', 'Failed to access Stripe dashboard');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Payment Account Setup</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Checking account status...</Text>
        </View>
      </View>
    );
  }

  const isAccountComplete = accountStatus?.onboardingComplete;
  const hasAccount = accountStatus?.hasAccount;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Payment Account Setup</Text>
      </View>

      <View style={styles.content}>
        {!hasAccount && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💳 Set Up Your Payment Account</Text>
            <Text style={styles.description}>
              To receive/send settlement disbursements, you need to connect a bank account through Stripe.
              This secure process ensures you can receive/send payments directly to your account.
            </Text>

            <View style={styles.benefitsList}>
              <Text style={styles.benefitItem}>✓ Secure bank account connection</Text>
              <Text style={styles.benefitItem}>✓ Direct deposit of settlement funds</Text>
              <Text style={styles.benefitItem}>✓ Track all payments in one place</Text>
              <Text style={styles.benefitItem}>✓ FDIC-insured transfers</Text>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, settingUpAccount && styles.disabledButton]}
              onPress={handleSetupAccount}
              disabled={settingUpAccount}
            >
              {settingUpAccount ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Set Up Payment Account</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.secureNote}>
              🔒 Your information is secure and encrypted. Verdict Path uses Stripe for payment processing.
            </Text>
          </View>
        )}

        {hasAccount && !isAccountComplete && (
          <View style={styles.section}>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>⚠️ Setup Incomplete</Text>
            </View>

            <Text style={styles.sectionTitle}>Complete Your Account Setup</Text>
            <Text style={styles.description}>
              Your payment account has been created, but you need to complete the onboarding process
              to receive/send disbursements.
            </Text>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleSetupAccount}
            >
              <Text style={styles.primaryButtonText}>Resume Setup</Text>
            </TouchableOpacity>

            <View style={styles.statusDetails}>
              <Text style={styles.statusLabel}>Account Status:</Text>
              <Text style={styles.statusValue}>
                Charges: {accountStatus.chargesEnabled ? '✓ Enabled' : '✗ Not Enabled'}
              </Text>
              <Text style={styles.statusValue}>
                Payouts: {accountStatus.payoutsEnabled ? '✓ Enabled' : '✗ Not Enabled'}
              </Text>
            </View>
          </View>
        )}

        {isAccountComplete && (
          <View style={styles.section}>
            <View style={[styles.statusBadge, styles.successBadge]}>
              <Text style={styles.statusBadgeText}>✓ Account Active</Text>
            </View>

            <Text style={styles.sectionTitle}>Your Payment Account is Ready!</Text>
            <Text style={styles.description}>
              Your bank account is connected and you're ready to receive settlement disbursements.
            </Text>

            <View style={styles.statusDetails}>
              <Text style={styles.statusLabel}>Account Status:</Text>
              <Text style={[styles.statusValue, styles.successText]}>
                ✓ Charges Enabled
              </Text>
              <Text style={[styles.statusValue, styles.successText]}>
                ✓ Payouts Enabled
              </Text>
            </View>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleAccessDashboard}
            >
              <Text style={styles.secondaryButtonText}>Access Stripe Dashboard</Text>
            </TouchableOpacity>

            <Text style={styles.dashboardNote}>
              View your payment history, update banking information, and manage your account settings.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={checkAccountStatus}
        >
          <Text style={styles.refreshButtonText}>🔄 Refresh Status</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.primary,
    borderBottomWidth: 2,
    borderBottomColor: '#8B4513'
  },
  backButton: {
    marginRight: 12
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: theme.colors.textSecondary
  },
  content: {
    flex: 1,
    padding: 16
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 12
  },
  description: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    lineHeight: 24,
    marginBottom: 20
  },
  benefitsList: {
    marginBottom: 24
  },
  benefitItem: {
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 8,
    lineHeight: 24
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  },
  secondaryButton: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.primary,
    marginTop: 16
  },
  secondaryButtonText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600'
  },
  disabledButton: {
    opacity: 0.6
  },
  secureNote: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic'
  },
  statusBadge: {
    backgroundColor: '#FFA500',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 16
  },
  successBadge: {
    backgroundColor: '#4CAF50'
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold'
  },
  statusDetails: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8
  },
  statusValue: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginBottom: 4
  },
  successText: {
    color: '#4CAF50',
    fontWeight: '600'
  },
  dashboardNote: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    fontStyle: 'italic'
  },
  refreshButton: {
    marginTop: 20,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center'
  },
  refreshButtonText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600'
  }
});

export default StripeConnectOnboardingScreen;
