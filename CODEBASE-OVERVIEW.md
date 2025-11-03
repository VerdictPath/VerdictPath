# Verdict Path - Codebase Overview

## 🎯 Quick Reference Guide

This document provides a high-level overview of the codebase for quick navigation and understanding.

---

## 📂 Directory Structure Explained

### `/` (Root Directory)

| File | Purpose |
|------|---------|
| `App.js` | Main React Native entry point, handles auth and navigation |
| `package.json` | Dependencies, scripts, project metadata |
| `app.json` | Expo configuration (name, version, splash screen) |
| `metro.config.js` | Metro bundler config for React Native |
| `babel.config.js` | JavaScript transpilation config |
| `nixpacks.toml` | Railway deployment configuration |
| `replit.md` | Project memory, decisions, architecture notes |

### `/src` (React Native Frontend)

```
src/
├── screens/              # All app screens (30+ files)
│   ├── LoginScreen.js    # Authentication
│   ├── DashboardScreen.js # Main user dashboard
│   ├── RoadmapScreen.js  # Interactive litigation map
│   ├── TreasureChestScreen.js # Coins and gamification
│   ├── VideoLibraryScreen.js  # Educational content
│   ├── MedicalHubScreen.js    # HIPAA document storage
│   └── ...               # 25+ more screens
│
├── components/           # Reusable UI components
│   ├── Button.js
│   ├── Card.js
│   └── ...
│
├── navigation/           # Navigation setup
│   └── AppNavigator.js   # Stack/tab navigation
│
├── styles/               # Styling and theme
│   └── theme.js          # Color palette, fonts
│
├── config/               # App configuration
│   └── api.js            # API endpoints, base URL
│
└── utils/                # Helper functions
    └── storage.js        # AsyncStorage helpers
```

### `/backend` (Node.js/Express API)

```
backend/
├── server.js             # Main server file (routes, middleware)
│
├── controllers/          # Business logic
│   ├── authController.js       # Signup, login, JWT
│   ├── litigationController.js # Progress tracking
│   ├── connectionController.js # Law firm/client links
│   ├── taskController.js       # Attorney tasks
│   ├── notificationController.js # Push notifications
│   ├── paymentController.js    # Stripe integration
│   └── ...                     # 10+ more controllers
│
├── routes/               # API endpoint definitions
│   ├── auth.js
│   ├── litigation.js
│   ├── connections.js
│   ├── tasks.js
│   └── ...
│
├── middleware/           # Request processing
│   ├── authMiddleware.js    # JWT verification
│   ├── encryptionMiddleware.js # AES-256-GCM
│   └── errorHandler.js      # Global error handling
│
├── models/               # Database models
│   └── schema.js         # Drizzle ORM schema
│
├── config/               # Server configuration
│   └── database.js       # PostgreSQL connection
│
└── public/               # Static files
    └── app/              # Web app bundle (from Expo)
```

### `/marketing-site` (Marketing Website)

```
marketing-site/
├── index.html            # Landing page
├── css/styles.css        # Styling (pirate theme)
├── js/script.js          # Interactivity
└── images/               # Visual assets
    ├── logo.png
    ├── treasure-map.png
    ├── treasure-chest.png
    └── ...
```

### `/attached_assets` (Media & Documents)

All visual assets and documentation:
- Pirate-themed images (treasure maps, chests, vaults)
- Legal documents (Privacy Policy, Terms, EULA)
- Design specifications
- Project notes

---

## 🔑 Key Files Deep Dive

### `App.js` (React Native Entry Point)
**What it does:**
- Handles user authentication state
- Loads fonts and assets
- Fetches user litigation progress on login
- Renders navigation structure
- Manages global state

**Key sections:**
```javascript
// Authentication check
useEffect(() => {
  checkAuthStatus();
}, []);

// Load progress on login
useEffect(() => {
  if (user) {
    fetchLitigationProgress();
  }
}, [user]);

// Main render
return user ? <AppNavigator /> : <AuthScreens />;
```

### `backend/server.js` (Backend Entry Point)
**What it does:**
- Connects to PostgreSQL database
- Configures middleware (CORS, body-parser, cookies)
- Registers all API routes
- Serves web app static files
- Error handling

**Key sections:**
```javascript
// Database connection
const pool = new Pool({ connectionString: DATABASE_URL });

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/litigation', litigationRoutes);
// ... 15+ more routes

// Serve web app
app.use(express.static('public/app'));
```

### `src/screens/RoadmapScreen.js` (Main Feature)
**What it does:**
- Displays interactive litigation roadmap
- Renders 9 stages with pirate theme
- Shows progress with green dotted lines
- Handles substage completion
- Coin rewards and animations

**Key features:**
- Treasure map background image
- Stage modals with substage details
- Audio playback for guidance
- Progress calculation (ALL substages = stage complete)
- Platform guards for web vs mobile

### `backend/controllers/litigationController.js`
**What it does:**
- Manages litigation progress
- Marks substages complete
- Awards coins for milestones
- Prevents duplicate completions
- Returns user progress data

**Key functions:**
```javascript
getProgress(userId)           // Get user's completed substages
completeSubstage(userId, id)  // Mark complete + award coins
getStages()                   // Return all 60 substages
```

### `backend/models/schema.js` (Database Schema)
**What it does:**
- Defines all database tables using Drizzle ORM
- Sets up relationships
- Configures constraints

**Key tables:**
```javascript
users                    // User accounts
litigation_stages        // Progress tracking
connections             // Attorney-client links
tasks                   // Attorney-assigned tasks
notifications           // Push notification system
medical_records         // Encrypted HIPAA storage
achievements            // Gamification
payments                // Stripe transactions
```

