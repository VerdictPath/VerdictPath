# Verdict Path - React Native Mobile App

## Overview
Verdict Path is a legal case management and education platform for Georgia Civil Litigation. It provides an interactive case roadmap, gamification features, educational video tutorials, and secure medical document storage. The project aims to offer an engaging and informative tool for navigating legal processes, supporting individual users, law firms, and medical providers with tiered subscription options.

## User Preferences
I want to work with an AI agent that is autonomous and proactive. It should make decisions and implement changes without constant oversight. I prefer that the agent proceed with tasks independently, only seeking clarification if absolutely necessary. I also prefer detailed explanations of the code and the logic behind any changes made.

## System Architecture
The application is a React Native mobile application built with the Expo framework, featuring a "pirate treasure map" theme.

### UI/UX Decisions
The UI/UX centers on a "pirate treasure map" theme with a warm tan/beige color palette. Key elements include:
- An interactive litigation roadmap visualized as a treasure map with animated paths and treasure chests for stages.
- The Verdict Path logo integrates a compass/ship wheel design with a "Chart Your Course to Justice" tagline, influencing the app's updated color scheme of Tan/Sand, Cream, Mahogany, Warm Gold, Navy, and Warm Gray.
- Pirate-themed badges and icons are used throughout the landing and dashboard screens for gamification and navigation.
- Subscription selection screens are tailored by user type (Individual, Law Firm, Medical Provider).
- The Medical Hub features distinct upload sections and real-time status tracking.

### Technical Implementations
- **Framework**: Expo SDK 52 with React Native 0.76.9.
- **Project Structure**: Modular organization with `src/screens/`, `src/components/`, etc.
- **Deployment**: Single-server architecture - backend serves both API and Expo web build on port 5000
- **Gamification Logic**: Implements a coin system for milestones and daily streaks, with coin-to-credit conversion.
- **Document Management**: Robust upload functionality for medical documents with multi-file support and specific file type filters.
- **State Management**: Centralized in `App.js`.
- **Styling**: Uses shared and screen-specific styles.
- **Image Processing**: Python/Pillow for logo background integration.
- **SVG Animation**: `react-native-svg` for cubic Bezier curve path animations.
- **Backend**: Node.js/Express (port 5000) with PostgreSQL database for user authentication, client management, litigation tracking, and HIPAA-compliant data handling.
- **HIPAA Security (Phase 1 & 2 Complete)**:
  - AES-256-GCM encryption for all Protected Health Information (PHI) at rest
  - Role-Based Access Control (RBAC) with 6 roles and 23 granular permissions
  - Patient Consent Management system for controlling PHI sharing
  - Comprehensive audit logging for all PHI access with IP tracking
  - Account security: lockout after 5 failed login attempts
  - Dual-layer protection: Permission checks + Consent verification before PHI access
  - Auto-consent when clients register with law firm codes

### Feature Specifications
- **User Authentication & Types**: Supports Individual, Law Firm, and Medical Provider user types with Free, Basic, and Premium subscription tiers.
- **Avatar Selection**: Pirate-themed avatars (Captain, Navigator, Gunner, First Mate).
- **Gamification**: Coin system for stage completion and daily streaks with fraud prevention:
  - Conversion rate: 5,000 coins = $1 credit
  - **Lifetime cap: $5 maximum per user account** (25,000 coins total)
  - Tracks total_coins and coins_spent in database
  - Prevents refunding coins already converted to credits
  - Full audit trail via coin_conversions table
  - Backend API enforces lifetime cap and prevents infinite credit exploit
- **Interactive Pirate Map**: 9-stage litigation journey with progress tracking and modal-based stage details. Pre-Litigation stage includes 11 substages (most recent: Demand Sent, Demand Rejected). "Answer Filed" substage added to "Complaint Filed" stage.
- **Video Library**: Integrated educational tutorials covering all litigation stages, with a total of 13 videos over 5 hours of content, ranging from free to premium.
- **Medical Hub**: HIPAA-compliant document storage and upload system for medical bills and records.
- **Document Upload & Data Entry**: Tasks for file uploads (e.g., Police Report) and text-based data entry.
- **Law Firm Client Portal**: Web and mobile access for law firms to manage clients, medical records, billing, evidence, and litigation stages.
- **HIPAA Compliance**: Production-ready HIPAA compliance implementation:
  - **Phase 1 (Complete)**: Encryption, audit logging, account security
  - **Phase 2 (Complete)**: Role-Based Access Control (RBAC) and Patient Consent Management
  - 6 roles: CLIENT, LAW_FIRM_ADMIN, LAW_FIRM_STAFF, MEDICAL_PROVIDER_ADMIN, MEDICAL_PROVIDER_STAFF, SYSTEM_ADMIN
  - 23 permissions across 6 categories: PHI Access, Medical Records, Billing, Litigation, Consent, Administration
  - Consent types: FULL_ACCESS, MEDICAL_RECORDS_ONLY, BILLING_ONLY, LITIGATION_ONLY, CUSTOM
  - API endpoints: Grant/revoke consent, view consents, check consent status
  - Meets HIPAA §164.502(a), §164.506, §164.508, §164.524, §164.528

## External Dependencies
- **Expo SDK**: Core framework for React Native development.
- **React Native**: For building mobile applications.
- **React**: JavaScript library for UIs.
- **react-dom**: DOM-specific methods for React.
- **react-native-web**: For running React Native components on the web.
- **Metro bundler**: JavaScript bundler for React Native.
- **react-native-svg**: For rendering SVG graphics and path animations.
- **@react-native-async-storage/async-storage**: For persistent storage in React Native.
- **PostgreSQL**: Database for backend data storage.
- **Node.js/Express**: Backend API development.

## Recent Bug Fixes (October 23, 2025)
- **Fixed authToken undefined error**: Added `authToken` variable derived from `user?.token` in App.js to fix console errors when navigating to RoadmapScreen and MedicalHubScreen
- **Fixed HIPAAFormsScreen navigation**: Updated navigation props to use consistent `onNavigate` pattern
- **Fixed API port mismatch**: Corrected LawFirmClientDetailsScreen API URL from localhost:3000 to localhost:5000
- **Added missing dependency**: Installed @react-native-async-storage/async-storage required by HIPAAFormsScreen
- **Rebuilt web bundle**: Regenerated Expo web build with all fixes applied