# Case Compass - React Native Mobile App

## Overview
Case Compass is a legal case management and education platform focused on Georgia Civil Litigation. It provides users with an interactive case roadmap, gamification features, video tutorials, and secure medical document storage.

## Project Type
React Native mobile application using Expo framework

## Recent Changes (October 21, 2025)
- Converted from React web (Vite) to React Native (Expo)
- Set up Expo SDK 52 with React Native 0.76.9
- Implemented complete app structure with multiple screens:
  - Landing page with registration and login
  - User dashboard with stats and navigation
  - Case roadmap with litigation stages
  - Video library
  - Medical documentation hub
- Configured workflow to run Expo development server on port 5000

## Tech Stack
- **Framework**: Expo SDK 52
- **React Native**: 0.76.9
- **React**: 18.3.1
- **Web Support**: react-dom, react-native-web
- **Bundler**: Metro (Expo)

## Project Structure
```
/
├── App.js              # Main application component with all screens
├── app.json            # Expo configuration
├── babel.config.js     # Babel configuration for Expo
├── package.json        # Dependencies and scripts
└── .gitignore         # Expo/React Native specific ignores
```

## Key Features
1. **User Authentication**: Register, login, logout (mock implementation)
2. **User Types**: Individual, Law Firm, Medical Provider
3. **Gamification**: 
   - Coin system for completing milestones
   - Daily login streaks with bonuses
   - Convert coins to account credits ($7 max/month)
4. **Case Roadmap**: 8-stage litigation journey tracking
5. **Video Library**: Educational video tutorials (5 videos)
6. **Medical Hub**: HIPAA-compliant document storage (placeholder)

## Running the App
The Expo server runs automatically via the configured workflow:
- Web: http://localhost:5000
- Mobile: Scan QR code with Expo Go app
- Command: `npx expo start --web --port 5000`

## Development Notes
- Currently uses mock data and local state management
- Backend API integration needed for production
- Email verification system to be implemented
- File upload for medical documents to be added
- Video player integration pending