---

## 🔄 Data Flow Examples

### User Login Flow
```
1. User enters email/password
   └─> src/screens/LoginScreen.js

2. POST /api/auth/login
   └─> backend/routes/auth.js
   └─> backend/controllers/authController.js

3. Verify password, generate JWT
   └─> Return token + user data

4. Store token in AsyncStorage
   └─> Update App.js state
   └─> Navigate to Dashboard

5. Fetch user progress
   └─> GET /api/litigation/progress
   └─> Merge with local stages data
   └─> Update UI
```

### Complete Substage Flow
```
1. User clicks "Mark Complete"
   └─> src/screens/RoadmapScreen.js

2. POST /api/litigation/complete
   └─> backend/routes/litigation.js
   └─> backend/controllers/litigationController.js

3. Check if already completed
   └─> If yes: Silent update, no alert
   └─> If no: Insert record, award coins

4. Return updated progress
   └─> Update frontend state
   └─> Show celebration animation
   └─> Draw green dotted line if stage complete
```

### Stripe Payment Flow
```
1. User selects coin package
   └─> src/screens/TreasureChestScreen.js

2. POST /api/payments/purchase-coins
   └─> backend/controllers/paymentController.js

3. Create Stripe PaymentIntent
   └─> Return client_secret

4. Present payment sheet (native)
   └─> @stripe/stripe-react-native

5. User completes payment
   └─> Stripe webhook confirms

6. Award purchased coins
   └─> Update user.purchased_coins
   └─> Return new balance
```

---

## 🎨 Theming System

### Color Variables (`src/styles/theme.js`)
```javascript
export const theme = {
  colors: {
    sand: '#F4E8D8',          // Background
    cream: '#F8F1E7',         // Cards/surfaces
    mahogany: '#8B6F47',      // Primary buttons
    gold: '#C9A961',          // Borders/accents
    navy: '#2C3E50',          // Text
    brightGold: '#D4AF37',    // Highlights
  }
};
```

### Usage in Components
```javascript
import { theme } from '../styles/theme';

<View style={{ backgroundColor: theme.colors.sand }}>
  <Text style={{ color: theme.colors.navy }}>Hello!</Text>
</View>
```

---

## 🔐 Security Implementation

### Encryption (`backend/middleware/encryptionMiddleware.js`)
- Algorithm: AES-256-GCM
- Used for: Medical records, sensitive documents
- Key: From `ENCRYPTION_KEY` environment variable

### Authentication (`backend/middleware/authMiddleware.js`)
- JWT tokens with 7-day expiration
- Middleware verifies token on protected routes
- Stores user ID in `req.user`

### Password Hashing
```javascript
// Signup
const hashedPassword = await bcrypt.hash(password, 10);

// Login
const isMatch = await bcrypt.compare(password, user.password_hash);
```

---

## 📱 Platform Differences

### Mobile vs Web Guards
```javascript
import { Platform } from 'react-native';

// Disable on web
if (Platform.OS !== 'web') {
  // Push notifications
  // Native Stripe payments
  // Document pickers
  // Calendar sync
}
```

### Web-Specific Config
```javascript
// metro.config.js
resolver: {
  resolverMainFields: ['browser', 'module', 'main'],
  alias: {
    'react-native': 'react-native-web'
  }
}
```

---

## 🧪 Testing Locations

### API Tests
```bash
# backend/__tests__/
# (Create if needed)
```

### Component Tests
```bash
# src/__tests__/
# (Create if needed)
```

### Manual Testing
```bash
# Run backend
cd backend && node server.js

# Run mobile
npx expo start

# Test API
curl http://localhost:5000/api/health
```

---

## 📝 Code Style Conventions

### File Naming
- React components: `PascalCase.js` (e.g., `DashboardScreen.js`)
- Utilities: `camelCase.js` (e.g., `authController.js`)
- Styles: `theme.js`, `styles.css`

### Component Structure
```javascript
// Imports
import React, { useState } from 'react';
import { View, Text } from 'react-native';

// Component
export default function MyScreen() {
  // State
  const [data, setData] = useState(null);
  
  // Effects
  useEffect(() => { ... }, []);
  
  // Handlers
  const handlePress = () => { ... };
  
  // Render
  return ( ... );
}

// Styles
const styles = StyleSheet.create({ ... });
```

### API Controller Structure
```javascript
// Get
exports.getItems = async (req, res) => {
  try {
    const items = await db.query(...);
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Post
exports.createItem = async (req, res) => { ... };

// Put
exports.updateItem = async (req, res) => { ... };

// Delete
exports.deleteItem = async (req, res) => { ... };
```

---

## 🚀 Build & Deploy

### Development
```bash
# Backend (localhost:5000)
cd backend && node server.js

# Mobile (Expo)
npx expo start

# Web (localhost:8081)
npx expo start --web
```

### Production Build
```bash
# Web bundle
npm run build:web

# Outputs to: backend/public/app/
```

### Railway Deployment
```bash
# Auto-deploy on git push
git push railway main

# Or manual trigger via Railway dashboard
```

---

## 📞 Developer Resources

### Internal Documentation
- `replit.md` - Project history and decisions
- `DEVELOPER-HANDOFF.md` - Complete handoff guide
- `SETUP-INSTRUCTIONS.md` - Step-by-step setup

### External Documentation
- [Expo Docs](https://docs.expo.dev/)
- [React Native Docs](https://reactnative.dev/)
- [Express.js Docs](https://expressjs.com/)
- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [Stripe Docs](https://stripe.com/docs)

---

**Happy coding!** 🏴‍☠️⚓

Navigate the codebase with confidence!
