# Verdict Path - React Native Mobile App

## Overview
Verdict Path is a React Native mobile application designed as a legal case management and education platform for civil litigation. It provides an interactive case roadmap, gamification elements, educational video tutorials, and secure medical document storage. The platform aims to assist individuals, law firms, and medical providers in navigating legal processes, supported by tiered subscription models, to offer an engaging and informative tool to support justice.

## User Preferences
I want to work with an AI agent that is autonomous and proactive. It should make decisions and implement changes without constant oversight. I prefer that the agent proceed with tasks independently, only seeking clarification if absolutely necessary. I also prefer detailed explanations of the code and the logic behind any changes made.

## System Architecture
The application is a React Native mobile app built with the Expo framework, featuring a "pirate treasure map" theme. The backend is a Node.js/Express server with a PostgreSQL database.

### UI/UX Decisions
The design is centered on a "pirate treasure map" theme with a warm tan/beige color palette. Key UI/UX elements include an interactive litigation roadmap, a compass/ship wheel logo, pirate-themed badges for gamification, and tailored subscription selection screens. The Medical Hub features distinct upload sections and real-time status tracking. UI elements like audio icons for roadmap substages and descriptive subscription cards are consistently styled to match the theme. Visual feedback for roadmap substage completion, enhanced audio icons, and a 6-slide pirate-themed onboarding flow are implemented. Progress tracking includes an animated progress bar and celebration animations for milestones. A sticky 5-tab bottom navigation is present for individual users, with an "Actions" tab for attorney-assigned tasks. Individual user dashboards include "Invite Friends" and "My Connections" functionalities. Medical Provider and Law Firm portals have dedicated functionalities like notification systems and analytics dashboards, with all upload functionalities currently disabled across the entire application, displaying "Coming Soon" messages.

### Technical Implementations
The application uses Expo SDK 52 with React Native 0.76.9. The project has a modular structure with a monorepo approach. The backend is Node.js/Express with PostgreSQL, deployed via Railway, and implements HIPAA-compliant security with AES-256-GCM encryption, Role-Based Access Control (RBAC), patient consent management, and audit logging. The system tracks litigation progress through 9 stages and 60 substages, includes client/patient management with real-time search, and a robust connection management system allowing individual users to connect with one law firm and multiple medical providers. A comprehensive subscription management system supports Free, Basic, and Premium tiers with unique code generation and upgrade/downgrade protocols. Gamification includes a coin system with a 25,000-coin cap and a universal invite/referral system. Cross-platform compatibility is extensively supported.

