# Verdict Path - React Native Mobile App

## Overview
Verdict Path is a legal case management and education platform designed for Georgia Civil Litigation. It offers an interactive case roadmap, gamification features, educational video tutorials, and secure medical document storage. The project aims to provide an engaging and informative tool for navigating the complexities of legal processes.

## User Preferences
I want to work with an AI agent that is autonomous and proactive. It should make decisions and implement changes without constant oversight. I prefer that the agent proceed with tasks independently, only seeking clarification if absolutely necessary. I also prefer detailed explanations of the code and the logic behind any changes made.

## System Architecture
The application is a React Native mobile application built with the Expo framework.

### UI/UX Decisions
- **Thematic Design**: The core UI/UX is built around a "pirate treasure map" theme, featuring treasure chests for stages, a parchment-like background, and pirate-themed avatars.
- **Logo Integration**: The Verdict Path logo is seamlessly integrated with a matching background color (`#f5f5f5`) for a clean, professional appearance.
- **Interactive Roadmap**: The litigation roadmap is transformed into an interactive treasure map, where each stage is represented by a positioned treasure chest. Clicking a treasure chest opens a modal with stage details, progress tracking, sub-stages, and integrated tutorial videos.
- **Animated Progress**: Animated green winding paths connect completed stages to the next, using S-curve designs and Bezier curves for a natural, flowing animation.
- **Subscription Selection**: A dedicated screen within the registration flow presents tiered subscription options based on user type (Individual, Law Firm, Medical Provider) and organization size.
- **Medical Hub UI**: Features distinct upload sections for Medical Bills and Medical Records with "Take Photo" or "Choose Files" options, real-time status tracking, and file viewing.
- **Data Entry UI**: Text-based tasks in the Pre-Litigation stage use a purple "✏️ Enter Information" button, displaying saved information with an "Edit Information" option.

### Technical Implementations
- **Framework**: Expo SDK 52 with React Native 0.76.9.
- **Project Structure**: Organized into `src/screens/`, `src/components/`, `src/utils/`, `src/constants/`, and `src/styles/` for modularity.
- **Gamification Logic**: Implements a coin system for completing milestones, daily login streaks, and coin-to-credit conversion, managed by utility functions.
- **Document Management**: Features robust document upload functionality with multi-file support, specific file type filters, and integration with the Medical Hub for validation.
- **State Management**: Centralized in `App.js` and passed via props.
- **Styling**: Uses shared common styles and screen-specific styles.
- **Image Processing**: Python/Pillow was used for logo background integration to remove artifacts.
- **SVG Animation**: Utilizes `react-native-svg` with cubic Bezier curves for animated path rendering.

### Feature Specifications
- **User Authentication**: Register, login, logout (mock implementation).
- **User Types & Subscriptions**: Supports Individual, Law Firm, and Medical Provider user types with Free, Basic, and Premium subscription tiers, including dynamic, size-based pricing for organizations.
- **Avatar Selection**: Users can choose from four pirate-themed avatars (Captain, Navigator, Gunner, First Mate).
- **Gamification**: Coin system for stage completion, daily streaks, and coin conversion to account credits.
- **Interactive Pirate Map**: 9-stage litigation journey visualized as a treasure map with avatar progress tracking, interactive treasure chests, and modal-based stage details.
- **Video Library**: Integrated educational video tutorials covering various litigation stages.
- **Medical Hub**: HIPAA-compliant document storage and upload system for medical bills and records, with completion validation tied to roadmap progress.
- **Document Upload & Data Entry**: Pre-Litigation stage features tasks requiring file uploads (e.g., Police Report, Body Cam) and text-based data entry (e.g., Auto Insurance details).
- **Comprehensive Stage Details**: Stages like Settlement and Trial have detailed multi-step breakdowns with individual coin awards, providing educational value.

## External Dependencies
- **Expo SDK**: Core framework for React Native development.
- **React Native**: Used for building native mobile applications.
- **React**: JavaScript library for building user interfaces.
- **react-dom**: Provides DOM-specific methods for React.
- **react-native-web**: Enables running React Native components and APIs on the web.
- **Metro bundler**: JavaScript bundler for React Native.
- **react-native-svg**: Library for rendering SVG graphics in React Native, used for path animations.