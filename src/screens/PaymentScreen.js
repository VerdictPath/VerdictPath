import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { CardField, useStripe } from '@stripe/stripe-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';
import PayButton from '../components/PayButton';

export default function PaymentScreen({ route, navigation }) {
  const { amount = 29.99, description = 'Premium Subscription', subscriptionTier } = route?.params || {};
  const { confirmPayment } = useStripe();
  const [loading, setLoading] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);

  const handlePayment = async () => {
    if (!cardComplete) {
      Alert.alert('Invalid Card', 'Please enter valid card details');
      return;
    }

    setLoading(true);
    
    try {
      const token = await AsyncStorage.getItem('token');
      
      if (!token) {
        Alert.alert('Error', 'Please login to continue');
        navigation.navigate('Login');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/payment/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: amount,
          description: description
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create payment');
      }

      const { clientSecret } = await response.json();

      const { error, paymentIntent } = await confirmPayment(clientSecret, {
        paymentMethodType: 'Card',
      });

      if (error) {
        Alert.alert('Payment Failed', error.message);
      } else if (paymentIntent) {
        Alert.alert(
          'Success!', 
          'Payment completed successfully!',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      }
    } catch (err) {
      console.error('Payment error:', err);
      Alert.alert('Error', err.message || 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Complete Payment</Text>
        <View style={styles.amountContainer}>
          <Text style={styles.currency}>$</Text>
          <Text style={styles.amount}>{amount.toFixed(2)}</Text>
        </View>
        <Text style={styles.description}>{description}</Text>
      </View>

      <View style={styles.cardContainer}>
        <Text style={styles.sectionTitle}>Card Details</Text>
        <CardField
          postalCodeEnabled={false}
          placeholder={{
            number: '4242 4242 4242 4242',
          }}
          cardStyle={{
            backgroundColor: '#FFFFFF',
            textColor: '#000000',
            borderWidth: 1,
            borderColor: '#D3C5A5',
            borderRadius: 8,
          }}
          style={styles.cardField}
          onCardChange={(cardDetails) => {
            setCardComplete(cardDetails.complete);
          }}
        />
      </View>

      <View style={styles.buttonContainer}>
        <PayButton
          onPress={handlePayment}
          loading={loading}
          disabled={!cardComplete || loading}
          title={loading ? 'Processing...' : `Pay $${amount.toFixed(2)}`}
        />
      </View>

      <View style={styles.testInfo}>
        <Text style={styles.testTitle}>Test Mode</Text>
        <Text style={styles.testText}>Test Card: 4242 4242 4242 4242</Text>
        <Text style={styles.testText}>Expiry: Any future date</Text>
        <Text style={styles.testText}>CVC: Any 3 digits</Text>
      </View>

      <View style={styles.secureInfo}>
        <Text style={styles.secureText}>🔒 Secure payment powered by Stripe</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5E6D3',
  },
  contentContainer: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    paddingVertical: 20,
    backgroundColor: '#FFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3E2723',
    marginBottom: 15,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  currency: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  amount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#8B4513',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  cardContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3E2723',
    marginBottom: 15,
  },
  cardField: {
    width: '100%',
    height: 50,
  },
  buttonContainer: {
    marginVertical: 20,
  },
  testInfo: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  testTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 8,
  },
  testText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  secureInfo: {
    alignItems: 'center',
    paddingVertical: 15,
  },
  secureText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
});
