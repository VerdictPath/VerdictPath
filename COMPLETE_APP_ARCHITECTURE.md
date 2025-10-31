# Verdict Path - Complete Application Architecture

## 📱 Application Overview

**Verdict Path** is a HIPAA-compliant React Native mobile application for civil litigation case management with three distinct user portals: Individual Users, Law Firms, and Medical Providers.

**Tech Stack:**
- Frontend: React Native (Expo SDK 52)
- Backend: Node.js/Express
- Database: PostgreSQL (Neon)
- Payment: Stripe
- Deployment: Railway (backend), Replit (development)

---

## 🏗️ Project Structure

```
verdict-path/
├── src/                          # Frontend React Native code
│   ├── screens/                  # 29 total screens
│   │   ├── OnboardingScreen.js         # 6-slide pirate-themed onboarding
│   │   ├── LandingScreen.js            # Initial landing page
│   │   ├── LoginScreen.js              # Universal login (3 user types)
│   │   ├── RegisterScreen.js           # Universal registration
│   │   ├── SubscriptionSelectionScreen.js  # Tier selection
│   │   │
│   │   ├── DashboardScreen.js          # Individual user dashboard
│   │   ├── RoadmapScreen.js            # 9-stage litigation map
│   │   ├── VideosScreen.js             # Educational video library
│   │   ├── MedicalHubScreen.js         # Document storage (disabled)
│   │   ├── HIPAAFormsScreen.js         # Consent forms
│   │   │
│   │   ├── LawFirmDashboardScreen.js   # Law firm portal
│   │   ├── LawFirmClientDetailsScreen.js  # Client management
│   │   ├── LawFirmSendNotificationScreen.js  # Push notifications
│   │   ├── LawFirmNotificationAnalyticsScreen.js  # Analytics
│   │   ├── LawFirmEventRequestsScreen.js  # Calendar event requests
│   │   ├── LawFirmSubscriptionScreen.js   # Subscription management
│   │   │
│   │   ├── MedicalProviderDashboardScreen.js  # Medical provider portal
│   │   ├── MedicalProviderPatientDetailsScreen.js  # Patient management
│   │   ├── MedicalProviderSendNotificationScreen.js  # Push notifications
│   │   ├── MedicalProviderEventRequestsScreen.js  # Calendar event requests
│   │   ├── MedicalProviderSubscriptionScreen.js  # Subscription management
│   │   │
│   │   ├── NotificationInboxScreen.js  # Notification center
│   │   ├── NotificationDetailScreen.js # Notification details
│   │   ├── NotificationSettingsScreen.js  # Preferences & quiet hours
│   │   │
│   │   ├── ActionDashboardScreen.js    # Attorney-assigned tasks
│   │   ├── CalendarScreen.js           # Device calendar integration
│   │   ├── ClientEventRequestsScreen.js  # Event request responses
│   │   │
│   │   ├── AchievementsScreen.js       # 16 achievements
│   │   ├── BadgeCollectionScreen.js    # 8 pirate badges
│   │   │
│   │   └── PaymentScreen.js            # Stripe payment processing
│   │
│   ├── components/               # Reusable components
│   │   ├── BottomNavigation.js   # 5-tab sticky navigation
│   │   ├── PayButton.js          # Stripe payment button
│   │   ├── InviteModal.js        # Referral system modal
│   │   └── ConnectionModal.js    # Connection management
│   │
│   ├── config/
│   │   └── api.js                # Environment-aware API configuration
│   │
│   ├── contexts/
│   │   └── NotificationContext.js  # Push notification provider
│   │
│   ├── services/
│   │   └── NotificationService.js  # Expo push notification handling
│   │
│   ├── styles/
│   │   ├── commonStyles.js       # Shared styles
│   │   └── theme.js              # Pirate theme colors
│   │
│   ├── constants/
│   │   └── mockData.js           # Stage/substage definitions
│   │
│   └── utils/
│       └── gamification.js       # Coin/badge calculations
│
├── backend/                      # Node.js/Express backend
│   ├── server.js                 # Main server file
│   │
│   ├── routes/                   # API routes (12 files)
│   │   ├── auth.js               # Authentication & registration
│   │   ├── lawfirm.js            # Law firm operations
│   │   ├── medicalprovider.js    # Medical provider operations
│   │   ├── consent.js            # HIPAA consent management
│   │   ├── coins.js              # Gamification coin system
│   │   ├── uploads.js            # HIPAA-compliant file uploads
│   │   ├── forms.js              # HIPAA forms
│   │   ├── litigation.js         # Case progress tracking
│   │   ├── invites.js            # Referral system
│   │   ├── connections.js        # User connections
│   │   ├── subscription.js       # Subscription management
│   │   ├── notifications.js      # Push notifications
│   │   ├── tasks.js              # Attorney-assigned tasks
│   │   ├── calendar.js           # Calendar integration
│   │   ├── gamification.js       # Achievements & badges
│   │   ├── eventRequests.js      # Calendar event requests
│   │   ├── payment.js            # Stripe payment processing
│   │   └── diagnostic.js         # System diagnostics
│   │
│   ├── middleware/
│   │   └── auth.js               # JWT authentication
│   │
│   ├── config/
│   │   └── db.js                 # PostgreSQL connection pool
│   │
│   ├── views/                    # EJS templates (web portals)
│   │   ├── lawfirm-login.ejs
│   │   └── medicalprovider-login.ejs
│   │
│   └── package.json              # Backend dependencies
│
├── App.js                        # Main app entry point
├── app.json                      # Expo configuration
├── package.json                  # Root dependencies
├── railway.toml                  # Railway deployment config
└── replit.md                     # Project documentation

```

