# Railway Deployment Fix - Stripe Environment Variables

## 🔴 Problem

Railway deployment crashed because Stripe environment variables are missing. The payment routes now gracefully handle this and won't crash, but you need to add the keys to enable payments in production.

---

## ✅ **Solution: Add Stripe Keys to Railway**

### **Step 1: Get Your Stripe Keys**

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. Copy your keys:
   - **Publishable key**: `pk_test_...` (for frontend)
   - **Secret key**: `sk_test_...` (for backend)

**For Production:**
- Switch to "Live mode" in Stripe Dashboard
- Use `pk_live_...` and `sk_live_...` keys

---

### **Step 2: Add Keys to Railway**

1. **Open Railway Project**: Go to [Railway Dashboard](https://railway.app/dashboard)
2. **Select Your Project**: Click on "verdictpath" project
3. **Click on Backend Service**: Select your backend deployment
4. **Go to Variables Tab**: Click "Variables" in the top menu
5. **Add Environment Variables**:

```bash
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
```

**Important Notes:**
- ⚠️ **DO NOT** add `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` to Railway - this is frontend-only
- ✅ **Only add** `STRIPE_SECRET_KEY` to the backend service
- 🔒 Make sure to use your actual Stripe secret key (starts with `sk_test_` or `sk_live_`)

6. **Click "Deploy"**: Railway will automatically redeploy with the new environment variable

---

### **Step 3: Add Frontend Key to Expo**

The frontend (mobile app) needs the publishable key. Add it to Replit Secrets:

1. **Go to Replit Secrets** (lock icon in left sidebar)
2. **Add/Verify**:
```bash
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
```

**This is already configured in Replit**, but verify it's present.

---

## ✅ **Current Fix Applied**

I've updated `backend/routes/payment.js` to **gracefully handle missing Stripe keys**:

```javascript
// Before (crashed on startup):
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

// After (deploys successfully, returns 503 for payment routes):
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  console.log('✅ Stripe configured successfully');
} else {
  console.warn('⚠️  STRIPE_SECRET_KEY not found - payment routes will be disabled');
}
```

**What This Means:**
- ✅ **Railway will deploy successfully** even without Stripe keys
- ⚠️ Payment routes will return **503 Service Unavailable** until keys are added
- ✅ **All other features work normally** (auth, notifications, calendar, etc.)
- ✅ **No crashes** - just disabled payment functionality

---

## 🚀 **Deployment Steps**

### **1. Push Code to Railway**

```bash
git add .
git commit -m "Fix: Make Stripe optional for deployment"
git push railway main
```

Railway will automatically deploy.

### **2. Add Stripe Keys (Optional)**

If you want payment functionality:
1. Add `STRIPE_SECRET_KEY` to Railway environment variables
2. Railway auto-redeploys
3. Payment routes become active

### **3. Verify Deployment**

Check your Railway deployment URL:
```bash
https://verdictpath.up.railway.app/health
```

You should see:
```json
{
  "status": "healthy",
  "services": {
    "api": "running",
    "database": "connected",
    "stripe": "configured"  // or "not configured" if keys not added
  }
}
```

---

## 📱 **Mobile App Configuration**

The mobile app **automatically detects** the environment:

**Development (Replit):**
- Uses: `https://3db82e01-661d-40f3-8a58-a2671f45f1df-00-ogc5sltdyi6u.riker.replit.dev`
- Stripe key: From `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` in Replit Secrets

**Production (Railway):**
- Uses: `https://verdictpath.up.railway.app`
- Stripe key: From `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` (bundled in build)

**No code changes needed!** The `src/config/api.js` file handles this automatically.

---

## 🔧 **Troubleshooting**

### **Issue: Payment routes return 503**

**Solution:** Add `STRIPE_SECRET_KEY` to Railway environment variables

### **Issue: Railway deployment still crashes**

**Possible causes:**
1. Database connection issue - Check `DATABASE_URL` is set
2. Missing other environment variables - Check Railway logs
3. Port binding issue - Railway automatically sets `PORT` variable

**Check Railway Logs:**
1. Go to Railway Dashboard
2. Click on your backend service
3. Click "Deployments" tab
4. Click on latest deployment
5. Check logs for error messages

### **Issue: Mobile app can't process payments**

**Check:**
1. Is `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` set in Replit Secrets?
2. Is the key correct (starts with `pk_test_` or `pk_live_`)?
3. Does the backend have `STRIPE_SECRET_KEY` set in Railway?
4. Is the API URL correct in `src/config/api.js`?

---

## ✅ **Test Your Deployment**

### **1. Test Health Endpoint**

```bash
curl https://verdictpath.up.railway.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-31T...",
  "uptime": 123.45,
  "services": {
    "api": "running",
    "database": "connected",
    "stripe": "configured"
  }
}
```

### **2. Test Payment Intent (if Stripe configured)**

```bash
curl -X POST https://verdictpath.up.railway.app/api/payment/create-payment-intent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"amount": 29.99, "description": "Test Payment"}'
```

Expected response:
```json
{
  "clientSecret": "pi_...",
  "paymentIntentId": "pi_..."
}
```

### **3. Test from Mobile App**

1. Open app on physical device
2. Navigate to payment screen: `onNavigate('payment')`
3. Enter test card: `4242 4242 4242 4242`
4. Click "Pay $29.99"
5. Should show success message

---

## 📚 **Related Files**

- `backend/routes/payment.js` - Payment API routes (updated to handle missing keys)
- `backend/server.js` - Server configuration (includes health check)
- `src/config/api.js` - Frontend API configuration (auto-detects environment)
- `RAILWAY_DEPLOYMENT_GUIDE.md` - General Railway deployment guide

---

## ✅ **Summary**

**Problem Solved:**
- ✅ Railway deployment won't crash anymore
- ✅ App works without Stripe keys (payment routes return 503)
- ✅ Easy to add Stripe keys later when needed

**Next Steps:**
1. **Deploy to Railway** - Push your code
2. **Add Stripe keys** - Add `STRIPE_SECRET_KEY` to Railway
3. **Test payment flow** - Use test cards to verify

Your deployment is now **crash-proof** and **production-ready**! 🚀
