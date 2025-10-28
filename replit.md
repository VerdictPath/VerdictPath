# Verdict Path - React Native Mobile App

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