---

## 🎯 Core Features

### **1. User Authentication (3 User Types)**

**Individual Users:**
- Email/password registration
- Subscription tiers: Free, Basic, Premium
- JWT token authentication
- Invite code system

**Law Firms:**
- Firm name + email registration
- Subscription tiers: Free, Basic ($49/mo), Premium ($149/mo)
- Multi-seat support (firm size: small/medium/large)
- Unique firm codes for client connections

**Medical Providers:**
- Provider name + email registration
- Same subscription tiers as law firms
- Patient management portal

**Code Location:** `backend/routes/auth.js`, `src/screens/LoginScreen.js`, `src/screens/RegisterScreen.js`

---

### **2. Interactive Litigation Roadmap**

**9 Stages, 60 Substages:**
```javascript
1. Initial Consultation → 5 substages
2. Case Investigation → 8 substages
3. Demand Letter → 6 substages
4. Pre-litigation → 7 substages
5. Filing Lawsuit → 8 substages
6. Discovery → 10 substages
7. Pre-trial → 7 substages
8. Trial → 5 substages
9. Post-trial → 4 substages
```

**Features:**
- Pirate treasure map UI theme
- Progress tracking (percentage completion)
- Audio descriptions for each substage
- Modal pop-ups with detailed information
- Law firm can update client progress remotely
- Coin rewards for completion (25,000 max)

**Code Location:** `src/screens/RoadmapScreen.js`, `backend/routes/litigation.js`

---

### **3. Push Notification System**

**22 Notification Templates:**
- 6 System notifications
- 10 Law firm templates (case updates, deadlines, document requests)
- 6 Medical provider templates (appointment reminders, treatment updates)

