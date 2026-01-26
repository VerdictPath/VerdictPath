import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Alert, Platform, TextInput } from 'react-native';
import { API_ENDPOINTS, apiRequest } from '../config/api';
import { medicalProviderTheme as theme } from '../styles/medicalProviderTheme';
import FeatureComparisonMatrix from '../components/FeatureComparisonMatrix';

const MEDICAL_PROVIDER_PRICING = {
  tiers: [
    { 
      name: 'Shingle Provider',
      min: 1,
      max: 49,
      basic: {
        monthly: 15,
        annual: 162,
        features: [
          'Up to 49 patients',
          'Access to your Patients\' Interactive Roadmap',
          'Basic Analytics',
          'Full Access to Push Notifications',
          'Evidence Locker Unlocked',
          'Medical Hub Unlocked'
        ]
      },
      premium: {
        monthly: 19,
        annual: 205,
        features: [
          'Everything in Basic',
          'Disbursement Payments Unlocked',
          'Negotiations with Law Firms Unlocked'
        ]
      },
      description: 'Individual practitioners or small clinics'
    },
    { 
      name: 'Boutique Provider',
      min: 50,
      max: 99,
      basic: {
        monthly: 25,
        annual: 270,
        features: [
          'Up to 99 patients',
          'Access to your Patients\' Interactive Roadmap',
          'Basic Analytics',
          'Full Access to Push Notifications',
          'Evidence Locker Unlocked',
          'Medical Hub Unlocked'
        ]
      },
      premium: {
        monthly: 33,
        annual: 356,
        features: [
          'Everything in Basic',
          'Disbursement Payments Unlocked',
          'Negotiations with Law Firms Unlocked'
        ]
      },
      description: 'Multi-provider practices or specialty clinics'
    },
    { 
      name: 'Medium Provider',
      min: 100,
      max: 199,
      basic: {
        monthly: 38,
        annual: 410,
        features: [
          'Up to 199 patients',
          'Access to your Patients\' Interactive Roadmap',
          'Basic Analytics',
          'Full Access to Push Notifications',
          'Evidence Locker Unlocked',
          'Medical Hub Unlocked'
        ]
      },
      premium: {
        monthly: 48,
        annual: 518,
        features: [
          'Everything in Basic',
          'Disbursement Payments Unlocked',
          'Negotiations with Law Firms Unlocked'
        ]
      },
      description: 'Regional medical centers or group practices'
    },
    { 
      name: 'Large Provider',
      min: 200,
      max: Infinity,
      basic: {
        monthly: 50,
        annual: 540,
        features: [
          'Unlimited patients',
          'Access to your Patients\' Interactive Roadmap',
          'Basic Analytics',
          'Full Access to Push Notifications',
          'Evidence Locker Unlocked',
          'Medical Hub Unlocked'
        ]
      },
      premium: {
        monthly: 63,
        annual: 680,
        features: [
          'Everything in Basic',
          'Disbursement Payments Unlocked',
          'Negotiations with Law Firms Unlocked'
        ]
      },
      description: 'Large multi-location practice'
    }
  ]
};

