import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { theme } from '../styles/theme';
import alert from '../utils/alert';

// API Configuration
const API_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://verdictpath.up.railway.app' 
    : 'http://localhost:5000');

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
  const [coinDetails, setCoinDetails] = useState({
    totalCoins: 0,
    availableCoins: 0,
    coinsSpent: 0,
    purchasedCoins: 0,
    freeCoins: 0,
    availablePurchasedCoins: 0,
    availableFreeCoins: 0,
    purchasedCoinsSpent: 0,
    freeCoinsSpent: 0,
    treasureChestCapacity: 25000,
    freeCoinsCapRemaining: 25000,
    lifetimeCredits: 0,
    maxLifetimeCredits: 0,
    remainingLifetimeCredits: 0
  });
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);

  useEffect(() => {
    fetchCoinBalance();
  }, []);

  const fetchCoinBalance = async () => {
    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/api/coins/balance`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentCoins(data.totalCoins || 0);
        setCoinDetails({
          totalCoins: data.totalCoins || 0,
          availableCoins: data.availableCoins || 0,
          coinsSpent: data.coinsSpent || 0,
          purchasedCoins: data.purchasedCoins || 0,
          freeCoins: data.freeCoins || 0,
          availablePurchasedCoins: data.availablePurchasedCoins || 0,
          availableFreeCoins: data.availableFreeCoins || 0,
          purchasedCoinsSpent: data.purchasedCoinsSpent || 0,
          freeCoinsSpent: data.freeCoinsSpent || 0,
          treasureChestCapacity: data.treasureChestCapacity || 25000,
          freeCoinsCapRemaining: data.freeCoinsCapRemaining || 25000,
          lifetimeCredits: data.lifetimeCredits || 0,
          maxLifetimeCredits: data.maxLifetimeCredits || 0,
          remainingLifetimeCredits: data.remainingLifetimeCredits || 0
        });
      }
    } catch (error) {
      console.error('Error fetching coins:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (packageData) => {
    if (Platform.OS === 'web') {
      alert(
        '🏴‍☠️ Mobile Only Feature',
        'Coin purchases are only available on the mobile app. Please use the Verdict Path mobile app to purchase coins.\n\nYou can still view your coin balance and use coins you\'ve earned!'
      );
      return;
    }
    
    alert(
      '🏴‍☠️ Coming Soon!',
      'Coin purchases will be available soon! Stay tuned, matey! ⚓'
    );
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
          <Text style={styles.balanceSubtext}>total coins</Text>
          
          <View style={styles.balanceDetails}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>💰 Purchased (Available):</Text>
              <Text style={styles.detailValue}>{formatNumber(coinDetails.availablePurchasedCoins)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>🎁 Free (Available):</Text>
              <Text style={styles.detailValue}>{formatNumber(coinDetails.availableFreeCoins)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>✨ Total Available:</Text>
              <Text style={styles.detailValue}>{formatNumber(coinDetails.availableCoins)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>📊 Total Spent:</Text>
              <Text style={styles.detailValue}>{formatNumber(coinDetails.coinsSpent)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>🏴‍☠️ Free Cap Remaining:</Text>
              <Text style={styles.detailValue}>{formatNumber(coinDetails.freeCoinsCapRemaining)}</Text>
            </View>
          </View>
          
          <View style={styles.balanceInfo}>
            <Text style={styles.infoText}>
              💡 Treasure chest cap (25,000) only applies to free coins earned
            </Text>
            <Text style={styles.infoText}>
              ⚓ Purchased coins have NO LIMIT and never expire!
            </Text>
          </View>
        </View>

        {Platform.OS === 'web' && (
          <View style={styles.webNotice}>
            <Text style={styles.webNoticeTitle}>📱 Mobile App Required</Text>
            <Text style={styles.webNoticeText}>
              Coin purchases are only available on the Verdict Path mobile app. 
              You can still view your coin balance here!
            </Text>
          </View>
        )}

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
          <Text style={styles.valueTitle}>⚓ Why Purchase Coins? ⚓</Text>
          
          <View style={styles.valueItem}>
            <Text style={styles.valueIcon}>🎥</Text>
            <View style={styles.valueTextContainer}>
              <Text style={styles.valueItemText}>
                Gain Access to Premium Video Tutorials.
              </Text>
            </View>
          </View>

          <View style={styles.valueItem}>
            <Text style={styles.valueIcon}>🔊</Text>
            <View style={styles.valueTextContainer}>
              <Text style={styles.valueItemText}>
                Gain Access to Audio Clips Explaining Each Stage in Litigation.
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
  balanceDetails: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.secondary,
    width: '100%',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: 'bold',
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
    backgroundColor: theme.colors.cream,
    borderRadius: 12,
    padding: 24,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: theme.colors.gold,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  valueTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  valueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: theme.colors.white,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.gold,
  },
  valueIcon: {
    fontSize: 32,
    marginRight: 16,
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
    fontSize: 15,
    color: theme.colors.text,
    lineHeight: 22,
    fontWeight: '500',
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
  webNotice: {
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#FFA726',
  },
  webNoticeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 8,
  },
  webNoticeText: {
    fontSize: 14,
    color: '#E65100',
    lineHeight: 20,
  },
});

export default TreasureChestScreen;
