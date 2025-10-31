# Verdict Path - Project Summary for Claude AI

## Project Overview
Verdict Path is a HIPAA-compliant React Native mobile application built with Expo SDK 52 for civil litigation case management and education. It serves three user types: Individual Users, Law Firms, and Medical Providers.

## Current Technical Stack

### Frontend
- **Framework**: React Native 0.76.9 with Expo SDK 52
- **Navigation**: Expo Router (file-based routing)
- **State Management**: React Hooks + Context API
- **UI Theme**: Pirate treasure map aesthetic with tan/beige color palette
- **Key Dependencies**:
  - expo-notifications (push notifications)
  - expo-calendar (calendar integration)
  - @react-native-async-storage/async-storage (local storage)
  - react-native-svg (graphics)
  - expo-image-picker, expo-document-picker (file handling)

### Backend
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL (Neon-hosted via Replit/Railway)
- **ORM**: Drizzle ORM
- **Authentication**: JWT tokens + bcrypt password hashing
- **Security**: HIPAA-compliant with AES-256-GCM encryption, RBAC, audit logging
- **Deployment**: Railway-ready with Replit development environment

### Database Schema Location
- **Schema Definition**: `shared/schema.ts` (Drizzle models)
- **Migration Command**: `npm run db:push` or `npm run db:push --force`

## Project Structure

```
workspace/
├── app/                          # Expo Router screens (file-based routing)
│   ├── (tabs)/                   # Bottom tab navigation
│   ├── auth/                     # Login/signup screens
│   ├── lawfirm/                  # Law firm portal screens
│   ├── medicalprovider/          # Medical provider portal screens
│   └── index.js                  # Root screen
├── src/
│   ├── components/               # Reusable React components
│   ├── config/
│   │   └── api.js               # Environment-aware API configuration
│   ├── contexts/                # React Context providers
│   └── services/                # API service layer
├── backend/
│   ├── server.js                # Express server entry point
│   ├── routes/                  # API route handlers
│   ├── controllers/             # Business logic controllers
│   ├── middleware/              # Auth, RBAC, encryption middleware
│   └── utils/                   # Helper functions
├── shared/
│   └── schema.ts                # Drizzle database schema (SINGLE SOURCE OF TRUTH)
├── assets/                      # Images, fonts, icons
├── package.json                 # Dependencies
└── replit.md                    # Project documentation and preferences

```

## Key Features Implemented

### Phase 1 (Complete)
- User authentication (3 user types with subscription tiers)
- Interactive 9-stage litigation roadmap with 60 substages
- Gamification system (coins, achievements, badges, leaderboard)
- Video library integration
- Connection management (individual ↔ law firm ↔ medical provider)
- Subscription management (Free/Basic/Premium)
- Invite/referral system

### Phase 2 (Complete - October 2025)
- **Push Notifications**: Full Expo push notification system with 22 templates
- **Attorney-Assigned Tasks**: Task creation with priorities, due dates, coin rewards
- **Notification Preferences**: User preferences with quiet hours (timezone-aware)
- **Calendar Integration**: Full device calendar sync with event sharing
- **Enhanced Gamification**: 16 achievements, 8 badges with rarity system
- **Calendar Event Requests**: Law firms/medical providers request events from clients/patients

## Environment Configuration

### API Configuration (src/config/api.js)
4-tier priority system:
1. **Explicit Override**: `EXPO_PUBLIC_API_BASE_URL` environment variable
2. **Production**: Auto-detects `!__DEV__` → `https://verdictpath.up.railway.app`
3. **Physical Device**: Detects iOS/Android → Uses Replit public URL
4. **Web Browser**: Defaults to `http://localhost:5000`

### Backend URL Detection (backend/server.js)
- Railway: Uses `RAILWAY_PUBLIC_DOMAIN` or `RAILWAY_STATIC_URL`
- Replit: Uses public domain from environment
- Local: Falls back to `http://localhost:5000`

## Current Development Issue

