# Verdict Path - React Native Mobile App

## Overview
Verdict Path is a React Native mobile application designed as a legal case management and education platform for civil litigation. It offers an interactive case roadmap, gamification, educational content, and secure medical document storage. The platform aims to assist individuals, law firms, and medical providers in navigating legal processes, supported by tiered subscription models, to provide an engaging and informative tool to support justice. The business vision is to empower users with legal knowledge and streamline case management.

## User Preferences
I want to work with an AI agent that is autonomous and proactive. It should make decisions and implement changes without constant oversight. I prefer that the agent proceed with tasks independently, only seeking clarification if absolutely necessary. I also prefer detailed explanations of the code and the logic behind any changes made.

## System Architecture
The application is a React Native mobile app built with the Expo framework, featuring a "pirate treasure map" theme. The backend is a Node.js/Express server with a PostgreSQL database.

### Subscription Pricing Structure (November 2025)
Comprehensive tiered pricing for law firms, individuals, and medical providers:
- **Law Firms**: 8 tiers (Solo/Shingle to Enterprise) based on client count (1-24 to 750+ clients), with Standard and Premium plans for each tier. Pricing ranges from $45-$1,800/month with 10% annual savings. Premium plans unlock disbursements, medical hub, and advanced analytics.
- **Individual Users**: 3 tiers (Free, Basic at $9.99/mo, Premium at $19.99/mo) with 17% annual savings.
- **Medical Providers**: 4 tiers (Shingle Provider 1-49 patients, Boutique Provider 50-99 patients, Medium Provider 100-199 patients, Large Provider 200+ patients) with Basic and Premium plans. Pricing ranges from $15-$63/month with 10% annual savings. Premium plans unlock disbursement payments and negotiations with law firms. Calculator-based selection with real-time per-patient cost calculations.
- Calculator-based selection for law firms with real-time per-client cost calculations and tier comparisons.

### UI/UX Decisions
The design uses a "pirate treasure map" theme with a warm tan/beige color palette. Key elements include an interactive litigation roadmap displayed on an actual treasure map background image, a compass/ship wheel logo, pirate-themed badges for gamification, and tailored subscription selection screens. The Medical Hub features distinct upload sections and "Coming Soon" messages for all upload functionalities. Visual feedback, enhanced audio icons, and a 6-slide pirate-themed onboarding are implemented. Progress tracking includes an animated progress bar. A sticky 5-tab bottom navigation is present for individual users, with an "Actions" tab for attorney-assigned tasks (with back button positioned at top-left). Law Firm and Medical Provider portals have dedicated functionalities like notification systems and analytics dashboards.

**Visual Assets**: The app uses custom pirate-themed images including a treasure map image (Treasure Map_1762016241708.png) for all Case Roadmap thumbnails and icons and as the actual roadmap background, a treasure chest image (Treasure Chest Full Cartoon_1762017505115.png) for all treasure/coin-related features including "Earn treasure as you progress" on the landing page and the main Treasure Chest button on the dashboard, a vault image (vault_1762018272142.jpeg) for all Evidence Locker icons, a video icon (video_1762018822588.jpeg) for all Video Library icons, a blue speaker icon (Speaker_1762189140530.png) for all audio playback icons in roadmap subcategories, and an "X marks the spot" image (X marks the Spot_1762186694664.png) for uncompleted litigation stages on the roadmap. The dashboard no longer includes a "Convert Coins" button.

### Technical Implementations
The application uses Expo SDK 52 with React Native 0.76.9 in a modular monorepo structure. The backend is Node.js/Express with PostgreSQL, deployed via Railway, implementing HIPAA-compliant security with AES-256-GCM encryption, RBAC, patient consent management, and audit logging. The system tracks litigation progress through 9 stages and 60 substages, includes client/patient management with real-time search, and a comprehensive connection management system. A subscription management system supports Free, Basic, and Premium tiers. Gamification includes a coin system with a 25,000-coin cap and a universal invite/referral system. Cross-platform compatibility is supported.

**Web Deployment (November 2025)**: The React Native app has been configured for web deployment alongside the mobile app. Expo web export generates a static bundle (backend/public/app) served by the Express server. Platform guards (Platform.OS === 'web') disable mobile-only features (push notifications, native Stripe payments, document/media pickers, calendar sync) on web while preserving core functionality (authentication, litigation roadmap, video library, dashboard). Metro bundler configured with react-native-web aliasing and mobile-only module exclusions. Railway deployment automated via nixpacks.toml to build web bundle during deployment. Backend serves JS/HTML with no-cache headers to prevent stale code.

