# Case Compass - React Native Mobile App

A legal case management and education platform focused on Georgia Civil Litigation.

## Features

- **User Authentication**: Register and login with support for three user types (Individual, Law Firm, Medical Provider)
- **Case Roadmap**: Interactive 8-stage litigation journey with milestone tracking
- **Gamification**: Earn coins by completing milestones, daily login streaks with bonuses
- **Video Library**: Educational tutorials for civil litigation
- **Medical Hub**: HIPAA-compliant document storage placeholder
- **Credit System**: Convert earned coins to account credits ($7 max/month)

## Tech Stack

- **Framework**: Expo SDK 52
- **React Native**: 0.76.9
- **React**: 18.3.1
- **Bundler**: Metro

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
│   ├── components/             # Reusable components (future)
│   ├── utils/                  # Utility functions
│   │   └── gamification.js     # Coin/credit calculations
│   ├── constants/              # App constants and mock data
│   │   └── mockData.js         # Litigation stages, videos, etc.
│   └── styles/                 # Shared styles
│       └── commonStyles.js     # Common style definitions
├── app.json                    # Expo configuration
├── babel.config.js             # Babel configuration
└── package.json                # Dependencies
```

## Getting Started

### Prerequisites

- Node.js 20.19.4+ installed
- Expo Go app on your mobile device (optional for mobile testing)

### Installation

```bash
npm install
```

### Running the App

**Web Development:**
```bash
npm start
```
The app will be available at http://localhost:5000

**Mobile Testing:**
- Scan the QR code with Expo Go app (Android)
- Scan with Camera app (iOS)

**Other Commands:**
```bash
npm run android  # Open Android emulator
npm run ios      # Open iOS simulator
npm run web      # Open web browser
```

## Development Notes

### Current Implementation
- Mock authentication (no backend connection)
- Local state management (no persistence)
- Placeholder features (video player, file upload)

### Next Steps for Production
1. Backend API integration for authentication
2. Email verification system
3. Database for user data and progress
4. Video player integration
5. File upload functionality for medical documents
6. Real payment processing for credits
7. Navigation library (React Navigation) for better screen management

## Code Organization

### State Management
All app state is managed in `App.js` and passed down to screens via props. For production, consider:
- Context API for global state
- Redux or Zustand for complex state
- Persistent storage with AsyncStorage

### Styles
- Common styles are in `src/styles/commonStyles.js`
- Screen-specific styles are defined within each screen file

### Constants
- Mock data and constants are centralized in `src/constants/mockData.js`
- Easy to replace with API calls when backend is ready

### Utilities
- Reusable functions in `src/utils/`
- Currently includes gamification calculations

## Contributing

When adding new features:
1. Create new components in `src/components/`
2. Add new screens to `src/screens/`
3. Update constants in `src/constants/`
4. Add utilities to `src/utils/`
5. Follow existing code style and structure

## License

Private project - All rights reserved
