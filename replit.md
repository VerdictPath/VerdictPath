# Verdict Path - React Native Mobile App

## Overview
Verdict Path is a React Native mobile application designed as a legal case management and education platform for Georgia Civil Litigation. It provides an interactive case roadmap, gamification elements, educational video tutorials, and secure medical document storage. The platform aims to assist individuals, law firms, and medical providers in navigating legal processes, supported by tiered subscription models. The project's vision is to offer an engaging and informative tool to support justice.

## User Preferences
I want to work with an AI agent that is autonomous and proactive. It should make decisions and implement changes without constant oversight. I prefer that the agent proceed with tasks independently, only seeking clarification if absolutely necessary. I also prefer detailed explanations of the code and the logic behind any changes made.

## System Architecture
The application is a React Native mobile app built with the Expo framework, featuring a "pirate treasure map" theme. The backend is a Node.js/Express server with a PostgreSQL database.

### UI/UX Decisions
The design is centered on a "pirate treasure map" theme with a warm tan/beige color palette. Key UI/UX elements include an interactive litigation roadmap, a compass/ship wheel logo, pirate-themed badges for gamification, and tailored subscription selection screens. The Medical Hub features distinct upload sections and real-time status tracking. UI elements like audio icons for roadmap substages and descriptive subscription cards are consistently styled to match the theme.

### Technical Implementations
- **Framework**: Expo SDK 52 with React Native 0.76.9.
- **Project Structure**: Modular, organized into `src/screens/` and `src/components/`.
- **Backend**: Node.js/Express (port 5000) with PostgreSQL for user authentication, client management, litigation tracking, and HIPAA-compliant data handling.
- **HIPAA Security**: Implements AES-256-GCM encryption for PHI at rest, Role-Based Access Control (RBAC) with 6 roles and 23 granular permissions, Patient Consent Management, comprehensive audit logging, and account security measures.
- **Litigation Progress Tracking**: Comprehensive backend integration for tracking user progress through a 9-stage litigation journey with 60 substages, including database tables, API endpoints, automatic coin rewards, and real-time progress display.
- **Client/Patient Management**: Includes real-time search functionality by name or email, restructured portals with tab-based navigation (Overview, Roadmap, Medical Hub, Evidence Locker) for individual client/patient details, and robust connection management for users.
- **Subscription Management**: Implements a complete system for individual, law firm, and medical provider subscriptions with Free, Basic, and Premium tiers. This includes automatic unique code generation, free trial limits, expanded law firm and medical provider size tiers, and a full upgrade/downgrade protocol with validation.
- **Gamification Logic**: Coin system for milestones and daily streaks with a fraud-prevented coin-to-credit conversion (lifetime cap of $5 credit).
- **Universal Invite/Referral System**: Allows all user types to generate unique invite codes, with coin rewards for individual users whose invitees sign up.
- **Cross-Platform Compatibility**: Extensive support for iOS, Android, mobile web, and desktop web.

### Feature Specifications
- **User Authentication & Types**: Supports Individual, Law Firm, and Medical Provider users across Free, Basic, and Premium tiers.
- **Interactive Pirate Map**: 9-stage litigation journey with progress tracking, detailed substages, and modal descriptions, now including interactive audio descriptions.
- **Video Library**: Integrated educational tutorials.
- **Medical Hub**: HIPAA-compliant document storage and upload system for medical records and bills.
- **Law Firm/Medical Provider Portals**: Web and mobile access for managing clients/patients, medical records, billing, evidence, and litigation stages.
- **Document Upload**: Intuitive, pirate-themed upload modal with camera and photo library options.

## External Dependencies
- **Expo SDK**: Core framework for React Native development.
- **React Native**: For building mobile applications.
- **React**: JavaScript library for UIs.
- **react-native-svg**: For rendering SVG graphics and animations.
- **@react-native-async-storage/async-storage**: For persistent storage.
- **PostgreSQL**: Database for backend data storage.
- **Node.js/Express**: Backend API development.