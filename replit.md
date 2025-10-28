# Verdict Path - React Native Mobile App

## Recent Changes (October 28, 2025)
- **Law Firm Paid Tier Client Limits**: Implemented firm size-based client limits for paid tiers:
  - Free tier: 10 clients maximum (unchanged)
  - Small tier: Under 100 clients (99 max)
  - Medium tier: 100-499 clients (499 max)
  - Large tier: 500-999 clients (999 max)
  - Enterprise tier: 1,000+ clients (unlimited)
  - Added firm_size column to law_firms table with enum constraint
  - Created centralized subscriptionLimits.js utility for limit calculations
  - Updated registration and connection controllers to enforce new limits
  - Pirate-themed error messages for both free and paid tier limits
- **Free Trial Subscription Limits**: Implemented client/patient limits for free trial accounts:
  - Added subscription_tier column to law_firms and medical_providers tables with default 'free' value
  - Free tier law firms limited to 10 clients maximum
  - Free tier medical providers limited to 10 patients maximum
  - Limit enforcement during both registration and connection updates
  - Pirate-themed error messages when limits reached (e.g., "Blimey! This law firm's ship be full to the brim!")
  - Database-level DEFAULT constraints ensure new accounts default to free tier
  - Parameterized queries prevent SQL injection
  - Fixed connectionsController to query correct tables (law_firms and medical_providers instead of users)
- **Automatic Unique Code Generation**: Implemented automatic code assignment for law firms and medical providers:
  - Law firms receive unique codes in format LAW-XXXXXX (e.g., LAW-AB3K9P)
  - Medical providers receive unique codes in format MED-XXXXXX (e.g., MED-XY7M2N)
  - Codes are automatically generated during account registration
  - Users see their code immediately after registration in the welcome message
  - Codes use collision-resistant character set (excludes confusing characters like 0/O, 1/I)
  - Backend utility ensures uniqueness with up to 10 generation attempts
  - Removed manual code input from registration screens
  - Clients/patients use these codes to establish connections with law firms/medical providers
- **Dashboard Header Enhancements**: Improved individual user dashboard with connection visibility:
  - Added "Add" button (🔗) in top right corner to quickly open ConnectionsModal
  - Top left now displays connected law firm and medical provider names (⚖️ Law Firm, 🏥 Medical Provider)
  - Auto-fetches connection data on dashboard load
  - Refreshes connection info after adding/updating connections
  - Clean, responsive layout with proper flex positioning
- **My Connections Feature**: Added connection management for individual users:
  - New "My Connections" menu item in individual user dashboard
  - ConnectionsModal component allows users to view and update their law firm and medical provider connections
  - Users can change law firm or medical provider after registration by entering new codes
  - Backend API endpoints: GET /api/connections/my-connections, PUT /api/connections/update-lawfirm, PUT /api/connections/update-medicalprovider
  - Displays current connection details (firm name, facility name, email)
  - Success/error alerts with pirate-themed messaging
  - Automatic linkage in law_firm_clients and medical_provider_patients tables
- **Invite Code for All User Types**: Added invite/referral code field for Law Firms and Medical Providers on registration:
  - Law firms and medical providers can now enter an invite code during sign-up
  - Matches individual user invite code functionality
  - Helps referrers earn rewards when new firms/providers sign up
  - Supports universal referral system across all user types
- **Law Firm Portal Tab Structure**: Refactored Law Firm Client Details Screen to match Medical Provider portal:
  - Converted from single-scroll view to tab-based navigation for better organization
  - Four tabs: Overview (📋), Roadmap (🗺️), Medical Hub (🏥), Evidence Locker (🗃️)
  - Overview tab displays client info, case summary stats, and case details
  - Roadmap tab shows litigation progress with interactive roadmap button
  - Medical Hub tab combines medical records and billing sections
  - Evidence Locker tab displays all evidence documents
  - Consistent styling and UX between Law Firm and Medical Provider portals
- **Evidence Locker Tab Added**: Created dedicated Evidence Locker tab in Medical Provider Patient Details Screen:
  - New tab button (🗃️) next to Medical Hub for better organization
  - Removed evidence section from Medical Hub to eliminate duplication
  - Evidence tab displays all evidence documents with type, title, description, location, and incident date
  - Empty state with helpful message when no evidence exists
  - Info section explaining secure evidence sharing with consent
  - Tab structure: Overview → Roadmap → Medical Hub → Evidence Locker
- **Medical Provider Search Bug Fix**: Fixed critical rendering issue preventing real-time search updates:
  - Fixed syntax error in renderPatientsTab function (removed extra `};` that blocked React re-renders)
  - Fixed backend to handle both encrypted and non-encrypted patient names (resolved "null, null" display issue)
  - Search now filters patients in real-time as you type without requiring page refresh
  - Added fallback logic in medicalproviderController.js for secure name field handling
