import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform
} from 'react-native';
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
      description: 'Established regional firm'
    },
    { 
      name: 'Medium',
      min: 200,
      max: 349,
      standard: {
        monthly: 420,
        annual: 4536,
        features: [
          'Up to 349 clients',
          '📍 Interactive Roadmap',
          '🔔 Push Notifications to Clients',
          '📊 Basic Analytics Dashboard',
          '🔒 Evidence Locker Access'
        ]
      },
      premium: {
        monthly: 500,
        annual: 5400,
        features: [
          'Everything in Basic',
          '🏥 Medical Hub (COMING SOON)',
          '📈 Premium Analytics Dashboard',
          '💰 Disbursements to Client Unlocked (COMING SOON)',
          '🏥 Disbursements to Medical Providers Unlocked (COMING SOON)'
        ]
      },
      description: 'Multi-location practice'
    },
    { 
      name: 'Medium-Large',
      min: 350,
      max: 499,
      standard: {
        monthly: 630,
        annual: 6804,
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
      description: 'Major regional firm'
    },
    { 
      name: 'Large',
      min: 500,
      max: 749,
      standard: {
        monthly: 1000,
        annual: 10800,
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
      description: 'Large multi-state firm'
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
      description: 'National firm'
    }
  ]
};

const INDIVIDUAL_PRICING = {
  free: {
    name: 'Free',
    monthly: 0,
    annual: 0,
    features: ['Access to roadmap', 'Basic notifications', 'Document storage (500MB)']
  },
  basic: {
    name: 'Basic',
    monthly: 9.99,
    annual: 99.99,
    features: ['Everything in Free', 'Unlimited storage', 'Priority support', 'No ads']
  },
  premium: {
    name: 'Premium',
    monthly: 19.99,
    annual: 199.99,
    features: ['Everything in Basic', 'AI document analysis', 'Video consultations', 'Premium content']
  }
};

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
      description: 'Perfect for solo practitioners'
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
      description: 'Small specialized practice'
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
      description: 'Growing practice'
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

