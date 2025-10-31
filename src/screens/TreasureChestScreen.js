import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { theme } from '../styles/theme';
import { useStripe } from '@stripe/stripe-react-native';
import PayButton from '../components/PayButton';

const COIN_PACKAGES = [
  {
    id: 'small_chest',
    name: 'Small Chest',
    coins: 4950,
    price: 0.99,
    priceInCents: 99,
    icon: '🏺',
    popular: false,
    description: 'Perfect starter pack'
  },
  {
    id: 'medium_chest',
    name: 'Medium Chest',
    coins: 9950,
    price: 1.99,
    priceInCents: 199,
    icon: '📦',
    popular: false,
    description: 'Great value for progress'
  },
  {
    id: 'large_chest',
    name: 'Large Chest',
    coins: 14950,
    price: 2.99,
    priceInCents: 299,
    icon: '🎁',
    popular: true,
    description: 'Most popular choice!'
  },
  {
    id: 'treasure_chest',
    name: 'Treasure Chest',
    coins: 19950,
    price: 3.99,
    priceInCents: 399,
    icon: '💎',
    popular: false,
    description: 'Maximum value'
  },
  {
    id: 'pirates_bounty',
    name: "Pirate's Bounty",
    coins: 24950,
    price: 4.99,
    priceInCents: 499,
    icon: '🏴‍☠️',
    popular: false,
    description: 'Ultimate treasure'
  }
];