- **Client/Patient Search Functionality**: Added search tools to both law firm and medical provider portals:
  - Real-time search by name or email with instant filtering
  - Search bar with 🔍 icon and clear button (✕)
  - Case-insensitive search across displayName, email, firstName, and lastName fields
  - Empty states for "no results found"
  - Consistent UX between both portals

## Overview
Verdict Path is a React Native mobile application designed as a legal case management and education platform for Georgia Civil Litigation. It provides an interactive case roadmap, gamification elements, educational video tutorials, and secure medical document storage. The platform aims to assist individuals, law firms, and medical providers in navigating legal processes, supported by tiered subscription models. The project's vision is to offer an engaging and informative tool to support justice.

## User Preferences
I want to work with an AI agent that is autonomous and proactive. It should make decisions and implement changes without constant oversight. I prefer that the agent proceed with tasks independently, only seeking clarification if absolutely necessary. I also prefer detailed explanations of the code and the logic behind any changes made.

## System Architecture
The application is a React Native mobile app built with the Expo framework, featuring a "pirate treasure map" theme. The backend is a Node.js/Express server with a PostgreSQL database.

### UI/UX Decisions
The design is centered on a "pirate treasure map" theme with a warm tan/beige color palette. Key UI/UX elements include an interactive litigation roadmap visualized as a treasure map, a compass/ship wheel logo with the tagline "Chart Your Course to Justice," pirate-themed badges and icons for gamification, and tailored subscription selection screens. The Medical Hub features distinct upload sections and real-time status tracking.

### Technical Implementations
- **Framework**: Expo SDK 52 with React Native 0.76.9.
- **Project Structure**: Modular, organized into `src/screens/` and `src/components/`.
- **Deployment**: Single-server architecture serving both API and Expo web build on port 5000.
- **Gamification Logic**: Coin system for milestones and daily streaks with a fraud-prevented coin-to-credit conversion (lifetime cap of $5 credit).
- **Document Management**: Robust multi-file upload with specific file type filters.
- **State Management**: Centralized in `App.js`.
- **Styling**: Uses shared and screen-specific stylesheets.
- **SVG Animation**: Utilizes `react-native-svg` for cubic Bezier curve path animations.
- **Backend**: Node.js/Express (port 5000) with PostgreSQL for user authentication, client management, litigation tracking, and HIPAA-compliant data handling.
- **HIPAA Security**: Implements AES-256-GCM encryption for PHI at rest, Role-Based Access Control (RBAC) with 6 roles and 23 granular permissions, Patient Consent Management, comprehensive audit logging, and account security measures like lockout after 5 failed login attempts. Dual-layer protection (Permission checks + Consent verification) is enforced before PHI access.
- **Litigation Progress Tracking**: Comprehensive backend integration for tracking user progress through a 9-stage litigation journey with 60 substages. This includes database tables, API endpoints for progress management, automatic coin rewards, and real-time progress display across user portals.
- **Client/Patient Management**: Search functionality for clients (law firm) and patients (medical provider) with real-time filtering. Restructured portals to organize client/patient-specific data on individual detail pages, including medical records, billing, and evidence.
- **Universal Invite/Referral System**: Allows all user types to generate unique invite codes, with coin rewards for individual users whose invitees sign up.
- **Cross-Platform Compatibility**: Extensive bug fixes for iOS, Android, mobile web, and desktop web, including responsive design, StatusBar configuration, and modal event handling.

### Feature Specifications
- **User Authentication & Types**: Supports Individual, Law Firm, and Medical Provider users across Free, Basic, and Premium tiers.
- **Gamification**: Coin system with a lifetime cap.
- **Interactive Pirate Map**: 9-stage litigation journey with progress tracking, detailed substages, and modal descriptions.
- **Video Library**: Integrated educational tutorials.
- **Medical Hub**: HIPAA-compliant document storage and upload system for medical records and bills.
- **Law Firm/Medical Provider Portals**: Web and mobile access for managing clients/patients, medical records, billing, evidence, and litigation stages.
- **Document Upload**: Intuitive, pirate-themed upload modal with camera and photo library options, including proper permission handling.

## External Dependencies
- **Expo SDK**: Core framework for React Native development.
- **React Native**: For building mobile applications.
- **React**: JavaScript library for UIs.
- **react-native-svg**: For rendering SVG graphics and animations.
- **@react-native-async-storage/async-storage**: For persistent storage.
- **PostgreSQL**: Database for backend data storage.
- **Node.js/Express**: Backend API development.