**Phase 2 Implementations (October 2025):**
- **Push Notification System** (100% Complete - October 30, 2025):
  - Law firms and medical providers can send targeted notifications to connected clients/patients
  - 22 total notification templates seeded (6 system + 10 law firm + 6 medical provider)
  - Multi-recipient selection and analytics tracking
  - Full Expo push notification integration with device registration/unregistration
  - Deep linking configured (verdictpath://) for iOS and Android with automatic screen routing
  - Real-time badge count synchronization with backend
  - Notification listeners handle foreground/background notifications
  - Automatic device cleanup on logout to prevent cross-account notification delivery
  - Production-ready with proper lifecycle management and memory leak prevention
- **Attorney-Assigned Task System**: Law firms create tasks for clients with priorities, due dates, and coin rewards. Individual users access tasks via ActionDashboardScreen.
- **Notification Preferences & Quiet Hours** (Complete - October 30, 2025):
  - User preferences API (GET/PUT /api/notifications/preferences) with toggles for urgent, task, system, and marketing notifications
  - Quiet hours enforcement with timezone-aware calculation and midnight-spanning window support
  - NotificationSettingsScreen with cross-platform Modal/TextInput time picker for iOS and Android
  - Complete preference enforcement across ALL notification endpoints (sendNotification, sendToClient, sendToPatient, sendToClients, sendToAllClients, sendToPatients, sendToAllPatients)
  - Returns 403 when preferences block delivery, 202 when quiet hours would queue
  - Urgent notifications bypass quiet hours only when urgent toggle is enabled
  - All notification types properly mapped and checked
- **Calendar Integration** (Complete - October 30, 2025):
  - Full device calendar sync via Expo Calendar API for iOS and Android
  - Calendar events support (court dates, appointments, depositions, deadlines, reminders)
  - CalendarScreen with event creation, filtering by type, and device sync controls
  - Backend API endpoints for CRUD operations with proper authentication
  - Sync status tracking (synced_to_device, device_event_id, last_synced_at)
  - Event sharing between law firms, medical providers, and clients
  - Field normalization supporting both camelCase and snake_case for API flexibility
- **Enhanced Gamification** (Complete - October 30, 2025):
  - 16 achievements seeded across 4 categories (progress, consistency, engagement, milestones)
  - 8 pirate-themed badges with rarity system (common, rare, epic, legendary)
  - AchievementsScreen with progress tracking, filtering, and rarity-based visual styling
  - BadgeCollectionScreen showing unlock status and collection progress
  - Transactional coin/badge awards on achievement completion with 25k coin cap
  - Achievement progress tracking API with automatic reward distribution
  - Leaderboard system (total coins, achievements, login streak)
  - User stats dashboard showing completion rates and totals
- **Calendar Event Requests** (Complete - October 30, 2025):
  - Law firms can request calendar events (depositions, mediations, consultations) from clients
  - Medical providers can request treatment dates (appointments, consultations, follow-ups) from patients
  - Automated notification system alerts clients/patients of new event requests
  - Clients/patients select 3 available dates/times via mobile UI with cross-platform date picker
  - Law firms/medical providers receive proposed dates and confirm one
  - Confirmed events automatically added to both parties' calendars with sharing enabled
  - LawFirmEventRequestsScreen and MedicalProviderEventRequestsScreen for creating and managing requests
  - ClientEventRequestsScreen for viewing all requests (both law firm and medical provider)
  - Complete workflow with status tracking (pending, dates_submitted, confirmed, cancelled)
  - Transaction-safe date submission and confirmation process
  - Navigation buttons added to law firm dashboard, medical provider dashboard, and individual user dashboard
- **Stripe Payment Integration** (Complete - October 31, 2025):
  - Full Stripe payment processing with @stripe/stripe-react-native SDK (v0.38.6 - Expo SDK 52 compatible)
  - Backend payment API with routes for payment intents, subscriptions, cancellation, and webhooks
  - PaymentScreen component with Payment Sheet API supporting Apple Pay, Google Pay, and credit/debit cards
  - Reusable PayButton component with loading states and pirate-themed styling
  - StripeProvider wrapper integrated into App.js for global Stripe context
  - Test mode enabled for safe development (pk_test_ and sk_test_ keys)
  - Environment-aware configuration using EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY and STRIPE_SECRET_KEY
  - Complete payment flow: card input → payment intent creation → payment confirmation → success handling
  - Backend endpoints: /api/payment/create-payment-intent, /api/payment/create-subscription, /api/payment/cancel-subscription, /api/payment/webhook
  - Graceful degradation: Backend deploys successfully without Stripe keys (returns 503 for payment routes until configured)
  - Railway deployment ready: No crashes when STRIPE_SECRET_KEY is missing
  - Comprehensive documentation in STRIPE_INTEGRATION_GUIDE.md, STRIPE_PAYMENT_USAGE_GUIDE.md, and RAILWAY_STRIPE_DEPLOYMENT.md
  - "Upgrade to Premium" button on Dashboard for Free tier users
  - Ready for subscription-based revenue model with dynamic amount and tier support
- **Privacy Policy & Terms Acceptance** (Complete - October 31, 2025):
  - Comprehensive privacy policy document (assets/privacy-policy.txt) covering all data collection and usage
  - Comprehensive terms of service document (assets/terms-of-service.txt) covering service usage, user conduct, and legal agreements
  - Comprehensive EULA document (assets/eula.txt) covering software licensing, intellectual property, and usage rights
  - PrivacyPolicyScreen, TermsOfServiceScreen, and EULAScreen components with formatted, scrollable document displays
  - Required checkbox acceptance during registration for all user types
  - "Create Account" button disabled until all three documents are accepted
  - Clickable links in registration flow for Privacy Policy, Terms of Service, and EULA
  - Database tracking of privacy_accepted_at timestamp for users, law_firms, and medical_providers (single timestamp covers all three documents)
  - Backend validation ensures accounts cannot be created without accepting all documents
  - Privacy/terms/EULA acceptance state properly reset after successful registration to prevent session leaking
  - CCPA, GDPR, and state-specific privacy rights documented
  - Payment terms, refund policy, and subscription details clearly outlined
  - Legal disclaimers: Service provides educational content, not legal or medical advice
  - Software licensing terms, usage restrictions, and intellectual property protections
  - Dispute resolution and arbitration procedures with class action waiver
  - Contact information and support procedures included

### Feature Specifications
- **User Authentication & Types**: Supports Individual, Law Firm, and Medical Provider users across Free, Basic, and Premium tiers.
- **Interactive Pirate Map**: Features a 9-stage litigation journey with progress tracking, detailed substages, modal descriptions, and interactive audio.
- **Video Library**: Integrated educational tutorials.
- **Medical Hub**: HIPAA-compliant document storage placeholder. All upload functionality is currently disabled system-wide with "Coming Soon" messages.
- **Law Firm/Medical Provider Portals**: Web and mobile access for managing clients/patients with read-only views of medical records, billing, evidence, and litigation stages.
- **Document Upload Status**: Feature completely disabled system-wide.

## External Dependencies
- **Expo SDK**: Core framework for React Native development.
- **React Native**: For building mobile applications.
- **React**: JavaScript library for UIs.
- **react-native-svg**: For rendering SVG graphics and animations.
- **@react-native-async-storage/async-storage**: For persistent storage.
- **@stripe/stripe-react-native**: Stripe payment processing SDK for React Native (v0.38.6).
- **stripe**: Stripe Node.js library for backend payment processing (v19.2.0).
- **PostgreSQL**: Database for backend data storage.
- **Node.js/Express**: Backend API development.

## Deployment Configuration
- **Railway Deployment Ready** (October 30, 2025): All Railway deployment issues fixed
  - Railway configuration files (railway.toml, railway.json, nixpacks.toml) properly configured
  - Database connection pooling optimized for Railway with proper SSL handling
  - CORS configured to support Railway domains and mobile apps
  - Dynamic BASE_URL handling for environment-aware API calls
  - .railwayignore file created to exclude unnecessary files
  - Server listens on 0.0.0.0 for Railway networking compatibility
  - Complete deployment guide available in RAILWAY_DEPLOYMENT_GUIDE.md

- **Multi-Environment API Configuration** (October 31, 2025): Environment-aware URL selection
  - Frontend API configuration uses priority cascade for automatic environment detection
  - Priority 1: EXPO_PUBLIC_API_BASE_URL environment variable (explicit override)
  - Priority 2: NODE_ENV=production automatically uses Railway backend URL
  - Priority 3: Defaults to localhost:5000 for local development
  - No code changes required when switching between environments
  - Backend auto-detects Railway vs Replit via RAILWAY_PUBLIC_DOMAIN
  - Full multi-environment guide in DEPLOYMENT_ENVIRONMENT_GUIDE.md