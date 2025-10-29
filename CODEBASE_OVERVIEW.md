# Verdict Path - Complete Codebase Overview

## Project Structure
```
verdict-path/
├── backend/
│   ├── server.js (Express server)
│   ├── config/
│   │   ├── db.js (PostgreSQL connection)
│   │   └── database.sql (Schema)
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── coinsController.js
│   │   ├── litigationController.js
│   │   └── [other controllers]
│   ├── routes/
│   │   ├── auth.js
│   │   ├── coins.js
│   │   ├── litigation.js
│   │   └── [other routes]
│   ├── middleware/
│   │   └── auth.js (JWT authentication)
│   └── services/
│       └── auditLogger.js (HIPAA audit logs)
├── src/
│   ├── screens/ (React Native screens)
│   ├── components/
│   ├── config/
│   │   └── api.js (API configuration)
│   └── utils/
└── App.js (Main React Native app)
```

## Tech Stack
- **Frontend**: React Native (Expo SDK 52), React 18.3.1
- **Backend**: Node.js, Express 5.1.0
- **Database**: PostgreSQL (Railway hosted)
- **Authentication**: JWT (jsonwebtoken)
- **Security**: bcryptjs, AES-256-GCM encryption for PHI

---

## Backend Code

### backend/server.js
```javascript
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const authRoutes = require('./routes/auth');
const lawfirmRoutes = require('./routes/lawfirm');
const medicalproviderRoutes = require('./routes/medicalprovider');
const consentRoutes = require('./routes/consent');
const coinsRoutes = require('./routes/coins');
const uploadRoutes = require('./routes/uploads');
const formsRoutes = require('./routes/forms');
const litigationRoutes = require('./routes/litigation');
const invitesRoutes = require('./routes/invites');
const connectionsRoutes = require('./routes/connections');
const subscriptionRoutes = require('./routes/subscription');
const diagnosticRoutes = require('./routes/diagnostic');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/lawfirm', lawfirmRoutes);
app.use('/api/medicalprovider', medicalproviderRoutes);
app.use('/api/consent', consentRoutes);
app.use('/api/coins', coinsRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/forms', formsRoutes);
app.use('/api/litigation', litigationRoutes);
app.use('/api/invites', invitesRoutes);
app.use('/api/connections', connectionsRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/diagnostic', diagnosticRoutes);

app.listen(PORT, () => {
  console.log(`VerdictPath Backend Server running on port ${PORT}`);
});

module.exports = app;
```

### backend/config/db.js
```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

module.exports = pool;
```

### backend/routes/coins.js
```javascript
const express = require('express');
const router = express.Router();
const coinsController = require('../controllers/coinsController');
const { authenticateToken } = require('../middleware/auth');

// REMOVED: /update endpoint to prevent coin farming vulnerability
// Coins are now only awarded through secure server-side processes:
// - Daily rewards: /claim-daily
// - Stage/substage completion: litigation endpoints
// - Invite rewards: invite endpoints

router.post('/convert', authenticateToken, coinsController.convertCoinsToCredits);
router.get('/balance', authenticateToken, coinsController.getBalance);
router.get('/conversion-history', authenticateToken, coinsController.getConversionHistory);
router.post('/claim-daily', authenticateToken, coinsController.claimDailyReward);

module.exports = router;
```

