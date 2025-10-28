import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { commonStyles } from '../styles/commonStyles';
import { USER_TYPES } from '../constants/mockData';
import { SUBSCRIPTION_TIERS, FIRM_SIZES, TIER_LEVELS } from '../constants/subscriptionPricing';

const SubscriptionSelectionScreen = ({ 
  userType, 
  onSelectSubscription,
  onNavigate
}) => {
  const [selectedTier, setSelectedTier] = useState(TIER_LEVELS.FREE);
  const [selectedSize, setSelectedSize] = useState(FIRM_SIZES.SMALL);

  const isOrganization = userType === USER_TYPES.LAW_FIRM || userType === USER_TYPES.MEDICAL_PROVIDER;

  const handleContinue = () => {
    onSelectSubscription(selectedTier, selectedSize);
  };

  const getPrice = (tier, size) => {
    if (tier === TIER_LEVELS.FREE) {
      return SUBSCRIPTION_TIERS[userType][tier].price;
    }
    
    if (userType === USER_TYPES.INDIVIDUAL) {
      return SUBSCRIPTION_TIERS[userType][tier].price;
    }
    
    return SUBSCRIPTION_TIERS[userType][tier][size].price;
  };

  const getFeatures = (tier, size) => {
    if (tier === TIER_LEVELS.FREE) {
      return SUBSCRIPTION_TIERS[userType][tier].features;
    }
    
    if (userType === USER_TYPES.INDIVIDUAL) {
      return SUBSCRIPTION_TIERS[userType][tier].features;
    }
    
    return SUBSCRIPTION_TIERS[userType][tier][size].features;
  };

  const getName = (tier, size) => {
    if (tier === TIER_LEVELS.FREE) {
      return SUBSCRIPTION_TIERS[userType][tier].name;
    }
    
    if (userType === USER_TYPES.INDIVIDUAL) {
      return SUBSCRIPTION_TIERS[userType][tier].name;
    }
    
    return SUBSCRIPTION_TIERS[userType][tier][size].name;
  };

  const getSubtitle = (tier, size) => {
    if (tier === TIER_LEVELS.FREE || userType === USER_TYPES.INDIVIDUAL) {
      return null;
    }
    
    return SUBSCRIPTION_TIERS[userType][tier][size].subtitle;
  };

  const renderPricingCard = (tier) => {
    const price = getPrice(tier, selectedSize);
    const features = getFeatures(tier, selectedSize);
    const name = getName(tier, selectedSize);
    const subtitle = getSubtitle(tier, selectedSize);
    const isSelected = selectedTier === tier;

    return (
      <TouchableOpacity
        key={tier}
        style={[styles.pricingCard, isSelected && styles.pricingCardSelected]}
        onPress={() => setSelectedTier(tier)}
      >
        <View style={styles.pricingHeader}>
          <Text style={[styles.tierName, isSelected && styles.tierNameSelected]}>{name}</Text>
          {subtitle && <Text style={styles.tierSubtitle}>{subtitle}</Text>}
        </View>
        
        <View style={styles.priceSection}>
          <Text style={[styles.price, isSelected && styles.priceSelected]}>
            ${price}
          </Text>
          <Text style={styles.priceLabel}>/month</Text>
        </View>

        <View style={styles.featuresSection}>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Text style={styles.featureCheck}>✓</Text>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {isSelected && (
          <View style={styles.selectedBadge}>
            <Text style={styles.selectedBadgeText}>Selected</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={commonStyles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Choose Your Plan</Text>
        <Text style={styles.subtitle}>
          {userType === USER_TYPES.INDIVIDUAL 
            ? 'Select the plan that best fits your needs'
            : 'Select your organization size and plan level'}
        </Text>
      </View>

      {isOrganization && (
        <View style={styles.sizeSelectionContainer}>
          <Text style={styles.sectionTitle}>Organization Size</Text>
          <View style={styles.sizeButtonsContainer}>
            <TouchableOpacity
              style={[styles.sizeButton, selectedSize === FIRM_SIZES.SMALL && styles.sizeButtonActive]}
              onPress={() => setSelectedSize(FIRM_SIZES.SMALL)}
            >
              <Text style={[styles.sizeButtonText, selectedSize === FIRM_SIZES.SMALL && styles.sizeButtonTextActive]}>
                Small{'\n'}
                <Text style={styles.sizeButtonSubtext}>Up to 99 clients</Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sizeButton, selectedSize === FIRM_SIZES.MEDIUM && styles.sizeButtonActive]}
              onPress={() => setSelectedSize(FIRM_SIZES.MEDIUM)}
            >
              <Text style={[styles.sizeButtonText, selectedSize === FIRM_SIZES.MEDIUM && styles.sizeButtonTextActive]}>
                Medium{'\n'}
                <Text style={styles.sizeButtonSubtext}>100-499 clients</Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sizeButton, selectedSize === FIRM_SIZES.LARGE && styles.sizeButtonActive]}
              onPress={() => setSelectedSize(FIRM_SIZES.LARGE)}
            >
              <Text style={[styles.sizeButtonText, selectedSize === FIRM_SIZES.LARGE && styles.sizeButtonTextActive]}>
                Large{'\n'}
                <Text style={styles.sizeButtonSubtext}>500-999 clients</Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sizeButton, selectedSize === FIRM_SIZES.ENTERPRISE && styles.sizeButtonActive]}
              onPress={() => setSelectedSize(FIRM_SIZES.ENTERPRISE)}
            >
              <Text style={[styles.sizeButtonText, selectedSize === FIRM_SIZES.ENTERPRISE && styles.sizeButtonTextActive]}>
                Enterprise{'\n'}
                <Text style={styles.sizeButtonSubtext}>1,000+ clients</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.pricingContainer}>
        {renderPricingCard(TIER_LEVELS.FREE)}
        {renderPricingCard(TIER_LEVELS.BASIC)}
        {renderPricingCard(TIER_LEVELS.PREMIUM)}
      </View>

      <View style={styles.actionContainer}>
        <TouchableOpacity style={commonStyles.primaryButton} onPress={handleContinue}>
          <Text style={commonStyles.buttonText}>
            {selectedTier === TIER_LEVELS.FREE ? 'Start Free Trial' : 'Continue to Payment'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => onNavigate('login')} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back to Login</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.disclaimer}>
        You can upgrade, downgrade, or cancel your subscription at any time.
        {selectedTier === TIER_LEVELS.FREE && ' No credit card required for free trial.'}
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  sizeSelectionContainer: {
    padding: 20,
    paddingTop: 0,
  },
  sizeButtonsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  sizeButton: {
    flex: 1,
    paddingVertical: 15,
    paddingHorizontal: 8,
    borderWidth: 2,
    borderColor: '#bdc3c7',
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  sizeButtonActive: {
    borderColor: '#3498db',
    backgroundColor: '#ebf5fb',
  },
  sizeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7f8c8d',
    textAlign: 'center',
  },
  sizeButtonTextActive: {
    color: '#3498db',
  },
  sizeButtonSubtext: {
    fontSize: 10,
    fontWeight: 'normal',
  },
  pricingContainer: {
    padding: 20,
    gap: 15,
  },
  pricingCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    borderWidth: 2,
    borderColor: '#ecf0f1',
    position: 'relative',
  },
  pricingCardSelected: {
    borderColor: '#3498db',
    backgroundColor: '#f8fbff',
  },
  pricingHeader: {
    marginBottom: 15,
  },
  tierName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  tierNameSelected: {
    color: '#3498db',
  },
  tierSubtitle: {
    fontSize: 13,
    color: '#7f8c8d',
    marginTop: 4,
  },
  priceSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 20,
  },
  price: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  priceSelected: {
    color: '#3498db',
  },
  priceLabel: {
    fontSize: 16,
    color: '#7f8c8d',
    marginLeft: 5,
  },
  featuresSection: {
    gap: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  featureCheck: {
    fontSize: 16,
    color: '#27ae60',
    marginRight: 10,
  },
  featureText: {
    fontSize: 14,
    color: '#2c3e50',
    flex: 1,
  },
  selectedBadge: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: '#3498db',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  selectedBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionContainer: {
    padding: 20,
    gap: 15,
  },
  backButton: {
    alignItems: 'center',
    padding: 15,
  },
  backButtonText: {
    fontSize: 16,
    color: '#3498db',
    fontWeight: '600',
  },
  disclaimer: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingBottom: 30,
    lineHeight: 18,
  },
});

export default SubscriptionSelectionScreen;