**Progress Loading (November 2025)**: App now fetches user's litigation progress from backend on login via `/api/litigation/progress` endpoint. Progress data (completed substages) is merged with static LITIGATION_STAGES, calculating stage completion when ALL substages are completed. Green animated dotted lines render between fully completed stages on the roadmap.

**Treasure Chest Coin Refresh (November 2025)**: Real-time coin balance updates implemented via `treasureChestRefreshKey` state in App.js. When users complete roadmap substages/stages, the refresh key increments automatically, triggering TreasureChestScreen useEffect to fetch fresh coin balance from `/api/coins/balance`. This ensures the treasure chest displays updated coin totals immediately after earning coins, whether the user is already viewing the screen or navigates to it afterward. Works in both online (backend) and offline modes with comprehensive debug logging. Critical fixes (Nov 10): Fixed database pool import in coinsController.js (was causing 500 errors), aligned TreasureChestScreen API URL with centralized config to prevent token mismatch between dev/prod environments, and added error logging for API failures.

Key features implemented include:
- **Push Notification System**: Targeted notifications, 22 templates, Expo push integration, deep linking, and real-time badge count synchronization.
- **Attorney-Assigned Task System**: Law firms create tasks for clients with priorities, due dates, and coin rewards.
- **Notification Preferences & Quiet Hours**: User-configurable notification types and quiet hours enforcement with timezone awareness.
- **Calendar Integration**: Full device calendar sync via Expo Calendar API for event creation, filtering, and sharing between user types.
- **Enhanced Gamification**: 16 achievements, 8 pirate-themed badges with rarity, progress tracking, and a leaderboard system.
- **Calendar Event Requests**: Workflow for law firms/medical providers to request event dates from clients/patients, with automated confirmations.
- **Stripe Payment Integration**: Full Stripe payment processing with @stripe/stripe-react-native SDK for subscriptions and one-time payments, supporting Apple Pay and Google Pay.
- **Coin Purchase System**: Backend API and UI for purchasing pirate-themed coin packages via Stripe, with a 25,000 coin cap.
- **Privacy Policy & Terms Acceptance**: Integration of Privacy Policy, Terms of Service, and EULA documents with required acceptance during registration and database tracking.
- **Settlement Disbursement System (November 2025)**: Law firm portal feature for tracking settlement disbursements to clients and medical providers. Database schema includes disbursements table (with stripe_account_id support for users, law_firms, and medical_providers) and disbursement_medical_payments table for individual provider payment tracking. Backend API routes (/api/disbursements/history, /api/disbursements/client-providers, /api/disbursements/process, /api/disbursements/:id) with authentication and transaction handling. Stripe Connect routes (/api/stripe-connect/create-account, /api/stripe-connect/account-status, /api/stripe-connect/create-dashboard-link) enable Express account creation and onboarding for law firms, clients, and medical providers. Frontend dashboard screen with payment breakdown UI. PROTOTYPE STATUS: Currently records disbursements with 'pending' status - Stripe Connect account onboarding UI needed for production to process actual fund transfers. $200 platform fee per disbursement transaction.

### Feature Specifications
- **User Authentication & Types**: Supports Individual, Law Firm, and Medical Provider users across Free, Basic, and Premium tiers.
- **Interactive Pirate Map**: A 9-stage litigation journey with progress tracking, detailed substages, modal descriptions, and interactive audio.
- **Video Library**: Integrated educational tutorials.
- **Medical Hub**: HIPAA-compliant document storage placeholder with all upload functionality disabled, showing "Coming Soon" messages.
- **Law Firm/Medical Provider Portals**: Web and mobile access for managing clients/patients with read-only views of medical records, billing, evidence, and litigation stages.

## External Dependencies
- **Expo SDK**: Core framework for React Native development.
- **React Native**: For building mobile applications.
- **React**: JavaScript library for UIs.
- **@react-native-async-storage/async-storage**: For persistent storage.
- **@stripe/stripe-react-native**: Stripe payment processing SDK (v0.38.6).
- **stripe**: Stripe Node.js library (v19.2.0).
- **PostgreSQL**: Database for backend data storage.
- **Node.js/Express**: Backend API development.