# Verdict Path - React Native Mobile App

## Overview
Verdict Path is a React Native mobile application designed as a legal case management and education platform for civil litigation. It offers an interactive case roadmap, gamification, educational content, and secure medical document storage. The platform aims to assist individuals, law firms, and medical providers in navigating legal processes, supported by tiered subscription models, to provide an engaging and informative tool to support justice. The business vision is to empower users with legal knowledge and streamline case management.

## User Preferences
I want to work with an AI agent that is autonomous and proactive. It should make decisions and implement changes without constant oversight. I prefer that the agent proceed with tasks independently, only seeking clarification if absolutely necessary. I also prefer detailed explanations of the code and the logic behind any changes made.

## System Architecture
The application is a React Native mobile app built with the Expo framework, featuring a "pirate treasure map" theme. The backend is a Node.js/Express server with a PostgreSQL database.

### UI/UX Decisions
The design uses a "pirate treasure map" theme with a warm tan/beige color palette. Key elements include an interactive litigation roadmap with a vintage treasure map background (featuring compass rose, skull island, "Starting Point", "Cave of Wonders", and "X marks the treasure"), a realistic treasure chest icon (pirate chest with gold coins on ship deck), pirate-themed badges for gamification, tailored subscription selection screens, and custom pirate-themed images. The Medical Hub features distinct upload sections and "Coming Soon" messages. Visual feedback, enhanced audio icons, and onboarding removed (direct to landing page). Progress tracking includes an animated progress bar with raining gold coins celebration video (11.1 MB) when individual users complete roadmap tasks. A sticky 5-tab bottom navigation is present for individual users, with an "Actions" tab for attorney-assigned tasks. Law Firm and Medical Provider portals have dedicated functionalities like notification systems and analytics dashboards. A new nautical pirate logo with a foggy sea background is used system-wide.

### Technical Implementations
The application uses Expo SDK 52 with React Native 0.76.9 in a modular monorepo structure. The backend is Node.js/Express with PostgreSQL, deployed via Railway, implementing HIPAA-compliant security with AES-256-GCM encryption, RBAC, patient consent management, and audit logging. The system tracks litigation progress through 9 stages and 60 substages, includes client/patient management with real-time search, and a comprehensive connection management system. A subscription management system supports Free, Basic, and Premium tiers. Gamification includes a coin system with a 25,000-coin cap and a universal invite/referral system. Cross-platform compatibility is supported, including web deployment with mobile-only features disabled for web. Real-time coin balance updates are implemented.

Key technical features include:
- **Avatar Video System (Individual Users Only)**: 100% COMPLETE - Comprehensive avatar system with 4 legal-themed characters (The Advocate, Lady Justice, The Paralegal, The Judge). All 12 videos (8 calm background loops + 4 action celebrations) and 4 thumbnails fully integrated (~47MB total assets). Features looping background videos on dashboard, celebratory action videos with coin rewards (substage completion, stage completion, daily bonus), dynamic theming based on selected avatar (4 unique color schemes), long-press preview on selection screen, and 6.5s auto-close action modals. Restricted to individual users only via backend validation and frontend conditional rendering - law firms and medical providers receive 403 errors if attempting access. Avatar database IDs preserved for compatibility (captain→Advocate, navigator→Lady Justice, strategist→Paralegal, advocate→Judge).
- **Bidirectional Connection System**: Complete connection management system allowing law firms to connect with medical providers and vice versa. Law firms can add/remove medical providers via connection codes, medical providers can add/remove law firms, and individual users can connect with both law firms and medical providers. Uses medical_provider_law_firms junction table with soft-delete (connection_status: active/disconnected).
- **Bill Negotiations Portal**: Full-featured negotiation system for law firms and medical providers to negotiate medical bills, including initiation, counter-offers, acceptance, and negotiation history.
- **Client-Medical Provider Relationship Management**: Secure system for tracking client-medical provider relationships, controlled by law firms.
- **Premium Access Control for Settlement Disbursements**: Gating of settlement disbursement features for premium law firm subscribers.
- **Push Notification System**: Targeted notifications, 22 templates, Expo push integration, deep linking, real-time badge count synchronization, client-specific analytics with filtering, and real-time client search in send notification screen.
- **Attorney-Assigned Task System**: Law firms create tasks for clients with priorities, due dates, and coin rewards. Individual users can view, complete, and revert tasks via Action Dashboard. Task reversion preserves coins (anti-farming mechanism) and prevents duplicate coin awards on re-completion.
- **Calendar Integration**: Full device calendar sync via Expo Calendar API.
- **Enhanced Gamification**: 16 achievements, 8 pirate-themed badges with rarity, progress tracking, and a leaderboard system.
- **Stripe Payment Integration**: Full Stripe payment processing for subscriptions and one-time payments, supporting Apple Pay and Google Pay, including a Coin Purchase System.
- **Settlement Disbursement System**: Law firm portal feature for tracking settlement disbursements, including Stripe Connect for account onboarding and payment processing.

### Feature Specifications
- **User Authentication & Types**: Supports Individual, Law Firm, and Medical Provider users across Free, Basic, and Premium tiers.
- **Subscription Pricing Structure**: Tiered pricing for law firms (8 tiers), individuals (3 tiers), and medical providers (4 tiers).
- **Interactive Pirate Map**: A 9-stage litigation journey with progress tracking, detailed substages, modal descriptions, and interactive audio.
- **Video Library**: Integrated educational tutorials.
- **Medical Hub**: HIPAA-compliant document storage placeholder.
- **Law Firm/Medical Provider Portals**: Web and mobile access for managing clients/patients with read-only views of medical records, billing, evidence, and litigation stages.
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