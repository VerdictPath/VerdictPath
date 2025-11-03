# Verdict Path - Complete Setup Instructions

## 📋 Prerequisites Checklist

Before you begin, make sure you have:

- [ ] Node.js 20 or higher installed ([nodejs.org](https://nodejs.org))
- [ ] npm (comes with Node.js)
- [ ] Git installed
- [ ] PostgreSQL database access (or use Railway/Neon)
- [ ] Stripe account for payments (test mode is fine)
- [ ] iOS Simulator (Mac only) or Android Emulator
- [ ] Text editor (VS Code recommended)

---

## 🚀 Step-by-Step Setup

### Step 1: Get the Code

```bash
# Clone or download the repository
git clone <your-repo-url>
cd verdict-path

# Or if you received a zip file:
unzip verdict-path.zip
cd verdict-path
```

### Step 2: Install Dependencies

```bash
# Install all npm packages
npm install

# This will take 2-3 minutes
# You should see "added XXX packages"
```

### Step 3: Set Up Environment Variables

Create a file named `.env` in the root directory:

```bash
# Copy the example file
cp .env.example .env

# Or create it manually
touch .env
```

Add these variables to `.env`:

```env
# ===== DATABASE =====
# Get from your PostgreSQL provider (Railway, Neon, etc.)
DATABASE_URL=postgresql://username:password@host:5432/database_name
PGHOST=your-database-host.com
PGPORT=5432
PGDATABASE=verdict_path
PGUSER=postgres
PGPASSWORD=your-secure-password

# ===== SECURITY =====
# Generate a random 32-character string
ENCRYPTION_KEY=abcdef1234567890abcdef1234567890
JWT_SECRET=your-random-jwt-secret-here-make-it-long

# ===== STRIPE PAYMENTS =====
# Get from https://dashboard.stripe.com/test/apikeys
STRIPE_SECRET_KEY=sk_test_51xxxxxxxxxxxxx
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51xxxxxxxxxxxxx

# ===== SERVER =====
NODE_ENV=development
PORT=5000
```

**Important**: 
- Never commit the `.env` file to Git
- Keep your secrets secure
- Use test mode keys for Stripe initially

### Step 4: Set Up the Database

**Option A: Use Railway (Easiest)**
```bash
# Go to railway.app
# Create new project → Add PostgreSQL
# Copy connection string to DATABASE_URL
```

**Option B: Local PostgreSQL**
```bash
# Install PostgreSQL locally
# Create database
createdb verdict_path

# Update .env with local connection
DATABASE_URL=postgresql://localhost:5432/verdict_path
```

**Push Schema to Database:**
```bash
npm run db:push
```

You should see: "✅ Database schema synchronized"

If you get an error, try:
```bash
npm run db:push --force
```

### Step 5: Start the Backend Server

```bash
cd backend
node server.js
```

You should see:
```
✅ Database connected
✅ Stripe configured successfully
VerdictPath Backend Server running on port 5000
API endpoints available at http://localhost:5000/api
```

Leave this terminal running.

### Step 6: Start the Mobile App

Open a **new terminal window**:

```bash
# From the project root
npx expo start
```

You'll see a QR code and menu:

```
› Press i │ open iOS simulator
› Press a │ open Android emulator
› Press w │ open web browser
```

**For iOS (Mac only):**
- Press `i`
- Xcode will open iOS Simulator
- App will load automatically

**For Android:**
- Press `a`
- Android Emulator will start
- App will load automatically

**For Physical Device:**
- Install Expo Go app from App Store/Play Store
- Scan the QR code with your camera

**For Web Browser:**
- Press `w`
- Opens at http://localhost:8081

### Step 7: Test the App

1. **Create an Account**
   - Click "Get Started Free"
   - Enter email and password
   - Choose user type (Individual User recommended)
   - Select subscription tier (Free is fine)

2. **Explore Features**
   - View the pirate treasure map roadmap
   - Click on litigation stages
   - Check the treasure chest (coins)
   - Browse the video library

3. **Test the Backend**
   - Open http://localhost:5000 in browser
   - Should see the web app version
   - API available at http://localhost:5000/api

---

## 🔧 Development Workflow

### Making Changes

**Frontend (React Native):**
```bash
# Edit files in src/
# Changes auto-reload in Expo
# Shake device or Cmd+D (iOS) / Cmd+M (Android) for dev menu
```

**Backend (Node.js):**
```bash
# Edit files in backend/
# Stop server (Ctrl+C)
# Restart: node server.js
# Or use nodemon for auto-restart:
npm install -g nodemon
nodemon backend/server.js
```

**Database Schema:**
```bash
# Edit backend/models/schema.js
# Push changes:
npm run db:push
```

### Building for Web

```bash
# Export web bundle
npm run build:web

# Outputs to: backend/public/app/
# Served automatically by backend at http://localhost:5000
```

---

## 🧪 Testing

### Test API Endpoints

```bash
# Health check
curl http://localhost:5000/api/health

# Create account
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","userType":"individual"}'
```

### Test Mobile App

1. Launch app in simulator
2. Create test account
3. Navigate through all screens
4. Test coin system
5. Complete a litigation substage
6. Check treasure chest

### Test Stripe Payments

Use Stripe test cards:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Expiry**: Any future date (e.g., 12/34)
- **CVC**: Any 3 digits (e.g., 123)

---

## 📱 Platform-Specific Setup

### iOS Setup

1. **Install Xcode** (Mac only)
   - Download from App Store
   - Open once to accept license

2. **Install iOS Simulator**
   ```bash
   xcode-select --install
   ```

3. **Run on iOS**
   ```bash
   npx expo start
   # Press 'i' for iOS simulator
   ```

### Android Setup

1. **Install Android Studio**
   - Download from [developer.android.com](https://developer.android.com)
   - Install Android SDK

2. **Create Virtual Device**
   - Open Android Studio
   - Tools → Device Manager
   - Create Virtual Device
   - Choose Pixel 5 or similar

3. **Run on Android**
   ```bash
   npx expo start
   # Press 'a' for Android emulator
   ```

---

## 🌐 Deployment

### Deploy to Railway

1. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Create New Project**
   - New Project → Deploy from GitHub repo
   - Select your repository
   - Railway auto-detects nixpacks.toml

3. **Add Environment Variables**
   - Settings → Variables
   - Add all variables from `.env`
   - Do NOT include `NODE_ENV=development`

4. **Deploy**
   - Railway builds and deploys automatically
   - Get URL: `your-app.up.railway.app`

5. **Set Up Database**
   - Add PostgreSQL service
   - Copy DATABASE_URL to variables
   - Run migrations from local: `npm run db:push`

---

## ❌ Common Issues & Solutions

### Issue: "Cannot find module 'expo'"
**Solution:**
```bash
npm install
npm install expo
```

### Issue: "Database connection failed"
**Solution:**
- Check DATABASE_URL in `.env`
- Verify database is running
- Test connection: `psql $DATABASE_URL`

### Issue: "Metro bundler port already in use"
**Solution:**
```bash
# Kill process on port 8081
lsof -ti:8081 | xargs kill -9
# Restart Expo
npx expo start
```

### Issue: "Stripe key invalid"
**Solution:**
- Verify keys in Stripe dashboard
- Make sure using test mode keys (start with `sk_test_`)
- Check keys in `.env` have no extra spaces

### Issue: "App shows blank screen on web"
**Solution:**
```bash
# Rebuild web bundle
npm run build:web
# Clear browser cache
# Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
```

### Issue: "Changes not appearing"
**Solution:**
```bash
# For mobile: Shake device → Reload
# For web: Clear cache and hard refresh
# For backend: Restart server
```

---

## 🔐 Security Checklist

- [ ] `.env` file is in `.gitignore`
- [ ] Using strong, random encryption key (32+ characters)
- [ ] Stripe keys are test mode initially
- [ ] Database has strong password
- [ ] JWT secret is long and random
- [ ] Never commit secrets to Git

---

## 📚 Useful Commands

```bash
# Install dependencies
npm install

# Start Expo development server
npx expo start

# Start backend server
cd backend && node server.js

# Build web app
npm run build:web

# Push database schema
npm run db:push

# Force push database schema
npm run db:push --force

# Open database studio
npm run db:studio

# Clear Expo cache
npx expo start -c

# Check for updates
npm outdated
```

---

## 🎯 Next Steps

1. ✅ Complete setup
2. ✅ Test app locally
3. 📝 Review codebase structure
4. 🎨 Customize branding (optional)
5. 🚀 Deploy to Railway
6. 📱 Test on real devices
7. 💳 Switch to Stripe live mode
8. 🌟 Launch!

---

## 📞 Getting Help

**Issues with this setup?**
1. Check error messages carefully
2. Search GitHub issues
3. Review Expo documentation
4. Check Railway deployment logs
5. Contact original developer

**Helpful Resources:**
- Expo Docs: https://docs.expo.dev
- React Native Docs: https://reactnative.dev
- Node.js Docs: https://nodejs.org/docs
- PostgreSQL Docs: https://www.postgresql.org/docs
- Stripe Docs: https://stripe.com/docs

---

**You're all set!** 🏴‍☠️⚓

Start developing, and navigate your code with confidence!
