# 🔐 ENVIRONMENT VARIABLES - Complete Template for Replit

## 📋 OVERVIEW

This file contains ALL environment variables needed for Verdict Path backend.
Copy these to your Replit "Secrets" tab (the lock icon 🔒 in the left sidebar).

---

## ⚡ QUICK START

1. Open your Replit project
2. Click the 🔒 "Secrets" icon in left sidebar
3. Add each variable below as a new secret
4. Click "Add new secret" for each one
5. Paste the key and value

---

## 🔴 CRITICAL - MUST CONFIGURE

### **Database** (Replit PostgreSQL)
```
DATABASE_URL=postgresql://username:password@hostname:5432/database_name
```
**How to get:**
- In Replit, click "Database" icon in left sidebar
- Click "PostgreSQL"
- Copy the connection string shown

---

### **JWT Secret** (Authentication)
```
JWT_SECRET=your_super_secret_random_string_here_make_it_long_and_random
```
**How to generate:**
- Option 1: Use this command in Replit Shell:
  ```bash
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```
- Option 2: Visit https://randomkeygen.com/ and use "CodeIgniter Encryption Keys"
- Option 3: Mash your keyboard randomly for 50+ characters

**IMPORTANT:** 
- Make it long (50+ characters)
- Use random mix of letters, numbers, symbols
- NEVER share this publicly
- Different for dev and production

---

### **Stripe Keys** (Payment Processing)

**Test Mode (for development):**
```
STRIPE_SECRET_KEY=sk_test_your_test_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

**Live Mode (for production):**
```
STRIPE_SECRET_KEY=sk_live_your_live_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_live_webhook_secret_here
```

**How to get:**
1. Go to https://dashboard.stripe.com
2. Sign up or log in
3. For Secret Key:
   - Developers → API keys
   - Copy "Secret key" (starts with sk_test_ or sk_live_)
4. For Webhook Secret:
   - Developers → Webhooks
   - Click your webhook endpoint
   - Click "Signing secret" → Reveal
   - Copy the value (starts with whsec_)

**REMEMBER:** Use test keys while testing, live keys only for production!

---

### **Stripe Price IDs** (Subscription Plans)

These are created in Stripe Dashboard when you set up your products.

```
STRIPE_PRICE_INDIVIDUAL_BASIC=price_1234567890abcdef
STRIPE_PRICE_INDIVIDUAL_PREMIUM=price_0987654321fedcba
STRIPE_PRICE_LAWFIRM_BASIC=price_abcd1234efgh5678
STRIPE_PRICE_LAWFIRM_PREMIUM=price_5678efgh1234abcd
STRIPE_PRICE_PROVIDER_BASIC=price_9876fedc5432ba10
STRIPE_PRICE_PROVIDER_PREMIUM=price_1234abcd5678efgh
```

**How to get:**
1. Go to https://dashboard.stripe.com
2. Products → Click "+ Add product"
3. Create each product/price:
   - Individual Basic: $9.99/month recurring
   - Individual Premium: $19.99/month recurring
   - Law Firm Basic: [your price]/month recurring
   - Law Firm Premium: [your price]/month recurring
   - Medical Provider Basic: [your price]/month recurring
   - Medical Provider Premium: [your price]/month recurring
4. After creating each, click the price
5. Copy the "Price ID" (starts with price_)
6. Add to secrets

---

### **File Storage** (Choose ONE option)

#### **OPTION A: Cloudinary (RECOMMENDED - Easier)**
```
UPLOAD_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz123456
```

**How to get:**
1. Sign up at https://cloudinary.com (FREE tier available)
2. After signup, go to Dashboard
3. You'll see:
   - Cloud Name
   - API Key
   - API Secret (click "eye" icon to reveal)
4. Copy each value to Replit Secrets

**Cloudinary Free Tier:**
- ✅ 25 GB storage
- ✅ 25 GB bandwidth/month
- ✅ More than enough for MVP!

---

#### **OPTION B: AWS S3 (More Complex)**
```
UPLOAD_PROVIDER=aws
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1
AWS_S3_BUCKET=verdictpath-documents
```

**How to get:**
1. Sign up at https://aws.amazon.com
2. Go to IAM → Users → Create User
3. Attach policy: AmazonS3FullAccess
4. Create access key
5. Copy Access Key ID and Secret Access Key
6. Go to S3 → Create bucket
7. Name it (e.g., verdictpath-documents)
8. Choose region (e.g., us-east-1)
9. Keep bucket private
10. Copy bucket name to secrets

**AWS Free Tier:**
- ✅ 5 GB storage (12 months free)
- ✅ 20,000 GET requests
- ✅ 2,000 PUT requests

---

### **Firebase (Push Notifications)**
```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYourPrivateKeyHere\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

