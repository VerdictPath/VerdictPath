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
- **PostgreSQL**: Database for backend data storage.
- **Node.js/Express**: Backend API development.