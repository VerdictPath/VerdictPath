# 🌍 Multi-Environment Deployment Guide

## Overview
Verdict Path is designed to run seamlessly across multiple environments:
- **Local Development** (Replit workspace)
- **Railway Production** (Backend API deployment)
- **Expo Build** (Mobile app distribution)

---

## 🔧 Environment Configuration

### **Backend API (Node.js/Express)**

The backend automatically adapts to its environment:

```javascript
// backend/server.js (already configured)
const PORT = process.env.PORT || 5000;
const BASE_URL = process.env.RAILWAY_PUBLIC_DOMAIN 
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  : `http://localhost:${PORT}`;
```

**Environment Detection:**
- ✅ Railway: Automatically uses `RAILWAY_PUBLIC_DOMAIN` and `PORT`
- ✅ Replit: Uses port 5000 with localhost
- ✅ CORS: Configured for Railway domains, Replit domains, and mobile apps

---

### **Frontend API Configuration (React Native/Expo)**

The mobile app frontend uses environment-aware URL selection:

```javascript
// src/config/api.js (updated with priority cascade)
const getApiBaseUrl = () => {
  // Priority 1: Explicit override (for testing/staging)
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL;
  }
  
  // Priority 2: Production environment (Railway backend)
  if (process.env.NODE_ENV === 'production') {
    return 'https://verdictpath.up.railway.app';
  }
  
  // Priority 3: Local development (Replit)
  return 'http://localhost:5000';
};
```

---

## 📱 Environment Setup by Scenario

### **Scenario 1: Local Development on Replit**

**Current Configuration** ✅
- Backend runs on port 5000 (workflow)
- Frontend uses `http://localhost:5000` by default
- No environment variables needed

**How it works:**
1. Backend API workflow serves on port 5000
2. Expo Mobile App workflow serves frontend
3. API calls go to `localhost:5000`

---

### **Scenario 2: Railway Backend + Expo Development**

**When to use:** Testing mobile app against production backend

**Setup:**
1. Deploy backend to Railway (see `RAILWAY_DEPLOYMENT_GUIDE.md`)
2. Get your Railway URL: `https://your-app.up.railway.app`
3. Set environment variable in Expo:

```bash
# Create .env file in project root
EXPO_PUBLIC_API_BASE_URL=https://your-app.up.railway.app
```

4. Restart Expo with cleared cache:
```bash
npx expo start --clear
```

---

### **Scenario 3: Full Production (Railway Backend + Expo Build)**

**When to use:** App Store/Play Store distribution

**Setup:**

1. **Deploy Backend to Railway:**
   - Follow `RAILWAY_DEPLOYMENT_GUIDE.md`
   - Set environment variables:
     ```
     NODE_ENV=production
     DATABASE_URL=${{Postgres.DATABASE_URL}}
     ENCRYPTION_KEY=<your-32-char-key>
     JWT_SECRET=<your-jwt-secret>
     ```
   - Note your Railway URL

2. **Configure Expo Build:**
   ```bash
   # No .env file needed - NODE_ENV=production triggers Railway URL
   # Or explicitly set:
   EXPO_PUBLIC_API_BASE_URL=https://verdictpath.up.railway.app
   
   # Build for production
   eas build --platform ios --profile production
   eas build --platform android --profile production
   ```

---

## 🔄 Switching Between Environments

### **From Local → Railway Backend:**
```bash
# Option 1: Set environment variable
echo "EXPO_PUBLIC_API_BASE_URL=https://your-app.up.railway.app" > .env

# Option 2: Set in eas.json build profiles
{
  "build": {
    "development": {
      "env": {
        "EXPO_PUBLIC_API_BASE_URL": "http://localhost:5000"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_API_BASE_URL": "https://verdictpath.up.railway.app"
      }
    }
  }
}

# Restart Expo
npx expo start --clear
```

### **From Railway → Local Backend:**
```bash
# Remove environment variable override
rm .env  # or delete EXPO_PUBLIC_API_BASE_URL line

# Restart Expo
npx expo start --clear
```

---

## ✅ Deployment Integrity Checklist

### **Backend (Railway)**
- [x] `railway.toml` configured with correct start command
- [x] `railway.json` has proper build configuration
- [x] `nixpacks.toml` sets Node.js version
- [x] Server listens on `0.0.0.0` (Railway requirement)
- [x] CORS allows Railway domains and mobile apps
- [x] Database connection pooling optimized for Railway
- [x] Environment variables properly configured

### **Frontend (Expo)**
- [x] API configuration uses environment-aware URL selection
- [x] Fallback to localhost for local development
- [x] Production mode automatically uses Railway URL
- [x] Environment variable override available for testing
- [x] Cache clearing documented for URL changes

### **Database**
- [x] PostgreSQL on Railway with automatic `DATABASE_URL`
- [x] Connection pooling configured
- [x] Migrations use `npm run db:push` (no manual SQL)
- [x] HIPAA-compliant encryption keys in environment variables

---

## 🚨 Common Issues & Solutions

### **Issue: Mobile app still connecting to old URL**

**Solution:**
```bash
# Clear Expo cache
npx expo start --clear

# Or remove node_modules cache
rm -rf .expo node_modules/.cache
npx expo start
```

### **Issue: CORS errors in production**

**Solution:** Backend already configured to allow Railway domains
```javascript
// backend/server.js - already configured
allowedOrigins = [
  /\.railway\.app$/,
  /\.replit\.dev$/,
  /\.repl\.co$/
]
```

### **Issue: Environment variable not working**

**Solution:**
1. Expo only reads `EXPO_PUBLIC_*` prefixed variables
2. Create `.env` file in project root (not `/backend`)
3. Restart Expo with `--clear` flag

---

## 📊 Environment Variables Reference

| Variable | Local Dev | Railway | Expo Build |
|----------|-----------|---------|------------|
| `NODE_ENV` | development | production | production |
| `PORT` | 5000 | auto (Railway) | N/A |
| `DATABASE_URL` | local DB | Railway Postgres | N/A |
| `RAILWAY_PUBLIC_DOMAIN` | - | auto-set | N/A |
| `EXPO_PUBLIC_API_BASE_URL` | optional | optional | set in eas.json |
| `ENCRYPTION_KEY` | set in Replit | set in Railway | N/A |
| `JWT_SECRET` | set in Replit | set in Railway | N/A |

---

## 🎯 Quick Commands

```bash
# Local Development (current setup)
# Backend: Runs automatically via "Backend API" workflow
# Frontend: Runs automatically via "Expo Mobile App" workflow
# No commands needed!

# Deploy Backend to Railway
git push  # Railway auto-deploys on push

# Test against Railway backend
echo "EXPO_PUBLIC_API_BASE_URL=https://your-app.up.railway.app" > .env
npx expo start --clear

# Build production app
EXPO_PUBLIC_API_BASE_URL=https://verdictpath.up.railway.app eas build --platform all

# Reset to local development
rm .env
npx expo start --clear
```

---

## ✨ Summary

Your current setup is **deployment-ready** with:
- ✅ Automatic environment detection
- ✅ Zero-config local development
- ✅ Seamless Railway deployment
- ✅ Flexible environment override capability
- ✅ No code changes required when switching environments

The API configuration uses a **priority cascade** that ensures the right backend URL is used in every scenario without manual intervention!
