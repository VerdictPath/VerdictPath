# Verdict Path - Developer Handoff Documentation

## 🏴‍☠️ Project Overview

**Verdict Path** is a HIPAA-compliant React Native mobile application (Expo SDK 52) for civil litigation case management with three user portals: Individual Users, Law Firms, and Medical Providers.

- **Tech Stack**: React Native (Expo SDK 52), Node.js/Express, PostgreSQL
- **Deployment**: Railway ([verdictpath.up.railway.app](https://verdictpath.up.railway.app))
- **Theme**: Pirate treasure map aesthetic with gamification
- **Status**: Production-ready with web and mobile support

---

## 📁 Project Structure

```
verdict-path/
├── App.js                      # Main React Native entry point
├── app.json                    # Expo configuration
├── package.json                # Dependencies and scripts
├── metro.config.js             # Metro bundler config
├── babel.config.js             # Babel transpiler config
├── nixpacks.toml               # Railway deployment config
│
├── src/                        # React Native source code
│   ├── screens/                # All app screens
│   ├── components/             # Reusable components
│   ├── navigation/             # Navigation setup
│   ├── styles/                 # Theme and styling
│   ├── config/                 # App configuration
│   └── utils/                  # Utility functions
│
├── backend/                    # Node.js/Express server
│   ├── server.js               # Main server file
│   ├── controllers/            # Business logic
│   ├── routes/                 # API endpoints
│   ├── middleware/             # Auth, encryption, logging
│   ├── models/                 # Database models
│   ├── config/                 # Server configuration
│   └── public/                 # Web app bundle
│
├── marketing-site/             # Marketing website (HTML/CSS/JS)
│   ├── index.html
│   ├── css/styles.css
│   ├── js/script.js
│   └── images/
│
├── attached_assets/            # Visual assets and documents
│   ├── *.png, *.jpeg           # App images
│   └── *.txt, *.md             # Documentation
│
└── replit.md                   # Project memory and architecture
```

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js 20+ and npm
- PostgreSQL database
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Emulator

### 1. Clone and Install
```bash
git clone <repository-url>
cd verdict-path
npm install
```

### 2. Environment Variables
Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database
PGHOST=your-db-host
PGPORT=5432
PGDATABASE=your-db-name
PGUSER=your-db-user
PGPASSWORD=your-db-password

# Security
ENCRYPTION_KEY=your-32-character-encryption-key-here
JWT_SECRET=your-jwt-secret-here

# Stripe Payments
STRIPE_SECRET_KEY=sk_test_xxxxx
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx

# Environment
NODE_ENV=development
PORT=5000
```

### 3. Database Setup
```bash
# Push schema to database
npm run db:push

# Or force push if there are conflicts
npm run db:push --force
```

### 4. Start Development

**Backend Server:**
```bash
cd backend
node server.js
# Runs on http://localhost:5000
```

**Mobile App (Expo):**
```bash
npx expo start
# Press 'i' for iOS simulator
# Press 'a' for Android emulator
# Scan QR code for physical device
```

**Web App:**
```bash
npx expo export:web
# Access at http://localhost:5000 (served by backend)
```

---

## 🗄️ Database Schema

### Core Tables

**users**
- `id` (varchar, UUID primary key)
- `email`, `password_hash`, `user_type`
- `subscription_tier` (Free, Basic, Premium)
- `pirate_coins`, `purchased_coins`
- Authentication and profile data

**litigation_stages**
- 9 main stages (Pre-Litigation → Post-Trial)
- 60 substages with descriptions and audio
- Tracks user progress

**connections**
- Links attorneys with clients
- Links medical providers with patients
- Status tracking (pending, active, rejected)

**tasks**
- Attorney-assigned tasks for clients
- Priority levels, due dates, coin rewards

**notifications**
- Push notification system
- Templates for 22 event types
- User preferences and quiet hours

**medical_records**
- HIPAA-compliant encrypted storage
- AES-256-GCM encryption
- Patient consent tracking

**achievements** & **badges**
- Gamification system
- 16 achievements, 8 pirate-themed badges
- Progress tracking and rewards

**payments**
- Stripe payment processing
- Subscription management
- Coin purchase history

---

## 🔐 Security Features

### HIPAA Compliance
- **Encryption**: AES-256-GCM for medical records
- **Access Control**: Role-based (RBAC)
- **Audit Logging**: All record access tracked
- **Patient Consent**: Required before sharing

### Authentication
- JWT tokens with 7-day expiration
- Bcrypt password hashing
- Secure cookie storage

### Data Protection
- Environment variable secrets
- SQL injection prevention
- XSS protection
- CORS configuration

---

## 🎨 Visual Theme

### Color Palette
```javascript
sand: '#F4E8D8'           // Background
cream: '#F8F1E7'          // Surface
mahogany: '#8B6F47'       // Primary
gold: '#C9A961'           // Secondary
navy: '#2C3E50'           // Text
brightGold: '#D4AF37'     // Accent
```

### Custom Assets
- **Treasure Map**: Case roadmap background
- **Treasure Chest**: Coin rewards and purchases
- **Vault**: Evidence locker icon
- **Video Icon**: Video library
- **Blue Speaker**: Audio playback
- **X Marks the Spot**: Uncompleted stages
- **Logo**: Compass/ship wheel

All located in `attached_assets/`

---

## 📱 Key Features

### Individual Users
- Interactive litigation roadmap (9 stages, 60 substages)
- Evidence locker (medical records, photos, videos, bills)
- Video library (educational tutorials)
- Treasure chest (gamification, coins, badges)
- Attorney connection and task management
- Push notifications with preferences
- Calendar integration

### Law Firm Portal
- Client management dashboard
- Real-time progress tracking
- Task assignment system
- Document collaboration
- Calendar event requests
- Targeted notifications
- Analytics dashboard

### Medical Provider Portal
- Patient management
- HIPAA-compliant record sharing
- Consent management
- Secure messaging
- Billing coordination

---

## 🌐 Web Deployment

### Platform Guards
Mobile-only features disabled on web:
```javascript
if (Platform.OS === 'web') {
  // Skip: Push notifications, native Stripe, 
  // document pickers, calendar sync
}
```

### Railway Deployment
```bash
# Automated via nixpacks.toml
npm run build:web    # Builds web bundle
npm run start        # Starts backend server
```

### Build Process
```bash
# Web bundle
npx expo export:web --output-dir backend/public/app

# Deploy to Railway
git push railway main
```

---

## 🔌 API Endpoints

### Authentication
```
POST /api/auth/signup          # Create account
POST /api/auth/login           # Login
POST /api/auth/verify-token    # Verify JWT
GET  /api/auth/user            # Get user profile
```

### Litigation Progress
```
GET  /api/litigation/progress           # Get user's progress
POST /api/litigation/complete           # Mark substage complete
GET  /api/litigation/stages             # Get all stages
```

### Connections
```
POST /api/connections/request           # Request connection
POST /api/connections/respond           # Accept/reject
GET  /api/connections/clients           # Get law firm clients
GET  /api/connections/patients          # Get medical patients
```

### Tasks
```
GET  /api/tasks                         # Get user's tasks
POST /api/tasks                         # Create task (law firm)
PUT  /api/tasks/:id/complete            # Complete task
```

### Payments
```
POST /api/payments/create-payment-intent    # Stripe payment
POST /api/payments/create-subscription      # Subscribe
POST /api/payments/purchase-coins           # Buy coins
```

### Notifications
```
POST /api/notifications/send                # Send notification
GET  /api/notifications/user                # Get user notifications
PUT  /api/notifications/read                # Mark as read
PUT  /api/notifications/preferences         # Update settings
```

---

## 🎮 Gamification System

### Coin System
- **Free Coins**: 25,000 cap, earned from progress
- **Purchased Coins**: No cap, bought via Stripe
- **Smart Spending**: Purchased coins used first

### Achievements (16 total)
- First Step, Learning Path, Consistent Progress
- Evidence Secured, Full Collection
- Community Member, Referral Champion
- And more...

### Badges (8 pirate-themed)
- Landlubber, Deckhand, Sailor, Navigator
- First Mate, Captain, Commodore, Admiral
- Rarity levels: Common, Uncommon, Rare, Epic, Legendary

### Leaderboard
- Global ranking by coins
- Weekly/monthly filters
- Achievement display

---

## 📲 Push Notifications

### Setup
- Expo push notification service
- 22 notification templates
- Deep linking to app screens
- Badge count synchronization

### User Preferences
- Configurable notification types
- Quiet hours (timezone-aware)
- Per-category controls

### Templates
- Task assignments
- Calendar events
- Progress milestones
- Document requests
- Connection updates
- And more...

---

## 💳 Stripe Integration

### Payment Methods
- Credit/debit cards
- Apple Pay
- Google Pay

### Subscription Tiers
- **Free**: $0/month - Basic features, 5GB storage
- **Basic**: $9/month - Advanced analytics, 50GB storage
- **Premium**: $19/month - Unlimited storage, AI insights

### Coin Packages
- Chest of 100 coins: $0.99
- Sack of 500 coins: $4.99
- Treasure Trove of 1,000 coins: $8.99
- Captain's Fortune of 5,000 coins: $39.99

---

## 🧪 Testing

### Run Mobile App
```bash
npx expo start
```

### Test Backend API
```bash
curl http://localhost:5000/api/health
```

### Test Web App
```bash
# Build web bundle
npm run build:web

# Start server
cd backend && node server.js

# Open browser
open http://localhost:5000
```

---

## 🐛 Common Issues

### "Progress not loading"
- Check backend API is running on port 5000
- Verify `/api/litigation/progress` endpoint
- Clear app cache and restart

### "Green dotted lines not appearing"
- Ensure ALL substages in a stage are completed
- Check `LITIGATION_STAGES` data structure
- Verify progress merge logic in `App.js`

### "Stripe payments failing"
- Check `STRIPE_SECRET_KEY` environment variable
- Verify publishable key in app
- Test with Stripe test cards

### "Web app shows blank screen"
- Run `npm run build:web` to rebuild
- Clear browser cache (Ctrl+Shift+R)
- Check backend serves from `/public/app`

---

## 📦 Dependencies

### Main Dependencies
```json
{
  "expo": "^52.0.0",
  "react-native": "0.76.9",
  "react": "18.3.1",
  "express": "^4.18.2",
  "pg": "^8.11.3",
  "stripe": "^19.2.0",
  "@stripe/stripe-react-native": "^0.38.6",
  "bcryptjs": "^2.4.3",
  "jsonwebtoken": "^9.0.2"
}
```

### Scripts
```json
{
  "start": "expo start",
  "build:web": "npx expo export:web --output-dir backend/public/app",
  "db:push": "drizzle-kit push",
  "db:studio": "drizzle-kit studio"
}
```

---

## 🚢 Deployment

### Railway (Current)
- **URL**: https://verdictpath.up.railway.app
- **Auto-deploy**: Push to main branch
- **Build**: nixpacks.toml configuration
- **Environment**: Set via Railway dashboard

### Environment Variables in Railway
Add all variables from `.env` in Railway dashboard:
- Database credentials
- Stripe keys
- Encryption key
- JWT secret

---

## 📞 Support & Maintenance

### Key Files for Debugging
- `backend/server.js` - Server configuration
- `App.js` - React Native entry point
- `src/config/api.js` - API endpoints
- `backend/controllers/` - Business logic
- `replit.md` - Project memory and decisions

### Logs
- Backend: Railway deployment logs
- Frontend: Expo development logs
- Database: PostgreSQL query logs

---

## 🎯 Next Steps for New Developer

1. **Setup Local Environment**
   - Clone repo
   - Install dependencies
   - Configure `.env`
   - Run database migrations

2. **Understand Architecture**
   - Review `replit.md` for context
   - Study database schema
   - Explore API endpoints
   - Test mobile and web apps

3. **Make First Changes**
   - Start with small UI tweaks
   - Test on both mobile and web
   - Push changes to Railway
   - Monitor production logs

4. **Key Contacts**
   - Original Developer: [Your Contact]
   - Railway Support: railway.app/help
   - Expo Support: expo.dev/support

---

## 📄 Additional Resources

- **Expo Docs**: https://docs.expo.dev/
- **React Native Docs**: https://reactnative.dev/
- **Stripe Docs**: https://stripe.com/docs
- **PostgreSQL Docs**: https://www.postgresql.org/docs/

---

## ⚠️ Important Notes

1. **Never commit `.env` file** - Contains sensitive keys
2. **Always test on both platforms** - Mobile and web have different behaviors
3. **Use `npm run db:push --force`** - For database schema changes
4. **Keep encryption key secure** - Required for medical records
5. **Test Stripe in test mode** - Before going live

---

**Questions?** Review the code, check `replit.md`, or contact the original developer.

**Good luck!** 🏴‍☠️⚓ Navigate justice with confidence!
