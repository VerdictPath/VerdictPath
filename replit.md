# Case Compass - React Native Mobile App

## Overview
Case Compass is a legal case management and education platform focused on Georgia Civil Litigation. It provides users with an interactive case roadmap, gamification features, video tutorials, and secure medical document storage.

## Project Type
React Native mobile application using Expo framework

## Recent Changes

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
- **Medical Provider Features**:
  - Patient limits based on practice size (100, 500, 1,000, unlimited)
  - Basic or Premium patient case tracking
  - Medical Hub access for uploading bills and records
  - HIPAA-compliant storage (10GB-unlimited based on size)
- **Registration Flow**: Landing → Register (user type) → Subscription Selection → Login → Dashboard
- **Stage Names on Map**: Small text labels below each treasure chest for better navigation

### October 22, 2025 - Document Upload and Data Entry Functionality
- **File Upload System**: Added document upload functionality to Pre-Litigation stage
- **Upload-Based Tasks**: 5 tasks require file uploads
  - Police Report, Body Cam, Dash Cam, Pictures, Health Insurance Card
  - Medical Bills and Medical Records link to Medical Hub
- **Data Entry Tasks**: 2 tasks use simple text input instead of uploads
  - Auto Insurance Company (text entry for company name)
  - Auto Insurance Policy Number (text entry for policy number)
- **No Upload Validation**: "Mark Complete" button always available regardless of upload/entry status
- **Multi-File Support**: Users can upload multiple files per upload-based task
- **File Type Filters**: Each upload task specifies accepted formats (PDF, JPG, PNG, MP4, etc.)
- **Upload Options**: "Take Photo" or "Choose Files" for upload tasks
- **View Uploaded Files**: Users can review uploaded file lists
- **Data Entry UI**: Purple "✏️ Enter Information" button for text-based tasks
- **Medical Hub Integration**: Medical documents redirect to Medical Hub screen
- **Upload Status**: Visual indicators show upload status (📤 Upload Files / Upload More)
- **Data Entry Display**: Shows saved information with "Edit Information" option

### October 22, 2025 - Interactive Treasure Map with Modals
- Transformed roadmap into fully interactive pirate treasure map
- **Treasure Chest Interface**: Each stage represented as positioned treasure chest (💰/🏆)
- **Modal-Based Details**: Click any treasure to open detailed stage modal with:
  - Stage description and progress tracking
  - All sub-stages with individual completion buttons
  - Tutorial video library (1-2 videos per stage)
  - "Mark Entire Stage Complete" option
- **All 8 Stages Enhanced** with sub-stages and videos:
  - Pre-Litigation: 9 steps (Police Report, Footage, Insurance, Medical Records)
  - Complaint Filed: 3 steps (Draft, File, Serve)
  - Discovery: 3 steps (Interrogatories, Documents, Admissions)
  - Depositions: 3 steps (Prep, Your Deposition, Opposing Party)
  - Mediation: 3 steps (Prep, Session, Negotiation)
  - Trial Prep: 3 steps (Witnesses, Exhibits, Strategy)
  - Trial/Settlement: 3 steps (Opening, Evidence, Closing)
  - Case Resolved: 2 steps (Judgment, Closure)
- **Video Tutorials**: 12+ educational videos integrated into stages
- **Avatar Integration**: User's selected avatar appears on current treasure chest
- **Visual Design**: Scrollable parchment map with decorative elements (⚓🦜🏴‍☠️🗡️🌊🧭)
- **Improved UX**: Modal slides up from bottom for easy access on mobile
- **Smart Completion**: Option to complete all steps at once or individually

### October 22, 2025 - Pirate Map Feature
- Implemented interactive pirate map-themed litigation roadmap
- Added avatar selection system with 4 video game-style characters (Warrior, Mage, Archer, Knight)
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
3. **Avatar Selection**: Choose from 4 video game-style characters
   - Warrior ⚔️ (Bold and fearless)
   - Mage 🔮 (Wise spellcaster)
   - Archer 🏹 (Precise ranger)
   - Knight 🛡️ (Honorable protector)
4. **Gamification**: 
   - Coin system for completing milestones
   - Daily login streaks with bonuses
   - Convert coins to account credits ($7 max/month)
   - Avatar-based progress tracking
5. **Interactive Pirate Map**: Visual treasure map showing 8-stage litigation journey
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