const SubscriptionSelectionScreen = ({ userType, onSelectSubscription, onNavigate }) => {
  const [clientCount, setClientCount] = useState('');
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [planType, setPlanType] = useState(userType === 'medicalprovider' ? 'basic' : 'standard');
  const [selectedTier, setSelectedTier] = useState(null);
  const [showCalculator, setShowCalculator] = useState(userType === 'lawfirm' || userType === 'medicalprovider');

  const calculateTier = (count) => {
    const numClients = parseInt(count);
    if (isNaN(numClients) || numClients < 1) return null;
    
    if (userType === 'medicalprovider') {
      return MEDICAL_PROVIDER_PRICING.tiers.find(
        tier => numClients >= tier.min && numClients <= tier.max
      );
    } else {
      return LAW_FIRM_PRICING.tiers.find(
        tier => numClients >= tier.min && numClients <= tier.max
      );
    }
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

  const handleSelectPlan = (plan, tierData = null, fromTable = false) => {
    if (userType === 'lawfirm' || userType === 'medicalprovider') {
      // If tierData is passed, use it; otherwise use currentTier from calculator
      const selectedTier = tierData || currentTier;
      
      if (!selectedTier) {
        const alertMessage = Platform.OS === 'web' 
          ? 'Please select a tier from the table below or enter your client/patient count to continue'
          : 'Selection Required\n\nPlease select a tier from the table below or enter your client/patient count to continue';
        
        if (Platform.OS === 'web') {
          alert(alertMessage);
        } else {
          Alert.alert('Selection Required', alertMessage);
        }
        return;
      }

      // If clicking from table and no count entered, auto-populate with midpoint of tier range
      if (fromTable && (!clientCount || parseInt(clientCount) === 0)) {
        const midpoint = selectedTier.max === Infinity 
          ? selectedTier.min 
          : Math.floor((selectedTier.min + selectedTier.max) / 2);
        setClientCount(midpoint.toString());
      }

      const planLabel = planType === 'premium' ? 'Premium' : (userType === 'medicalprovider' ? 'Basic' : 'Standard');
      const countLabel = userType === 'medicalprovider' ? 'Patients' : 'Clients';
      const tierRange = selectedTier.max === Infinity 
        ? `${selectedTier.min}+ ${countLabel.toLowerCase()}`
        : `${selectedTier.min}-${selectedTier.max} ${countLabel.toLowerCase()}`;

      // Build confirmation message
      let confirmMessage = `Select ${selectedTier.name} ${planLabel} plan?\n\n` +
        `Tier Range: ${tierRange}\n` +
        `Price: $${getPrice(selectedTier)}/${billingPeriod === 'monthly' ? 'month' : 'year'}`;
      
      // Add client/patient info if count was entered
      if (clientCount && parseInt(clientCount) > 0) {
        confirmMessage += `\n${countLabel}: ${clientCount}\n` +
          `Per ${countLabel.toLowerCase().slice(0, -1)}: $${getPerClientCost(selectedTier, clientCount)}`;
      }

      const alertFunc = Platform.OS === 'web' ? 
        (title, message, buttons) => {
          if (window.confirm(message)) {
            buttons[1].onPress();
          }
        } : Alert.alert;

      alertFunc(
        'Confirm Selection',
        confirmMessage,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue',
            onPress: () => {
              onSelectSubscription(
                selectedTier.name.toLowerCase().replace(/[^a-z]/g, ''),
                {
                  clientCount: clientCount ? parseInt(clientCount) : null,
                  tierName: selectedTier.name,
                  billingPeriod: billingPeriod,
                  planType: planType
                }
              );
            }
          }
        ]
      );
    } else {
      const tierData = INDIVIDUAL_PRICING[plan];
      const price = billingPeriod === 'monthly' ? tierData.monthly : tierData.annual;
      
      if (plan === 'free') {
        onSelectSubscription('free', null);
      } else {
        const alertFunc = Platform.OS === 'web' ? 
          (title, message, buttons) => {
            if (window.confirm(message)) {
              buttons[1].onPress();
            }
          } : Alert.alert;

        alertFunc(
          'Confirm Selection',
          `Select ${tierData.name} plan?\n\n` +
          `Price: $${price}/${billingPeriod === 'monthly' ? 'month' : 'year'}`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Continue',
              onPress: () => {
                onSelectSubscription(plan, { billingPeriod: billingPeriod });
              }
            }
          ]
        );
      }
    }
  };

  const renderLawFirmPricing = () => {
    // Derive features from LAW_FIRM_PRICING (using first tier as template)
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
      '🏥 Medical Hub (COMING SOON)',
      '🏥 Medical Provider Payments (COMING SOON)'
    ];

    return (
      <View style={styles.lawFirmContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => onNavigate('register')}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        <FeatureComparisonMatrix
          heading="📊 Compare Plans"
          subheading="Choose the plan that best fits your firm's needs"
          standardFeatures={standardFeatures}
          premiumFeatures={premiumFeatures}
          showDisbursementNote={true}
        />
        
        <View style={styles.calculator}>
          <Text style={styles.calculatorTitle}>💼 Calculate Your Price</Text>
          <Text style={styles.calculatorSubtitle}>
            Simple, transparent pricing based on your client count
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>How many clients do you have? (Optional)</Text>
            <Text style={styles.inputHint}>
              Enter a count for per-client pricing, or skip to select a tier below
            </Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={clientCount}
              onChangeText={setClientCount}
              placeholder="Enter number of clients (optional)"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.planTypeSelector}>
            <Text style={styles.planTypeSelectorLabel}>Select Plan Type:</Text>
            <View style={styles.planTypeButtons}>
              <TouchableOpacity
                style={[
                  styles.planTypeButton,
                  planType === 'standard' && styles.planTypeButtonActive
                ]}
                onPress={() => setPlanType('standard')}
              >
                <Text style={[
                  styles.planTypeButtonText,
                  planType === 'standard' && styles.planTypeButtonTextActive
                ]}>
                  Standard
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
                <Text style={styles.planTypeButtonSubtext}>+19-31% - Advanced features</Text>
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
                <Text style={styles.priceAmount}>
                  ${getPrice(currentTier)}
                </Text>
                <Text style={styles.pricePeriod}>
                  /{billingPeriod === 'monthly' ? 'mo' : 'yr'}
                </Text>
              </View>

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
                  planType === 'premium' && styles.selectButtonPremium
                ]}
                onPress={() => handleSelectPlan('lawfirm', currentTier)}
              >
                <Text style={styles.selectButtonText}>
                  Select {currentTier.name} {planType === 'premium' ? 'Premium' : 'Standard'}
                </Text>
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

              {currentTier.max !== Infinity && (
                <Text style={styles.nextTierHint}>
                  💡 At {currentTier.max + 1} clients, you'll upgrade to {
                    LAW_FIRM_PRICING.tiers[
                      LAW_FIRM_PRICING.tiers.indexOf(currentTier) + 1
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
                    planType === 'standard' && styles.tableToggleActive
                  ]}
                  onPress={() => setPlanType('standard')}
                >
                  <Text style={[
                    styles.tableToggleText,
                    planType === 'standard' && styles.tableToggleTextActive
                  ]}>Standard</Text>
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
                {LAW_FIRM_PRICING.tiers.map((tier, index) => {
                  const pricing = tier[planType];
                  const price = billingPeriod === 'monthly' ? pricing.monthly : pricing.annual;
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.pricingTableColumn,
                        currentTier?.name === tier.name && styles.pricingTableColumnActive
                      ]}
                      onPress={() => handleSelectPlan('lawfirm', tier, true)}
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
    );
  };

  const renderMedicalProviderPricing = () => {
    return (
      <View style={styles.lawFirmContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => onNavigate('register')}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        
        <View style={styles.calculator}>
          <Text style={styles.calculatorTitle}>🏥 Calculate Your Price</Text>
          <Text style={styles.calculatorSubtitle}>
            Simple, transparent pricing based on your patient count
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>How many patients do you have? (Optional)</Text>
            <Text style={styles.inputHint}>
              Enter a count for per-patient pricing, or skip to select a tier below
            </Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={clientCount}
              onChangeText={setClientCount}
              placeholder="Enter number of patients (optional)"
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
                  planType === 'premium' && styles.selectButtonPremium
                ]}
                onPress={() => handleSelectPlan('medicalprovider', currentTier)}
              >
                <Text style={styles.selectButtonText}>
                  Select {currentTier.name} {planType === 'premium' ? 'Premium' : 'Basic'}
                </Text>
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
                      onPress={() => handleSelectPlan('medicalprovider', tier, true)}
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
    );
  };

  const renderIndividualPricing = () => {
    return (
      <View style={styles.individualContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => onNavigate('register')}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        
        <Text style={styles.title}>Choose Your Plan</Text>
        <Text style={styles.subtitle}>
          Navigate your legal journey with confidence
        </Text>

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
              <Text style={styles.savingsText}>Save 17%</Text>
            </View>
          </TouchableOpacity>
        </View>

        {Object.keys(INDIVIDUAL_PRICING).map((planKey) => {
          const plan = INDIVIDUAL_PRICING[planKey];
          const price = billingPeriod === 'monthly' ? plan.monthly : plan.annual;

          return (
            <TouchableOpacity
              key={planKey}
              style={[
                styles.planCard,
                planKey === 'premium' && styles.planCardPremium
              ]}
              onPress={() => handleSelectPlan(planKey)}
            >
              {planKey === 'premium' && (
                <View style={styles.premiumBadgeTop}>
                  <Text style={styles.premiumBadgeTopText}>⭐ BEST VALUE</Text>
                </View>
              )}

              <Text style={styles.planName}>{plan.name}</Text>
              <View style={styles.planPrice}>
                <Text style={styles.planPriceAmount}>${price}</Text>
                <Text style={styles.planPricePeriod}>
                  /{billingPeriod === 'monthly' ? 'month' : 'year'}
                </Text>
              </View>

              <View style={styles.planFeatures}>
                {plan.features.map((feature, index) => (
                  <View key={index} style={styles.featureRow}>
                    <Text style={styles.featureCheck}>✓</Text>
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.selectButtonContainer}>
                <Text style={[
                  styles.selectButtonText,
                  planKey === 'premium' && styles.selectButtonTextPremium
                ]}>
                  Select {plan.name}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      {userType === 'lawfirm' ? renderLawFirmPricing() : 
       userType === 'medicalprovider' ? renderMedicalProviderPricing() :
       renderIndividualPricing()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  lawFirmContainer: {
    padding: 20
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    alignSelf: 'flex-start'
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary
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
    marginBottom: 4
  },
  inputHint: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 8,
    fontStyle: 'italic'
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
    borderColor: 'transparent'
  },
  planTypeButtonActive: {
    backgroundColor: theme.colors.secondary,
    borderColor: theme.colors.primary
  },
  planTypeButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4
  },
  planTypeButtonTextActive: {
    color: theme.colors.primary
  },
  planTypeButtonSubtext: {
    fontSize: 13,
    color: theme.colors.textSecondary
  },
  premiumBadgeSmall: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8
  },
  premiumBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333'
  },
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
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
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textSecondary
  },
  toggleTextActive: {
    color: theme.colors.primary,
    fontWeight: '600'
  },
  savingsBadge: {
    position: 'absolute',
    top: -6,
    right: 8,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  savingsText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff'
  },
  results: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0'
  },
  tierBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  tierBadge: {
    flex: 1
  },
  tierName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 4
  },
  tierRange: {
    fontSize: 14,
    color: theme.colors.textSecondary
  },
  premiumPill: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12
  },
  premiumPillText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333'
  },
  tierDescription: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginBottom: 16
  },
  priceDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12
  },
  priceAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: theme.colors.primary
  },
  pricePeriod: {
    fontSize: 20,
    color: theme.colors.textSecondary,
    marginLeft: 4
  },
  priceDetails: {
    marginBottom: 24
  },
  perClientText: {
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 4
  },
  savingsHighlight: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50'
  },
  featuresContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  featureCheck: {
    fontSize: 16,
    color: '#4CAF50',
    marginRight: 8,
    marginTop: 2
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text,
    lineHeight: 22
  },
  selectButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 12
  },
  selectButtonPremium: {
    backgroundColor: '#FFD700'
  },
  selectButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff'
  },
  upgradeHint: {
    padding: 12,
    alignItems: 'center',
    marginBottom: 12
  },
  upgradeHintText: {
    fontSize: 14,
    color: theme.colors.primary,
    textDecorationLine: 'underline'
  },
  nextTierHint: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic'
  },
  pricingTableContainer: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0'
  },
  pricingTableHeader: {
    marginBottom: 16
  },
  pricingTableTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 12,
    textAlign: 'center'
  },
  pricingTableToggle: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 4,
    alignSelf: 'center'
  },
  tableToggleButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 6
  },
  tableToggleActive: {
    backgroundColor: '#fff'
  },
  tableToggleText: {
    fontSize: 14,
    color: theme.colors.textSecondary
  },
  tableToggleTextActive: {
    color: theme.colors.primary,
    fontWeight: '600'
  },
  pricingTable: {
    flexDirection: 'row',
    gap: 12
  },
  pricingTableColumn: {
    width: 120,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent'
  },
  pricingTableColumnActive: {
    backgroundColor: theme.colors.secondary,
    borderColor: theme.colors.primary
  },
  tableColumnName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 4
  },
  tableColumnRange: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginBottom: 8
  },
  tableColumnPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary
  },
  tableColumnPeriod: {
    fontSize: 12,
    color: theme.colors.textSecondary
  },
  additionalRevenueBox: {
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#4CAF50'
  },
  revenueBoxTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 12
  },
  revenueBoxText: {
    fontSize: 15,
    color: '#1B5E20',
    lineHeight: 22,
    marginBottom: 12
  },
  revenueBoxExample: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 12
  },
  comingSoonBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start'
  },
  comingSoonText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fff'
  },
  individualContainer: {
    padding: 20
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative'
  },
  planCardPremium: {
    borderColor: '#FFD700',
    transform: [{ scale: 1.02 }]
  },
  premiumBadgeTop: {
    position: 'absolute',
    top: -12,
    right: 20,
    backgroundColor: '#FFD700',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12
  },
  premiumBadgeTopText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333'
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 12
  },
  planPrice: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 20
  },
  planPriceAmount: {
    fontSize: 42,
    fontWeight: 'bold',
    color: theme.colors.text
  },
  planPricePeriod: {
    fontSize: 18,
    color: theme.colors.textSecondary,
    marginLeft: 4
  },
  planFeatures: {
    marginBottom: 20
  },
  selectButtonContainer: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center'
  },
  selectButtonTextPremium: {
    backgroundColor: '#FFD700'
  }
});

export default SubscriptionSelectionScreen;
