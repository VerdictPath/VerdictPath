# Verdict Path - React Native Mobile App

## Overview
Verdict Path is a React Native mobile application designed as a legal case management and education platform for Georgia Civil Litigation. It provides an interactive case roadmap, gamification elements, educational video tutorials, and secure medical document storage. The platform aims to assist individuals, law firms, and medical providers in navigating legal processes, supported by tiered subscription models. The project's vision is to offer an engaging and informative tool to support justice.

## User Preferences
I want to work with an AI agent that is autonomous and proactive. It should make decisions and implement changes without constant oversight. I prefer that the agent proceed with tasks independently, only seeking clarification if absolutely necessary. I also prefer detailed explanations of the code and the logic behind any changes made.

## System Architecture
The application is a React Native mobile app built with the Expo framework, featuring a "pirate treasure map" theme. The backend is a Node.js/Express server with a PostgreSQL database.

### UI/UX Decisions
The design is centered on a "pirate treasure map" theme with a warm tan/beige color palette. Key UI/UX elements include an interactive litigation roadmap, a compass/ship wheel logo, pirate-themed badges for gamification, and tailored subscription selection screens. The Medical Hub features distinct upload sections and real-time status tracking. UI elements like audio icons for roadmap substages and descriptive subscription cards are consistently styled to match the theme.

**Roadmap Substage Completion Visual Feedback**:
- "Mark Complete" buttons appear in RED (#e74c3c) for incomplete substages
- After completion, buttons transform to solid GREEN (#27ae60) displaying "✓ Completed" in white text
- Clear visual distinction helps users quickly identify their progress
- UI state properly syncs with backend completion status

**Audio Icons Enhancement**:
- Audio icons (🎧) in roadmap substages feature solid blue background (#3498db) for high visibility
- Enhanced size (46x46) with shadow/elevation effects for better user recognition
- Positioned prominently within substage descriptions

**Individual User Dashboard**:
- Header button displays "Invite Friends" (👍) in the top right to allow individual users to invite other users
- "My Connections" link appears in the dashboard menu for managing law firm and medical provider connections
- Separate invite and connections functionality for clear user workflows
- **Roadmap Screen**: File upload functionality completely disabled - substages with upload requirements display "🏴‍☠️ File upload coming soon!" banners
- **Medical Hub Screen**: Upload functionality completely disabled with pirate-themed "Coming Soon" messaging

**Medical Provider Portal**:
- **Upload functionality COMPLETELY DISABLED across all screens** - no active upload pathways remain
- Patient Details view displays pirate-themed "🏴‍☠️ Coming Soon" badges for upload sections
- All upload imports, state variables, and UploadModal component removed from codebase
- All upload handler functions disabled to prevent any document uploads until feature is fully implemented
- "Manage Law Firm Connections" link added to dashboard for future law firm connection management
- Connections tab displays pirate-themed coming soon message explaining future feature to connect with cooperating law firms

**Law Firm Portal**:
- "Invite" button in header for inviting new users via unique firm code
- "My Connections" link added to dashboard menu for managing client and provider connections
- Both invite and connections functionality clearly separated for streamlined workflows
- Client Details view is read-only for Medical Hub (no upload capabilities)

### Technical Implementations
- **Framework**: Expo SDK 52 with React Native 0.76.9.
- **Project Structure**: Modular, organized into `src/screens/` and `src/components/`. Monorepo structure with frontend at root and backend in `backend/` subdirectory.
- **Backend**: Node.js/Express (port 5000) with PostgreSQL for user authentication, client management, litigation tracking, and HIPAA-compliant data handling.
- **Deployment**: Railway deployment configured via `railway.json`, `nixpacks.toml`, and `Procfile` to ensure backend server runs correctly. Frontend (Expo) is for local development only; Railway deploys backend API.
- **HIPAA Security**: Implements AES-256-GCM encryption for PHI at rest, Role-Based Access Control (RBAC) with 6 roles and 23 granular permissions, Patient Consent Management, comprehensive audit logging, and account security measures.
- **Litigation Progress Tracking**: Comprehensive backend integration for tracking user progress through a 9-stage litigation journey with 60 substages, including database tables, API endpoints, automatic coin rewards, and real-time progress display.
- **Client/Patient Management**: Includes real-time search functionality by name or email, restructured portals with tab-based navigation (Overview, Roadmap, Medical Hub, Evidence Locker) for individual client/patient details, and robust connection management for users.
- **Subscription Management**: Implements a complete system for individual, law firm, and medical provider subscriptions with Free, Basic, and Premium tiers. This includes automatic unique code generation, free trial limits, expanded law firm and medical provider size tiers, and a full upgrade/downgrade protocol with validation.
- **Gamification Logic**: Coin system for milestones and daily streaks with a fraud-prevented coin-to-credit conversion (lifetime cap of $5 credit).
- **Universal Invite/Referral System**: Allows all user types to generate unique invite codes, with coin rewards for individual users whose invitees sign up.
- **Cross-Platform Compatibility**: Extensive support for iOS, Android, mobile web, and desktop web.

### Feature Specifications
- **User Authentication & Types**: Supports Individual, Law Firm, and Medical Provider users across Free, Basic, and Premium tiers.
- **Interactive Pirate Map**: 9-stage litigation journey with progress tracking, detailed substages, and modal descriptions, including interactive audio descriptions with enhanced visibility.
- **Video Library**: Integrated educational tutorials.
- **Medical Hub**: HIPAA-compliant document storage placeholder with pirate-themed "coming soon" messages. **All upload functionality completely disabled** across Individual, Medical Provider, and Law Firm portals pending full implementation.
- **Law Firm/Medical Provider Portals**: Web and mobile access for managing clients/patients with read-only views of medical records, billing, evidence, and litigation stages.
- **Document Upload Status**: Feature completely disabled system-wide. All upload buttons, modals, file pickers, and API endpoints are inactive. Display pirate-themed "Coming Soon" messaging throughout the application.

## External Dependencies
- **Expo SDK**: Core framework for React Native development.
- **React Native**: For building mobile applications.
- **React**: JavaScript library for UIs.
- **react-native-svg**: For rendering SVG graphics and animations.
- **@react-native-async-storage/async-storage**: For persistent storage.
- **PostgreSQL**: Database for backend data storage.
- **Node.js/Express**: Backend API development.