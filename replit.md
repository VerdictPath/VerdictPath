# Verdict Path - React Native Mobile App

## Overview
Verdict Path is a legal case management and education platform designed for Georgia Civil Litigation. It offers an interactive case roadmap, gamification features, educational video tutorials, and secure medical document storage. The project aims to provide an engaging and informative tool for navigating the complexities of legal processes.

## User Preferences
I want to work with an AI agent that is autonomous and proactive. It should make decisions and implement changes without constant oversight. I prefer that the agent proceed with tasks independently, only seeking clarification if absolutely necessary. I also prefer detailed explanations of the code and the logic behind any changes made.

## Recent Changes

### October 23, 2025 - Phase 1 HIPAA Compliance Implementation ✅ COMPLETE
- **Comprehensive HIPAA Security Features**: Full implementation of encryption, audit logging, and account security
- **AES-256-GCM Encryption Service**: 
  - Protected Health Information (PHI) encrypted at rest using industry-standard AES-256-GCM
  - Envelope encryption with master key + unique per-record IVs for authenticated encryption
  - SHA-256 hashing for searchable fields (email_hash)
  - Encryption service: `backend/services/encryption.js`
- **Database Schema Enhancements**:
  - Added encrypted columns to users table: `first_name_encrypted`, `last_name_encrypted`, `email_hash`
  - Added encrypted columns to medical_records table: `description_encrypted`, `facility_name_encrypted`, `provider_name_encrypted`, `diagnosis_encrypted`
  - Added encrypted columns to medical_billing table: `description_encrypted`, `provider_name_encrypted`, `insurance_info_encrypted`
  - New `audit_logs` table for 7-year HIPAA-compliant audit trail
  - New `account_security` table for brute force attack protection
- **Audit Logging System**:
  - Comprehensive PHI access tracking: VIEW_CLIENT_LIST, VIEW_CLIENT_DETAILS, VIEW_MEDICAL_RECORD, VIEW_BILLING
  - Captures IP address, user-agent, metadata for all PHI operations
  - Suspicious activity detection and flagging
  - 7-year retention for HIPAA compliance
  - Service: `backend/services/auditLogger.js`
- **Account Security**:
  - Account lockout after 5 failed login attempts (30-minute lockout)
  - Lockout tracking in account_security table
  - Integrated into all authentication flows (client, law firm, medical provider)
  - Middleware: `backend/middleware/security.js`
- **Controller Integration**:
  - authController: Encrypts PHI on registration (first_name, last_name, email_hash)
  - lawfirmController: Decrypts PHI on all read operations (user names, medical records, billing data)
  - Graceful fallback to plaintext during migration period
  - All PHI access logged to audit trail
- **Migration Tool**:
  - Comprehensive script to encrypt existing database records: `backend/scripts/migrate-encrypt-phi.js`
  - Encrypts ALL PHI fields: names, diagnosis, insurance info, facility/provider details
  - Schema existence checks for safe execution
  - Idempotent and safe to re-run
  - Progress tracking and error reporting
- **Testing Tools**:
  - Encryption verification script: `backend/scripts/test-encryption.js`
  - Tests encryption/decryption roundtrips
  - Validates hashing functionality
- **Documentation**:
  - Complete implementation guide: `HIPAA-IMPLEMENTATION.md`
  - Security best practices
  - Migration instructions
  - Future roadmap (Phases 2-4)
- **Security Requirements**:
  - ⚠️ **CRITICAL**: ENCRYPTION_KEY must be set in Replit Secrets before system is functional
  - Never commit encryption keys to version control
  - 32-byte base64-encoded key required for AES-256-GCM
- **Next Phases**:
  - Phase 2: Role-Based Access Control (RBAC) and patient consent management
  - Phase 3: Multi-Factor Authentication (MFA) and password policies
  - Phase 4: Breach detection and compliance reporting

### October 23, 2025 - Working "Start Free Trial" Button with Multi-Portal Support
- **Registration Flow Integration**: "Start Free Trial" button now creates real accounts via backend API
  - Individual users → Client dashboard with gamification features
  - Law Firms → Law Firm dashboard (view clients and documents)
  - Medical Providers → Medical Provider dashboard (view patients)
  - Auto-generated unique codes for organizations (FIRM + timestamp, MED + timestamp)
- **Medical Provider Support**: Added complete backend support
  - medical_providers table in PostgreSQL database
  - medical_provider_patients junction table
  - Registration endpoint: /api/auth/register/medicalprovider
  - Login support for medical_provider userType
  - Mobile dashboard screen (placeholder for patient list)
- **Backend API Integration**: Mobile app now calls real backend APIs
  - JWT tokens stored in user state
  - Proper authentication for all user types
  - Automatic routing to correct dashboard after registration
- **Testing**: You can now register as any user type and see their respective portals

### October 23, 2025 - Law Firm Client Portal System
- **Complete Backend Implementation**: Built comprehensive Node.js/Express backend API
  - PostgreSQL database with 8 tables: users, law_firms, medical_records, medical_billing, evidence, litigation_stages, litigation_stage_history, law_firm_clients
  - JWT authentication for law firms and clients
  - RESTful API endpoints for dashboard, client management, litigation tracking
- **Web Portal**: Created professional EJS-based web dashboard with tan/beige theme
  - Law firm login and dashboard
  - Client list (sorted Last, First name)
  - Client details view (medical records, billing, evidence, litigation stages)
  - Fully responsive design matching app's warm color scheme
- **Mobile App Integration**: Law firm functionality in React Native app
  - Law Firm Dashboard Screen: View all registered clients
  - Client Details Screen: Access client documents and case information
  - Seamless navigation between law firm and client views
  - Consistent tan/beige theme throughout
- **Features**:
  - Law firms can register with unique firm codes
  - Clients register with firm codes to auto-connect
  - Law firms access all client documents (medical records, billing, evidence)
  - Litigation stage tracking and management
  - Both mobile app and web dashboard access
  - HIPAA-compliant document access controls
- **Backend Server**: Runs on port 3000, API endpoints at `/api/auth` and `/api/lawfirm`
- **Web Portal**: Access at `http://localhost:3000/portal`

### October 23, 2025 - Updated Logo & Color Scheme
- **Logo Update**: Replaced logo with new Verdict Path branding featuring compass/ship wheel design with "Chart Your Course to Justice" tagline
- **Color Scheme Overhaul**: Updated entire app to match logo's warm tan/beige aesthetic
  - **Background**: Tan/Sand (#F4E8D8) - matches logo background
  - **Surface**: Cream (#F8F1E7) - for cards and containers
  - **Primary**: Mahogany (#8B6F47) - for buttons and primary actions
  - **Secondary**: Warm Gold (#C9A961) - for borders and accents
  - **Text**: Navy (#2C3E50) - for primary text
  - **Text Secondary**: Warm Gray (#A0826D) - for secondary text
  - Created centralized theme.js for consistent color management
  - Updated all screens, buttons, icons, and components to use new palette
  - Maintains pirate/treasure theme with warmer, more sophisticated earth tones

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