**Features:**
- Expo push notifications
- Deep linking (verdictpath://)
- Multi-recipient selection
- Analytics tracking (sent, delivered, clicked)
- Device registration/unregistration
- Real-time badge counts
- Foreground/background handling
- Automatic cleanup on logout

**Notification Preferences:**
- Toggle for urgent, task, system, marketing notifications
- Quiet hours (user-defined time window)
- Timezone-aware enforcement
- Urgent notifications can bypass quiet hours

**Code Location:** `backend/routes/notifications.js`, `src/services/NotificationService.js`, `src/contexts/NotificationContext.js`

---

### **4. Attorney-Assigned Task System**

**Features:**
- Law firms create tasks for clients
- Priority levels (Low, Medium, High)
- Due dates
- Coin rewards on completion
- Status tracking (Pending, In Progress, Completed)
- Task templates

**Code Location:** `backend/routes/tasks.js`, `src/screens/ActionDashboardScreen.js`

---

### **5. Calendar Integration**

**Device Calendar Sync:**
- Full Expo Calendar API integration
- Event types: Court dates, appointments, depositions, deadlines, reminders
- Bi-directional sync
- Event sharing between law firms/providers and clients
- Sync status tracking

**Event Request Workflow:**
- Law firms request events from clients (depositions, mediations, consultations)
- Medical providers request treatment dates
- Clients select 3 available dates/times
- Provider confirms one date
- Event automatically added to both calendars

**Code Location:** `backend/routes/calendar.js`, `backend/routes/eventRequests.js`, `src/screens/CalendarScreen.js`

---

### **6. Gamification System**

**16 Achievements (4 Categories):**
- Progress: First step, halfway, case complete
- Consistency: Daily login streak, weekly engagement
- Engagement: Video watcher, document uploader
- Milestones: Connection made, coins earned

**8 Pirate-Themed Badges:**
- Rarity system: Common, Rare, Epic, Legendary
- Unlock conditions based on achievements
- Badge collection display

**Coin System:**
- Earn coins for completing substages
- 25,000 coin cap
- Conversion to credits (future feature)
- Daily bonus for login streaks
- Task completion rewards

**Leaderboard:**
- Total coins earned
- Achievement count
- Login streak

**Code Location:** `backend/routes/gamification.js`, `src/screens/AchievementsScreen.js`, `src/screens/BadgeCollectionScreen.js`

---

### **7. Stripe Payment Integration**

**Payment Features:**
- One-time payments (payment intents)
- Subscription management
- Subscription cancellation
- Payment history
- Webhook support

**Stripe Configuration:**
- Frontend: `@stripe/stripe-react-native` SDK (v0.38.6)
- Backend: `stripe` npm package (v19.2.0)
- Environment-aware (TEST/LIVE modes)
- Graceful degradation (works without Stripe keys)

**Payment Flow:**
```
1. User navigates to PaymentScreen
2. Enters card details (CardField component)
3. App creates payment intent on backend
4. Stripe confirms payment
5. Success/error handling
6. User redirected back
```

**Test Cards:**
- Success: 4242 4242 4242 4242
- Decline: 4000 0000 0000 0002

**Code Location:** `backend/routes/payment.js`, `src/screens/PaymentScreen.js`, `src/components/PayButton.js`

---

### **8. Connection Management**

**Individual Users:**
- Connect to ONE law firm (via firm code)
- Connect to MULTIPLE medical providers
- View all connections
- Disconnect functionality

**Law Firms:**
- View all connected clients
- Client search (real-time)
- Client details (roadmap, documents, billing)
- Update client litigation progress

**Medical Providers:**
- View all connected patients
- Patient search (real-time)
- Patient details (medical records, billing)

**Code Location:** `backend/routes/connections.js`, `src/components/ConnectionModal.js`

---

### **9. HIPAA Compliance**

**Security Features:**
- AES-256-GCM encryption for medical documents
- Role-Based Access Control (RBAC)
- Patient consent management
- Audit logging
- Secure file storage
- HTTPS/SSL enforcement
- JWT token authentication

**Document Upload Status:**
- Currently DISABLED system-wide
- "Coming Soon" messages displayed
- Backend routes exist but return placeholders

**Code Location:** `backend/routes/uploads.js`, `backend/routes/consent.js`, `src/screens/MedicalHubScreen.js`

---

## 🔌 Backend API Endpoints

### **Authentication**
```
POST /api/auth/register/client
POST /api/auth/register/lawfirm
POST /api/auth/register/medicalprovider
POST /api/auth/login
```

### **Law Firm**
```
GET  /api/lawfirm/dashboard
GET  /api/lawfirm/clients
GET  /api/lawfirm/client/:clientId
POST /api/lawfirm/litigation-stage
GET  /api/lawfirm/documents/all
```

### **Medical Provider**
```
GET  /api/medicalprovider/dashboard
GET  /api/medicalprovider/patients
GET  /api/medicalprovider/patient/:patientId
```

### **Coins & Gamification**
```
POST /api/coins/convert
GET  /api/coins/balance
GET  /api/coins/conversion-history
POST /api/coins/claim-daily
GET  /api/gamification/achievements
GET  /api/gamification/badges
POST /api/gamification/unlock-achievement
GET  /api/gamification/leaderboard
GET  /api/gamification/user-stats
```

### **Invites & Referrals**
```
GET  /api/invites/my-code
GET  /api/invites/stats
GET  /api/invites/validate/:code
POST /api/invites/process
```

### **Connections**
```
GET  /api/connections/my-connections
POST /api/connections/update-lawfirm
POST /api/connections/disconnect-lawfirm
POST /api/connections/add-medical-provider
POST /api/connections/remove-medical-provider
```

### **Litigation Progress**
```
GET  /api/litigation/progress
POST /api/litigation/substage/complete
POST /api/litigation/substage/revert
POST /api/litigation/stage/complete
POST /api/litigation/stage/revert
POST /api/litigation/video/progress
```

### **Notifications**
```
POST /api/notifications/register-device
POST /api/notifications/unregister-device
GET  /api/notifications/my-notifications
GET  /api/notifications/unread-count
PUT  /api/notifications/:id/read
PUT  /api/notifications/:id/clicked
POST /api/notifications/send-to-clients
POST /api/notifications/send-to-patients
GET  /api/notifications/preferences
PUT  /api/notifications/preferences
```

### **Tasks**
```
GET  /api/tasks/my-tasks
POST /api/tasks/create
PUT  /api/tasks/:taskId/status
GET  /api/tasks/client/:clientId
DELETE /api/tasks/:taskId
GET  /api/tasks/templates
```

### **Calendar**
```
GET  /api/calendar/events
POST /api/calendar/events
PUT  /api/calendar/events/:id
DELETE /api/calendar/events/:id
POST /api/calendar/sync/:eventId
```

### **Event Requests**
```
POST /api/event-requests/create
GET  /api/event-requests/lawfirm
GET  /api/event-requests/medicalprovider
GET  /api/event-requests/client
POST /api/event-requests/:id/submit-dates
POST /api/event-requests/:id/confirm
POST /api/event-requests/:id/cancel
```

### **Payment (Stripe)**
```
POST /api/payment/create-payment-intent
POST /api/payment/create-subscription
POST /api/payment/cancel-subscription
GET  /api/payment/subscription-status
POST /api/payment/webhook
```

### **Subscription Management**
```
GET  /api/subscription/lawfirm/current
POST /api/subscription/lawfirm/update
GET  /api/subscription/medicalprovider/current
POST /api/subscription/medicalprovider/update
```

### **Health Check**
```
GET  /health
```

---

## 🗄️ Database Schema (PostgreSQL)

### **users**
```sql
id (serial PRIMARY KEY)
email (varchar UNIQUE)
password_hash (varchar)
user_type (varchar) -- 'individual', 'law_firm', 'medical_provider'
first_name (varchar)
last_name (varchar)
firm_name (varchar)
provider_name (varchar)
subscription_tier (varchar) -- 'Free', 'Basic', 'Premium'
firm_size (varchar)
coins (integer DEFAULT 0)
login_streak (integer DEFAULT 0)
last_login_date (date)
stripe_customer_id (varchar)
stripe_subscription_id (varchar)
created_at (timestamp)
updated_at (timestamp)
```

### **litigation_progress**
```sql
id (serial PRIMARY KEY)
user_id (integer REFERENCES users)
stage_id (integer)
substage_id (varchar)
completed (boolean)
completed_at (timestamp)
```

### **connections**
```sql
id (serial PRIMARY KEY)
client_id (integer REFERENCES users)
law_firm_id (integer REFERENCES users)
connected_at (timestamp)
```

### **medical_provider_connections**
```sql
id (serial PRIMARY KEY)
client_id (integer REFERENCES users)
provider_id (integer REFERENCES users)
connected_at (timestamp)
```

### **notifications**
```sql
id (serial PRIMARY KEY)
recipient_id (integer REFERENCES users)
sender_id (integer REFERENCES users)
title (varchar)
body (text)
type (varchar)
data (jsonb)
read (boolean DEFAULT false)
clicked (boolean DEFAULT false)
sent_at (timestamp)
read_at (timestamp)
clicked_at (timestamp)
```

### **push_tokens**
```sql
id (serial PRIMARY KEY)
user_id (integer REFERENCES users)
expo_push_token (varchar)
device_type (varchar)
created_at (timestamp)
```

### **notification_preferences**
```sql
id (serial PRIMARY KEY)
user_id (integer REFERENCES users)
urgent_notifications (boolean DEFAULT true)
task_notifications (boolean DEFAULT true)
system_notifications (boolean DEFAULT true)
marketing_notifications (boolean DEFAULT true)
quiet_hours_start (time)
quiet_hours_end (time)
timezone (varchar)
```

### **tasks**
```sql
id (serial PRIMARY KEY)
law_firm_id (integer REFERENCES users)
client_id (integer REFERENCES users)
title (varchar)
description (text)
priority (varchar) -- 'Low', 'Medium', 'High'
status (varchar) -- 'Pending', 'In Progress', 'Completed'
due_date (timestamp)
coin_reward (integer)
created_at (timestamp)
completed_at (timestamp)
```

### **calendar_events**
```sql
id (serial PRIMARY KEY)
user_id (integer REFERENCES users)
title (varchar)
description (text)
event_type (varchar)
start_time (timestamp)
end_time (timestamp)
location (varchar)
synced_to_device (boolean DEFAULT false)
device_event_id (varchar)
last_synced_at (timestamp)
created_by_id (integer REFERENCES users)
shared_with_ids (integer[])
```

### **event_requests**
```sql
id (serial PRIMARY KEY)
requester_id (integer REFERENCES users)
recipient_id (integer REFERENCES users)
event_type (varchar)
description (text)
status (varchar) -- 'pending', 'dates_submitted', 'confirmed', 'cancelled'
proposed_dates (jsonb)
confirmed_date (timestamp)
created_at (timestamp)
```

### **achievements**
```sql
id (serial PRIMARY KEY)
name (varchar)
description (text)
category (varchar) -- 'progress', 'consistency', 'engagement', 'milestones'
badge_id (integer REFERENCES badges)
coin_reward (integer)
requirement (jsonb)
```

### **user_achievements**
```sql
id (serial PRIMARY KEY)
user_id (integer REFERENCES users)
achievement_id (integer REFERENCES achievements)
progress (integer)
unlocked (boolean DEFAULT false)
unlocked_at (timestamp)
```

### **badges**
```sql
id (serial PRIMARY KEY)
name (varchar)
description (text)
icon (varchar)
rarity (varchar) -- 'common', 'rare', 'epic', 'legendary'
```

### **invite_codes**
```sql
id (serial PRIMARY KEY)
user_id (integer REFERENCES users)
code (varchar UNIQUE)
uses (integer DEFAULT 0)
max_uses (integer)
created_at (timestamp)
```

### **firm_codes**
```sql
id (serial PRIMARY KEY)
law_firm_id (integer REFERENCES users)
code (varchar UNIQUE)
created_at (timestamp)
```

---

## 🌍 Environment Configuration

### **Frontend (Expo)**
```bash
EXPO_PUBLIC_API_BASE_URL         # Optional: explicit API override
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY  # Stripe publishable key (pk_test_ or pk_live_)
```

### **Backend (Node.js)**
```bash
DATABASE_URL                     # PostgreSQL connection string
JWT_SECRET                       # Secret for JWT tokens
STRIPE_SECRET_KEY                # Stripe secret key (sk_test_ or sk_live_)
NODE_ENV                         # 'development' or 'production'
PORT                             # Server port (default: 5000)
RAILWAY_PUBLIC_DOMAIN            # Auto-set by Railway
```

---

## 🚀 Deployment

### **Development (Replit)**
```bash
# Start backend
cd backend && node server.js

# Start Expo
npx expo start --lan --clear
```

### **Production (Railway)**
```bash
# Push to Railway
git push railway main

# Environment variables required:
# - DATABASE_URL (auto-configured by Railway)
# - JWT_SECRET
# - STRIPE_SECRET_KEY (optional, graceful degradation)
```

### **Multi-Environment API Configuration**

**Frontend auto-detects environment:**
1. EXPO_PUBLIC_API_BASE_URL → Explicit override
2. NODE_ENV=production → Railway URL
3. Platform iOS/Android → Replit public URL
4. Web browser → localhost:5000

**No code changes needed between environments!**

---

## 📚 Documentation Files

- `replit.md` - Project memory & architecture
- `STRIPE_INTEGRATION_GUIDE.md` - Backend Stripe API docs
- `STRIPE_PAYMENT_USAGE_GUIDE.md` - Frontend payment guide
- `RAILWAY_STRIPE_DEPLOYMENT.md` - Railway deployment guide
- `RAILWAY_DEPLOYMENT_GUIDE.md` - General Railway deployment
- `DEPLOYMENT_ENVIRONMENT_GUIDE.md` - Multi-environment setup
- `COMPLETE_APP_ARCHITECTURE.md` - This file

---

## ✅ Current Status (October 31, 2025)

**Phase 2 Complete:**
- ✅ Push Notifications (22 templates, deep linking, analytics)
- ✅ Notification Preferences & Quiet Hours
- ✅ Attorney-Assigned Task System
- ✅ Calendar Integration (device sync, event sharing)
- ✅ Calendar Event Requests (full workflow)
- ✅ Enhanced Gamification (16 achievements, 8 badges, leaderboard)
- ✅ Stripe Payment Integration (graceful degradation, Railway-ready)

**Key Metrics:**
- 29 screens
- 12 backend route files
- 60+ API endpoints
- 20+ database tables
- 3 user types
- 9 litigation stages
- 60 substages
- 22 notification templates
- 16 achievements
- 8 badges

**Production Ready:**
- ✅ HIPAA-compliant security
- ✅ Railway deployment configured
- ✅ Multi-environment support
- ✅ Graceful error handling
- ✅ Real-time notifications
- ✅ Payment processing
- ✅ Comprehensive documentation

---

## 🎯 Key Design Patterns

**Pirate Treasure Map Theme:**
- Tan/beige color palette (#F5E6D3, #D3C5A5)
- Brown accent colors (#8B4513, #3E2723)
- Compass/ship wheel iconography
- Progress bars styled as treasure maps
- Badge system uses pirate imagery

**Security:**
- JWT authentication on all protected routes
- Password hashing with bcryptjs
- Role-based access control
- HIPAA-compliant encryption
- Audit logging

**User Experience:**
- Sticky 5-tab bottom navigation (individual users)
- Real-time search (client/patient lookup)
- Pull-to-refresh on data screens
- Loading states on all async operations
- Success/error alerts with user-friendly messages
- Deep linking for notifications

---

This is the complete technical architecture of Verdict Path. Every feature, screen, API endpoint, and database table is documented here.
