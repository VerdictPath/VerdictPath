import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Alert, Platform } from 'react-native';
import { API_ENDPOINTS, apiRequest } from '../config/api';
import { TIER_LEVELS, FIRM_SIZES } from '../constants/subscriptionPricing';
import { getPrice } from '../utils/subscriptionPricing';

const LawFirmSubscriptionScreen = ({ token }) => {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [selectedTier, setSelectedTier] = useState(TIER_LEVELS.FREE);
  const [selectedSize, setSelectedSize] = useState(FIRM_SIZES.SHINGLE);

  useEffect(() => {
    fetchSubscriptionDetails();
  }, []);

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
      setSelectedTier(response.subscription.tier || TIER_LEVELS.FREE);
      setSelectedSize(response.subscription.firmSize || FIRM_SIZES.SHINGLE);
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

  const handleUpdateSubscription = async () => {
    try {
      setUpdating(true);
      
      const response = await apiRequest(API_ENDPOINTS.SUBSCRIPTION.LAWFIRM_UPDATE, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          subscriptionTier: selectedTier,
          firmSize: selectedTier !== TIER_LEVELS.FREE ? selectedSize : null
        })
      });

      if (Platform.OS === 'web') {
        alert(response.message || 'Subscription updated successfully!');
      } else {
        Alert.alert('Success', response.message || 'Subscription updated successfully!');
      }
      
      await fetchSubscriptionDetails();
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

  const hasChanges = () => {
    if (!currentSubscription) return false;
    return (
      selectedTier !== currentSubscription.tier ||
      selectedSize !== currentSubscription.firmSize
    );
  };

  const renderCurrentPlan = () => {
    if (!currentSubscription) return null;

    return (
      <View style={styles.currentPlanCard}>
        <Text style={styles.currentPlanTitle}>Current Subscription</Text>
        <View style={styles.currentPlanDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Plan:</Text>
            <Text style={styles.detailValue}>
              {currentSubscription.tier === TIER_LEVELS.FREE && 'Free Trial'}
              {currentSubscription.tier === TIER_LEVELS.BASIC && 'Basic'}
              {currentSubscription.tier === TIER_LEVELS.PREMIUM && 'Premium'}
            </Text>
          </View>
          {currentSubscription.firmSize && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Firm Size:</Text>
              <Text style={styles.detailValue}>
                {currentSubscription.firmSize.charAt(0).toUpperCase() + currentSubscription.firmSize.slice(1)}
              </Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Client Limit:</Text>
            <Text style={styles.detailValue}>
              {currentSubscription.clientLimit === 999999 ? 'Unlimited' : currentSubscription.clientLimit}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Current Clients:</Text>
            <Text style={[styles.detailValue, styles.currentCount]}>
              {currentSubscription.currentClientCount}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderPricingCard = (tier) => {
    const isSelected = selectedTier === tier;
    const isFree = tier === TIER_LEVELS.FREE;
    const price = isFree ? 0 : getPrice('lawfirm', tier, selectedSize);
    
    const features = {
      [TIER_LEVELS.FREE]: [
        '10 clients maximum',
        'Basic litigation roadmap',
        'Client document storage',
        'Email support'
      ],
      [TIER_LEVELS.BASIC]: [
        'Based on firm size',
        'Full litigation roadmap',
        'HIPAA-compliant storage',
        'Priority email support',
        'Client progress tracking'
      ],
      [TIER_LEVELS.PREMIUM]: [
        'Based on firm size',
        'Everything in Basic',
        'Advanced analytics',
        'White-label options',
        'Dedicated support',
        'API access'
      ]
    };

    return (
      <TouchableOpacity
        key={tier}
        style={[styles.pricingCard, isSelected && styles.pricingCardSelected]}
        onPress={() => setSelectedTier(tier)}
      >
        <View style={styles.pricingHeader}>
          <Text style={[styles.pricingTitle, isSelected && styles.pricingTitleSelected]}>
            {tier === TIER_LEVELS.FREE && 'Free Trial'}
            {tier === TIER_LEVELS.BASIC && 'Basic'}
            {tier === TIER_LEVELS.PREMIUM && 'Premium'}
          </Text>
          {!isFree && (
            <Text style={[styles.pricingPrice, isSelected && styles.pricingPriceSelected]}>
              ${price}/mo
            </Text>
          )}
          {isFree && (
            <Text style={[styles.pricingPrice, isSelected && styles.pricingPriceSelected]}>
              Free
            </Text>
          )}
        </View>
        <View style={styles.featuresList}>
          {features[tier].map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Text style={styles.featureBullet}>⚖️</Text>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>
      </TouchableOpacity>
    );
  };

  const renderSizeCard = (size) => {
    const isSelected = selectedSize === size;
    const sizeInfo = {
      [FIRM_SIZES.SHINGLE]: { title: 'Shingle Firm', limit: '1-24 clients', desc: 'Solo practitioners or new firms' },
      [FIRM_SIZES.BOUTIQUE]: { title: 'Boutique Firm', limit: '25-49 clients', desc: 'Small teams with specialized practice' },
      [FIRM_SIZES.SMALL]: { title: 'Small Firm', limit: '50-99 clients', desc: 'Growing practices with multiple attorneys' },
      [FIRM_SIZES.MEDIUM]: { title: 'Medium Firm', limit: '100-499 clients', desc: 'Established firms with diverse practice areas' },
      [FIRM_SIZES.LARGE]: { title: 'Large Firm', limit: '500-999 clients', desc: 'Regional firms with multiple offices' },
      [FIRM_SIZES.ENTERPRISE]: { title: 'Enterprise', limit: '1,000+ clients', desc: 'Large-scale operations and national firms' }
    };

    const info = sizeInfo[size];

    return (
      <TouchableOpacity
        key={size}
        style={[styles.sizeCard, isSelected && styles.sizeCardSelected]}
        onPress={() => setSelectedSize(size)}
      >
        <Text style={[styles.sizeCardTitle, isSelected && styles.sizeCardTitleSelected]}>
          {info.title}
        </Text>
        <Text style={[styles.sizeCardLimit, isSelected && styles.sizeCardLimitSelected]}>
          {info.limit}
        </Text>
        <Text style={styles.sizeCardDesc}>{info.desc}</Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a5490" />
        <Text style={styles.loadingText}>Loading subscription details...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⚖️ Subscription Management</Text>
        <Text style={styles.headerSubtitle}>Manage your law firm subscription and organization size</Text>
      </View>

      {renderCurrentPlan()}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select New Plan</Text>
        <View style={styles.pricingCardsContainer}>
          {renderPricingCard(TIER_LEVELS.FREE)}
          {renderPricingCard(TIER_LEVELS.BASIC)}
          {renderPricingCard(TIER_LEVELS.PREMIUM)}
        </View>
      </View>

      {selectedTier !== TIER_LEVELS.FREE && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Firm Size</Text>
          <Text style={styles.sectionSubtitle}>Choose the tier that matches your current or expected client count</Text>
          <View style={styles.sizeCardsContainer}>
            {renderSizeCard(FIRM_SIZES.SHINGLE)}
            {renderSizeCard(FIRM_SIZES.BOUTIQUE)}
            {renderSizeCard(FIRM_SIZES.SMALL)}
            {renderSizeCard(FIRM_SIZES.MEDIUM)}
            {renderSizeCard(FIRM_SIZES.LARGE)}
            {renderSizeCard(FIRM_SIZES.ENTERPRISE)}
          </View>
        </View>
      )}

      {hasChanges() && (
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.updateButton, updating && styles.updateButtonDisabled]}
            onPress={handleUpdateSubscription}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.updateButtonText}>Update Subscription</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>⚓ Important Notes</Text>
        <Text style={styles.infoText}>
          • You can upgrade your plan at any time{'\n'}
          • Downgrades are only allowed if your current client count fits within the new limit{'\n'}
          • Changes take effect immediately{'\n'}
          • For billing questions, contact support
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666'
  },
  header: {
    backgroundColor: '#1a5490',
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
    borderColor: '#1a5490',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  currentPlanTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a5490',
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
    color: '#666',
    fontWeight: '500'
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold'
  },
  currentCount: {
    color: '#1a5490'
  },
  section: {
    margin: 15
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15
  },
  pricingCardsContainer: {
    gap: 10
  },
  pricingCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd'
  },
  pricingCardSelected: {
    borderColor: '#1a5490',
    backgroundColor: '#f0f7ff'
  },
  pricingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  pricingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  pricingTitleSelected: {
    color: '#1a5490'
  },
  pricingPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666'
  },
  pricingPriceSelected: {
    color: '#1a5490'
  },
  featuresList: {
    gap: 8
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  featureBullet: {
    marginRight: 8,
    fontSize: 14
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: '#555'
  },
  sizeCardsContainer: {
    gap: 10
  },
  sizeCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd'
  },
  sizeCardSelected: {
    borderColor: '#1a5490',
    backgroundColor: '#f0f7ff'
  },
  sizeCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3
  },
  sizeCardTitleSelected: {
    color: '#1a5490'
  },
  sizeCardLimit: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 5
  },
  sizeCardLimitSelected: {
    color: '#1a5490'
  },
  sizeCardDesc: {
    fontSize: 13,
    color: '#777'
  },
  actionContainer: {
    margin: 15,
    marginTop: 20
  },
  updateButton: {
    backgroundColor: '#1a5490',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center'
  },
  updateButtonDisabled: {
    opacity: 0.6
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  infoBox: {
    backgroundColor: '#fff9e6',
    margin: 15,
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f0e68c'
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8b7500',
    marginBottom: 8
  },
  infoText: {
    fontSize: 13,
    color: '#665500',
    lineHeight: 20
  }
});

export default LawFirmSubscriptionScreen;