### backend/controllers/coinsController.js (Key Security Function)
```javascript
const DAILY_BONUSES = [5, 7, 10, 12, 15, 20, 30]; // Daily streak bonus tiers

const claimDailyReward = async (req, res) => {
  try {
    const userId = req.user.id;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get user's current streak and last claim time
      const userResult = await client.query(
        'SELECT total_coins, login_streak, last_daily_claim_at FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'User not found' });
      }

      const user = userResult.rows[0];
      const lastClaimAt = user.last_daily_claim_at;
      const currentCoins = user.total_coins || 0;
      let currentStreak = user.login_streak || 0;

      // Check if user already claimed today
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      if (lastClaimAt) {
        const lastClaimDate = new Date(lastClaimAt);
        const lastClaimDay = new Date(lastClaimDate.getFullYear(), lastClaimDate.getMonth(), lastClaimDate.getDate());

        // Check if already claimed today
        if (lastClaimDay.getTime() === today.getTime()) {
          await client.query('ROLLBACK');
          return res.status(400).json({ 
            message: 'Daily reward already claimed today',
            alreadyClaimed: true,
            nextClaimAvailable: new Date(today.getTime() + 24 * 60 * 60 * 1000),
            currentStreak: currentStreak
          });
        }

        // Check if streak continues (claimed yesterday)
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        if (lastClaimDay.getTime() === yesterday.getTime()) {
          currentStreak++;
        } else {
          currentStreak = 1;
        }
      } else {
        currentStreak = 1;
      }

      // Calculate bonus based on streak
      const streakIndex = Math.min(currentStreak - 1, DAILY_BONUSES.length - 1);
      const bonus = DAILY_BONUSES[streakIndex];
      const newCoinTotal = currentCoins + bonus;

      // Update user with new coins, streak, and last claim time
      await client.query(
        `UPDATE users 
         SET total_coins = $1, 
             login_streak = $2, 
             last_daily_claim_at = CURRENT_TIMESTAMP 
         WHERE id = $3`,
        [newCoinTotal, currentStreak, userId]
      );

      // Log the daily reward claim
      await auditLogger.log({
        actorId: userId,
        actorType: req.user.userType || 'client',
        action: 'DAILY_REWARD_CLAIMED',
        entityType: 'UserCoins',
        entityId: userId,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: { 
          bonus: bonus,
          streak: currentStreak,
          previousCoins: currentCoins,
          newCoins: newCoinTotal
        }
      });

      await client.query('COMMIT');

      res.json({ 
        success: true,
        bonus: bonus,
        newStreak: currentStreak,
        totalCoins: newCoinTotal,
        message: `Daily bonus claimed! You earned ${bonus} coins! ${currentStreak} day streak! 🎉`
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error claiming daily reward:', error);
    res.status(500).json({ message: 'Failed to claim daily reward' });
  }
};

module.exports = {
  convertCoinsToCredits,
  getBalance,
  getConversionHistory,
  claimDailyReward
};
```

---

## Frontend Code

### App.js (Main Entry Point)
```javascript
import React, { useState, useEffect } from 'react';
import { View, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';

import { LITIGATION_STAGES, USER_TYPES } from './src/constants/mockData';
import { calculateDailyBonus, calculateCreditsFromCoins, calculateCoinsNeeded } from './src/utils/gamification';
import { apiRequest, API_ENDPOINTS } from './src/config/api';

import LandingScreen from './src/screens/LandingScreen';
import SignupScreen from './src/screens/SignupScreen';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import RoadmapScreen from './src/screens/RoadmapScreen';
// ... other screen imports

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('landing');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [coins, setCoins] = useState(0);
  const [loginStreak, setLoginStreak] = useState(0);
  // ... other state

  const handleClaimDailyBonus = async () => {
    if (!user || !user.token) {
      Alert.alert('Error', 'You must be logged in to claim daily rewards');
      return;
    }

    try {
      const response = await apiRequest(API_ENDPOINTS.COINS.CLAIM_DAILY, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });

      if (response.success) {
        setCoins(response.totalCoins);
        setLoginStreak(response.newStreak);
        Alert.alert('Daily Bonus!', response.message);
      } else {
        Alert.alert('Error', response.message || 'Failed to claim daily reward');
      }
    } catch (error) {
      if (error.message && error.message.includes('already claimed')) {
        Alert.alert('Already Claimed', 'You have already claimed your daily reward today. Come back tomorrow!');
      } else {
        console.error('Error claiming daily bonus:', error);
        Alert.alert('Error', error.message || 'Failed to claim daily reward');
      }
    }
  };

  // ... rest of app logic

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="auto" />
      
      {currentScreen === 'landing' && (
        <LandingScreen onNavigate={handleNavigate} />
      )}
      
      {currentScreen === 'dashboard' && (
        <DashboardScreen
          user={user}
          coins={coins}
          loginStreak={loginStreak}
          onClaimBonus={handleClaimDailyBonus}
          onConvertCoins={handleConvertCoinsToCredits}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        />
      )}
      
      {/* ... other screens */}
    </View>
  );
}
```

