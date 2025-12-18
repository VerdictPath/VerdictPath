import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Alert, Platform, TextInput } from 'react-native';
import { API_ENDPOINTS, apiRequest } from '../config/api';
import { theme } from '../styles/theme';
import FeatureComparisonMatrix from '../components/FeatureComparisonMatrix';

const LAW_FIRM_PRICING = {
  tiers: [
    { 
      name: 'Solo/Shingle',
      min: 1,
      max: 24,
      standard: {
        monthly: 45,
        annual: 486,
        features: [
          'Up to 24 clients',
          '📍 Interactive Roadmap',
          '🔔 Push Notifications to Clients',
          '📊 Basic Analytics Dashboard',
          '🔒 Evidence Locker Access'
        ]
      },
      premium: {
        monthly: 59,
        annual: 637,
        features: [
          'Everything in Basic',
          '🏥 Medical Hub (COMING SOON)',
          '📈 Premium Analytics Dashboard',
          '💰 Disbursements to Client Unlocked (COMING SOON)',
          '🏥 Disbursements to Medical Providers Unlocked (COMING SOON)'
        ]
      },
      description: 'Perfect for solo practitioners'
    },
    { 
      name: 'Boutique',
      min: 25,
      max: 49,
      standard: {
        monthly: 80,
        annual: 864,
        features: [
          'Up to 49 clients',
          '📍 Interactive Roadmap',
          '🔔 Push Notifications to Clients',
          '📊 Basic Analytics Dashboard',
          '🔒 Evidence Locker Access'
        ]
      },
      premium: {
        monthly: 104,
        annual: 1123,
        features: [
          'Everything in Basic',
          '🏥 Medical Hub (COMING SOON)',
          '📈 Premium Analytics Dashboard',
          '💰 Disbursements to Client Unlocked (COMING SOON)',
          '🏥 Disbursements to Medical Providers Unlocked (COMING SOON)'
        ]
      },
      description: 'Small specialized firms'
    },
    { 
      name: 'Small Firm',
      min: 50,
      max: 99,
      standard: {
        monthly: 140,
        annual: 1512,
        features: [
          'Up to 99 clients',
          '📍 Interactive Roadmap',
          '🔔 Push Notifications to Clients',
          '📊 Basic Analytics Dashboard',
          '🔒 Evidence Locker Access'
        ]
      },
      premium: {
        monthly: 175,
        annual: 1890,
        features: [
          'Everything in Basic',
          '🏥 Medical Hub (COMING SOON)',
          '📈 Premium Analytics Dashboard',
          '💰 Disbursements to Client Unlocked (COMING SOON)',
          '🏥 Disbursements to Medical Providers Unlocked (COMING SOON)'
        ]
      },
      description: 'Growing practice'
    },
    { 
      name: 'Medium-Small',
      min: 100,
      max: 199,
      standard: {
        monthly: 250,
        annual: 2700,
        features: [
          'Up to 199 clients',
          '📍 Interactive Roadmap',
          '🔔 Push Notifications to Clients',
          '📊 Basic Analytics Dashboard',
          '🔒 Evidence Locker Access'
        ]
      },
      premium: {
        monthly: 300,
        annual: 3240,
        features: [
          'Everything in Basic',
          '🏥 Medical Hub (COMING SOON)',
          '📈 Premium Analytics Dashboard',
          '💰 Disbursements to Client Unlocked (COMING SOON)',
          '🏥 Disbursements to Medical Providers Unlocked (COMING SOON)'
        ]
      },
      description: 'Established regional firms'
    },
    { 
      name: 'Medium-Large',
      min: 200,
      max: 299,
      standard: {
        monthly: 420,
        annual: 4536,
        features: [
          'Up to 299 clients',
          '📍 Interactive Roadmap',
          '🔔 Push Notifications to Clients',
          '📊 Basic Analytics Dashboard',
          '🔒 Evidence Locker Access'
        ]
      },
      premium: {
        monthly: 490,
        annual: 5292,
        features: [
          'Everything in Basic',
          '🏥 Medical Hub (COMING SOON)',
          '📈 Premium Analytics Dashboard',
          '💰 Disbursements to Client Unlocked (COMING SOON)',
          '🏥 Disbursements to Medical Providers Unlocked (COMING SOON)'
        ]
      },
      description: 'Multi-location firms'
    },
    { 
      name: 'Large',
      min: 300,
      max: 499,
      standard: {
        monthly: 660,
        annual: 7128,
        features: [
          'Up to 499 clients',
          '📍 Interactive Roadmap',
          '🔔 Push Notifications to Clients',
          '📊 Basic Analytics Dashboard',
          '🔒 Evidence Locker Access'
        ]
      },
      premium: {
        monthly: 750,
        annual: 8100,
        features: [
          'Everything in Basic',
          '🏥 Medical Hub (COMING SOON)',
          '📈 Premium Analytics Dashboard',
          '💰 Disbursements to Client Unlocked (COMING SOON)',
          '🏥 Disbursements to Medical Providers Unlocked (COMING SOON)'
        ]
      },
      description: 'Large metropolitan firms'
    },
    { 
      name: 'Regional',
      min: 500,
      max: 749,
      standard: {
        monthly: 1050,
        annual: 11340,
        features: [
          'Up to 749 clients',
          '📍 Interactive Roadmap',
          '🔔 Push Notifications to Clients',
          '📊 Basic Analytics Dashboard',
          '🔒 Evidence Locker Access'
        ]
      },
      premium: {
        monthly: 1200,
        annual: 12960,
        features: [
          'Everything in Basic',
          '🏥 Medical Hub (COMING SOON)',
          '📈 Premium Analytics Dashboard',
          '💰 Disbursements to Client Unlocked (COMING SOON)',
          '🏥 Disbursements to Medical Providers Unlocked (COMING SOON)'
        ]
      },
      description: 'Multi-state operations'
    },
    { 
      name: 'Enterprise',
      min: 750,
      max: Infinity,
      standard: {
        monthly: 1500,
        annual: 16200,
        features: [
          'Unlimited clients',
          '📍 Interactive Roadmap',
          '🔔 Push Notifications to Clients',
          '📊 Basic Analytics Dashboard',
          '🔒 Evidence Locker Access'
        ]
      },
      premium: {
        monthly: 1800,
        annual: 19440,
        features: [
          'Everything in Basic',
          '🏥 Medical Hub (COMING SOON)',
          '📈 Premium Analytics Dashboard',
          '💰 Disbursements to Client Unlocked (COMING SOON)',
          '🏥 Disbursements to Medical Providers Unlocked (COMING SOON)'
        ]
      },
      description: 'National firms and corporations'
    }
  ]
};