const TreasureChestScreen = ({ onBack, user, setCoins }) => {
  const [currentCoins, setCurrentCoins] = useState(0);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  useEffect(() => {
    fetchCoinBalance();
  }, []);

  const fetchCoinBalance = async () => {
    try {
      setLoading(true);

      const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 
        (process.env.NODE_ENV === 'production' 
          ? 'https://verdictpath.up.railway.app' 
          : 'http://localhost:5000');

      const response = await fetch(`${API_BASE_URL}/api/coins/balance`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentCoins(data.coins || 0);
      }
    } catch (error) {
      console.error('Error fetching coins:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializePaymentSheet = async (packageData) => {
    try {
      setPurchasing(true);

      const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 
        (process.env.NODE_ENV === 'production' 
          ? 'https://verdictpath.up.railway.app' 
          : 'http://localhost:5000');

      const response = await fetch(`${API_BASE_URL}/api/coin-purchases/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ packageId: packageData.id })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create payment intent');
      }

      const { clientSecret } = await response.json();

      const { error } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'Verdict Path',
        style: 'automatic',
        googlePay: {
          merchantCountryCode: 'US',
          testEnv: true,
          currencyCode: 'USD',
        },
        applePay: {
          merchantCountryCode: 'US',
        },
        returnURL: 'verdictpath://stripe-redirect',
      });

      if (error) {
        throw new Error(error.message);
      }

      setPurchasing(false);
      return clientSecret;
    } catch (error) {
      setPurchasing(false);
      Alert.alert('Error', error.message);
      return null;
    }
  };

  const handlePurchase = async (packageData) => {
    try {
      setSelectedPackage(packageData);

      const clientSecret = await initializePaymentSheet(packageData);
      if (!clientSecret) return;

      const { error } = await presentPaymentSheet();

      if (error) {
        Alert.alert('Payment cancelled', error.message);
        return;
      }

      const paymentIntentId = clientSecret.split('_secret_')[0];

      setPurchasing(true);

      const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 
        (process.env.NODE_ENV === 'production' 
          ? 'https://verdictpath.up.railway.app' 
          : 'http://localhost:5000');

      const confirmResponse = await fetch(`${API_BASE_URL}/api/coin-purchases/confirm-purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ paymentIntentId })
      });

      if (!confirmResponse.ok) {
        const errorData = await confirmResponse.json();
        throw new Error(errorData.message || 'Failed to confirm purchase');
      }

      const result = await confirmResponse.json();

      setPurchasing(false);

      if (setCoins) {
        setCoins(result.totalCoins);
      }
      setCurrentCoins(result.totalCoins);

      let message = `🎉 You've received ${result.coinsAwarded.toLocaleString()} coins!`;
      if (result.cappedAt25000) {
        message += `\n\nNote: Some coins were not added due to the 25,000 coin cap.`;
      }

      Alert.alert('⚓ Treasure Acquired!', message, [
        { 
          text: 'Aye Aye!', 
          onPress: () => setSelectedPackage(null)
        }
      ]);
    } catch (error) {
      setPurchasing(false);
      Alert.alert('Purchase Failed', error.message);
    }
  };

  const formatNumber = (num) => {
    return num.toLocaleString();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.gold} />
          <Text style={styles.loadingText}>Loading your treasure...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Treasure Chest</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>⚓ Treasure Chest ⚓</Text>
        <Text style={styles.pageSubtitle}>Purchase coins to unlock progress</Text>

        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>Your Current Treasure</Text>
            <Text style={styles.balanceIcon}>💰</Text>
          </View>
          <Text style={styles.balanceAmount}>{formatNumber(currentCoins)}</Text>
          <Text style={styles.balanceSubtext}>coins</Text>
          
          <View style={styles.balanceInfo}>
            <Text style={styles.infoText}>
              💡 Coins help you progress through your case journey
            </Text>
          </View>
        </View>

        <View style={styles.packagesSection}>
          <Text style={styles.sectionTitle}>Choose Your Treasure</Text>
          <Text style={styles.sectionSubtitle}>
            1 coin = $0.0002 • Use coins to unlock case stages
          </Text>

          {COIN_PACKAGES.map((pkg) => (
            <TouchableOpacity
              key={pkg.id}
              style={[
                styles.packageCard,
                pkg.popular && styles.packageCardPopular
              ]}
              onPress={() => handlePurchase(pkg)}
              disabled={purchasing}
              activeOpacity={0.8}
            >
              {pkg.popular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>⭐ MOST POPULAR</Text>
                </View>
              )}

              <View style={styles.packageContent}>
                <View style={styles.packageLeft}>
                  <Text style={styles.packageIcon}>{pkg.icon}</Text>
                  <View style={styles.packageInfo}>
                    <Text style={styles.packageName}>{pkg.name}</Text>
                    <Text style={styles.packageDescription}>{pkg.description}</Text>
                    <View style={styles.coinsRow}>
                      <Text style={styles.packageCoins}>
                        {formatNumber(pkg.coins)}
                      </Text>
                      <Text style={styles.coinsLabel}> coins</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.packageRight}>
                  <View style={styles.priceButton}>
                    <Text style={styles.priceText}>${pkg.price.toFixed(2)}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.valueSection}>
          <Text style={styles.valueTitle}>Why Purchase Coins?</Text>
          
          <View style={styles.valueItem}>
            <Text style={styles.valueIcon}>⚡</Text>
            <View style={styles.valueTextContainer}>
              <Text style={styles.valueItemTitle}>Fast Progress</Text>
              <Text style={styles.valueItemText}>
                Advance through your litigation roadmap quickly
              </Text>
            </View>
          </View>

          <View style={styles.valueItem}>
            <Text style={styles.valueIcon}>🎯</Text>
            <View style={styles.valueTextContainer}>
              <Text style={styles.valueItemTitle}>Unlock Achievements</Text>
              <Text style={styles.valueItemText}>
                Earn exclusive badges and rewards
              </Text>
            </View>
          </View>

          <View style={styles.valueItem}>
            <Text style={styles.valueIcon}>🏆</Text>
            <View style={styles.valueTextContainer}>
              <Text style={styles.valueItemTitle}>Climb the Leaderboard</Text>
              <Text style={styles.valueItemText}>
                Compete with other users for top rankings
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.securityNotice}>
          <Text style={styles.securityText}>
            🔒 Secure payment powered by Stripe
          </Text>
          <Text style={styles.securitySubtext}>
            All transactions are encrypted and secure
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: theme.colors.primary,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.secondary,
  },
  backButton: {
    marginRight: 15,
  },
  backButtonText: {
    fontSize: 16,
    color: theme.colors.white,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '600',
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  pageSubtitle: {
    fontSize: 16,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 24,
  },
  balanceCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 3,
    borderColor: '#FFD700',
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceLabel: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '600',
    marginRight: 8,
  },
  balanceIcon: {
    fontSize: 24,
  },
  balanceAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFD700',
    textShadowColor: '#CD7F32',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  balanceSubtext: {
    fontSize: 18,
    color: theme.colors.text,
    fontWeight: '600',
    marginTop: -8,
  },
  balanceInfo: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.secondary,
    width: '100%',
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.text,
    textAlign: 'center',
  },
  packagesSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  packageCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
  },
  packageCardPopular: {
    borderColor: '#FFD700',
    borderWidth: 3,
    backgroundColor: '#FFFEF0',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  popularText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  packageContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  packageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  packageIcon: {
    fontSize: 48,
    marginRight: 16,
  },
  packageInfo: {
    flex: 1,
  },
  packageName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  packageDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  coinsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  packageCoins: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  coinsLabel: {
    fontSize: 14,
    color: theme.colors.text,
  },
  packageRight: {
    marginLeft: 12,
  },
  priceButton: {
    backgroundColor: theme.colors.mahogany,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  priceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.white,
  },
  valueSection: {
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  valueTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  valueItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  valueIcon: {
    fontSize: 28,
    marginRight: 12,
    marginTop: 2,
  },
  valueTextContainer: {
    flex: 1,
  },
  valueItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  valueItemText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  securityNotice: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  securityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 4,
  },
  securitySubtext: {
    fontSize: 12,
    color: '#4CAF50',
  },
});

export default TreasureChestScreen;
