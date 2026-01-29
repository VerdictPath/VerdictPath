# Verdict Path - React Native Mobile App

## Overview
Verdict Path is a React Native mobile application providing a legal case management and education platform for civil litigation. It features an interactive case roadmap, gamification, educational content, and secure medical document storage. The platform aims to empower individuals, law firms, and medical providers with legal knowledge, streamline case management, and support justice through an engaging, informative tool and tiered subscription models.

## User Preferences
I want to work with an AI agent that is autonomous and proactive. It should make decisions and implement changes without constant oversight. I prefer that the agent proceed with tasks independently, only seeking clarification if absolutely necessary. I also prefer detailed explanations of the code and the logic behind any changes made.

## System Architecture
The application is a React Native mobile app built with the Expo framework, featuring a "pirate treasure map" theme. The backend is a Node.js/Express server with a PostgreSQL database.

### UI/UX Decisions
The design adopts a "pirate treasure map" theme with a warm tan/beige color palette. It includes an interactive litigation roadmap, pirate-themed gamification badges, a realistic treasure chest icon, and custom pirate imagery. The Medical Hub has distinct upload sections, and progress tracking features an animated progress bar. Navigation includes a sticky 7-tab bottom navigation with variations for individual users (Dashboard, Roadmap, Medical Hub, Notifications, Messages, Actions, Profile), Law Firm portals (Dashboard, Notifications, Users, Messages, Activity, Disbursements, Negotiations), and Medical Provider portals (Dashboard, Notifications, Users, Messages, HIPAA, Activity, Disbursements). A nautical pirate logo with a foggy sea background is used system-wide.

### Technical Implementations
The application uses Expo SDK 52 with React Native 0.76.9 in a modular monorepo structure. The Node.js/Express backend with PostgreSQL is deployed via Railway, implementing HIPAA-compliant security (AES-256-GCM encryption, RBAC, patient consent, audit logging). The system tracks litigation through 9 stages and 60 substages, includes client/patient management, and a comprehensive connection management system. A subscription management system supports Free, Basic, and Premium tiers. Gamification includes a coin system and a universal invite/referral system. Cross-platform compatibility is supported, including web deployment.

Key technical features include:
- **User Authentication & Types**: Supports Individual, Law Firm, and Medical Provider users across multiple tiers, with multi-user accounts and role-based permissions for firms and providers.
- **Interactive Litigation Roadmap**: A 9-stage journey with progress tracking, substages, modal descriptions, interactive audio, and integrated file uploads.
- **Avatar Video System**: For individual users, featuring legal-themed characters, background loops, and celebration videos.
- **Bidirectional Connection System**: Manages connections between law firms, medical providers, and individual users.
- **Bill Negotiations Portal**: For law firms and medical providers to manage negotiations.
- **Real-time Firebase Notification System**: Production-ready system with 22 templates, deep linking, real-time badge counts, and analytics, using Firebase as a sync layer and PostgreSQL as the source of truth.
- **Attorney-Assigned Task System**: Law firms can create tasks for clients with priorities, due dates, and coin rewards.
- **Calendar Integration**: Full device calendar sync via Expo Calendar API.
- **Enhanced Gamification**: 16 achievements, 8 pirate-themed badges, progress tracking, and a leaderboard.
- **Stripe Payment Integration**: Full payment processing for subscriptions and one-time payments, including Apple Pay and Google Pay.
- **Settlement Disbursement System**: For law firms to track disbursements, integrated with Stripe Connect.
- **Multi-User Law Firm/Medical Provider Accounts**: Role-based permission systems with granular control, user limits, CRUD operations, and audit logging. Medical Provider accounts are enhanced with HIPAA compliance features.
- **Activity Tracking System**: Comprehensive logging for law firms with 28 action types across 8 categories.
- **SMS Notification System**: Twilio-based with HIPAA-safe logging, encrypted phone storage, explicit opt-in, and automated task reminders.
- **Individual User Profile Settings**: Allows users to manage notification preferences, quiet hours, and notification types.
- **HIPAA-Compliant Real-time Chat System**: End-to-end encrypted messaging with AES-256-GCM encryption, Firebase real-time sync for encrypted content, audit logging, typing indicators, and read receipts.
- **Secure Document Upload/Download System**: HIPAA-compliant AWS S3 storage with magic bytes validation, dangerous content detection, short-lived presigned URLs, role-based rate limiting, and comprehensive audit logging.
- **Individual User Disbursements Screen**: Allows individual users to view disbursements and securely manage bank information with AES-256 encryption.
- **Polly the Navigator (AI Assistant)**: A pirate-themed AI assistant for individual users, providing conversational navigation and quick access to features.
- **Admin Dashboard (Web Portal)**: A comprehensive web portal for administration, including user management, activity logs, and HIPAA-compliant audit trails.

### Feature Specifications
- **Subscription Pricing Structure**: Tiered pricing models for law firms, individuals, and medical providers.
- **Video Library**: Integrated educational tutorials.
- **Medical Hub**: HIPAA-compliant document storage.
- **Law Firm/Medical Provider Portals**: Web and mobile access for client/patient management.
- **Calendar Event Requests**: Workflow for requesting event dates from clients/patients.
- **Privacy Policy & Terms Acceptance**: Integration of legal documents.

## Recent Implementation Notes

### Standardized Error Handling (January 2026)
- Created `backend/utils/errorResponse.js` with standardized error response utilities (AppError, sendErrorResponse, sendSuccessResponse, handleDatabaseError, asyncHandler)
- Created `backend/middleware/errorHandler.js` with global error handler middleware
- API 404 handler returns JSON for /api/* routes instead of SPA HTML
- Migrated controllers to standardized error handling (no error.message leakage in production):
  - authController.js (11 endpoints)
  - lawfirmController.js (13 handlers)
  - medicalproviderController.js (3 handlers)
- Remaining controllers can be migrated post-launch as needed

### expo-av to expo-video Migration (Deferred)
- Both expo-av and expo-video coexist in the project
- Video functionality works correctly across all screens
- Full migration deferred to post-launch due to complexity

### AWS S3 Requirements
- Medical Hub document upload requires AWS S3 credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET_NAME, AWS_REGION)

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