// Launch promotion: All tiers are $40/month during launch special
const LAUNCH_PROMO_PRICE = 40;
const IS_LAUNCH_PROMO = true;

const LawFirmSubscriptionScreen = ({ token, onBack, isNewRegistration, registrationData, onRegistrationComplete, user }) => {
  const [loading, setLoading] = useState(!isNewRegistration);
  const [updating, setUpdating] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [clientCount, setClientCount] = useState('');
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  // During launch promo, default to premium and Standard is not selectable
  const [planType, setPlanType] = useState(IS_LAUNCH_PROMO ? 'premium' : 'standard');

  useEffect(() => {
    if (!isNewRegistration) {
      fetchSubscriptionDetails();
    }
  }, [isNewRegistration]);

  // Force premium during launch promo
  useEffect(() => {
    if (IS_LAUNCH_PROMO && planType !== 'premium') {
      setPlanType('premium');
    }
  }, [planType]);

  const fetchSubscriptionDetails = async () => {
    try {
      setLoading(true);
      const response = await apiRequest(API_ENDPOINTS.SUBSCRIPTION.LAWFIRM_CURRENT, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setCurrentSubscription(response.subscription);
      
      // Set initial planType to match current subscription
      if (response.subscription?.planType) {
        setPlanType(response.subscription.planType);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
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
    
    return LAW_FIRM_PRICING.tiers.find(
      tier => numClients >= tier.min && numClients <= tier.max
    );
  };

  const currentTier = calculateTier(clientCount);

  const getPrice = (tier) => {
    if (!tier) return 0;
    // During launch promo, all tiers are $40/month
    if (IS_LAUNCH_PROMO && billingPeriod === 'monthly') {
      return LAUNCH_PROMO_PRICE;
    }
    const pricing = tier[planType];
    return billingPeriod === 'monthly' ? pricing.monthly : pricing.annual;
  };

  const getOriginalPrice = (tier) => {
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

  const confirmDowngrade = (selectedTier, onConfirm) => {
    const isDowngrading = currentSubscription?.planType === 'premium' && planType === 'standard';
    
    if (!isDowngrading) {
      onConfirm();
      return;
    }

    // Show downgrade warning
    if (Platform.OS === 'web') {
      const confirmed = confirm(
        '⚠️ DOWNGRADE WARNING\n\n' +
        'You are about to downgrade from Premium to Standard.\n\n' +
        '⛔ You will LOSE access to:\n' +
        '• Settlement Disbursements\n' +
        '• Premium Analytics Dashboard\n' +
        '• Medical Hub (when available)\n' +
        '• Medical Provider Payments (when available)\n\n' +
        '💰 Any pending disbursements should be completed before downgrading.\n\n' +
        'Are you sure you want to downgrade to Standard?'
      );
      
      if (confirmed) {
        onConfirm();
      }
    } else {
      Alert.alert(
        '⚠️ Downgrade Warning',
        'You are about to downgrade from Premium to Standard.\n\n' +
        '⛔ You will LOSE access to:\n' +
        '• Settlement Disbursements\n' +
        '• Premium Analytics Dashboard\n' +
        '• Medical Hub (when available)\n' +
        '• Medical Provider Payments (when available)\n\n' +
        '💰 Any pending disbursements should be completed before downgrading.\n\n' +
        'Are you sure you want to downgrade?',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Downgrade to Standard',
            style: 'destructive',
            onPress: onConfirm
          }
        ]
      );
    }
  };

  const handleUpdateSubscription = async (selectedTier) => {
    const performUpdate = async () => {
      try {
        setUpdating(true);
        
        // During launch promo, force premium
        const effectivePlanType = IS_LAUNCH_PROMO ? 'premium' : planType;
        
        // DEBUG: Log what we're about to send
        const requestBody = {
          subscriptionTier: selectedTier.name.toLowerCase().replace(/[^a-z]/g, ''),
          planType: effectivePlanType,
          firmSize: {
            clientCount: clientCount ? parseInt(clientCount) : null,
            tierName: selectedTier.name,
            billingPeriod: billingPeriod,
            planType: effectivePlanType
          }
        };
        console.log('[LawFirm Subscription] Sending update request:', requestBody);
        console.log('[LawFirm Subscription] Stringified body:', JSON.stringify(requestBody));
        
        const response = await apiRequest(API_ENDPOINTS.SUBSCRIPTION.LAWFIRM_UPDATE, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(requestBody)
        });

        // Try to refresh subscription details, but don't show error if it fails
        // since the update itself was successful
        try {
          await fetchSubscriptionDetails();
        } catch (fetchError) {
          console.error('Error refreshing subscription details:', fetchError);
          // Silently fail - update was successful, just couldn't refresh
        }

        if (Platform.OS === 'web') {
          alert('Subscription updated successfully!');
        } else {
          Alert.alert('Success', 'Subscription updated successfully!');
        }
      } catch (error) {
        console.error('Error updating subscription:', error);
        if (Platform.OS === 'web') {
          alert(error.message || 'Failed to update subscription');
        } else {
          Alert.alert('Error', error.message || 'Failed to update subscription');
        }
      } finally {
        setUpdating(false);
      }
    };

    // Check for downgrade and confirm before proceeding
    confirmDowngrade(selectedTier, performUpdate);
  };

  const handleNewRegistration = async (selectedTier) => {
    if (!registrationData) {
      alert('Registration data is missing. Please go back and try again.');
      return;
    }

    try {
      setUpdating(true);
      
      // During launch promo, force premium
      const effectivePlanType = IS_LAUNCH_PROMO ? 'premium' : planType;
      
      const response = await apiRequest(API_ENDPOINTS.AUTH.REGISTER_LAWFIRM, {
        method: 'POST',
        body: JSON.stringify({
          firmName: registrationData.firmName,
          email: registrationData.email,
          password: registrationData.password,
          firstName: registrationData.firstName,
          lastName: registrationData.lastName,
          subscriptionTier: selectedTier.name.toLowerCase().replace(/[^a-z]/g, ''),
          planType: effectivePlanType,
          firmSize: {
            clientCount: clientCount ? parseInt(clientCount) : null,
            tierName: selectedTier.name,
            billingPeriod: billingPeriod,
            planType: effectivePlanType
          },
          privacyAccepted: registrationData.privacyAccepted
        })
      });

      const userData = {
        id: response.lawFirm.id,
        email: response.lawFirm.email,
        type: 'law_firm',
        firmName: response.lawFirm.firmName,
        firmCode: response.lawFirm.firmCode,
        token: response.token,
        subscription: selectedTier.name.toLowerCase().replace(/[^a-z]/g, ''),
        planType: effectivePlanType,
        coins: 0,
        streak: 0
      };

      if (onRegistrationComplete) {
        onRegistrationComplete(userData);
      }
    } catch (error) {
      console.error('Error registering law firm:', error);
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

    const planTypeDisplay = currentSubscription.planType === 'premium' ? 'Premium' : 'Standard';
    const isPremium = currentSubscription.planType === 'premium';

    return (
      <View style={styles.currentPlanCard}>
        <Text style={styles.currentPlanTitle}>Current Subscription</Text>
        <View style={styles.currentPlanDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Plan Type:</Text>
            <View style={styles.planTypeBadgeContainer}>
              {isPremium && (
                <View style={styles.planTypeBadge}>
                  <Text style={styles.planTypeBadgeText}>⭐</Text>
                </View>
              )}
              <Text style={[
                styles.detailValue,
                isPremium && styles.premiumPlanText
              ]}>
                {planTypeDisplay}
              </Text>
            </View>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Current Clients:</Text>
            <Text style={[styles.detailValue, styles.currentCount]}>
              {currentSubscription.currentClientCount}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Client Limit:</Text>
            <Text style={styles.detailValue}>
              {currentSubscription.clientLimit === 999999 ? 'Unlimited' : currentSubscription.clientLimit}
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

  const renderFeatureComparison = () => {
    const standardFeatures = [
      'Client limits vary by tier',
      '📍 Interactive Roadmap',
      '🔔 Push Notifications to Clients',
      '📊 Basic Analytics Dashboard',
      '🔒 Evidence Locker Access'
    ];

    const premiumFeatures = [
      '📈 Premium Analytics Dashboard',
      '💰 Settlement Disbursements',
      '🤝 Negotiations Portal',
      '🏥 Medical Hub (COMING SOON)',
      '🏥 Medical Provider Payments (COMING SOON)'
    ];

    return (
      <FeatureComparisonMatrix
        heading="📊 Compare Plans"
        subheading="Choose the plan that best fits your firm's needs"
        standardFeatures={standardFeatures}
        premiumFeatures={premiumFeatures}
        showDisbursementNote={true}
      />
    );
  };

  return (
    <ScrollView style={styles.container}>
      {onBack && (
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>{isNewRegistration ? '← Back' : '← Back to Dashboard'}</Text>
        </TouchableOpacity>
      )}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{isNewRegistration ? '⚖️ Select Your Plan' : '⚖️ Subscription Management'}</Text>
        <Text style={styles.headerSubtitle}>{isNewRegistration ? 'Choose a subscription plan for your law firm' : 'Manage your law firm subscription'}</Text>
      </View>

      {!isNewRegistration && renderCurrentPlan()}

      {renderFeatureComparison()}

      <View style={styles.calculatorContainer}>
        <View style={styles.calculator}>
          <Text style={styles.calculatorTitle}>💼 Calculate Your Price</Text>
          <Text style={styles.calculatorSubtitle}>
            Simple, transparent pricing based on your client count
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>How many clients do you have?</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={clientCount}
              onChangeText={setClientCount}
              placeholder="Enter number of clients"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.planTypeSelector}>
            <Text style={styles.planTypeSelectorLabel}>Select Plan Type:</Text>
            <View style={styles.planTypeButtons}>
              {/* Standard plan - disabled during launch promo */}
              <View
                style={[
                  styles.planTypeButton,
                  IS_LAUNCH_PROMO && styles.planTypeButtonDisabled
                ]}
              >
                <Text style={[
                  styles.planTypeButtonText,
                  IS_LAUNCH_PROMO && styles.planTypeButtonTextCrossedOut
                ]}>
                  Standard
                </Text>
                <Text style={[styles.planTypeButtonSubtext, IS_LAUNCH_PROMO && styles.planTypeButtonSubtextDisabled]}>
                  {IS_LAUNCH_PROMO ? 'Not available during promo' : 'Core features'}
                </Text>
              </View>
              
              <TouchableOpacity
                style={[
                  styles.planTypeButton,
                  styles.planTypeButtonActive,
                  IS_LAUNCH_PROMO && styles.planTypeButtonPromo
                ]}
                onPress={() => !IS_LAUNCH_PROMO && setPlanType('premium')}
                activeOpacity={IS_LAUNCH_PROMO ? 1 : 0.7}
              >
                <View style={styles.premiumBadgeSmall}>
                  <Text style={styles.premiumBadgeText}>⭐ PREMIUM</Text>
                </View>
                {IS_LAUNCH_PROMO && (
                  <View style={styles.launchPromoBadge}>
                    <Text style={styles.launchPromoBadgeText}>LAUNCH SPECIAL</Text>
                  </View>
                )}
                <Text style={[
                  styles.planTypeButtonText,
                  styles.planTypeButtonTextActive
                ]}>
                  Premium
                </Text>
                <Text style={styles.planTypeButtonSubtext}>All features included</Text>
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
                    {currentTier.min}-{currentTier.max === Infinity ? '999+' : currentTier.max} clients
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
                {IS_LAUNCH_PROMO && billingPeriod === 'monthly' && (
                  <Text style={styles.originalPriceDisplay}>
                    ${getOriginalPrice(currentTier)}/mo
                  </Text>
                )}
                <Text style={styles.priceAmount}>
                  ${getPrice(currentTier)}
                </Text>
                <Text style={styles.pricePeriod}>
                  /{billingPeriod === 'monthly' ? 'mo' : 'yr'}
                </Text>
              </View>
              {IS_LAUNCH_PROMO && billingPeriod === 'monthly' && (
                <View style={styles.promoSavingsBox}>
                  <Text style={styles.promoSavingsText}>
                    SAVE ${getOriginalPrice(currentTier) - LAUNCH_PROMO_PRICE}/MONTH!
                  </Text>
                  <Text style={styles.promoSavingsSubtext}>Launch Special - Premium for only $40/mo!</Text>
                </View>
              )}

              <View style={styles.priceDetails}>
                <Text style={styles.perClientText}>
                  Just ${getPerClientCost(currentTier, clientCount)} per client
                </Text>
                {billingPeriod === 'annual' && (
                  <Text style={styles.savingsHighlight}>
                    💰 Save ${getAnnualSavings(currentTier)}/year
                  </Text>
                )}
              </View>

              <View style={styles.featuresContainer}>
                <Text style={styles.featuresTitle}>
                  {planType === 'premium' ? '⭐ Premium Features:' : '📦 Standard Features:'}
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
                    {isNewRegistration ? 'Select' : 'Update to'} {currentTier.name} {planType === 'premium' ? 'Premium' : 'Standard'}
                  </Text>
                )}
              </TouchableOpacity>

              {planType === 'standard' && (
                <TouchableOpacity
                  style={styles.upgradeHint}
                  onPress={() => setPlanType('premium')}
                >
                  <Text style={styles.upgradeHintText}>
                    ⭐ Upgrade to Premium for advanced features
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={styles.pricingTableContainer}>
            <View style={styles.pricingTableHeader}>
              <Text style={styles.pricingTableTitle}>Select Your Firm Size</Text>
              {IS_LAUNCH_PROMO && (
                <View style={styles.tablePromoBanner}>
                  <Text style={styles.tablePromoBannerText}>🎉 All tiers just $40/mo during launch!</Text>
                </View>
              )}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.pricingTable}>
                {LAW_FIRM_PRICING.tiers.map((tier, index) => {
                  const pricing = tier.premium; // Always show premium pricing during promo
                  const originalPrice = billingPeriod === 'monthly' ? pricing.monthly : pricing.annual;
                  const promoPrice = IS_LAUNCH_PROMO && billingPeriod === 'monthly' ? LAUNCH_PROMO_PRICE : originalPrice;
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.pricingTableColumn,
                        currentTier?.name === tier.name && styles.pricingTableColumnActive
                      ]}
                      onPress={() => {
                        setClientCount(String(tier.min));
                        // Tier selection for firm size - registration/update happens via main button
                      }}
                      disabled={updating}
                    >
                      <Text style={styles.tableColumnName}>{tier.name}</Text>
                      <Text style={styles.tableColumnRange}>
                        {tier.min}-{tier.max === Infinity ? '999+' : tier.max}
                      </Text>
                      {IS_LAUNCH_PROMO && billingPeriod === 'monthly' && (
                        <Text style={styles.tableColumnOriginalPrice}>
                          ${originalPrice}
                        </Text>
                      )}
                      <Text style={[styles.tableColumnPrice, IS_LAUNCH_PROMO && styles.tableColumnPromoPrice]}>
                        ${promoPrice}
                      </Text>
                      <Text style={styles.tableColumnPeriod}>
                        /{billingPeriod === 'monthly' ? 'mo' : 'yr'}
                      </Text>
                      {currentTier?.name === tier.name && (
                        <View style={styles.selectedBadge}>
                          <Text style={styles.selectedBadgeText}>SELECTED</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>

        <View style={styles.additionalRevenueBox}>
          <Text style={styles.revenueBoxTitle}>💰 Unlock Disbursements with Premium</Text>
          <Text style={styles.revenueBoxText}>
            Premium plan unlocks the ability to process settlement disbursements and pay clients and participating medical providers through the app.
          </Text>
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>🚀 COMING SOON</Text>
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
  planTypeBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  planTypeBadge: {
    backgroundColor: theme.colors.warmGold,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: theme.colors.secondary
  },
  planTypeBadgeText: {
    fontSize: 12,
    color: theme.colors.navy
  },
  premiumPlanText: {
    color: theme.colors.mahogany,
    fontWeight: 'bold'
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
  tableColumnPromoPrice: {
    color: '#28A745'
  },
  tableColumnOriginalPrice: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
    marginBottom: 2
  },
  tableColumnPeriod: {
    fontSize: 10,
    color: theme.colors.textSecondary
  },
  selectedBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 8
  },
  selectedBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold'
  },
  tablePromoBanner: {
    backgroundColor: '#28A745',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8
  },
  tablePromoBannerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center'
  },
  planTypeButtonDisabled: {
    backgroundColor: '#f0f0f0',
    borderColor: '#ddd',
    opacity: 0.7
  },
  planTypeButtonTextCrossedOut: {
    textDecorationLine: 'line-through',
    color: '#999'
  },
  planTypeButtonSubtextDisabled: {
    color: '#bbb'
  },
  planTypeButtonPromo: {
    borderColor: '#28A745',
    borderWidth: 3
  },
  launchPromoBadge: {
    backgroundColor: '#28A745',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4
  },
  launchPromoBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff'
  },
  originalPriceDisplay: {
    fontSize: 24,
    color: '#999',
    textDecorationLine: 'line-through',
    marginRight: 12
  },
  promoSavingsBox: {
    backgroundColor: '#28A745',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    marginBottom: 8,
    alignItems: 'center'
  },
  promoSavingsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff'
  },
  promoSavingsSubtext: {
    fontSize: 12,
    color: '#fff',
    marginTop: 4
  },
  additionalRevenueBox: {
    backgroundColor: '#fff9e6',
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ffd700'
  },
  revenueBoxTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8b7500',
    marginBottom: 12
  },
  revenueBoxText: {
    fontSize: 14,
    color: '#665500',
    lineHeight: 20,
    marginBottom: 12
  },
  comingSoonBadge: {
    backgroundColor: '#4caf50',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start'
  },
  comingSoonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12
  }
});

export default LawFirmSubscriptionScreen;
