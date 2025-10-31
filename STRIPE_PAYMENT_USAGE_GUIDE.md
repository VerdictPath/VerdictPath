# Stripe Payment Integration - Usage Guide

## ✅ Files Created

### 1. **PaymentScreen.js** (`src/screens/PaymentScreen.js`)
Main payment screen with full Stripe integration, card input, and payment processing.

### 2. **PayButton.js** (`src/components/PayButton.js`)
Reusable payment button component with loading states and pirate-themed styling.

### 3. **App.js** (Updated)
- Added StripeProvider wrapper for entire app
- Added PaymentScreen to navigation
- App version updated to 1.0.4

---

## 🎯 How to Navigate to Payment Screen

### Option 1: From Any Screen (Direct Navigation)

```javascript
// In your component:
import { useNavigation } from './path/to/navigation';

const MyComponent = () => {
  const handleUpgrade = () => {
    // Navigate to payment screen with custom parameters
    navigation.navigate('payment', {
      amount: 29.99,
      description: 'Premium Subscription - 1 Month',
      subscriptionTier: 'Premium'
    });
  };

  return (
    <TouchableOpacity onPress={handleUpgrade}>
      <Text>Upgrade to Premium</Text>
    </TouchableOpacity>
  );
};
```

### Option 2: Add to Dashboard (Recommended)

**Add to `DashboardScreen.js`:**

```javascript
// In DashboardScreen.js, add a subscription upgrade button:

import PayButton from '../components/PayButton';

const DashboardScreen = ({ onNavigate }) => {
  return (
    <View>
      {/* Your existing dashboard content */}
      
      {/* Add Upgrade Section */}
      <View style={styles.upgradeSection}>
        <Text style={styles.upgradeTitle}>Upgrade Your Plan</Text>
        <Text style={styles.upgradeTier}>Current: Free</Text>
        
        <PayButton
          title="Upgrade to Premium - $29.99/mo"
          onPress={() => onNavigate('payment')}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  upgradeSection: {
    backgroundColor: '#FFF',
    padding: 20,
    margin: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  upgradeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3E2723',
    marginBottom: 8,
  },
  upgradeTier: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
});
```

### Option 3: Update Navigation Handler in App.js

To pass dynamic payment amounts:

```javascript
// In App.js, update the payment screen section:

{currentScreen === 'payment' && (
  <PaymentScreen
    route={{
      params: {
        amount: user?.subscriptionTier === 'Basic' ? 19.99 : 29.99,
        description: user?.subscriptionTier === 'Basic' 
          ? 'Upgrade to Premium - 1 Month' 
          : 'Premium Subscription - 1 Month',
        subscriptionTier: 'Premium'
      }
    }}
    navigation={{
      navigate: handleNavigateInternal,
      goBack: () => setCurrentScreen('dashboard')
    }}
  />
)}
```

---

## 💳 Test the Payment Screen

### 1. **Start the App**
```bash
# Expo should already be running, scan the QR code
```

### 2. **Navigate to Payment**
```javascript
// From any screen:
onNavigate('payment');
```

### 3. **Test Cards**

| Card Number | Result | Description |
|------------|--------|-------------|
| `4242 4242 4242 4242` | ✅ Success | Payment succeeds |
| `4000 0000 0000 0002` | ❌ Decline | Card declined |
| `4000 0027 6000 3184` | 🔐 3D Secure | Requires authentication |

**Other Test Values:**
- Expiry: Any future date (e.g., `12/25`)
- CVC: Any 3 digits (e.g., `123`)
- ZIP: Any 5 digits (not required)

---

## 🎨 Customization Examples

### Change Payment Amount

```javascript
// Custom amount example:
<PaymentScreen
  route={{
    params: {
      amount: 49.99,
      description: 'Law Firm Premium - Annual',
      subscriptionTier: 'Premium'
    }
  }}
  navigation={navigation}
/>
```

### Add Subscription Tiers

