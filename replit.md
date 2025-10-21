# Case Compass - React Native Mobile App

## Overview
Case Compass is a legal case management and education platform focused on Georgia Civil Litigation. It provides users with an interactive case roadmap, gamification features, video tutorials, and secure medical document storage.

## Project Type
React Native mobile application using Expo framework

## Recent Changes (October 21, 2025)
### Project Restructuring
- Converted from React web (Vite) to React Native (Expo)
- Organized codebase into proper project structure:
  - `src/screens/` - All screen components (Landing, Login, Register, Dashboard, Roadmap, Videos, MedicalHub)
  - `src/constants/` - Mock data and constants
  - `src/utils/` - Utility functions (gamification logic)
  - `src/styles/` - Common styles
  - `src/components/` - Reusable components (future use)
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
3. **Gamification**: 
   - Coin system for completing milestones
   - Daily login streaks with bonuses
   - Convert coins to account credits ($7 max/month)
4. **Case Roadmap**: 8-stage litigation journey with progress tracking
5. **Video Library**: Educational video tutorials (5 videos)
6. **Medical Hub**: HIPAA-compliant document storage (placeholder)

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
