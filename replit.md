# Verdict Path - React Native Mobile App

## Overview
Verdict Path is a legal case management and education platform focused on Georgia Civil Litigation. It provides users with an interactive case roadmap, gamification features, video tutorials, and secure medical document storage.

## Project Type
React Native mobile application using Expo framework

## Recent Changes

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

### October 22, 2025 - Detailed Settlement Stage Substeps
- **Settlement Stage Expansion**: Updated Settlement stage with comprehensive 10-step disbursement process
  - Negotiations
  - Agreement to settle
  - Settlement release
  - Lien affidavit
  - Settlement statement
  - Disbursement to attorney
  - Attorney fees/costs/case expenses disbursed
  - Medical provider payments
  - Funding payments
  - Client disbursement
- **Coin Distribution**: Each substep awards coins (6-15 coins per step, total 85 coins possible)
- **Financial Transparency**: Detailed breakdown of settlement disbursement process for user education

### October 22, 2025 - Detailed Trial Stage Substeps
- **Trial Stage Expansion**: Updated Trial stage with comprehensive 16-step process
  - PreTrial motions
  - Jury selection / voir dire
  - Opening statements
  - Plaintiff's witness testimony (direct and cross examination)
  - Plaintiff's evidence (pictures, documents, records, affidavits)
  - Plaintiff rests
  - Motions
  - Defense's witness testimony (direct and cross examination)
  - Defense's evidence (pictures, documents, records, affidavits)
  - Defense rests
  - Motions
  - Closing arguments
  - Jury instructions (from judge)
  - Jury deliberations
  - Jury questions
  - Verdict
- **Coin Distribution**: Each substep awards coins (5-20 coins per step, total 175 coins possible)
- **Educational Value**: Provides detailed breakdown of trial procedures for user education