### Problem: Physical Device Testing
- **Replit Limitation**: Only port 5000 is publicly exposed
- **Expo Metro Bundler**: Runs on port 8081 (not publicly accessible)
- **Internal IP**: `172.31.100.226:8081` cannot be reached from external networks
- **LocalTunnel**: Installed but shows warning page that blocks Expo Go

### Attempted Solutions
1. ✅ Tunnel mode with @expo/ngrok (asks for Expo login)
2. ✅ LocalTunnel on port 8081 (works for web, not Expo Go)
3. ✅ LAN mode (requires same network)
4. ✅ Backend on port 5000 (publicly accessible and working)

### Working Solutions
- **Web Version**: `https://verdictpath.loca.lt` (accessible in mobile browser)
- **Backend API**: Publicly accessible via Replit URL
- **Railway Deployment**: Configured and ready for production

## Test Credentials

```javascript
// Law Firm
Email: lawfirm@test.com
Password: LawFirm123!

// Individual Users
Email: sarah.johnson@test.com
Password: Client123!

Email: michael.chen@test.com
Password: Client123!

Email: emily.rodriguez@test.com
Password: Client123!

// Medical Provider
Email: medicalprovider@test.com
Password: Provider123!
```

## Important Files

### Configuration Files
- `package.json` - Dependencies and scripts
- `app.json` - Expo configuration
- `railway.toml`, `railway.json`, `nixpacks.toml` - Railway deployment config
- `replit.md` - Project documentation and user preferences

### Critical Code Files
- `src/config/api.js` - Environment-aware API URL configuration
- `backend/server.js` - Express server with CORS and environment detection
- `shared/schema.ts` - Database schema (use Drizzle ORM, never raw SQL)
- `backend/middleware/auth.js` - JWT authentication
- `backend/middleware/rbac.js` - Role-based access control

### Database Management
- **Never write manual migrations**
- **Always use**: `npm run db:push` or `npm run db:push --force`
- **Schema location**: `shared/schema.ts`
- **CRITICAL**: Never change existing ID column types (serial vs varchar)

## Workflows (Replit)

```bash
# Backend API (Port 5000 - Publicly Accessible)
cd backend && node server.js

# Expo Mobile App (Port 8081 - Internal Only)
cd /home/runner/workspace && npx expo start --lan --clear

# LocalTunnel (For Web Access)
npx localtunnel --port 8081 --subdomain verdictpath
```

## Known Issues & Constraints

1. **Upload Functionality**: Currently disabled system-wide with "Coming Soon" messages
2. **Port Exposure**: Only port 5000 is publicly accessible on Replit
3. **Physical Device Testing**: Requires alternative solutions (Railway, web version, or same network)
4. **Expo Go Limitations**: Cannot bypass LocalTunnel warning page

## Deployment Status

### Replit (Development)
- ✅ Backend running on port 5000
- ✅ Expo Metro Bundler on port 8081 (internal only)
- ✅ PostgreSQL database connected
- ✅ Environment variables configured

### Railway (Production-Ready)
- ✅ Configuration files in place
- ✅ Dynamic environment detection
- ✅ CORS configured for Railway domains
- ✅ Database connection pooling optimized
- ⏳ Needs deployment

## User Preferences (from replit.md)

- Autonomous AI agent that makes decisions independently
- Detailed explanations of code and logic
- Proceed with tasks without constant oversight
- Only seek clarification if absolutely necessary

## Next Steps / Recommendations

1. **For Physical Device Testing**: Deploy to Railway and use `eas build --profile development`
2. **Alternative**: Test web version at `https://verdictpath.loca.lt` in mobile browser
3. **Production**: Complete Railway deployment for full production environment
4. **Feature Development**: Re-enable upload functionality when ready

## Questions to Ask Claude AI

Suggested topics for assistance:
1. How to expose Expo Metro Bundler (port 8081) for external access on Replit
2. Alternative tunneling solutions that work with Expo Go
3. Best practices for multi-environment API configuration
4. Optimizing physical device testing workflow
5. Railway deployment checklist and verification

---

**Last Updated**: October 31, 2025
**Expo SDK Version**: 52
**React Native Version**: 0.76.9
**Node.js Version**: 20.x
**Database**: PostgreSQL (Neon via Replit/Railway)
