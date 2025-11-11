# 🏴‍☠️ Verdict Path - React Native Mobile App

**Navigate Your Legal Journey with Confidence**

A HIPAA-compliant React Native mobile application (Expo SDK 52) for civil litigation case management featuring three user portals, pirate-themed gamification, and secure document storage.

---

## 🎯 What is Verdict Path?

Verdict Path is a comprehensive legal tech platform that helps individuals navigate civil litigation through an interactive pirate-themed treasure map, secure document storage, and professional collaboration tools.

## Features

### For Individual Users
- 🗺️ **Interactive Litigation Roadmap** - 9-stage journey with 60+ substages
- 🪙 **Gamification System** - Earn coins and badges as you progress
- 🎧 **Educational Content** - Audio and video tutorials for each stage
- 📊 **Progress Tracking** - Real-time case progress monitoring
- 🏥 **Medical Hub** - Secure document storage (coming soon)
- 🗃️ **Evidence Locker** - Organized evidence management
- 👥 **Referral System** - Invite friends and earn rewards

### For Law Firms
- 📋 **Client Management** - Comprehensive client dashboard
- 🔍 **Real-time Search** - Quick client lookup by name or email
- 📈 **Case Analytics** - Track litigation progress across all clients
- 🔒 **Read-only Access** - View client medical records and evidence
- 🤝 **Connection Management** - Manage client and provider relationships
- 📊 **Subscription Tiers** - Flexible pricing based on firm size

### For Medical Providers
- 👥 **Patient Portal** - Manage patient records and billing
- 💰 **Billing Tracking** - Monitor outstanding medical bills
- 🔐 **HIPAA Compliance** - AES-256-GCM encryption for PHI
- ✅ **Consent Management** - Patient consent tracking
- 📁 **Secure Uploads** - Protected document management (coming soon)
- 🏢 **Provider Tiers** - Scalable pricing options

## Technology Stack

### Frontend
- **Framework**: React Native (Expo SDK 52)
- **Platform**: iOS, Android, Mobile Web, Desktop Web
- **UI Library**: React Native Web
- **State Management**: React Hooks
- **Styling**: StyleSheet API with custom theme

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL (Neon)
- **Authentication**: JWT tokens
- **Template Engine**: EJS (for web portals)

### Security & Compliance
- **Encryption**: AES-256-GCM for PHI at rest
- **RBAC**: 6 roles with 23 granular permissions
- **Audit Logging**: Comprehensive HIPAA-compliant logs
- **Consent Tracking**: Patient consent management system

## Project Structure

```
verdict-path/
├── src/                          # React Native source code
│   ├── screens/                  # App screens
│   ├── components/               # Reusable components
│   ├── styles/                   # Theme and common styles
│   ├── utils/                    # Utility functions
│   └── config/                   # Configuration files
├── backend/                      # Node.js/Express backend
│   ├── server.js                 # Main server entry point
│   ├── routes/                   # API endpoints
│   ├── controllers/              # Business logic
│   ├── services/                 # Core services (encryption, audit, etc.)
│   ├── middleware/               # Auth, permissions, security
│   ├── config/                   # Database config and schema
│   └── views/                    # EJS templates for web portals
├── attached_assets/              # Static assets (images, logos)
└── package.json                  # Dependencies
```

## Installation

### Prerequisites
- Node.js 20+
- PostgreSQL database
- Expo CLI

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/verdict-path.git
   cd verdict-path
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file with:
   ```
   DATABASE_URL=your_postgresql_connection_string
   ENCRYPTION_KEY=your_32_byte_encryption_key
   ```

4. **Initialize database**
   ```bash
   npm run db:push
   ```

5. **Build the web app**
   ```bash
   npx expo export --platform web --output-dir backend/public/app
   ```

6. **Start the server**
   ```bash
   node backend/server.js
   ```

The app will be available at `http://localhost:5000`

## Development

### Running the app locally
```bash
# Start backend server
node backend/server.js

# Rebuild Expo web app (after making changes)
npx expo export --platform web --output-dir backend/public/app
```

### Database migrations
```bash
# Push schema changes to database
npm run db:push

# Force push (if data loss warning)
npm run db:push --force
```

## Subscription Tiers

### Individual Users
- **Free**: Basic roadmap access
- **Basic ($2.99/month)**: Full roadmap + audio tutorials
- **Premium ($4.99/month)**: Everything + video tutorials + medical hub

### Law Firms
- **Free**: Up to 5 clients
- **Basic**: 6-20 clients ($49/month)
- **Premium**: 21-50 clients ($99/month)
- **Enterprise**: 51+ clients (custom pricing)

### Medical Providers
- **Free**: Up to 5 patients
- **Basic**: 6-20 patients ($39/month)
- **Premium**: 21+ patients ($79/month)

## Security Features

- **AES-256-GCM Encryption** for all PHI data at rest
- **JWT Authentication** with secure token management
- **Role-Based Access Control** (RBAC) with granular permissions
- **Audit Logging** for all PHI access and modifications
- **Patient Consent Management** with tracking and verification
- **Secure File Uploads** with validation and scanning

## Design Theme

Verdict Path uses a **pirate treasure map** theme throughout:
- Warm tan/beige color palette
- Compass/ship wheel logo
- Pirate-themed badges and rewards
- "Coming Soon" messages with pirate flair 🏴‍☠️

## API Documentation

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Litigation Progress
- `GET /api/litigation/progress` - Get user's litigation progress
- `POST /api/litigation/complete-substage` - Mark substage complete
- `POST /api/litigation/uncomplete-substage` - Undo completion

### Law Firm Portal
- `GET /api/lawfirm/dashboard` - Firm dashboard data
- `GET /api/lawfirm/client/:id` - Client details
- `GET /api/lawfirm/clients` - All clients

### Medical Provider Portal
- `GET /api/medicalprovider/dashboard` - Provider dashboard
- `GET /api/medicalprovider/patient/:id` - Patient details
- `POST /api/medicalprovider/billing` - Add billing entry

## Contributing

This is a private project. For questions or issues, contact the development team.

## License

Copyright © 2025 Verdict Path. All rights reserved.

## Contact

For support or inquiries:
- Email: contact@verdictpath.io
- Developer: VerdictPath

---

**Built with ⚓ for justice and accessibility in civil litigation**