### October 22, 2025 - Seamless Logo Integration
- **Landing Screen Logo**: Updated Verdict Path stacked logo with seamless background integration
  - Logo background color matches app background (#f5f5f5) for clean, professional appearance
  - Removed white and beige background artifacts using Python/Pillow image processing
  - Logo displays: Green winding path icon, gold compass, "VERDICT PATH" branding, and taglines
  - Optimized at 350x350 pixels with proper aspect ratio

### October 22, 2025 - Tiered Subscription System
- **Subscription Selection Screen**: New screen in registration flow showing pricing tiers
- **User-Type Based Pricing**: Different pricing for Individual, Law Firm, and Medical Provider
- **Organization Size Selection**: Law Firms and Medical Providers select size (Small, Medium, Large, Enterprise)
- **Three Subscription Tiers**:
  - Free: Limited features, 30-day trial for organizations
  - Basic: Full features, client/patient management
  - Premium: Advanced features, priority support, custom integrations
- **Dynamic Pricing**:
  - Individuals: $0 (Free), $4.99 (Basic), $11.99 (Premium)
  - Law Firms: Size-based pricing from $100-$2,500 (Basic), $135-$3,375 (Premium)
  - Medical Providers: 30% discount from law firm pricing
    - Small: $70 (Basic), $95 (Premium)
    - Medium: $350 (Basic), $473 (Premium)
    - Large: $840 (Basic), $1,134 (Premium)
    - Enterprise: $1,750 (Basic), $2,363 (Premium)
- **Law Firm Features** (uniform across all sizes):
  - Basic Package: Basic package for your clients, Document storage for your clients, Basic analytics dashboard
  - Premium Package: Everything in Basic, Custom branding, Medical Hub, Premium analytics, HIPAA-Compliant Storage, Download medical bills and records from patient and medical providers accounts
- **Medical Provider Features** (uniform across all sizes):
  - Basic Package: Basic package for your patients, Document storage for your patients, Basic analytics dashboard
  - Premium Package: Everything in Basic, Custom branding, Medical Hub, HIPAA-compliant storage, Upload medical bills and records to patient account
- **Registration Flow**: Landing → Register (user type) → Subscription Selection → Login → Dashboard
- **Stage Names on Map**: Small text labels below each treasure chest for better navigation

### October 22, 2025 - Medical Hub Upload Validation
- **Medical Hub Upload System**: Full document upload functionality in Medical Hub
  - Separate upload sections for Medical Bills and Medical Records
  - "Take Photo" or "Choose Files" upload options for each document type
  - View uploaded documents with file lists and counts
  - Real-time upload status tracking
- **Completion Validation**: Medical Bills and Medical Records in Pre-Litigation stage can only be marked complete after uploading documents in Medical Hub
  - Users redirected to Medical Hub if attempting to mark complete without uploads
  - Clear error messages guide users to upload required documents
  - Upload status synchronized between Roadmap and Medical Hub

### October 22, 2025 - Document Upload and Data Entry Functionality
- **File Upload System**: Added document upload functionality to Pre-Litigation stage
- **Upload-Based Tasks**: 5 tasks require file uploads
  - Police Report, Body Cam, Dash Cam, Pictures, Health Insurance Card
- **Data Entry Tasks**: 2 tasks use simple text input instead of uploads
  - Auto Insurance Company (text entry for company name)
  - Auto Insurance Policy Number (text entry for policy number)
- **Multi-File Support**: Users can upload multiple files per upload-based task
- **File Type Filters**: Each upload task specifies accepted formats (PDF, JPG, PNG, MP4, etc.)
- **Upload Options**: "Take Photo" or "Choose Files" for upload tasks
- **View Uploaded Files**: Users can review uploaded file lists
- **Data Entry UI**: Purple "✏️ Enter Information" button for text-based tasks
- **Medical Hub Integration**: Medical Bills and Medical Records redirect to Medical Hub screen
- **Upload Status**: Visual indicators show upload status (📤 Upload Files / Upload More)
- **Data Entry Display**: Shows saved information with "Edit Information" option

### October 22, 2025 - Animated Winding Path Lines on Treasure Map
- **Animated Progress Lines**: Green winding paths travel from completed stages to next stages
  - Serpentine, snake-like curved paths resembling treasure map routes
  - S-curve design with multiple control points for natural winding effect
  - 1.5-second smooth animation from start to end position
  - Green (#27ae60) dotted lines with 4px width
  - Wave amplitude adjusts based on distance (up to 80px for dramatic curves)
  - Lines persist after animation completes showing the full winding path
  - Multiple curved paths shown for consecutively completed stages
- **Implementation**: Using react-native-svg Path with cubic Bezier curves and smooth curve commands (C and S)

### October 22, 2025 - Interactive Treasure Map with Modals
- Transformed roadmap into fully interactive pirate treasure map
- **Treasure Chest Interface**: Each stage represented as positioned treasure chest (💰/🏆)
- **Modal-Based Details**: Click any treasure to open detailed stage modal with:
  - Stage description and progress tracking
  - All sub-stages with individual completion buttons
  - Tutorial video library (1-2 videos per stage)
  - "Mark Entire Stage Complete" option
- **All 9 Stages Enhanced** with sub-stages and videos:
  - Pre-Litigation: 9 steps (Police Report, Footage, Insurance, Medical Records)
  - Complaint Filed: 3 steps (Draft, File, Serve)
  - Discovery Begins: 5 steps (Interrogatories, Request for Production of Documents, Request for Admissions, Entry Upon Land for Inspection, Experts)
  - Depositions: 4 steps (Prep, Your Deposition, Opposing Party, Expert Deposition)
  - Mediation: 3 steps (Prep, Session, Negotiation)
  - Trial Prep: 5 steps (Prepare your Testimony, Confirm Exhibits and Evidence with your Attorney, Arrange to miss work, Arrange Transportation, Discuss Trial Strategy)
  - Trial: 3 steps (Opening Statements, Presentation of Evidence, Closing Arguments)
  - Settlement: 3 steps (Settlement Negotiation, Settlement Agreement, Settlement Payment)
  - Case Resolved: 2 steps (Judgment Entry, Case Closure)
- **Video Tutorials**: 12+ educational videos integrated into stages
- **Avatar Integration**: User's selected avatar appears on current treasure chest
- **Visual Design**: Scrollable parchment map with decorative elements (⚓🦜🏴‍☠️🗡️🌊🧭)
- **Improved UX**: Modal slides up from bottom for easy access on mobile
- **Smart Completion**: Option to complete all steps at once or individually

### October 22, 2025 - Pirate Map Feature
- Implemented interactive pirate map-themed litigation roadmap
- Added avatar selection system with 4 pirate-themed characters (Captain, Navigator, Gunner, First Mate)
- Redesigned RoadmapScreen with treasure map aesthetics
- Created AvatarSelector component for character selection
- Enhanced user engagement with gamified visual design

### October 21, 2025 - Project Restructuring
- Converted from React web (Vite) to React Native (Expo)
- Organized codebase into proper project structure:
  - `src/screens/` - All screen components (Landing, Login, Register, Dashboard, Roadmap, Videos, MedicalHub)
  - `src/constants/` - Mock data and constants
  - `src/utils/` - Utility functions (gamification logic)
  - `src/styles/` - Common styles
  - `src/components/` - Reusable components
- Split monolithic App.js into modular, maintainable components
- Created utility functions for gamification calculations
- Centralized constants and mock data

### Technical Setup
- Expo SDK 52 with React Native 0.76.9
- Metro bundler for web and mobile
- Configured workflow to run on port 5000

## Tech Stack
- **Framework**: Expo SDK 52
- **React Native**: 0.76.9
- **React**: 18.3.1
- **Web Support**: react-dom, react-native-web
- **Bundler**: Metro (Expo)

## Project Structure
```
/
├── App.js                      # Main app container with state management
├── src/
│   ├── screens/                # Screen components
│   │   ├── LandingScreen.js
│   │   ├── LoginScreen.js
│   │   ├── RegisterScreen.js
│   │   ├── SubscriptionSelectionScreen.js
│   │   ├── DashboardScreen.js
│   │   ├── RoadmapScreen.js
│   │   ├── VideosScreen.js
│   │   └── MedicalHubScreen.js
│   ├── components/             # Reusable components
│   │   └── AvatarSelector.js
│   ├── utils/                  # Utility functions
│   │   └── gamification.js
│   ├── constants/              # Constants and mock data
│   │   ├── mockData.js
│   │   └── subscriptionPricing.js
│   └── styles/                 # Shared styles
│       └── commonStyles.js
├── app.json                    # Expo configuration
├── babel.config.js             # Babel configuration
└── package.json                # Dependencies
```

## Key Features
1. **User Authentication**: Register, login, logout (mock implementation)
2. **User Types & Subscriptions**: 
   - Individual, Law Firm, Medical Provider
   - Tiered subscription plans (Free, Basic, Premium)
   - Size-based pricing for organizations
   - Dynamic pricing based on user type and size
3. **Avatar Selection**: Choose from 4 pirate-themed characters
   - Captain 🏴‍☠️ (Fearless leader of the crew)
   - Navigator 🧭 (Expert chart reader)
   - Gunner ⚓ (Master of the cannons)
   - First Mate 🦜 (Trusted parrot companion)
4. **Gamification**: 
   - Coin system for completing milestones
   - Daily login streaks with bonuses
   - Convert coins to account credits ($7 max/month)
   - Avatar-based progress tracking
5. **Interactive Pirate Map**: Visual treasure map showing 9-stage litigation journey
   - Stages displayed as islands/locations
   - Avatar marker shows current progress
   - Pirate-themed aesthetics (parchment, decorations, legend)
   - Complete stages to earn coins and advance
6. **Video Library**: Educational video tutorials (5 videos)
7. **Medical Hub**: HIPAA-compliant document storage (placeholder)

## Running the App
The Expo server runs automatically via the configured workflow:
- **Web**: http://localhost:5000
- **Mobile**: Scan QR code with Expo Go app
- **Command**: `npx expo start --web --port 5000`

## Development Notes
- Modular component structure for easy maintenance
- Centralized constants for easy updates
- Utility functions for reusable logic
- Currently uses mock data and local state management
- Backend API integration needed for production
- Email verification system to be implemented
- File upload for medical documents to be added
- Video player integration pending

## Code Organization
- **State Management**: Centralized in App.js, passed to screens via props
- **Styles**: Common styles shared, screen-specific styles in each component
- **Constants**: All mock data and configuration in `src/constants/`
- **Utils**: Reusable functions in `src/utils/`