**How to get:**
1. Go to https://console.firebase.google.com
2. Create project or select existing
3. Project Settings (gear icon) → Service Accounts
4. Click "Generate new private key"
5. Download the JSON file
6. Open the JSON file and copy:
   - project_id → FIREBASE_PROJECT_ID
   - private_key → FIREBASE_PRIVATE_KEY (include the entire key with \n)
   - client_email → FIREBASE_CLIENT_EMAIL

**IMPORTANT:** The private_key must include the newline characters (\n).

**Alternative:** Instead of individual secrets, you can upload the entire JSON file:
- Save it as `firebase-service-account.json` in your backend root
- Add to .gitignore
- Update the code to read from file instead of env vars

---

### **Application Settings**
```
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-frontend-url.com
```

**Values:**
- **NODE_ENV**: 
  - Use `development` while testing
  - Use `production` when live
- **PORT**: Usually `3001` (Replit will assign dynamically)
- **FRONTEND_URL**: 
  - Your React Native app's URL
  - Or use `*` to allow all origins (testing only!)

---

## 🟡 OPTIONAL - RECOMMENDED

### **Email Service** (for password reset, welcome emails)

#### **Option A: SendGrid**
```
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.1234567890abcdefghijklmnopqrstuvwxyz
SENDGRID_FROM_EMAIL=noreply@verdictpath.com
SENDGRID_FROM_NAME=Verdict Path
```

**How to get:**
1. Sign up at https://sendgrid.com (FREE tier: 100 emails/day)
2. Settings → API Keys → Create API Key
3. Give it full access
4. Copy the key (starts with SG.)

---

#### **Option B: Mailgun**
```
EMAIL_PROVIDER=mailgun
MAILGUN_API_KEY=key-1234567890abcdefghijklmnopqrstuvwxyz
MAILGUN_DOMAIN=mg.verdictpath.com
MAILGUN_FROM_EMAIL=noreply@verdictpath.com
```

**How to get:**
1. Sign up at https://mailgun.com (FREE tier: 100 emails/day for 3 months)
2. Add and verify your domain
3. Get API key from dashboard
4. Copy domain and API key

---

### **Error Monitoring** (Sentry)
```
SENTRY_DSN=https://1234567890abcdef@o123456.ingest.sentry.io/123456
```

**How to get:**
1. Sign up at https://sentry.io (FREE tier available)
2. Create new project
3. Select Node.js
4. Copy the DSN (looks like a URL)
5. Add to secrets

**Benefits:**
- ✅ Automatic error tracking
- ✅ Real-time alerts
- ✅ Error analytics
- ✅ Free for small projects

---

### **Analytics** (Optional)
```
GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
MIXPANEL_TOKEN=1234567890abcdefghijklmnopqrstuvwxyz
```

---

## 🟢 OPTIONAL - CAN ADD LATER

### **SMS Notifications** (Twilio)
```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+15551234567
```

---

### **Video Hosting** (if using video features)
```
VIMEO_ACCESS_TOKEN=your_vimeo_access_token
VIMEO_CLIENT_ID=your_client_id
VIMEO_CLIENT_SECRET=your_client_secret
```

---

## 📋 COMPLETE CHECKLIST

Copy this to Replit Secrets:

### **CRITICAL (Must Have):**
- [ ] DATABASE_URL
- [ ] JWT_SECRET
- [ ] STRIPE_SECRET_KEY
- [ ] STRIPE_WEBHOOK_SECRET
- [ ] STRIPE_PRICE_INDIVIDUAL_BASIC
- [ ] STRIPE_PRICE_INDIVIDUAL_PREMIUM
- [ ] STRIPE_PRICE_LAWFIRM_BASIC
- [ ] STRIPE_PRICE_LAWFIRM_PREMIUM
- [ ] STRIPE_PRICE_PROVIDER_BASIC
- [ ] STRIPE_PRICE_PROVIDER_PREMIUM
- [ ] UPLOAD_PROVIDER (cloudinary or aws)
- [ ] CLOUDINARY_* or AWS_* (depending on choice)
- [ ] FIREBASE_PROJECT_ID
- [ ] FIREBASE_PRIVATE_KEY
- [ ] FIREBASE_CLIENT_EMAIL
- [ ] NODE_ENV
- [ ] FRONTEND_URL

