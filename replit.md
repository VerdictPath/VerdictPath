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
- **Gamification Logic**: Implements a coin system for milestones and daily streaks, with coin-to-credit conversion.
- **Document Management**: Robust upload functionality for medical documents with multi-file support and specific file type filters.
- **State Management**: Centralized in `App.js`.
- **Styling**: Uses shared and screen-specific styles.
- **Image Processing**: Python/Pillow for logo background integration.
- **SVG Animation**: `react-native-svg` for cubic Bezier curve path animations.
- **Backend**: Node.js/Express with PostgreSQL database for user authentication, client management, litigation tracking, and HIPAA-compliant data handling, including AES-256-GCM encryption for PHI, audit logging, and account security features.

### Feature Specifications
- **User Authentication & Types**: Supports Individual, Law Firm, and Medical Provider user types with Free, Basic, and Premium subscription tiers.
- **Avatar Selection**: Pirate-themed avatars (Captain, Navigator, Gunner, First Mate).
- **Gamification**: Coin system for stage completion and daily streaks.
- **Interactive Pirate Map**: 9-stage litigation journey with progress tracking and modal-based stage details. "Answer Filed" substage added to "Complaint Filed" stage.
- **Video Library**: Integrated educational tutorials covering all litigation stages, with a total of 13 videos over 5 hours of content, ranging from free to premium.
- **Medical Hub**: HIPAA-compliant document storage and upload system for medical bills and records.
- **Document Upload & Data Entry**: Tasks for file uploads (e.g., Police Report) and text-based data entry.
- **Law Firm Client Portal**: Web and mobile access for law firms to manage clients, medical records, billing, evidence, and litigation stages.
- **HIPAA Compliance**: Comprehensive security features including AES-256-GCM encryption for PHI, detailed audit logging, and account security measures (e.g., lockout after failed login attempts).

## External Dependencies
- **Expo SDK**: Core framework for React Native development.
- **React Native**: For building mobile applications.
- **React**: JavaScript library for UIs.
- **react-dom**: DOM-specific methods for React.
- **react-native-web**: For running React Native components on the web.
- **Metro bundler**: JavaScript bundler for React Native.
- **react-native-svg**: For rendering SVG graphics and path animations.
- **PostgreSQL**: Database for backend data storage.
- **Node.js/Express**: Backend API development.