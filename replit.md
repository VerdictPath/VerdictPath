# Verdict Path - React Native Mobile App

## Overview
Verdict Path is a React Native mobile application designed as a legal case management and education platform for civil litigation. Its primary purpose is to empower individuals, law firms, and medical providers by offering legal knowledge, streamlining case management, and supporting justice. The platform features an interactive case roadmap, gamification, educational content, and secure medical document storage. It aims to achieve this through an engaging, informative tool and tiered subscription models, thereby serving a broad market across the legal and medical sectors.

## User Preferences
I want to work with an AI agent that is autonomous and proactive. It should make decisions and implement changes without constant oversight. I prefer that the agent proceed with tasks independently, only seeking clarification if absolutely necessary. I also prefer detailed explanations of the code and the logic behind any changes made.

### Cross-Platform Rule (MANDATORY)
**Every change to the app MUST be verified and perfected across ALL three platforms:**
1. **Web/URL** — The web version served at the app URL (rebuild with `npx expo export --platform web`, run `node fix-web-build.js` to copy to `backend/public/app/`, restart the server)
2. **Apple (iOS)** — React Native code must work correctly on iOS via Expo
3. **Google (Android)** — React Native code must work correctly on Android via Expo

This means:
- All UI changes must be tested/considered for web, iOS, and Android rendering differences
- Platform-specific code (`Platform.OS` checks) must be used when behavior differs across platforms
- Web builds must always be rebuilt and deployed to `backend/public/app/` after any frontend changes
- No change is considered complete until it works on all three platforms

## System Architecture
The application is a React Native mobile app built with the Expo framework, featuring a "pirate treasure map" theme. The backend is a Node.js/Express server with a PostgreSQL database.

### UI/UX Decisions
The design uses a "pirate treasure map" theme with a warm tan/beige color palette. Key UI/UX elements include an interactive litigation roadmap, pirate-themed gamification badges, a realistic treasure chest icon, and custom pirate imagery. The Medical Hub has distinct upload sections, and progress tracking uses an animated progress bar. Navigation is managed by a sticky 7-tab bottom navigation bar, which varies for individual users, Law Firm portals, and Medical Provider portals. A nautical pirate logo with a foggy sea background is used system-wide.

### Technical Implementations
The application utilizes Expo SDK 52 with React Native 0.76.9 in a modular monorepo structure. The Node.js/Express backend with PostgreSQL, deployed via Railway, implements HIPAA-compliant security, including AES-256-GCM encryption, RBAC, patient consent, and audit logging.

Key features include:
- **User Management**: Supports Individual, Law Firm, and Medical Provider users with multi-user accounts, role-based permissions, and tiered access.
- **Interactive Litigation Roadmap**: A 9-stage journey with 60 substages, progress tracking, modal descriptions, interactive audio, and integrated file uploads.
- **Avatar Video System**: For individual users, featuring legal-themed characters and background loops.
- **Connection System**: Request/approval-based connections between law firms, medical providers, and individual users. Users enter a connection code to send a request; the recipient must accept before the connection is established. Uses `connection_requests` table with pending/accepted/declined/cancelled states. Notifications sent on request creation, acceptance, and decline with deep-linking.
- **Bill Negotiations Portal**: Facilitates negotiations for law firms and medical providers.
- **Real-time Notification System**: Firebase-based system with 22 templates, deep linking, real-time badge counts, and analytics, using Firebase as a sync layer and PostgreSQL as the source of truth.
- **Attorney-Assigned Task System**: Allows law firms to create tasks for clients with priorities, due dates, and coin rewards.
- **Calendar Integration**: Full device calendar sync via Expo Calendar API, with cross-account event visibility.
- **Gamification**: Includes 16 achievements, 8 pirate-themed badges, progress tracking, and a leaderboard.
- **Payment & Disbursement**: Stripe integration for subscriptions and one-time payments (including Apple Pay/Google Pay), and a settlement disbursement system for law firms using Stripe Connect.
- **Multi-User Accounts**: Role-based permission systems for law firms and medical providers, with granular control, user limits, CRUD operations, and audit logging. HIPAA compliance features are enhanced for Medical Provider accounts.
- **Activity Tracking System**: Comprehensive logging for law firms with 28 action types across 8 categories.
- **SMS Notification System**: Twilio-based with HIPAA-safe logging, encrypted phone storage, and automated task reminders.
- **User Profile Settings**: Allows individuals to manage notification preferences and quiet hours.
- **HIPAA-Compliant Real-time Chat System**: End-to-end encrypted messaging with AES-256-GCM, Firebase real-time sync for encrypted content, typing indicators, and read receipts.
- **Secure Document Upload/Download System**: HIPAA-compliant AWS S3 storage with magic bytes validation, dangerous content detection, short-lived presigned URLs, role-based rate limiting, and comprehensive audit logging.
- **Individual User Disbursements Screen**: Allows users to view disbursements and securely manage bank information with AES-256 encryption.
- **Polly the Navigator (AI Assistant)**: A pirate-themed AI assistant for individual users, providing conversational navigation.
- **Admin Dashboard**: A web portal for administration, user management, activity logs, and HIPAA-compliant audit trails.
- **Background Music System**: Customizable background music for individual users with avatar theme songs or ambient ocean sounds, managed via `BackgroundMusicService.js` and `MusicContext.js`, persisting preferences via AsyncStorage and server sync.
- **Web Video Background System**: Handled by `WebVideoBackground.js` using native `<video>` elements with poster image fallbacks and CSS background redundancy, ensuring proper video display across web browsers.
- **Security Hardening**: Debug endpoints removed, JWT token expiry reduced to 7 days with automatic refresh, Helmet middleware added for security headers, CORS tightened, and legacy unsigned cookies removed.

### Feature Specifications
- **Subscription Pricing Structure**: Tiered models for law firms, individuals, and medical providers.
- **Video Library**: Integrated educational tutorials.
- **Medical Hub**: HIPAA-compliant document storage.
- **Law Firm/Medical Provider Portals**: Web and mobile access for client/patient management.
- **Calendar Event Requests**: Workflow for requesting event dates.
- **Privacy Policy & Terms Acceptance**: Integration of legal documents.

## External Dependencies
- **Expo SDK**: Core framework for React Native development.
- **React Native**: For building mobile applications.
- **React**: JavaScript library for UIs.
- **@react-native-async-storage/async-storage**: For persistent storage.
- **@stripe/stripe-react-native**: Stripe payment processing SDK.
- **stripe**: Stripe Node.js library.
- **PostgreSQL**: Database for backend data storage.
- **Node.js/Express**: Backend API development.
- **nodemailer**: For email services.
- **twilio**: For SMS services.
- **Firebase**: Real-time database for notification sync layer.
- **firebase-admin**: Server-side Firebase SDK for custom token authentication.
- **AWS S3**: For secure document storage.