# Verdict Path - React Native Mobile App

## Overview
Verdict Path is a React Native mobile application designed as a legal case management and education platform for civil litigation. It provides an interactive case roadmap, gamification elements, educational video tutorials, and secure medical document storage. The platform aims to assist individuals, law firms, and medical providers in navigating legal processes, supported by tiered subscription models. The project's vision is to offer an engaging and informative tool to support justice.

## User Preferences
I want to work with an AI agent that is autonomous and proactive. It should make decisions and implement changes without constant oversight. I prefer that the agent proceed with tasks independently, only seeking clarification if absolutely necessary. I also prefer detailed explanations of the code and the logic behind any changes made.

## System Architecture
The application is a React Native mobile app built with the Expo framework, featuring a "pirate treasure map" theme. The backend is a Node.js/Express server with a PostgreSQL database.

### UI/UX Decisions
The design is centered on a "pirate treasure map" theme with a warm tan/beige color palette. Key UI/UX elements include an interactive litigation roadmap, a compass/ship wheel logo, pirate-themed badges for gamification, and tailored subscription selection screens. The Medical Hub features distinct upload sections and real-time status tracking. UI elements like audio icons for roadmap substages and descriptive subscription cards are consistently styled to match the theme.

**Roadmap Substage Completion Visual Feedback**:
- "Mark Complete" buttons appear in RED (#e74c3c) for incomplete substages
- After completion, buttons transform to solid GREEN (#27ae60) displaying "✓ Completed" in white text
- Clear visual distinction helps users quickly identify their progress
- UI state properly syncs with backend completion status

**Audio Icons Enhancement**:
- Audio icons (🎧) in roadmap substages feature solid blue background (#3498db) for high visibility
- Enhanced size (46x46) with shadow/elevation effects for better user recognition
- Positioned prominently within substage descriptions

**Onboarding Experience**:
- 6-slide visual onboarding flow for first-time users with pirate theme
- Swipeable horizontal slides covering: Welcome, Roadmap Summary, Audio/Video Tutorials, Rewards, Secure Documents, Get Started
- Progress dots indicating current slide position
- Skip option on all slides except final
- "Get Started" button on final slide in green
- AsyncStorage persists completion status - only shows once per user
- Smooth transition to landing screen after completion
- Educational focus on roadmap stages and importance of audio/video learning resources

**Progress Tracking & Gamification UI**:
- Animated progress percentage bar (0-100%) on roadmap screen with smooth fill animation
- Celebration animation component with confetti, treasure chest visuals, and pirate messages
- Triggers automatically on milestone completions (25%, 50%, 75%, 100%)
- Visual coin rewards display during celebration
- Pirate-themed colors and styling throughout

**Bottom Navigation (Individual Users)**:
- Sticky 5-tab navigation bar: Home (🏠), Roadmap (🗺️), Actions (⚓), Videos (📺), Profile (👤)
- Actions tab replaced Forms tab - displays attorney-assigned tasks from connected law firm
- Position: absolute at bottom with platform-aware padding for iOS notches
- Active tab highlighting with solid blue background and white icons/text
- All individual user screens have 80px bottom padding to prevent content overlap
- Navigation only visible for individual users, hidden for law firm/medical provider portals

**Individual User Dashboard**:
- Header button displays "Invite Friends" (👍) in the top right to allow individual users to invite other users
- "My Connections" link appears in the dashboard menu for managing law firm and medical provider connections
- Separate invite and connections functionality for clear user workflows
- **Roadmap Screen**: File upload functionality completely disabled - substages with upload requirements display "🏴‍☠️ File upload coming soon!" banners
- **Medical Hub Screen**: Upload functionality completely disabled with pirate-themed "Coming Soon" messaging
- **Action Dashboard** (accessed via Actions tab): View attorney-assigned tasks with summary cards (To Do, In Progress, Completed, Overdue), filter by status/priority, tap tasks to update status (Start, Mark Complete), pull-to-refresh for real-time updates, overdue tasks highlighted in red

**Medical Provider Portal**:
- **Upload functionality COMPLETELY DISABLED across all screens** - no active upload pathways remain
- Patient Details view displays pirate-themed "🏴‍☠️ Coming Soon" badges for upload sections
- All upload imports, state variables, and UploadModal component removed from codebase
- All upload handler functions disabled to prevent any document uploads until feature is fully implemented
- "Manage Law Firm Connections" link added to dashboard for future law firm connection management
- Connections tab displays pirate-themed coming soon message explaining future feature to connect with cooperating law firms
- **Send Notifications** screen: Healthcare-focused notification system with 6 medical templates, multi-patient selection, and message personalization capabilities
- **Analytics Dashboard**: Track patient notification engagement with healthcare-specific metrics

**Law Firm Portal**:
- "Invite" button in header for inviting new users via unique firm code
- "My Connections" link added to dashboard menu for managing client and provider connections
- Both invite and connections functionality clearly separated for streamlined workflows
- Client Details view is read-only for Medical Hub (no upload capabilities)
- **Send Notifications** screen: Multi-step wizard for sending push notifications to clients with template selection, client selection, message customization, and optional task assignment
- **Analytics Dashboard**: Track notification engagement metrics (sent, delivered, clicked) with date range filtering

### Technical Implementations
- **Framework**: Expo SDK 52 with React Native 0.76.9.
- **Project Structure**: Modular, organized into `src/screens/` and `src/components/`. Monorepo structure with frontend at root and backend in `backend/` subdirectory.
- **Backend**: Node.js/Express (port 5000) with PostgreSQL for user authentication, client management, litigation tracking, and HIPAA-compliant data handling.
- **Deployment**: Railway deployment configured via `railway.json`, `nixpacks.toml`, and `Procfile` to ensure backend server runs correctly. Frontend (Expo) is for local development only; Railway deploys backend API.
- **HIPAA Security**: Implements AES-256-GCM encryption for PHI at rest, Role-Based Access Control (RBAC) with 6 roles and 23 granular permissions, Patient Consent Management, comprehensive audit logging, and account security measures.
- **Litigation Progress Tracking**: Comprehensive backend integration for tracking user progress through a 9-stage litigation journey with 60 substages, including database tables, API endpoints, automatic coin rewards, and real-time progress display.
- **Client/Patient Management**: Includes real-time search functionality by name or email, restructured portals with tab-based navigation (Overview, Roadmap, Medical Hub, Evidence Locker) for individual client/patient details, and robust connection management for users.
- **Connection Management**: ONLY individual users (userType: 'individual' or 'client') can manage connections with law firms or medical providers. Law firms and medical providers are completely blocked from using connection features. Individual users can:
  - Connect with ONE law firm at a time via connection code
  - Connect with MULTIPLE medical providers simultaneously via connection codes (no limit)
  - Disconnect from their current law firm (sets law_firm_code to NULL, removes law_firm_clients relationship)
  - Remove specific medical providers by ID from their list of connections
  - Switch to a different law firm (automatically removes old relationship before creating new one)
  - Add additional medical providers to their existing list without replacing previous connections
  - Backend enforces 403 Forbidden for non-individual users on all connection endpoints
  - Endpoints: POST /connections/update-lawfirm, POST /connections/add-medical-provider, POST /connections/disconnect-lawfirm, POST /connections/remove-medical-provider
  - GET /connections/my-connections returns lawFirm (single object) and medicalProviders (array)
  - Medical provider connections stored in medical_provider_patients junction table
  - All connection operations prevent orphaned database relationships and maintain data integrity
- **Subscription Management**: Implements a complete system for individual, law firm, and medical provider subscriptions with Free, Basic, and Premium tiers. This includes automatic unique code generation, free trial limits, expanded law firm and medical provider size tiers, and a full upgrade/downgrade protocol with validation.
- **Gamification Logic**: Coin system for milestones and daily streaks with a fraud-prevented coin-to-credit conversion (lifetime cap of $5 credit).
- **Universal Invite/Referral System**: Allows all user types to generate unique invite codes, with coin rewards for individual users whose invitees sign up.
- **Cross-Platform Compatibility**: Extensive support for iOS, Android, mobile web, and desktop web.
- **Phase 2: Smart Notifications & Attorney-Controlled Action Dashboard** (October 2025):
  - **Push Notification System**: Law firms and medical providers can send targeted push notifications to connected clients/patients with 16 professional templates, multi-recipient selection, scheduling capabilities, and comprehensive analytics tracking (sent, delivered, clicked rates).
  - **Attorney-Assigned Task System**: Law firms create actionable tasks for clients through LawFirmSendNotificationScreen with optional task assignment. Tasks include titles, descriptions, priorities (urgent/high/medium/low), due dates, and coin rewards. Individual users access tasks via ActionDashboardScreen with filtering by status/priority, pull-to-refresh, and tap-to-update functionality.
  - **Notification Templates**: 10 law firm templates (court_reminder, deposition_notice, document_request, settlement_update, case_milestone, deadline_reminder, appointment_confirmation, task_reminder, status_update, general_communication) and 6 medical provider templates (appointment_reminder, test_results, prescription_ready, billing_notice, health_tip, general_update).
  - **Security & Compliance**: Zero AI-generated legal advice - all task content controlled by attorneys. Law firms can only create tasks for connected clients (verified via law_firm_clients junction table). Task audit logging tracks all status changes.
  - **Database Schema**: New tables include push_notifications, push_devices, notification_analytics, notification_templates, law_firm_tasks, medical_provider_tasks, task_templates, and task_audit.
  - **API Integration**: Centralized API configuration in src/config/api.js with Railway backend URL. All API calls use apiRequest helper with proper error handling and authentication headers.

### Feature Specifications
- **User Authentication & Types**: Supports Individual, Law Firm, and Medical Provider users across Free, Basic, and Premium tiers.
- **Interactive Pirate Map**: 9-stage litigation journey with progress tracking, detailed substages, and modal descriptions, including interactive audio descriptions with enhanced visibility.
- **Video Library**: Integrated educational tutorials.
- **Medical Hub**: HIPAA-compliant document storage placeholder with pirate-themed "coming soon" messages. **All upload functionality completely disabled** across Individual, Medical Provider, and Law Firm portals pending full implementation.
- **Law Firm/Medical Provider Portals**: Web and mobile access for managing clients/patients with read-only views of medical records, billing, evidence, and litigation stages.
- **Document Upload Status**: Feature completely disabled system-wide. All upload buttons, modals, file pickers, and API endpoints are inactive. Display pirate-themed "Coming Soon" messaging throughout the application.

## External Dependencies
- **Expo SDK**: Core framework for React Native development.
- **React Native**: For building mobile applications.
- **React**: JavaScript library for UIs.
- **react-native-svg**: For rendering SVG graphics and animations.
- **@react-native-async-storage/async-storage**: For persistent storage.
- **PostgreSQL**: Database for backend data storage.
- **Node.js/Express**: Backend API development.