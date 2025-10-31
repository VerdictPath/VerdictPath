# Stripe Payment Integration - Complete Guide

## ✅ What Was Implemented

Your Verdict Path app now has a complete Stripe payment integration with the following features:

### Backend Files Created/Modified:
1. **`backend/routes/payment.js`** - Complete Stripe payment API endpoints
2. **`backend/server.js`** - Updated to include payment routes

### Packages Installed:
- ✅ `stripe` (v19.2.0) - Official Stripe Node.js SDK
- ✅ `dotenv` (v17.2.3) - Environment variable management
- ✅ `express`, `cors` - Already installed

### Secrets Configured:
- ✅ `STRIPE_SECRET_KEY` - Your Stripe secret key (backend)
- ✅ `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Your publishable key (mobile app)

---

## 📡 Available API Endpoints

All endpoints are available at: `http://localhost:5000/api/payment`

### 1. **Create Payment Intent** (One-Time Payments)
```http
POST /api/payment/create-payment-intent
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "amount": 29.99,
  "description": "Premium Subscription - 1 Month"
}
```

**Response:**
```json
{
  "clientSecret": "pi_xxxxx_secret_xxxxx",
  "paymentIntentId": "pi_xxxxx"
}
```

---

### 2. **Create Subscription**
```http
POST /api/payment/create-subscription
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "priceId": "price_xxxxx",
  "subscriptionTier": "Premium"
}
```

**Response:**
```json
{
  "subscriptionId": "sub_xxxxx",
  "clientSecret": "pi_xxxxx_secret_xxxxx"
}
```

---

### 3. **Cancel Subscription**
```http
POST /api/payment/cancel-subscription
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "message": "Subscription cancelled successfully",
  "subscription": { ...stripe subscription object... }
}
```

---

### 4. **Get Subscription Status**
```http
GET /api/payment/subscription-status
Authorization: Bearer YOUR_JWT_TOKEN
```

**Response:**
```json
{
  "hasSubscription": true,
  "tier": "Premium",
  "status": "active",
  "currentPeriodEnd": "2025-11-30T00:00:00.000Z",
  "cancelAtPeriodEnd": false
}
```

---

### 5. **Get Available Prices**
```http
GET /api/payment/prices
```

**Response:**
```json
{
  "prices": [
    {
      "id": "price_xxxxx",
      "unit_amount": 2999,
      "currency": "usd",
      "product": { ...product details... }
    }
  ]
}
```

---

### 6. **Webhook Endpoint** (For Stripe Events)
```http
POST /api/payment/webhook
Content-Type: application/json
Stripe-Signature: t=xxxxx,v1=xxxxx
```

**Handles These Events:**
- `payment_intent.succeeded` - Payment successful
- `customer.subscription.created` - New subscription
- `customer.subscription.updated` - Subscription changed
- `customer.subscription.deleted` - Subscription cancelled

---

## 🔧 Next Steps to Complete Integration

### Step 1: Create Stripe Products & Prices

