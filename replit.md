# Verdict Path - React Native Mobile App

## Overview
Verdict Path is a legal case management and education platform designed for Georgia Civil Litigation. It offers an interactive case roadmap, gamification features, educational video tutorials, and secure medical document storage. The project aims to provide an engaging and informative tool for navigating the complexities of legal processes.

## User Preferences
I want to work with an AI agent that is autonomous and proactive. It should make decisions and implement changes without constant oversight. I prefer that the agent proceed with tasks independently, only seeking clarification if absolutely necessary. I also prefer detailed explanations of the code and the logic behind any changes made.

## Recent Changes

### October 23, 2025 - Updated Logo
- **Logo Update**: Replaced logo with new Verdict Path branding featuring compass/ship wheel design with "Chart Your Course to Justice" tagline

### October 23, 2025 - Pirate-Themed Icons Throughout App
- **Landing Screen & Dashboard UI Enhancement**: Replaced emoji icons with sophisticated pirate-themed badges throughout the app
- **Landing Screen UI Enhancement**: Replaced emoji icons with sophisticated custom badges
  - Custom geometric icons matching the treasure map theme without being cartoonish
  - **Compass** (navy blue with gold accents) - Interactive case roadmap
  - **Gold Coin** (golden with shine effect) - Earn coins as you progress
  - **Professional Video Camera** (black with lens, green viewfinder, microphone) - Expert video tutorials
  - **Red Hospital Cross** (red cross on white background) - Secure medical records storage
  - **Purple Gem** (diamond-cut design) - Daily login rewards
  - Sophisticated color palette: ocean blues, treasure gold, wood tones, gem purple, flame orange
  - 40px circular badges on landing page, 48px on dashboard menu, 32px in stats
  - Professional nautical/treasure aesthetic
- **Dashboard Screen Icons**: Applied custom geometric icons to all dashboard elements
  - **Stats Icons**: Gold coin (coins), flame (login streak), purple gem (tier)
  - **Menu Icons**: 
    - Compass (roadmap) - Navy blue with gold accents
    - Professional video camera (videos) - Black background, detailed lens with blue reflection, green viewfinder, microphone
    - Hospital cross (medical hub) - Red cross on white background
    - Treasure chest (convert) - Wooden chest with gold lock matching pirate theme
    - Power symbol (logout) - Red background with universal power icon
  - **Bonus Button**: Treasure chest icon for daily bonus claim
  - Consistent design language across entire app

### October 23, 2025 - Answer Filed Stage Added
- **Complaint Filed Expansion**: Added "Answer Filed (within 30 days)" as 4th substage
  - Tracks when defendant files their response to the complaint
  - Awards 7 coins upon completion
  - Total Complaint Filed stage coins increased to 32
  - Icon: 📄 (document)
  - Full substages: Draft Complaint, File with Court, Serve Defendant, Answer Filed

### October 22, 2025 - Comprehensive Video Library
- **Video Library Expansion**: Updated video library to include all 13 tutorial videos from all litigation stages
  - Pre-Litigation: Pre-Litigation Essentials, Document Collection Guide
  - Complaint Filed: Filing Your Complaint
  - Discovery Begins: Understanding Discovery, Discovery Response Strategies
  - Depositions: Deposition Deep Dive, How to Testify Effectively
  - Mediation: Mediation Mastery
  - Trial Prep: Trial Preparation Guide, Courtroom Procedures
  - Trial: Trial Tactics
  - Settlement: Settlement Strategies
  - Case Resolved: Post-Trial Procedures
- **Video Organization**: Each video tagged with category for easy browsing
- **Pricing Tiers**: Videos range from free to premium ($2.99-$6.99)
- **Total Duration**: Over 5 hours of educational legal content

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