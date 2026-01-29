import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { API_ENDPOINTS, apiRequest } from '../config/api';
import { theme } from '../styles/theme';
import alert from '../utils/alert';

const INDIVIDUAL_PRICING = {
  free: {
    name: 'Free',
    monthly: 0,
    annual: 0,
    features: [
      '⚓ Interactive Litigation Roadmap',
      '📹 Full Video Library Access',
      '🪙 Gamification & Coin Rewards',
      '🏴‍☠️ Pirate-Themed Experience',
      '📱 Mobile & Web Access',
      '📚 Premium Educational Content',
      '📅 Calendar Integration',
      '🔔 Priority Notifications',
      '🏥 Medical Hub Access (HIPAA-Compliant)',
      '📊 Advanced Analytics Dashboard',
      '💰 Settlement Disbursement Receiving',
      '🏆 Premium Badge & Recognition'
    ],
    description: 'Complete case management suite - 100% FREE'
  }
};

const IndividualSubscriptionScreen = ({ user, onNavigate, onSubscriptionChanged }) => {
  const [loading, setLoading] = useState(true);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [updating, setUpdating] = useState(false);
  const [stripeAccountStatus, setStripeAccountStatus] = useState(null);

  useEffect(() => {
    fetchCurrentSubscription();
    checkStripeAccountStatus();
  }, []);

  const checkStripeAccountStatus = async () => {
    try {
      if (!user?.token) return;
      
      const response = await apiRequest(
        API_ENDPOINTS.STRIPE_CONNECT.ACCOUNT_STATUS,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${user.token}`,
          },
        }
      );
      
      setStripeAccountStatus(response);
    } catch (error) {
      console.error('Error checking Stripe account status:', error);
    }
  };

  const fetchCurrentSubscription = async () => {
    try {
      if (!user?.token) {
        setCurrentSubscription({
          tier: 'free',
          price: 0
        });
        setLoading(false);
        return;
      }

      setLoading(true);
      const response = await apiRequest(
        API_ENDPOINTS.SUBSCRIPTION.INDIVIDUAL_CURRENT,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${user.token}`,
          },
        }
      );

      if (response.subscription) {
        setCurrentSubscription(response.subscription);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      // Set default free subscription instead of showing error
      setCurrentSubscription({
        tier: 'free',
        price: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSubscription = async (newTier) => {
    // Handle downgrade to free
    if (newTier === 'free' && currentSubscription?.tier !== 'free') {
      alert(
        'Downgrade to Free?',
        'Are you sure you want to downgrade to the Free plan? You\'ll lose access to premium features.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Downgrade',
            style: 'destructive',
            onPress: () => performUpdate(newTier)
          }
        ]
      );
      return;
    }

    performUpdate(newTier);
  };

  const performUpdate = async (newTier) => {
    try {
      setUpdating(true);
      const response = await apiRequest(
        API_ENDPOINTS.SUBSCRIPTION.INDIVIDUAL_UPDATE,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${user?.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subscriptionTier: newTier,
            billingCycle: billingCycle
          }),
        }
      );

      if (response.success) {
        alert('Success!', response.message);
        await fetchCurrentSubscription();
        
        if (onSubscriptionChanged) {
          await onSubscriptionChanged();
        }
      } else {
        alert('Error', response.error || 'Failed to update subscription');
      }
    } catch (error) {
      console.error('Error updating subscription:', error);
      alert('Error', 'Failed to update subscription. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const renderTierCard = (tierId) => {
    const tier = INDIVIDUAL_PRICING[tierId];
    const currentTier = currentSubscription?.tier?.toLowerCase() || 'free';
    const isCurrentTier = currentTier === tierId;
    const price = billingCycle === 'annual' ? tier.annual : tier.monthly;
    const priceDisplay = price === 0 ? 'Free' : `$${price.toFixed(2)}/${billingCycle === 'annual' ? 'year' : 'month'}`;

    return (
      <View 
        key={tierId}
        style={[
          styles.tierCard,
          isCurrentTier && styles.currentTierCard
        ]}
      >
        {isCurrentTier && (
          <View style={styles.currentBadge}>
            <Text style={styles.currentBadgeText}>Current Plan</Text>
          </View>
        )}
        
        <Text style={styles.tierName}>{tier.name}</Text>
        <Text style={styles.tierDescription}>{tier.description}</Text>
        
        <View style={styles.priceSection}>
          <Text style={styles.tierPrice}>{priceDisplay}</Text>
          {tier.savings && billingCycle === 'annual' && (
            <Text style={styles.savingsText}>{tier.savings}</Text>
          )}
        </View>

        <View style={styles.featuresSection}>
          {tier.features.map((feature, index) => (
            <Text key={index} style={styles.featureText}>{feature}</Text>
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.selectButton,
            isCurrentTier && styles.currentButton,
            updating && styles.disabledButton
          ]}
          onPress={() => handleUpdateSubscription(tierId)}
          disabled={isCurrentTier || updating}
        >
          <Text style={[
            styles.selectButtonText,
            isCurrentTier && styles.currentButtonText
          ]}>
            {isCurrentTier ? 'Current Plan' : (tierId === 'free' ? 'Downgrade' : 'Upgrade')}
          </Text>
        </TouchableOpacity>
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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        {onNavigate && (
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => onNavigate('dashboard')}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Subscription Plans</Text>
        <Text style={styles.headerSubtitle}>
          Choose the plan that's right for your litigation journey
        </Text>
      </View>

      <View style={styles.tiersContainer}>
        {renderTierCard('free')}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerNote}>
          💡 All features are included for FREE - HIPAA-compliant medical document storage, settlement disbursement receiving, and more!
        </Text>
        <Text style={styles.footerNote}>
          📱 Includes full mobile and web access.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: theme.colors.primary,
    padding: 25,
    paddingTop: Platform.OS === 'web' ? 25 : 50,
  },
  backButton: {
    marginBottom: 15,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 12,
    padding: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeToggle: {
    backgroundColor: theme.colors.primary,
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  activeToggleText: {
    color: '#fff',
  },
  tiersContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  tierCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currentTierCard: {
    borderColor: theme.colors.primary,
    borderWidth: 3,
  },
  currentBadge: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  currentBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tierName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  tierDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 15,
  },
  priceSection: {
    marginBottom: 20,
  },
  tierPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 5,
  },
  savingsText: {
    fontSize: 14,
    color: '#27ae60',
    fontWeight: '600',
  },
  featuresSection: {
    marginBottom: 20,
  },
  featureText: {
    fontSize: 15,
    color: '#34495e',
    marginBottom: 10,
    lineHeight: 22,
  },
  selectButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  currentButton: {
    backgroundColor: '#ecf0f1',
  },
  disabledButton: {
    opacity: 0.5,
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  currentButtonText: {
    color: '#7f8c8d',
  },
  footer: {
    padding: 20,
    backgroundColor: '#fff',
    marginTop: 10,
  },
  footerNote: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 10,
    lineHeight: 20,
  },
});

export default IndividualSubscriptionScreen;