```javascript
// Create a subscription selection screen:
const subscriptionTiers = [
  { tier: 'Basic', price: 9.99, description: 'Basic Features' },
  { tier: 'Premium', price: 29.99, description: 'All Features + Priority Support' },
  { tier: 'Enterprise', price: 99.99, description: 'Custom Solutions' },
];

subscriptionTiers.map(({ tier, price, description }) => (
  <PayButton
    key={tier}
    title={`${tier} - $${price}/mo`}
    onPress={() => navigation.navigate('payment', { 
      amount: price, 
      description: `${tier} Subscription - 1 Month`,
      subscriptionTier: tier 
    })}
  />
));
```

---

## 🔐 Environment Variables Required

Make sure these are set in your Replit Secrets:

```bash
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...  # Frontend (Expo)
STRIPE_SECRET_KEY=sk_test_...                    # Backend (Node.js)
```

**Current Status:** ✅ Using TEST keys (safe for development)

---

## 🚀 Production Checklist

Before going live:

- [ ] Replace `pk_test_...` with `pk_live_...` in EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY
- [ ] Replace `sk_test_...` with `sk_live_...` in STRIPE_SECRET_KEY
- [ ] Set up webhook endpoint at `/api/payment/webhook`
- [ ] Configure webhook in Stripe Dashboard
- [ ] Test all payment flows with live cards
- [ ] Enable 3D Secure authentication
- [ ] Set up proper error handling and logging

---

## 📱 Example: Complete Payment Flow

**1. User clicks "Upgrade to Premium" on Dashboard**

```javascript
// DashboardScreen.js
<PayButton
  title="Upgrade to Premium"
  onPress={() => onNavigate('payment')}
/>
```

**2. PaymentScreen loads with Stripe card input**

```javascript
// PaymentScreen.js automatically:
// - Shows card input field
// - Displays amount ($29.99)
// - Provides test card info
```

**3. User enters card details**

```
Card: 4242 4242 4242 4242
Expiry: 12/25
CVC: 123
```

**4. User clicks "Pay $29.99" button**

```javascript
// PaymentScreen.js:
// - Creates payment intent on backend
// - Confirms payment with Stripe
// - Shows success/error alert
// - Navigates back to dashboard
```

**5. Payment successful!**

```
✅ Success!
Payment completed successfully!
```

---

## 🛠️ Advanced Features

### Add Payment History

```javascript
// Create PaymentHistoryScreen.js:
const PaymentHistoryScreen = ({ user }) => {
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    fetchPaymentHistory();
  }, []);

  const fetchPaymentHistory = async () => {
    const token = await AsyncStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/api/payment/history`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    setPayments(data.payments);
  };

  return (
    <FlatList
      data={payments}
      renderItem={({ item }) => (
        <View>
          <Text>{item.description}</Text>
          <Text>${item.amount}</Text>
          <Text>{item.status}</Text>
        </View>
      )}
    />
  );
};
```

### Add Subscription Management

```javascript
// Subscription cancellation:
const handleCancelSubscription = async () => {
  const token = await AsyncStorage.getItem('token');
  const response = await fetch(`${API_BASE_URL}/api/payment/cancel-subscription`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ subscriptionId: user.subscriptionId })
  });
  
  if (response.ok) {
    Alert.alert('Success', 'Subscription cancelled');
  }
};
```

---

## 📚 Related Files

- Backend API: `backend/routes/payment.js`
- API Configuration: `src/config/api.js`
- Backend Server: `backend/server.js`
- Integration Guide: `STRIPE_INTEGRATION_GUIDE.md`

---

## ✅ Current Status

```
✅ PaymentScreen.js created
✅ PayButton.js component created
✅ App.js updated with navigation
✅ StripeProvider wrapper added
✅ Backend payment API ready
✅ Test mode enabled
✅ Expo app running
✅ Ready to accept payments!
```

---

## 🎯 Next Steps

1. **Test the payment flow** with test cards
2. **Add payment button to Dashboard** or other screens
3. **Customize amounts** for different subscription tiers
4. **Set up webhooks** for production
5. **Add payment history** screen (optional)

Your payment system is now fully integrated and ready to use! 🎉
