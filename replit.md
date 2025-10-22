# Case Compass - React Native Mobile App

## Overview
Case Compass is a legal case management and education platform focused on Georgia Civil Litigation. It provides users with an interactive case roadmap, gamification features, video tutorials, and secure medical document storage.

## Project Type
React Native mobile application using Expo framework

## Recent Changes

### October 22, 2025 - Pirate Map Feature
- Implemented interactive pirate map-themed litigation roadmap
- Added avatar selection system with 4 video game-style characters (Warrior, Mage, Archer, Knight)
- Redesigned RoadmapScreen with treasure map aesthetics:
  - Aged parchment background
  - Stages positioned as map locations/islands
  - Visual paths connecting litigation stages
  - User's avatar marker displayed at current progress
  - Decorative elements (anchor, parrot, gem)
  - Map legend for user guidance
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
│   │   ├── DashboardScreen.js
│   │   ├── RoadmapScreen.js
│   │   ├── VideosScreen.js
│   │   └── MedicalHubScreen.js
│   ├── components/             # Reusable components
│   │   └── AvatarSelector.js
│   ├── utils/                  # Utility functions
│   │   └── gamification.js
│   ├── constants/              # Constants and mock data
│   │   └── mockData.js
│   └── styles/                 # Shared styles
│       └── commonStyles.js
├── app.json                    # Expo configuration
├── babel.config.js             # Babel configuration
└── package.json                # Dependencies
```

## Key Features
1. **User Authentication**: Register, login, logout (mock implementation)
2. **User Types**: Individual, Law Firm, Medical Provider
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