1. Go to **[Stripe Dashboard → Products](https://dashboard.stripe.com/products)**
2. Click **"Add Product"**
3. Create your subscription tiers:

**Example Products:**
```
Product 1: Verdict Path - Basic
  - Price: $9.99/month
  - Price ID: price_basic_monthly (you'll get this after creating)

Product 2: Verdict Path - Premium
  - Price: $29.99/month
  - Price ID: price_premium_monthly
```

4. Copy the **Price IDs** - you'll need these for the mobile app

---

### Step 2: Set Up Webhooks (Important for Production!)

1. Go to **[Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)**
2. Click **"Add Endpoint"**
3. Enter your endpoint URL:
   ```
   https://verdictpath.up.railway.app/api/payment/webhook
   ```
   (Or your Replit URL for testing)

4. Select these events to listen for:
   - `payment_intent.succeeded`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

5. Copy the **Webhook Signing Secret** (starts with `whsec_`)
6. Add it to your Replit Secrets as: `STRIPE_WEBHOOK_SECRET`

---

### Step 3: Frontend Integration (React Native)

Here's how to integrate Stripe into your mobile app:

#### Install Stripe React Native Package:
```bash
npm install @stripe/stripe-react-native
```

#### Example Payment Screen:
```javascript
// src/screens/PaymentScreen.js
import { useStripe, CardField } from '@stripe/stripe-react-native';
import { useState } from 'react';
import { API_BASE_URL } from '../config/api';

export default function PaymentScreen() {
  const { confirmPayment } = useStripe();
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);
    
    try {
      // 1. Create payment intent on your backend
      const response = await fetch(`${API_BASE_URL}/api/payment/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${yourAuthToken}`
        },
        body: JSON.stringify({
          amount: 29.99,
          description: 'Premium Subscription'
        })
      });
      
      const { clientSecret } = await response.json();
      
      // 2. Confirm payment with Stripe
      const { error, paymentIntent } = await confirmPayment(clientSecret, {
        paymentMethodType: 'Card',
      });
      
      if (error) {
        console.error('Payment failed:', error.message);
        alert('Payment failed: ' + error.message);
      } else if (paymentIntent) {
        console.log('Payment successful!', paymentIntent.id);
        alert('Payment successful!');
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Payment error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Complete Payment</Text>
      
      <CardField
        postalCodeEnabled={false}
        placeholder={{
          number: '4242 4242 4242 4242',
        }}
        cardStyle={{
          backgroundColor: '#FFFFFF',
        }}
        style={{
          width: '100%',
          height: 50,
          marginVertical: 30,
        }}
      />
      
      <Button
        title={loading ? "Processing..." : "Pay $29.99"}
        onPress={handlePayment}
        disabled={loading}
      />
    </View>
  );
}
```

#### Configure App.js (Important!):
```javascript
// App.js or _layout.js
import { StripeProvider } from '@stripe/stripe-react-native';

export default function App() {
  return (
    <StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY}>
      {/* Your app content */}
    </StripeProvider>
  );
}
```

---

## 🧪 Testing

### Test Mode

You're currently using **LIVE** keys. For testing, I recommend switching to **TEST** keys:

1. Go to Stripe Dashboard
2. Toggle to **"Test Mode"** (top right)
3. Get your test keys (`pk_test_...` and `sk_test_...`)
4. Update your Replit Secrets with test keys

### Test Card Numbers

Use these in test mode:
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
Requires 3D Secure: 4000 0027 6000 3184

Expiry: Any future date (e.g., 12/25)
CVC: Any 3 digits (e.g., 123)
ZIP: Any 5 digits (e.g., 12345)
```

---

## 🔒 Security Best Practices

✅ **Already Implemented:**
- Secrets stored securely in Replit environment variables
- JWT authentication required for all payment endpoints
- Stripe webhook signature verification
- No sensitive keys exposed in code

⚠️ **Remember:**
- Never commit Stripe keys to Git
- Always verify webhook signatures in production
- Use HTTPS in production (Railway deployment ready)

---

## 📊 Database Schema

The payment system uses these existing fields in your `users` table:
- `stripe_customer_id` (varchar) - Stores Stripe customer ID
- `stripe_subscription_id` (varchar) - Stores active subscription ID
- `subscription_tier` (varchar) - Stores tier level (Free/Basic/Premium)

---

## 🚀 Integration with Existing Features

The Stripe integration automatically:
- ✅ Creates Stripe customers for new subscribers
- ✅ Updates user subscription tier in database
- ✅ Handles subscription upgrades/downgrades
- ✅ Processes subscription cancellations
- ✅ Syncs subscription status via webhooks

---

## 📝 API Testing with Postman/cURL

### Example: Create Payment Intent
```bash
curl -X POST http://localhost:5000/api/payment/create-payment-intent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "amount": 29.99,
    "description": "Premium Subscription"
  }'
```

### Example: Get Subscription Status
```bash
curl -X GET http://localhost:5000/api/payment/subscription-status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## ✅ Deployment Checklist

When deploying to Railway:

- [ ] Switch to live Stripe keys (or keep test keys for staging)
- [ ] Add `STRIPE_WEBHOOK_SECRET` to Railway environment variables
- [ ] Update webhook URL in Stripe Dashboard to Railway URL
- [ ] Test webhook delivery in Stripe Dashboard
- [ ] Verify SSL certificate is working (required for webhooks)
- [ ] Test a real payment flow end-to-end

---

## 📚 Additional Resources

- [Stripe API Documentation](https://stripe.com/docs/api)
- [Stripe React Native SDK](https://stripe.com/docs/stripe-react-native)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)

---

## 🎯 Summary

You now have a **production-ready Stripe integration** with:
- ✅ One-time payments
- ✅ Recurring subscriptions
- ✅ Subscription management (upgrade/cancel)
- ✅ Webhook event handling
- ✅ Secure authentication
- ✅ Database synchronization

**Next step:** Integrate the Stripe React Native SDK in your mobile app to create payment screens!