const MedicalProviderSubscriptionScreen = ({ token, onBack, isNewRegistration, registrationData, onRegistrationComplete }) => {
  const [loading, setLoading] = useState(!isNewRegistration);
  const [updating, setUpdating] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [clientCount, setClientCount] = useState('');
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [planType, setPlanType] = useState('basic');

  useEffect(() => {
    if (!isNewRegistration) {
      fetchSubscriptionDetails();
    }
  }, [isNewRegistration]);

  const fetchSubscriptionDetails = async () => {
    try {
      setLoading(true);
      const response = await apiRequest(API_ENDPOINTS.SUBSCRIPTION.MEDICALPROVIDER_CURRENT, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setCurrentSubscription(response.subscription);
    } catch (error) {
      if (Platform.OS === 'web') {
        alert('Failed to load subscription details');
      } else {
        Alert.alert('Error', 'Failed to load subscription details');
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateTier = (count) => {
    const numClients = parseInt(count);
    if (isNaN(numClients) || numClients < 1) return null;
    
    return MEDICAL_PROVIDER_PRICING.tiers.find(
      tier => numClients >= tier.min && numClients <= tier.max
    );
  };

  const currentTier = calculateTier(clientCount);

  const getPrice = (tier) => {
    if (!tier) return 0;
    const pricing = tier[planType];
    return billingPeriod === 'monthly' ? pricing.monthly : pricing.annual;
  };

  const getPerClientCost = (tier, count) => {
    if (!tier || !count) return 0;
    const price = getPrice(tier);
    return (price / parseInt(count)).toFixed(2);
  };

  const getAnnualSavings = (tier) => {
    if (!tier) return 0;
    const pricing = tier[planType];
    return ((pricing.monthly * 12) - pricing.annual).toFixed(2);
  };

  const handleUpdateSubscription = async (selectedTier) => {
    try {
      setUpdating(true);
      
      const response = await apiRequest(API_ENDPOINTS.SUBSCRIPTION.MEDICALPROVIDER_UPDATE, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          subscriptionTier: selectedTier.name.toLowerCase().replace(/[^a-z]/g, ''),
          providerSize: {
            patientCount: clientCount ? parseInt(clientCount) : null,
            tierName: selectedTier.name,
            billingPeriod: billingPeriod,
            planType: planType
          }
        })
      });

      if (Platform.OS === 'web') {
        alert('Subscription updated successfully!');
      } else {
        Alert.alert('Success', 'Subscription updated successfully!');
      }
      
      // Try to refresh subscription details, but don't show error if it fails
      try {
        await fetchSubscriptionDetails();
      } catch (refreshError) {
      }
    } catch (error) {
      if (Platform.OS === 'web') {
        alert(error.message || 'Failed to update subscription');
      } else {
        Alert.alert('Error', error.message || 'Failed to update subscription');
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleNewRegistration = async (selectedTier) => {
    if (!registrationData) {
      alert('Registration data is missing. Please go back and try again.');
      return;
    }

    try {
      setUpdating(true);
      
      const response = await apiRequest(API_ENDPOINTS.AUTH.REGISTER_MEDICALPROVIDER, {
        method: 'POST',
        body: JSON.stringify({
          providerName: registrationData.providerName,
          email: registrationData.email,
          password: registrationData.password,
          firstName: registrationData.firstName,
          lastName: registrationData.lastName,
          subscriptionTier: 'free',
          planType: planType,
          providerSize: {
            patientCount: clientCount ? parseInt(clientCount) : null,
            tierName: selectedTier ? selectedTier.name : 'Solo',
            billingPeriod: billingPeriod,
            planType: planType
          },
          privacyAccepted: registrationData.privacyAccepted
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
        planType: planType,
        coins: 0,
        streak: 0
      };

      if (onRegistrationComplete) {
        onRegistrationComplete(userData);
      }
    } catch (error) {
      const errorMsg = error.message || 'Failed to create account. Please try again.';
      if (Platform.OS === 'web') {
        alert('Registration Error: ' + errorMsg);
      } else {
        Alert.alert('Registration Error', errorMsg);
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleSelectTier = (selectedTier) => {
    if (isNewRegistration) {
      handleNewRegistration(selectedTier);
    } else {
      handleUpdateSubscription(selectedTier);
    }
  };

  const renderCurrentPlan = () => {
    if (!currentSubscription) return null;

    return (
      <View style={styles.currentPlanCard}>
        <Text style={styles.currentPlanTitle}>Current Subscription</Text>
        <View style={styles.currentPlanDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Current Patients:</Text>
            <Text style={[styles.detailValue, styles.currentCount]}>
              {currentSubscription.currentPatientCount}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Patient Limit:</Text>
            <Text style={styles.detailValue}>
              {currentSubscription.patientLimit === 999999 ? 'Unlimited' : currentSubscription.patientLimit}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading subscription details...</Text>
      </View>
    );
  }

  const basicFeatures = [
    'Patient limits vary by tier',
    '📍 Access to Patients\' Interactive Roadmap',
    '📊 Basic Analytics',
    '🔔 Full Access to Push Notifications',
    '🔒 Evidence Locker Unlocked',
    '🏥 Medical Hub Unlocked'
  ];

  const premiumFeatures = [
    '💰 Disbursement Payments Unlocked',
    '🤝 Negotiations with Law Firms Unlocked'
  ];

  return (
    <ScrollView style={styles.container}>
      {onBack && (
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back to Dashboard</Text>
        </TouchableOpacity>
      )}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🏥 Subscription Management</Text>
        <Text style={styles.headerSubtitle}>Manage your medical practice subscription</Text>
      </View>

      {renderCurrentPlan()}

      <FeatureComparisonMatrix
        heading="📊 Compare Plans"
        subheading="Choose the plan that best fits your practice"
        standardFeatures={basicFeatures}
        premiumFeatures={premiumFeatures}
        showDisbursementNote={true}
        disbursementNoteText="Settlement Disbursements is a premium-only feature. Upgrade to Premium to receive payments from law firms."
        standardLabel="Basic"
        standardDescription="Core features for your practice"
        premiumLabel="Premium"
        premiumDescription="Advanced features"
        userType="medical_provider"
      />

      <View style={styles.calculatorContainer}>
        <View style={styles.calculator}>
          <Text style={styles.calculatorTitle}>🏥 Calculate Your Price</Text>
          <Text style={styles.calculatorSubtitle}>
            Simple, transparent pricing based on your patient count
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>How many patients do you have?</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={clientCount}
              onChangeText={setClientCount}
              placeholder="Enter number of patients"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.planTypeSelector}>
            <Text style={styles.planTypeSelectorLabel}>Select Plan Type:</Text>
            <View style={styles.planTypeButtons}>
              <TouchableOpacity
                style={[
                  styles.planTypeButton,
                  planType === 'basic' && styles.planTypeButtonActive
                ]}
                onPress={() => setPlanType('basic')}
              >
                <Text style={[
                  styles.planTypeButtonText,
                  planType === 'basic' && styles.planTypeButtonTextActive
                ]}>
                  Basic
                </Text>
                <Text style={styles.planTypeButtonSubtext}>Essential features</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.planTypeButton,
                  planType === 'premium' && styles.planTypeButtonActive
                ]}
                onPress={() => setPlanType('premium')}
              >
                <View style={styles.premiumBadgeSmall}>
                  <Text style={styles.premiumBadgeText}>⭐ PREMIUM</Text>
                </View>
                <Text style={[
                  styles.planTypeButtonText,
                  planType === 'premium' && styles.planTypeButtonTextActive
                ]}>
                  Premium
                </Text>
                <Text style={styles.planTypeButtonSubtext}>Advanced features</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.billingToggle}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                billingPeriod === 'monthly' && styles.toggleActive
              ]}
              onPress={() => setBillingPeriod('monthly')}
            >
              <Text style={[
                styles.toggleText,
                billingPeriod === 'monthly' && styles.toggleTextActive
              ]}>
                Monthly
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.toggleButton,
                billingPeriod === 'annual' && styles.toggleActive
              ]}
              onPress={() => setBillingPeriod('annual')}
            >
              <Text style={[
                styles.toggleText,
                billingPeriod === 'annual' && styles.toggleTextActive
              ]}>
                Annual
              </Text>
              <View style={styles.savingsBadge}>
                <Text style={styles.savingsText}>Save 10%</Text>
              </View>
            </TouchableOpacity>
          </View>

          {currentTier && (
            <View style={styles.results}>
              <View style={styles.tierBadgeContainer}>
                <View style={styles.tierBadge}>
                  <Text style={styles.tierName}>{currentTier.name}</Text>
                  <Text style={styles.tierRange}>
                    {currentTier.min}-{currentTier.max === Infinity ? '999+' : currentTier.max} patients
                  </Text>
                </View>
                {planType === 'premium' && (
                  <View style={styles.premiumPill}>
                    <Text style={styles.premiumPillText}>⭐ PREMIUM</Text>
                  </View>
                )}
              </View>

              <Text style={styles.tierDescription}>{currentTier.description}</Text>

              <View style={styles.priceDisplay}>
                <Text style={styles.priceAmount}>
                  ${getPrice(currentTier)}
                </Text>
                <Text style={styles.pricePeriod}>
                  /{billingPeriod === 'monthly' ? 'mo' : 'yr'}
                </Text>
              </View>

              <View style={styles.priceDetails}>
                <Text style={styles.perClientText}>
                  Just ${getPerClientCost(currentTier, clientCount)} per patient
                </Text>
                {billingPeriod === 'annual' && (
                  <Text style={styles.savingsHighlight}>
                    💰 Save ${getAnnualSavings(currentTier)}/year
                  </Text>
                )}
              </View>

              <View style={styles.featuresContainer}>
                <Text style={styles.featuresTitle}>
                  {planType === 'premium' ? '⭐ Premium Features:' : '📦 Basic Features:'}
                </Text>
                {currentTier[planType].features.map((feature, index) => (
                  <View key={index} style={styles.featureRow}>
                    <Text style={styles.featureCheck}>✓</Text>
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.selectButton,
                  planType === 'premium' && styles.selectButtonPremium,
                  updating && styles.selectButtonDisabled
                ]}
                onPress={() => handleSelectTier(currentTier)}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.selectButtonText}>
                    Update to {currentTier.name} {planType === 'premium' ? 'Premium' : 'Basic'}
                  </Text>
                )}
              </TouchableOpacity>

              {planType === 'basic' && (
                <TouchableOpacity
                  style={styles.upgradeHint}
                  onPress={() => setPlanType('premium')}
                >
                  <Text style={styles.upgradeHintText}>
                    ⭐ Upgrade to Premium for advanced features
                  </Text>
                </TouchableOpacity>
              )}

              {currentTier.max !== Infinity && (
                <Text style={styles.nextTierHint}>
                  💡 At {currentTier.max + 1} patients, you'll upgrade to {
                    MEDICAL_PROVIDER_PRICING.tiers[
                      MEDICAL_PROVIDER_PRICING.tiers.indexOf(currentTier) + 1
                    ]?.name
                  }
                </Text>
              )}
            </View>
          )}

          <View style={styles.pricingTableContainer}>
            <View style={styles.pricingTableHeader}>
              <Text style={styles.pricingTableTitle}>All Tiers at a Glance</Text>
              <View style={styles.pricingTableToggle}>
                <TouchableOpacity
                  style={[
                    styles.tableToggleButton,
                    planType === 'basic' && styles.tableToggleActive
                  ]}
                  onPress={() => setPlanType('basic')}
                >
                  <Text style={[
                    styles.tableToggleText,
                    planType === 'basic' && styles.tableToggleTextActive
                  ]}>Basic</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.tableToggleButton,
                    planType === 'premium' && styles.tableToggleActive
                  ]}
                  onPress={() => setPlanType('premium')}
                >
                  <Text style={[
                    styles.tableToggleText,
                    planType === 'premium' && styles.tableToggleTextActive
                  ]}>Premium</Text>
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.pricingTable}>
                {MEDICAL_PROVIDER_PRICING.tiers.map((tier, index) => {
                  const pricing = tier[planType];
                  const price = billingPeriod === 'monthly' ? pricing.monthly : pricing.annual;
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.pricingTableColumn,
                        currentTier?.name === tier.name && styles.pricingTableColumnActive
                      ]}
                      onPress={() => handleSelectTier(tier)}
                      disabled={updating}
                    >
                      <Text style={styles.tableColumnName}>{tier.name}</Text>
                      <Text style={styles.tableColumnRange}>
                        {tier.min}-{tier.max === Infinity ? '999+' : tier.max}
                      </Text>
                      <Text style={styles.tableColumnPrice}>
                        ${price}
                      </Text>
                      <Text style={styles.tableColumnPeriod}>
                        /{billingPeriod === 'monthly' ? 'mo' : 'yr'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: theme.colors.primary,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)'
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: theme.colors.textSecondary
  },
  header: {
    backgroundColor: theme.colors.primary,
    padding: 20,
    paddingTop: 40
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#e0e0e0'
  },
  currentPlanCard: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  currentPlanTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 15
  },
  currentPlanDetails: {
    gap: 10
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5
  },
  detailLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500'
  },
  detailValue: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: 'bold'
  },
  currentCount: {
    color: theme.colors.primary
  },
  calculatorContainer: {
    padding: 20
  },
  calculator: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 20
  },
  calculatorTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
    textAlign: 'center'
  },
  calculatorSubtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24
  },
  inputGroup: {
    marginBottom: 24
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    borderWidth: 2,
    borderColor: theme.colors.border,
    color: theme.colors.text
  },
  planTypeSelector: {
    marginBottom: 24
  },
  planTypeSelectorLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12
  },
  planTypeButtons: {
    flexDirection: 'row',
    gap: 12
  },
  planTypeButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border
  },
  planTypeButtonActive: {
    backgroundColor: '#e8f4ff',
    borderColor: theme.colors.primary
  },
  planTypeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4
  },
  planTypeButtonTextActive: {
    color: theme.colors.primary
  },
  planTypeButtonSubtext: {
    fontSize: 12,
    color: theme.colors.textSecondary
  },
  premiumBadgeSmall: {
    backgroundColor: '#ffd700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4
  },
  premiumBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000'
  },
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    position: 'relative'
  },
  toggleActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary
  },
  toggleTextActive: {
    color: theme.colors.primary
  },
  savingsBadge: {
    position: 'absolute',
    top: -8,
    right: 8,
    backgroundColor: '#4caf50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  savingsText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold'
  },
  results: {
    marginTop: 24,
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.border
  },
  tierBadgeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  tierBadge: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8
  },
  tierName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  },
  tierRange: {
    color: '#fff',
    fontSize: 12,
    marginTop: 2
  },
  premiumPill: {
    backgroundColor: '#ffd700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12
  },
  premiumPillText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000'
  },
  tierDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 16,
    fontStyle: 'italic'
  },
  priceDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: 8
  },
  priceAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: theme.colors.primary
  },
  pricePeriod: {
    fontSize: 18,
    color: theme.colors.textSecondary,
    marginLeft: 4
  },
  priceDetails: {
    alignItems: 'center',
    marginBottom: 20
  },
  perClientText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4
  },
  savingsHighlight: {
    fontSize: 14,
    color: '#4caf50',
    fontWeight: 'bold'
  },
  featuresContainer: {
    marginBottom: 20
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 12
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  featureCheck: {
    color: '#4caf50',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
    marginTop: 2
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20
  },
  selectButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 12
  },
  selectButtonPremium: {
    backgroundColor: '#ffd700',
    borderWidth: 2,
    borderColor: '#000'
  },
  selectButtonDisabled: {
    opacity: 0.6
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff'
  },
  upgradeHint: {
    paddingVertical: 12,
    alignItems: 'center'
  },
  upgradeHintText: {
    fontSize: 14,
    color: theme.colors.primary,
    textDecorationLine: 'underline'
  },
  nextTierHint: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic'
  },
  pricingTableContainer: {
    marginTop: 24
  },
  pricingTableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  pricingTableTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text
  },
  pricingTableToggle: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 2
  },
  tableToggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6
  },
  tableToggleActive: {
    backgroundColor: '#fff'
  },
  tableToggleText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '600'
  },
  tableToggleTextActive: {
    color: theme.colors.primary
  },
  pricingTable: {
    flexDirection: 'row',
    gap: 12
  },
  pricingTableColumn: {
    width: 120,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center'
  },
  pricingTableColumnActive: {
    borderColor: theme.colors.primary,
    backgroundColor: '#e8f4ff'
  },
  tableColumnName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 4
  },
  tableColumnRange: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginBottom: 8
  },
  tableColumnPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary
  },
  tableColumnPeriod: {
    fontSize: 10,
    color: theme.colors.textSecondary
  }
});

export default MedicalProviderSubscriptionScreen;
