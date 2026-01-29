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
  ImageBackground,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import { theme } from '../styles/theme';
import alert from '../utils/alert';
import { API_BASE_URL } from '../config/api';

const treasureCaveBackground = require('../../attached_assets/Treasure Cave_1764036765036.png');

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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

const TreasureChestScreen = ({ onBack, user, setCoins, refreshKey = 0 }) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isTablet = windowWidth >= 768;
  const isDesktop = windowWidth >= 1024;
  
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
    if (user?.token) {
      fetchCoinBalance();
    }
  }, [refreshKey, user?.token]);

  const fetchCoinBalance = async () => {
    try {
      setLoading(true);

      const response = await fetch(`${API_BASE_URL}/api/coins/balance`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const totalCoins = data.totalCoins || 0;
        
        setCurrentCoins(totalCoins);
        setCoinDetails({
          totalCoins: totalCoins,
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
        
        if (setCoins) {
          setCoins(totalCoins);
        }
      } else {
        console.error('[TreasureChest] Failed to fetch balance - Status:', response.status);
        const errorText = await response.text();
        console.error('[TreasureChest] Error response:', errorText);
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

  const responsiveStyles = {
    scrollContent: {
      padding: isDesktop ? 40 : isTablet ? 30 : 20,
      maxWidth: isDesktop ? 800 : isTablet ? 600 : '100%',
      alignSelf: 'center',
      width: '100%',
    },
    pageTitle: {
      fontSize: isDesktop ? 42 : isTablet ? 38 : 34,
    },
    balanceAmount: {
      fontSize: isDesktop ? 60 : isTablet ? 56 : 52,
    },
  };

  if (loading) {
    return (
      <ImageBackground 
        source={treasureCaveBackground} 
        style={[styles.container, { width: windowWidth, height: windowHeight }]}
        imageStyle={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFD700" />
            <Text style={styles.loadingText}>Loading your treasure...</Text>
          </View>
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground 
      source={treasureCaveBackground} 
      style={[styles.container, { width: windowWidth, height: windowHeight }]}
      imageStyle={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Treasure Chest</Text>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, responsiveStyles.scrollContent]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.pageTitle, responsiveStyles.pageTitle]}>⚓ Treasure Chest ⚓</Text>
          <Text style={styles.pageSubtitle}>Purchase coins to unlock progress</Text>

          <View style={styles.balanceCard}>
            <View style={styles.balanceHeader}>
              <Text style={styles.balanceLabel}>Your Current Treasure</Text>
              <Text style={styles.balanceIcon}>💰</Text>
            </View>
            <Text style={[styles.balanceAmount, responsiveStyles.balanceAmount]}>{formatNumber(currentCoins)}</Text>
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
              Use coins to unlock case stages
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
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: '100%',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    minHeight: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'rgba(44, 62, 80, 0.9)',
    borderBottomWidth: 2,
    borderBottomColor: '#FFD700',
  },
  backButton: {
    marginRight: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFD700',
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
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
    fontSize: 18,
    color: '#FFD700',
    fontWeight: '700',
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  pageTitle: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 6,
  },
  pageSubtitle: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '600',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  balanceCard: {
    backgroundColor: 'rgba(26, 26, 26, 0.92)',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#FFD700',
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceLabel: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '700',
    marginRight: 8,
  },
  balanceIcon: {
    fontSize: 28,
  },
  balanceAmount: {
    fontSize: 52,
    fontWeight: 'bold',
    color: '#FFD700',
    textShadowColor: '#CD7F32',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 6,
  },
  balanceSubtext: {
    fontSize: 20,
    color: '#E0E0E0',
    fontWeight: '600',
    marginTop: -6,
  },
  balanceDetails: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 215, 0, 0.4)',
    width: '100%',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 15,
    color: '#B0B0B0',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 17,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  balanceInfo: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 215, 0, 0.4)',
    width: '100%',
  },
  infoText: {
    fontSize: 14,
    color: '#E0E0E0',
    textAlign: 'center',
    marginBottom: 6,
  },
  packagesSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  packageCard: {
    backgroundColor: 'rgba(26, 26, 26, 0.92)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.5)',
  },
  packageCardPopular: {
    borderColor: '#FFD700',
    borderWidth: 3,
    backgroundColor: 'rgba(40, 35, 20, 0.95)',
    shadowColor: '#FFD700',
    shadowOpacity: 0.4,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    backgroundColor: '#FFD700',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 12,
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  popularText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1a1a1a',
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
    fontSize: 19,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 4,
  },
  packageDescription: {
    fontSize: 14,
    color: '#B0B0B0',
    marginBottom: 6,
  },
  coinsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  packageCoins: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFD700',
    textShadowColor: '#CD7F32',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  coinsLabel: {
    fontSize: 15,
    color: '#E0E0E0',
    fontWeight: '500',
  },
  packageRight: {
    marginLeft: 12,
  },
  priceButton: {
    backgroundColor: '#8B0000',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  priceText: {
    fontSize: 19,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  valueSection: {
    backgroundColor: 'rgba(26, 26, 26, 0.92)',
    borderRadius: 14,
    padding: 24,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  valueTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 20,
    textAlign: 'center',
    textShadowColor: '#CD7F32',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  valueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(50, 50, 50, 0.8)',
    padding: 16,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700',
  },
  valueIcon: {
    fontSize: 34,
    marginRight: 16,
  },
  valueTextContainer: {
    flex: 1,
  },
  valueItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  valueItemText: {
    fontSize: 16,
    color: '#E0E0E0',
    lineHeight: 24,
    fontWeight: '500',
  },
  securityNotice: {
    backgroundColor: 'rgba(30, 60, 30, 0.9)',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  securityText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#81C784',
    marginBottom: 4,
  },
  securitySubtext: {
    fontSize: 14,
    color: '#A5D6A7',
  },
  webNotice: {
    backgroundColor: 'rgba(60, 40, 20, 0.92)',
    borderRadius: 12,
    padding: 18,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#FFA726',
  },
  webNoticeTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#FFB74D',
    marginBottom: 8,
  },
  webNoticeText: {
    fontSize: 15,
    color: '#FFCC80',
    lineHeight: 22,
  },
});

export default TreasureChestScreen;
