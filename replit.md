# Verdict Path - React Native Mobile App

## Overview
Verdict Path is a legal case management and education platform for Georgia Civil Litigation, designed as a React Native mobile application. It offers an interactive case roadmap, gamification, educational video tutorials, and secure medical document storage. The platform aims to assist individuals, law firms, and medical providers in navigating legal processes, supported by tiered subscription models. The project's vision is to provide an engaging and informative tool for justice.

## Recent Changes (October 27, 2025)
- **Intuitive Upload Modal**: Replaced basic Alert dialogs with a custom UploadModal component (`src/components/UploadModal.js`) for the individual user portal's pre-litigation stage. The new modal features:
  - Beautiful pirate-themed design with cream, mahogany, and warm gold colors
  - Two prominent option cards: "Take Photo" (camera) and "Choose Files" (photo library)
  - Clear file format information showing accepted types
  - Proper async flow ensuring modal stays mounted during file picker interaction
  - Null-safe rendering with optional chaining
  - Smooth fade animations on open/close
  - Three ways to close: X button, tap outside, or Cancel button
  - High z-index to ensure modal appears on top
- **Camera & Photo Library Permissions**: Implemented proper permission handling for iOS and Android:
  - Camera permission request with user-friendly error messages
  - Photo library permission request for selecting existing photos
  - Detailed logging for debugging permission issues
  - Clear guidance to enable permissions in device settings if denied
  - Separate functions for camera (`pickImage`) and photo library (`pickImageFromLibrary`)

## User Preferences
I want to work with an AI agent that is autonomous and proactive. It should make decisions and implement changes without constant oversight. I prefer that the agent proceed with tasks independently, only seeking clarification if absolutely necessary. I also prefer detailed explanations of the code and the logic behind any changes made.

## System Architecture
The application is a React Native mobile app built with the Expo framework, featuring a "pirate treasure map" theme.

### UI/UX Decisions
The design is centered on a "pirate treasure map" theme with a warm tan/beige color palette. Key UI/UX elements include:
- An interactive litigation roadmap visualized as a treasure map with animated paths and chests.
- A Verdict Path logo featuring a compass/ship wheel design and a "Chart Your Course to Justice" tagline, influencing the app's color scheme (Tan/Sand, Cream, Mahogany, Warm Gold, Navy, Warm Gray).
- Pirate-themed badges and icons for gamification and navigation on landing and dashboard screens.
- Tailored subscription selection screens for Individual, Law Firm, and Medical Provider user types.
- A Medical Hub with distinct upload sections and real-time status tracking.

### Technical Implementations
- **Framework**: Expo SDK 52 with React Native 0.76.9.
- **Project Structure**: Modular, with `src/screens/` and `src/components/`.
- **Deployment**: Single-server architecture where the backend serves both API and Expo web build on port 5000.
- **Gamification Logic**: Coin system for milestones and daily streaks, with fraud-prevented coin-to-credit conversion (lifetime cap of $5 credit per user).
- **Document Management**: Robust multi-file upload with specific file type filters.
- **State Management**: Centralized in `App.js`.
- **Styling**: Shared and screen-specific styles.
- **SVG Animation**: Utilizes `react-native-svg` for cubic Bezier curve path animations.
- **Backend**: Node.js/Express (port 5000) with PostgreSQL for user authentication, client management, litigation tracking, and HIPAA-compliant data handling.
- **HIPAA Security**:
  - AES-256-GCM encryption for PHI at rest.
  - Role-Based Access Control (RBAC) with 6 roles and 23 granular permissions.
  - Patient Consent Management for PHI sharing control.
  - Comprehensive audit logging for PHI access with IP tracking.
  - Account security measures including lockout after 5 failed login attempts.
  - Dual-layer protection (Permission checks + Consent verification) before PHI access.
  - Auto-consent for clients registering with law firm codes.
- **Litigation Progress Tracking**: Comprehensive backend integration for tracking user progress through a 9-stage litigation journey, including 60 substages. This includes:
  - Database tables (`user_litigation_progress`, `litigation_substage_completions`, etc.).
  - API endpoints for getting/updating progress, completing stages/substages, and tracking video views.
  - Automatic coin rewards and progress percentage calculation upon substage completion (including auto-completion via document uploads).
  - Manual task completion feature for ALL pre-litigation tasks - users can mark tasks complete without upload requirements.
  - Real-time progress display on the Dashboard, Law Firm client portal, and Medical Provider dashboard.

### Feature Specifications
- **User Authentication & Types**: Supports Individual, Law Firm, Medical Provider (Free, Basic, Premium tiers).
- **Avatar Selection**: Pirate-themed avatars.
- **Gamification**: Coin system with a lifetime cap of $5 credit ($25,000 coins).
- **Interactive Pirate Map**: 9-stage litigation journey with progress tracking, including detailed substages and modal descriptions.
- **Video Library**: Integrated educational tutorials covering litigation stages.
- **Medical Hub**: HIPAA-compliant document storage and upload system.
- **Document Upload & Data Entry**: Tasks for file uploads and text-based data entry.
- **Law Firm Client Portal**: Web and mobile access for client, medical record, billing, evidence, and litigation stage management.
- **HIPAA Compliance**: Production-ready implementation including encryption, RBAC (6 roles, 23 permissions), and Patient Consent Management (multiple consent types).

## External Dependencies
- **Expo SDK**: Core framework for React Native development.
- **React Native**: For building mobile applications.
- **React**: JavaScript library for UIs.
- **react-native-svg**: For rendering SVG graphics and animations.
- **@react-native-async-storage/async-storage**: For persistent storage.
- **PostgreSQL**: Database for backend data storage.
- **Node.js/Express**: Backend API development.