### src/config/api.js
```javascript
const getApiBaseUrl = () => {
  // PRODUCTION: Railway backend URL
  const railwayBackendUrl = 'https://verdictpath.up.railway.app';
  return railwayBackendUrl;
};

export const API_BASE_URL = getApiBaseUrl();
export const API_URL = `${API_BASE_URL}/api`;

export const API_ENDPOINTS = {
  AUTH: {
    REGISTER_CLIENT: '/api/auth/register/client',
    REGISTER_LAWFIRM: '/api/auth/register/lawfirm',
    REGISTER_MEDICALPROVIDER: '/api/auth/register/medicalprovider',
    LOGIN: '/api/auth/login'
  },
  COINS: {
    CONVERT: '/api/coins/convert',
    BALANCE: '/api/coins/balance',
    CONVERSION_HISTORY: '/api/coins/conversion-history',
    CLAIM_DAILY: '/api/coins/claim-daily'
  },
  LITIGATION: {
    PROGRESS: '/api/litigation/progress',
    COMPLETE_SUBSTAGE: '/api/litigation/substage/complete',
    REVERT_SUBSTAGE: '/api/litigation/substage/revert',
    COMPLETE_STAGE: '/api/litigation/stage/complete',
    REVERT_STAGE: '/api/litigation/stage/revert'
  },
  // ... other endpoints
};

export const apiRequest = async (endpoint, options = {}) => {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log('API Request:', url, options.method || 'GET');
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    const data = await response.json();
    console.log('API Response:', response.status, data);

    if (!response.ok) {
      const errorMessage = data.message || data.error || 'API request failed';
      throw new Error(errorMessage);
    }

    return data;
  } catch (error) {
    console.error('API Error:', error.message || error);
    throw error;
  }
};
```

---

## Database Schema (PostgreSQL)

### Key Tables

**users table:**
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  user_type VARCHAR(50) NOT NULL, -- 'client', 'lawfirm', 'medicalprovider'
  subscription VARCHAR(50) DEFAULT 'Free',
  total_coins INTEGER DEFAULT 0,
  coins_spent INTEGER DEFAULT 0,
  login_streak INTEGER DEFAULT 0,
  last_daily_claim_at TIMESTAMP, -- SECURITY: Prevents daily reward farming
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**litigation_progress table:**
```sql
CREATE TABLE litigation_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  stage_id INTEGER NOT NULL,
  substage_id INTEGER,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**coin_conversions table:**
```sql
CREATE TABLE coin_conversions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  coins_converted INTEGER NOT NULL,
  credit_amount DECIMAL(10, 2) NOT NULL,
  conversion_rate INTEGER NOT NULL,
  converted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);
```

**audit_logs table (HIPAA compliance):**
```sql
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  actor_id INTEGER,
  actor_type VARCHAR(50),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id INTEGER,
  ip_address VARCHAR(45),
  user_agent TEXT,
  metadata JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Key Features

### Security Features
1. **JWT Authentication** - Token-based auth for all API requests
2. **Daily Reward Security** - `last_daily_claim_at` timestamp prevents farming
3. **HIPAA Compliance** - AES-256-GCM encryption, audit logging, RBAC
4. **Server-side Validation** - All coin awards validated on backend
5. **Atomic Transactions** - PostgreSQL transactions prevent race conditions

### Gamification System
- **Daily Bonuses**: 5-30 coins based on login streak (1-7+ days)
- **Litigation Milestones**: Coins awarded for completing stages/substages
- **Invite Rewards**: Users earn coins when referrals sign up
- **Coin Conversion**: 5,000 coins = $1 credit (lifetime cap: $5)
- **Streak System**: Consecutive daily logins increase bonus rewards

### User Types
1. **Individual Users** - Track personal litigation journey
2. **Law Firms** - Manage clients, view case progress
3. **Medical Providers** - Manage patients, HIPAA-compliant documents

---

## Current Issue Being Fixed

**Problem**: Users can claim daily rewards infinitely (coin farming vulnerability)

**Root Cause**: Railway backend is running old code without the security fix

**Database Status**: ✅ Column `last_daily_claim_at` exists in Railway database

**Code Status**: ✅ Security code exists in GitHub repository

**Deployment Status**: ❌ Railway needs to pull latest code from GitHub

**Solution in Progress**: Reconnecting Railway to GitHub to force deployment of latest code

---

## Environment Variables (Railway)
```
DATABASE_URL=postgresql://postgres:***@centerbeam.proxy.rlwy.net:14459/railway
ENCRYPTION_KEY=*** (AES-256-GCM for PHI encryption)
NODE_ENV=production
```

---

## NPM Scripts
```json
{
  "start": "expo start",
  "android": "expo start --android",
  "ios": "expo start --ios",
  "web": "expo start --web"
}
```

---

This is the complete codebase overview. You can copy this entire document and share it with Claude AI for questions about your app.
