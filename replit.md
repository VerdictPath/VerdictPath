# Verdict Path - React Native Mobile App

## Overview
Verdict Path is a React Native mobile application designed as a legal case management and education platform for civil litigation. It offers an interactive case roadmap, gamification, educational content, and secure medical document storage. The platform aims to assist individuals, law firms, and medical providers in navigating legal processes, supported by tiered subscription models, to provide an engaging and informative tool to support justice. The business vision is to empower users with legal knowledge and streamline case management.

## User Preferences
I want to work with an AI agent that is autonomous and proactive. It should make decisions and implement changes without constant oversight. I prefer that the agent proceed with tasks independently, only seeking clarification if absolutely necessary. I also prefer detailed explanations of the code and the logic behind any changes made.

## System Architecture
The application is a React Native mobile app built with the Expo framework, featuring a "pirate treasure map" theme. The backend is a Node.js/Express server with a PostgreSQL database.

### UI/UX Decisions
The design uses a "pirate treasure map" theme with a warm tan/beige color palette. Key elements include an interactive litigation roadmap with a vintage treasure map background, a realistic treasure chest icon, pirate-themed badges for gamification, tailored subscription selection screens, and custom pirate-themed images. The Medical Hub features distinct upload sections. Progress tracking includes an animated progress bar with a raining gold coins celebration video. A sticky 7-tab bottom navigation is present for individual users (Dashboard, Roadmap, Medical Hub, Notifications, Messages, Actions, Profile), with a "Messages" tab for HIPAA-compliant encrypted chat, "Actions" tab for attorney-assigned tasks, and "Profile" tab for notification preferences. Law Firm portals have 7 tabs (Dashboard, Notifications, Users, Messages, Activity, Disbursements, Negotiations) and Medical Provider portals have 7 tabs (Dashboard, Notifications, Users, Messages, HIPAA, Activity, Disbursements), both featuring HIPAA-compliant encrypted chat via the Messages tab. A new nautical pirate logo with a foggy sea background is used system-wide, featuring a feathered edge effect on the landing page.

### Technical Implementations
The application uses Expo SDK 52 with React Native 0.76.9 in a modular monorepo structure. The backend is Node.js/Express with PostgreSQL, deployed via Railway, implementing HIPAA-compliant security with AES-256-GCM encryption, RBAC, patient consent management, and audit logging. The system tracks litigation progress through 9 stages and 60 substages, includes client/patient management with real-time search, and a comprehensive connection management system. A subscription management system supports Free, Basic, and Premium tiers. Gamification includes a coin system with a 25,000-coin cap and a universal invite/referral system. Cross-platform compatibility is supported, including web deployment with mobile-only features disabled for web.

Key technical features include:
- **Avatar Video System (Individual Users Only)**: Comprehensive avatar system with 4 legal-themed characters, integrated videos for background loops and celebrations, dynamic theming, and restricted access for individual users.
- **Bidirectional Connection System**: Complete connection management system allowing law firms to connect with medical providers and individual users to connect with both.
- **Bill Negotiations Portal**: Full-featured negotiation system for law firms and medical providers.
- **Client-Medical Provider Relationship Management**: Secure system for tracking client-medical provider relationships, controlled by law firms.
- **Premium Access Control for Settlement Disbursements**: Gating of settlement disbursement features for premium law firm subscribers.
- **Real-time Firebase Notification System**: Production-ready notification system using Firebase Realtime Database as a sync layer with PostgreSQL as source of truth. Features include custom token authentication, tenant-scoped security rules, dual-write pattern for all notification operations, automatic REST polling fallback when Firebase unavailable, 22 notification templates, deep linking, real-time badge count synchronization, and analytics.
- **Attorney-Assigned Task System**: Law firms create tasks for clients with priorities, due dates, and coin rewards.
- **Calendar Integration**: Full device calendar sync via Expo Calendar API.
- **Enhanced Gamification**: 16 achievements, 8 pirate-themed badges with rarity, progress tracking, and a leaderboard system.
- **Stripe Payment Integration**: Full Stripe payment processing for subscriptions and one-time payments, including Apple Pay and Google Pay.
- **Settlement Disbursement System**: Law firm portal feature for tracking settlement disbursements, including Stripe Connect.
- **Multi-User Law Firm Accounts**: Complete role-based permission system supporting admin, attorney, and staff roles with granular permissions, user limits, and full CRUD operations. Includes audit logging and comprehensive authentication middleware.
- **Activity Tracking System**: Comprehensive activity logging for law firms with 28 action types across 8 categories, including IP address, user agent, and metadata.
- **Multi-User Medical Provider Accounts with HIPAA Compliance**: Complete role-based permission system supporting admin, physician, nurse, staff, and billing roles with granular permissions. Enhanced with HIPAA compliance features like automatic sensitivity level assignment, patient access auditing, HIPAA training validation, 7-year data retention, and patient-specific audit trails.
- **SMS Notification System with HIPAA Compliance**: Comprehensive Twilio SMS notification system with HIPAA-safe logging (phone numbers redacted to ****1234), encrypted phone storage (AES-256-GCM), explicit opt-in consent (sms_notifications_enabled defaults to false), error message sanitization, and automated task reminder scheduler that runs hourly for tasks due within 24 hours. Individual users can manage SMS preferences via Profile tab in bottom navigation.
- **Individual User Profile Settings**: Individual users have access to a Profile tab (6th tab) in bottom navigation leading to NotificationSettingsScreen where they can manage push, email, and SMS notification preferences, set quiet hours, and configure notification types (urgent, task, system, marketing). Features proper camelCase/snake_case API mapping for seamless backend integration.
- **HIPAA-Compliant Real-time Chat System**: End-to-end encrypted messaging between connections (law firm-client, provider-patient, firm-provider). Features include AES-256-GCM message encryption with per-message IVs, connection validation using existing relationship tables, Firebase real-time sync with encrypted content only, comprehensive audit logging for all message operations (create, read, mark_read), typing indicators, read receipts, unread counts, and SMS notifications for urgent messages. Database schema includes 5 tables: conversations, conversation_participants, messages, message_deliveries, and message_audit_log. All messages stored encrypted in PostgreSQL with Firebase used only for real-time delivery of encrypted payloads.
  - **Firebase Real-time Architecture**: Backend syncs messages to `/chat/conversations/{conversationId}/messages/{messageId}` and unread counts to `/chat/{participantType}s/{participantId}/unread_counts`. Frontend uses custom token authentication via `authenticateWithBackend(token)` before subscribing to Firebase listeners. ChatConversationScreen subscribes to message updates and triggers API refetch for decrypted messages. ChatListScreen monitors unread count changes to auto-refresh conversation lists without manual refresh. All Firebase paths are tenant-scoped with security rules requiring authentication. Graceful degradation to manual refresh when Firebase unavailable.
