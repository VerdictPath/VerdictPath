import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { commonStyles } from '../styles/commonStyles';
import { theme } from '../styles/theme';
import { useStripe, CardField } from '@stripe/stripe-react-native';
import PayButton from '../components/PayButton';

const CoinStoreScreen = ({ onBack, user, setCoins }) => {
  const [packages, setPackages] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  useEffect(() => {
    fetchPackages();
    fetchPurchaseHistory();
  }, []);

  const fetchPackages = async () => {
    try {
      const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 
        (process.env.NODE_ENV === 'production' 
          ? 'https://verdictpath.up.railway.app' 
          : 'http://localhost:5000');

      const response = await fetch(`${API_BASE_URL}/api/coin-purchases/packages`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPackages(data.packages);
      }
    } catch (error) {
      console.error('Error fetching coin packages:', error);
    }
  };

  const fetchPurchaseHistory = async () => {
    try {
      const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 
        (process.env.NODE_ENV === 'production' 
          ? 'https://verdictpath.up.railway.app' 
          : 'http://localhost:5000');

      const response = await fetch(`${API_BASE_URL}/api/coin-purchases/history`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPurchaseHistory(data.purchases);
      }
    } catch (error) {
      console.error('Error fetching purchase history:', error);
    }
  };

  const initializePaymentSheet = async (packageData) => {
    try {
      setLoading(true);

      const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 
        (process.env.NODE_ENV === 'production' 
          ? 'https://verdictpath.up.railway.app' 
          : 'http://localhost:5000');

      // Create payment intent
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

      // Initialize payment sheet
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

      setLoading(false);
      return clientSecret;
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', error.message);
      return null;
    }
  };

  const handlePurchase = async (packageData) => {
    try {
      setSelectedPackage(packageData);

      // Initialize payment sheet
      const clientSecret = await initializePaymentSheet(packageData);
      if (!clientSecret) return;

      // Present payment sheet
      const { error } = await presentPaymentSheet();

      if (error) {
        Alert.alert('Payment cancelled', error.message);
        return;
      }

      // Extract payment intent ID from client secret
      const paymentIntentId = clientSecret.split('_secret_')[0];

      // Confirm purchase with backend
      setLoading(true);

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

      setLoading(false);

      // Update coins in parent component
      if (setCoins) {
        setCoins(result.totalCoins);
      }

      // Show success message
      let message = `🎉 ${result.coinsAwarded.toLocaleString()} coins added to your account!`;
      if (result.cappedAt25000) {
        message += `\n\nNote: Some coins were not added due to the 25,000 coin cap.`;
      }

      Alert.alert('Purchase Successful!', message, [
        { 
          text: 'OK', 
          onPress: () => {
            fetchPurchaseHistory();
            setSelectedPackage(null);
          }
        }
      ]);
    } catch (error) {
      setLoading(false);
      Alert.alert('Purchase Failed', error.message);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Coin Store</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>💰 Purchase Coins</Text>
            <Text style={styles.infoText}>
              Coins can be used for premium features, unlocking content, and earning badges. 
              Your account has a maximum of 25,000 coins.
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Available Packages</Text>

          {packages.map((pkg) => (
            <View key={pkg.id} style={styles.packageCard}>
              <View style={styles.packageHeader}>
                <Text style={styles.packageCoins}>🪙 {pkg.coins.toLocaleString()} Coins</Text>
                <Text style={styles.packagePrice}>${(pkg.price / 100).toFixed(2)}</Text>
              </View>
              <View style={styles.packageDetails}>
                <Text style={styles.packageValue}>
                  ${((pkg.price / 100) / pkg.coins * 1000).toFixed(2)} per 1,000 coins
                </Text>
              </View>
              <PayButton
                onPress={() => handlePurchase(pkg)}
                title={`Buy ${pkg.coins.toLocaleString()} Coins`}
                loading={loading && selectedPackage?.id === pkg.id}
                disabled={loading}
              />
            </View>
          ))}

          {purchaseHistory.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Purchase History</Text>
              {purchaseHistory.map((purchase, index) => (
                <View key={index} style={styles.historyCard}>
                  <View style={styles.historyRow}>
                    <Text style={styles.historyCoins}>
                      🪙 {purchase.coins_purchased.toLocaleString()} coins
                    </Text>
                    <Text style={styles.historyAmount}>
                      ${(purchase.amount_paid / 100).toFixed(2)}
                    </Text>
                  </View>
                  <Text style={styles.historyDate}>
                    {formatDate(purchase.purchased_at)}
                  </Text>
                </View>
              ))}
            </>
          )}
        </View>
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
  content: {
    padding: 20,
  },
  infoCard: {
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.text,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginTop: 10,
    marginBottom: 15,
  },
  packageCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  packageCoins: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  packagePrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.mahogany,
  },
  packageDetails: {
    marginBottom: 15,
  },
  packageValue: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  historyCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.lightGray,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  historyCoins: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  historyAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.mahogany,
  },
  historyDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
});

export default CoinStoreScreen;
