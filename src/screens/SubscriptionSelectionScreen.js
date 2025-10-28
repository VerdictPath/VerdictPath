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
  const [selectedSize, setSelectedSize] = useState(
    userType === USER_TYPES.LAW_FIRM ? FIRM_SIZES.SHINGLE : FIRM_SIZES.SMALL
  );

  const isOrganization = userType === USER_TYPES.LAW_FIRM || userType === USER_TYPES.MEDICAL_PROVIDER;
  const isLawFirm = userType === USER_TYPES.LAW_FIRM;

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
          <Text style={styles.sectionSubtitle}>
            {isLawFirm 
              ? 'Choose the tier that matches your current or expected client count'
              : 'Choose the tier that matches your current or expected patient count'}
          </Text>
          
          <View style={styles.sizeCardsContainer}>
            {isLawFirm && (
              <>
                <TouchableOpacity
                  style={[styles.sizeCard, selectedSize === FIRM_SIZES.SHINGLE && styles.sizeCardActive]}
                  onPress={() => setSelectedSize(FIRM_SIZES.SHINGLE)}
                >
                  <Text style={[styles.sizeCardTitle, selectedSize === FIRM_SIZES.SHINGLE && styles.sizeCardTitleActive]}>
                    Shingle Firm
                  </Text>
                  <Text style={[styles.sizeCardLimit, selectedSize === FIRM_SIZES.SHINGLE && styles.sizeCardLimitActive]}>
                    1-24 clients
                  </Text>
                  <Text style={styles.sizeCardDescription}>
                    Solo practitioners or new firms just getting started
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sizeCard, selectedSize === FIRM_SIZES.BOUTIQUE && styles.sizeCardActive]}
                  onPress={() => setSelectedSize(FIRM_SIZES.BOUTIQUE)}
                >
                  <Text style={[styles.sizeCardTitle, selectedSize === FIRM_SIZES.BOUTIQUE && styles.sizeCardTitleActive]}>
                    Boutique Firm
                  </Text>
                  <Text style={[styles.sizeCardLimit, selectedSize === FIRM_SIZES.BOUTIQUE && styles.sizeCardLimitActive]}>
                    25-49 clients
                  </Text>
                  <Text style={styles.sizeCardDescription}>
                    Small teams focusing on specialized practice areas
                  </Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={[styles.sizeCard, selectedSize === FIRM_SIZES.SMALL && styles.sizeCardActive]}
              onPress={() => setSelectedSize(FIRM_SIZES.SMALL)}
            >
              <Text style={[styles.sizeCardTitle, selectedSize === FIRM_SIZES.SMALL && styles.sizeCardTitleActive]}>
                {isLawFirm ? 'Small Firm' : 'Small Practice'}
              </Text>
              <Text style={[styles.sizeCardLimit, selectedSize === FIRM_SIZES.SMALL && styles.sizeCardLimitActive]}>
                {isLawFirm ? '50-99 clients' : 'Up to 99 patients'}
              </Text>
              <Text style={styles.sizeCardDescription}>
                {isLawFirm 
                  ? 'Growing practices with multiple attorneys'
                  : 'Growing practices with multiple providers'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sizeCard, selectedSize === FIRM_SIZES.MEDIUM && styles.sizeCardActive]}
              onPress={() => setSelectedSize(FIRM_SIZES.MEDIUM)}
            >
              <Text style={[styles.sizeCardTitle, selectedSize === FIRM_SIZES.MEDIUM && styles.sizeCardTitleActive]}>
                {isLawFirm ? 'Medium Firm' : 'Medium Practice'}
              </Text>
              <Text style={[styles.sizeCardLimit, selectedSize === FIRM_SIZES.MEDIUM && styles.sizeCardLimitActive]}>
                {isLawFirm ? '100-499 clients' : '100-499 patients'}
              </Text>
              <Text style={styles.sizeCardDescription}>
                Established practices with diverse specialties
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sizeCard, selectedSize === FIRM_SIZES.LARGE && styles.sizeCardActive]}
              onPress={() => setSelectedSize(FIRM_SIZES.LARGE)}
            >
              <Text style={[styles.sizeCardTitle, selectedSize === FIRM_SIZES.LARGE && styles.sizeCardTitleActive]}>
                {isLawFirm ? 'Large Firm' : 'Large Practice'}
              </Text>
              <Text style={[styles.sizeCardLimit, selectedSize === FIRM_SIZES.LARGE && styles.sizeCardLimitActive]}>
                {isLawFirm ? '500-999 clients' : '500-999 patients'}
              </Text>
              <Text style={styles.sizeCardDescription}>
                {isLawFirm 
                  ? 'Regional firms with multiple office locations'
                  : 'Regional practices with multiple facilities'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sizeCard, selectedSize === FIRM_SIZES.ENTERPRISE && styles.sizeCardActive]}
              onPress={() => setSelectedSize(FIRM_SIZES.ENTERPRISE)}
            >
              <Text style={[styles.sizeCardTitle, selectedSize === FIRM_SIZES.ENTERPRISE && styles.sizeCardTitleActive]}>
                Enterprise
              </Text>
              <Text style={[styles.sizeCardLimit, selectedSize === FIRM_SIZES.ENTERPRISE && styles.sizeCardLimitActive]}>
                {isLawFirm ? '1,000+ clients' : '1,000+ patients'}
              </Text>
              <Text style={styles.sizeCardDescription}>
                Large-scale operations and national organizations
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
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 15,
  },
  sizeSelectionContainer: {
    padding: 20,
    paddingTop: 0,
  },
  sizeCardsContainer: {
    gap: 12,
  },
  sizeCard: {
    padding: 16,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  sizeCardActive: {
    borderColor: '#3498db',
    backgroundColor: '#f0f8ff',
  },
  sizeCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  sizeCardTitleActive: {
    color: '#3498db',
  },
  sizeCardLimit: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
    marginBottom: 8,
  },
  sizeCardLimitActive: {
    color: '#3498db',
  },
  sizeCardDescription: {
    fontSize: 12,
    color: '#95a5a6',
    lineHeight: 18,
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