- **Secure Document Upload/Download System**: Comprehensive HIPAA-compliant document handling with AWS S3 storage featuring:
  - Magic bytes validation to verify true file types (JPEG, PNG, PDF, DOC, DOCX, HEIC) match claimed MIME types
  - Dangerous content detection blocks PHP, JavaScript, and HTML injection patterns
  - Short-lived presigned URLs (5 minutes) for downloads to minimize exposure
  - Role-based rate limiting: 30 uploads/15min general, 10 uploads/hour for individuals, exempt for law firms/medical providers
  - Separate authorization flows for law firms and medical providers with consent verification
  - Comprehensive audit logging in document_access_log table for all access attempts (success/failure)
  - AES-256-GCM encryption for sensitive document metadata
- **Individual User Disbursements Screen**: Individual users can view settlement disbursements from their law firm and securely manage bank information. Features include:
  - View all received disbursements with status (pending/completed/failed), amounts, and transaction IDs
  - Secure bank information storage with AES-256 encryption for bank name, account holder, routing number, and account number
  - Redacted display showing only last 4 digits of routing and account numbers for security
  - Add/update bank account functionality with validation (9-digit routing number, 4-17 digit account number)
  - Accessible via Dashboard quick action button (💰 Disbursements) or through Polly the Navigator
- **Polly the Navigator (AI Assistant)**: Pirate-themed AI navigation assistant for individual users. Appears as a floating parrot button (🦜) on all individual user screens. Helps users navigate to features via conversational interface with pirate personality ("Ahoy, matey!"). Provides quick navigation buttons to all major sections.
- **Admin Dashboard (Web Portal)**: Comprehensive admin portal at `/portal/admin` with pirate-themed dark UI. Features include:
  - Separate admin authentication with ADMIN_USERNAME and ADMIN_PASSWORD environment variables
  - Dashboard overview with statistics for all user types (individuals, law firms, medical providers)
  - User management with filtering by type, search, and pagination
  - Detailed user views showing account info, subscription status, coins, streaks, staff members, and connected clients
  - User activation/deactivation controls
  - Activity logs viewer with filtering by source (law firm, medical provider, audit) and action type
  - HIPAA-compliant audit trail viewer with 7-year retention tracking
  - All access is logged and session expires after 8 hours

### Feature Specifications
- **User Authentication & Types**: Supports Individual, Law Firm, and Medical Provider users across Free, Basic, and Premium tiers. Multi-user accounts with role-based permissions for law firms (admin, attorney, staff) and medical providers (admin, physician, nurse, staff, billing).
- **Subscription Pricing Structure**: Tiered pricing for law firms (8 tiers), individuals (3 tiers), and medical providers (4 tiers).
- **Interactive Pirate Map**: A 9-stage litigation journey with progress tracking, detailed substages, modal descriptions, and interactive audio. Includes file upload functionality in Pre-Litigation phase substages with support for camera (mobile only), gallery, and document uploads. Uploaded evidence is automatically visible to connected law firms in the Evidence Locker.
- **Video Library**: Integrated educational tutorials.
- **Medical Hub**: HIPAA-compliant document storage placeholder.
- **Law Firm/Medical Provider Portals**: Web and mobile access for managing clients/patients.
- **Notification Preferences & Quiet Hours**: User-configurable notification types and quiet hours enforcement.
- **Calendar Event Requests**: Workflow for law firms/medical providers to request event dates from clients/patients.
- **Privacy Policy & Terms Acceptance**: Integration of legal documents with required acceptance.

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