### **RECOMMENDED:**
- [ ] EMAIL_PROVIDER (sendgrid or mailgun)
- [ ] EMAIL_API_KEY
- [ ] SENTRY_DSN

### **OPTIONAL:**
- [ ] GOOGLE_ANALYTICS_ID
- [ ] MIXPANEL_TOKEN
- [ ] TWILIO_* (if using SMS)

---

## 🔍 HOW TO VERIFY

After adding all secrets to Replit:

1. **In Replit Shell, run:**
```bash
node -e "console.log(process.env.DATABASE_URL ? '✅ DATABASE_URL set' : '❌ DATABASE_URL missing')"
node -e "console.log(process.env.JWT_SECRET ? '✅ JWT_SECRET set' : '❌ JWT_SECRET missing')"
node -e "console.log(process.env.STRIPE_SECRET_KEY ? '✅ STRIPE_SECRET_KEY set' : '❌ STRIPE_SECRET_KEY missing')"
```

2. **Or add this to your server.js temporarily:**
```javascript
// Check environment variables on startup
console.log('🔍 Environment Check:');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Missing');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Set' : '❌ Missing');
console.log('STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? '✅ Set' : '❌ Missing');
console.log('UPLOAD_PROVIDER:', process.env.UPLOAD_PROVIDER || '❌ Missing');
console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? '✅ Set' : '❌ Missing');
```

---

## 🚨 SECURITY WARNINGS

### **NEVER:**
- ❌ Commit secrets to Git
- ❌ Share secrets publicly
- ❌ Use production keys in development
- ❌ Hardcode secrets in code
- ❌ Screenshot secrets
- ❌ Email secrets

### **ALWAYS:**
- ✅ Use Replit Secrets for all sensitive data
- ✅ Use different keys for dev and production
- ✅ Rotate keys periodically
- ✅ Use test mode while developing
- ✅ Keep secrets file in .gitignore

---

## 📝 EXAMPLE .env FILE (For Local Development)

If developing locally (not in Replit), create a `.env` file:

```bash
# Copy this entire section to .env file (local development only)
# DO NOT commit this file to Git!

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/verdictpath

# JWT
JWT_SECRET=your_long_random_secret_here

# Stripe
STRIPE_SECRET_KEY=sk_test_your_test_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PRICE_INDIVIDUAL_BASIC=price_xxx
STRIPE_PRICE_INDIVIDUAL_PREMIUM=price_xxx
STRIPE_PRICE_LAWFIRM_BASIC=price_xxx
STRIPE_PRICE_LAWFIRM_PREMIUM=price_xxx
STRIPE_PRICE_PROVIDER_BASIC=price_xxx
STRIPE_PRICE_PROVIDER_PREMIUM=price_xxx

# File Storage (Cloudinary)
UPLOAD_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour\nPrivate\nKey\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com

# App Settings
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000
```

Then add to `.gitignore`:
```
.env
firebase-service-account.json
```

---

## 🎯 SUMMARY

**Minimum Required for MVP:**
1. Database connection (1 variable)
2. JWT secret (1 variable)
3. Stripe keys (8 variables)
4. File storage (4 variables for Cloudinary)
5. Firebase (3 variables)
6. App settings (3 variables)

**Total: ~20 environment variables minimum**

---

## 💡 PRO TIPS

1. **Generate strong JWT_SECRET:**
   - Use at least 64 characters
   - Mix letters, numbers, symbols
   - Never reuse across projects

2. **Cloudinary vs AWS:**
   - Cloudinary: Easier, better free tier, faster setup
   - AWS S3: More control, better for large scale

3. **Test vs Live Stripe:**
   - Always test with test keys first
   - Switch to live keys only when ready to launch
   - Test cards: 4242 4242 4242 4242

4. **Firebase Service Account:**
   - Keep the JSON file secure
   - Don't commit to Git
   - Regenerate if compromised

5. **Database URL:**
   - Replit provides PostgreSQL built-in
   - Free tier may have limitations
   - Consider upgrade for production

---

## 📞 NEED HELP?

**Getting Stripe Keys:** Check BACKEND-IMPLEMENTATION-GUIDE.md
**Cloudinary Setup:** See backend-file-uploads.js comments
**Firebase Setup:** See backend-push-notifications.js comments
**Database Issues:** Check Replit documentation

---

**All Set? Start adding these to Replit Secrets now! 🚀**