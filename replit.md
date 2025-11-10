# Verdict Path - React Native Mobile App

## Overview
Verdict Path is a React Native mobile application designed as a legal case management and education platform for civil litigation. It offers an interactive case roadmap, gamification, educational content, and secure medical document storage. The platform aims to assist individuals, law firms, and medical providers in navigating legal processes, supported by tiered subscription models, to provide an engaging and informative tool to support justice. The business vision is to empower users with legal knowledge and streamline case management.

## User Preferences
I want to work with an AI agent that is autonomous and proactive. It should make decisions and implement changes without constant oversight. I prefer that the agent proceed with tasks independently, only seeking clarification if absolutely necessary. I also prefer detailed explanations of the code and the logic behind any changes made.

## System Architecture
The application is a React Native mobile app built with the Expo framework, featuring a "pirate treasure map" theme. The backend is a Node.js/Express server with a PostgreSQL database.

### UI/UX Decisions
The design uses a "pirate treasure map" theme with a warm tan/beige color palette. Key elements include an interactive litigation roadmap, a compass/ship wheel logo, pirate-themed badges for gamification, and tailored subscription selection screens. The Medical Hub features distinct upload sections and "Coming Soon" messages. Visual feedback, enhanced audio icons, and a 6-slide pirate-themed onboarding are implemented. Progress tracking includes an animated progress bar. A sticky 5-tab bottom navigation is present for individual users, with an "Actions" tab for attorney-assigned tasks. Law Firm and Medical Provider portals have dedicated functionalities like notification systems and analytics dashboards. Custom pirate-themed images are used throughout the application for various features.

### Technical Implementations
The application uses Expo SDK 52 with React Native 0.76.9 in a modular monorepo structure. The backend is Node.js/Express with PostgreSQL, deployed via Railway, implementing HIPAA-compliant security with AES-256-GCM encryption, RBAC, patient consent management, and audit logging. The system tracks litigation progress through 9 stages and 60 substages, includes client/patient management with real-time search, and a comprehensive connection management system. A subscription management system supports Free, Basic, and Premium tiers. Gamification includes a coin system with a 25,000-coin cap and a universal invite/referral system. Cross-platform compatibility is supported, including web deployment with mobile-only features disabled for web. Real-time coin balance updates are implemented.

**Recent Implementations (November 10, 2025):**
- **Bill Negotiations Portal**: Full-featured negotiation system allowing law firms and medical providers to negotiate medical bills directly in-app. Features include negotiation initiation with client/patient and provider selection, counter-offer workflow, offer acceptance, phone call request mechanism, and downloadable negotiation logs. Backend implements negotiations and negotiation_history tables with full audit trail. Both law firms and medical providers can initiate and manage negotiations through a unified interface with role-specific workflows.
- **Premium Access Control for Settlement Disbursements**: Implemented comprehensive premium-tier gating for the settlement disbursement feature. Only law firms with premium subscriptions can access disbursement processing. Enforcement includes backend middleware (requirePremiumLawFirm), database schema changes (plan_type column with CHECK constraint), frontend UI gating with upgrade modal, and explicit planType validation to prevent silent tier persistence. Protected routes return 403 errors with upgrade messaging for non-premium firms.
- **Law Firm Dashboard Header Layout**: Fixed invite button visibility issue by making the firm info section flexible (flex: 1) and preventing the invite button from shrinking (flexShrink: 0). This ensures the invite button remains fully visible on all screen sizes, even with long firm names.
- **Navigation Consistency**: Added back button to Individual user's subscription plan selection screen to match Law Firm and Medical Provider navigation patterns.

### Feature Specifications
- **User Authentication & Types**: Supports Individual, Law Firm, and Medical Provider users across Free, Basic, and Premium tiers.
- **Subscription Pricing Structure**: Tiered pricing for law firms (8 tiers), individuals (3 tiers), and medical providers (4 tiers) with different plans and annual savings.
- **Interactive Pirate Map**: A 9-stage litigation journey with progress tracking, detailed substages, modal descriptions, and interactive audio.
- **Video Library**: Integrated educational tutorials.
- **Medical Hub**: HIPAA-compliant document storage placeholder with "Coming Soon" messages for upload functionality.
- **Law Firm/Medical Provider Portals**: Web and mobile access for managing clients/patients with read-only views of medical records, billing, evidence, and litigation stages.
- **Push Notification System**: Targeted notifications, 22 templates, Expo push integration, deep linking, and real-time badge count synchronization.
- **Attorney-Assigned Task System**: Law firms create tasks for clients with priorities, due dates, and coin rewards.
- **Notification Preferences & Quiet Hours**: User-configurable notification types and quiet hours enforcement with timezone awareness.
- **Calendar Integration**: Full device calendar sync via Expo Calendar API.
- **Enhanced Gamification**: 16 achievements, 8 pirate-themed badges with rarity, progress tracking, and a leaderboard system.
- **Calendar Event Requests**: Workflow for law firms/medical providers to request event dates from clients/patients.
- **Stripe Payment Integration**: Full Stripe payment processing for subscriptions and one-time payments, supporting Apple Pay and Google Pay.
- **Coin Purchase System**: Backend API and UI for purchasing pirate-themed coin packages via Stripe, with a 25,000 coin cap.
- **Privacy Policy & Terms Acceptance**: Integration of Privacy Policy, Terms of Service, and EULA documents with required acceptance.
- **Settlement Disbursement System**: Law firm portal feature for tracking settlement disbursements to clients and medical providers, including Stripe Connect for account onboarding and payment processing.
- **Bill Negotiations Portal**: In-app negotiation system enabling law firms and medical providers to negotiate medical bills. Supports full workflow including initiation, counter-offers, acceptance, call requests, and negotiation history logs. Accessible from both Law Firm and Medical Provider dashboards with role-specific UX.

## External Dependencies
- **Expo SDK**: Core framework for React Native development.
- **React Native**: For building mobile applications.
- **React**: JavaScript library for UIs.
- **@react-native-async-storage/async-storage**: For persistent storage.
- **@stripe/stripe-react-native**: Stripe payment processing SDK.
- **stripe**: Stripe Node.js library.
- **PostgreSQL**: Database for backend data storage.
- **Node.js/Express**: Backend API development.