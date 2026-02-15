# VerdictPath Beta Testing Checklist

**Version:** 1.0
**Date:** February 15, 2026
**Purpose:** Comprehensive testing guide for beta testers

---

## ⚙️ Prerequisites

### Before Starting Beta Testing:
- [ ] Verify you're using **TEST MODE** for Stripe (keys start with `pk_test_` and `sk_test_`)
- [ ] Confirm test accounts are created in database
- [ ] Backend server is running and accessible
- [ ] Mobile app is built and deployed (or running via Expo)
- [ ] All environment variables are configured

### Test Accounts Setup:
Create test accounts for each user type:
- [ ] Individual Client account
- [ ] Law Firm account
- [ ] Law Firm User account
- [ ] Medical Provider account
- [ ] Medical Provider User account

---

## 1. 🔐 Authentication & Registration

### Client Registration
- [ ] Register new client with valid data
- [ ] Test with missing required fields (should fail gracefully)
- [ ] Test with duplicate email (should show error)
- [ ] Test password strength requirements
- [ ] Verify email validation (valid format)
- [ ] Test with law firm code (valid and invalid)
- [ ] Confirm privacy policy acceptance is required
- [ ] Verify account is created in database
- [ ] Check welcome email is sent (if configured)

### Law Firm Registration
- [ ] Register new law firm
- [ ] Test firm code generation (should be unique)
- [ ] Test subscription tier selection
- [ ] Verify firm size selection works
- [ ] Test address fields (street, city, state, zip)
- [ ] Confirm bar number field accepts input

### Medical Provider Registration
- [ ] Register new medical provider
- [ ] Test provider code generation
- [ ] Verify NPI number field
- [ ] Test specialty field
- [ ] Verify license number field

### Login Flow
- [ ] Login as client
- [ ] Login as law firm
- [ ] Login as medical provider
- [ ] Test incorrect password (should fail)
- [ ] Test non-existent email (should fail)
- [ ] Test rate limiting (>10 failed attempts in 1 minute)
- [ ] Verify JWT token is returned
- [ ] Verify httpOnly cookie is set
- [ ] Test "Remember Me" functionality

### Logout
- [ ] Logout successfully clears session
- [ ] After logout, protected routes require re-login
- [ ] Token is invalidated

---

## 2. 👥 User Management

### Multi-User Management (Law Firms)
- [ ] Law firm owner can create additional users
- [ ] Set user roles (admin, attorney, staff)
- [ ] Test permissions for each role
- [ ] Deactivate user account
- [ ] Reactivate user account
- [ ] View activity logs for users

### Multi-User Management (Medical Providers)
- [ ] Medical provider owner can create staff users
- [ ] Set user roles and permissions
- [ ] Test HIPAA audit logging for user actions

---

## 3. 🤝 Connections & Relationships

### Client-Law Firm Connection
- [ ] Client connects to law firm using firm code
- [ ] Law firm can see connected clients on dashboard
- [ ] Client can update/disconnect law firm
- [ ] Test client limit enforcement based on subscription tier

### Client-Medical Provider Connection
- [ ] Law firm can link client to medical provider
- [ ] Medical provider can see linked patients
- [ ] Test consent requirements
- [ ] Verify HIPAA compliance in data sharing

### Connection Requests
- [ ] Send connection request
- [ ] Accept connection request
- [ ] Decline connection request
- [ ] Cancel pending request

---

## 4. 📁 File Management

### Document Upload
- [ ] Upload PDF file
- [ ] Upload image (JPG, PNG, HEIC)
- [ ] Upload Word document (DOC, DOCX)
- [ ] Test file size limits (should reject >50MB)
- [ ] Test invalid file types (should reject)
- [ ] Verify files are encrypted at rest
- [ ] Test file naming (should include user ID prefix)

### File Access Control
- [ ] Client can view own files
- [ ] Law firm can view client files (if connected)
- [ ] Medical provider can view patient files (if connected)
- [ ] Unauthorized users cannot access files (403 error)
- [ ] Test direct URL access (should require token)

### File Categories
- [ ] Upload medical record
- [ ] Upload medical bill
- [ ] Upload evidence document
- [ ] Categorize files correctly
- [ ] Filter files by category

### File Download/Stream
- [ ] Download PDF file
- [ ] Stream image inline
- [ ] Test mobile image viewing (React Native Image component)

---

## 5. 💰 Payment & Subscriptions (Stripe Test Mode)

### Stripe Customer Setup (Law Firms)
- [ ] Law firm creates Stripe customer account
- [ ] Add payment method using test card: `4242 4242 4242 4242`
- [ ] Test declining card: `4000 0000 0000 0002`
- [ ] Access billing portal
- [ ] Update payment method
- [ ] Remove payment method
- [ ] View payment history

### Stripe Connect (Recipients - Clients/Providers)
- [ ] Client creates Connect account
- [ ] Complete onboarding flow
- [ ] Link bank account (test mode)
- [ ] View Connect dashboard
- [ ] Check account verification status

### Coin Purchases
- [ ] Purchase coin package (test mode)
- [ ] Verify payment intent creation
- [ ] Confirm payment success
- [ ] Check coins added to balance
- [ ] Verify transaction recorded in database

### Disbursements
- [ ] Process settlement disbursement (test mode)
- [ ] Verify funds transferred to Connect account
- [ ] Check disbursement history
- [ ] Test fee calculations

### Subscriptions
- [ ] Upgrade law firm subscription tier
- [ ] Verify new limits applied
- [ ] Test client limit enforcement
- [ ] Cancel subscription
- [ ] Reactivate subscription

---

## 6. 🎮 Gamification Features

### Coins & Rewards
- [ ] Claim daily login bonus
- [ ] Earn coins for completing substages
- [ ] Earn coins for uploading documents
- [ ] Check coin balance
- [ ] View coin transaction history

### Progress Tracking
- [ ] View litigation progress
- [ ] Complete substage
- [ ] Complete full stage
- [ ] Revert substage (undo)
- [ ] View progress timeline

### Tiers & Achievements
- [ ] Bronze tier features
- [ ] Silver tier features (if applicable)
- [ ] Gold tier features (if applicable)
- [ ] View achievement badges

---

## 7. 📨 Notifications

### Push Notifications (Mobile)
- [ ] Register device for push notifications
- [ ] Receive test notification
- [ ] Click notification (should navigate to relevant screen)
- [ ] Mark notification as read
- [ ] View notification history

### In-App Notifications
- [ ] View unread count
- [ ] View notification list
- [ ] Mark all as read
- [ ] Reply to notification thread
- [ ] Delete notification

### Notification Preferences
- [ ] Update notification preferences
- [ ] Disable specific notification types
- [ ] Test quiet hours (if implemented)

### SMS Notifications (if enabled)
- [ ] Receive account creation SMS
- [ ] Receive credential SMS
- [ ] Verify phone number format

### Email Notifications (if enabled)
- [ ] Receive welcome email
- [ ] Receive password reset email
- [ ] Receive security alert email

---

## 8. ⚖️ Litigation Management

### Case Stages
- [ ] View current litigation stage
- [ ] Progress through stages sequentially
- [ ] View stage details and requirements
- [ ] Track next steps and due dates

### Case Information
- [ ] Add case number
- [ ] Set case value
- [ ] Track settlement amount
- [ ] Add case notes
- [ ] View stage history

---

## 9. 💬 Communication

### Chat Feature
- [ ] Send message to law firm
- [ ] Receive message from law firm
- [ ] View chat history
- [ ] Test real-time updates
- [ ] Verify HIPAA compliance in messages

### Notifications to Clients
- [ ] Law firm sends notification to single client
- [ ] Law firm sends notification to all clients
- [ ] Law firm sends notification to specific clients
- [ ] View delivery status
- [ ] Track click-through rate

---

## 10. 📊 Law Firm Dashboard

### Client Overview
- [ ] View list of all clients
- [ ] Search clients
- [ ] Filter clients by status
- [ ] View client details
- [ ] Access client files
- [ ] Track client progress

### Analytics
- [ ] View total clients count
- [ ] View active cases
- [ ] View notification statistics
- [ ] View activity logs
- [ ] Export reports (if implemented)

### Activity Tracking
- [ ] View activity logs
- [ ] Filter by user
- [ ] Filter by date range
- [ ] View failed login attempts
- [ ] Track HIPAA access logs

---

## 11. 🏥 Medical Provider Dashboard

### Patient Overview
- [ ] View list of patients
- [ ] Search patients
- [ ] View patient details
- [ ] Access patient files (with consent)

### HIPAA Compliance
- [ ] All PHI fields are encrypted
- [ ] Access logs are recorded
- [ ] Audit trail is complete
- [ ] Verify consent requirements
- [ ] Test data breach notification (if implemented)

### Notifications to Patients
- [ ] Send notification to single patient
- [ ] Send notification to all patients
- [ ] View delivery status

---

## 12. 🔒 Security Testing

### Authentication Security
- [ ] Test SQL injection in login form
- [ ] Test XSS in registration fields
- [ ] Verify password hashing (bcrypt)
- [ ] Test JWT expiration (should expire after 7 days)
- [ ] Test token refresh mechanism

### Authorization
- [ ] Client cannot access law firm routes
- [ ] Law firm cannot access medical provider routes
- [ ] Users cannot access other users' data
- [ ] File access is properly restricted

### Rate Limiting
- [ ] Login endpoint (10 requests/minute per IP)
- [ ] API endpoint (1000 requests/15 minutes)
- [ ] Password reset (3 requests/hour)
- [ ] Coin purchases (20 requests/hour)
- [ ] File uploads (check limits)

### Data Protection
- [ ] PHI fields are encrypted at rest
- [ ] Passwords are hashed (not plain text)
- [ ] Sensitive data not in logs
- [ ] HTTPS enforced in production
- [ ] Cookie security flags set correctly

---

## 13. 🌐 Cross-Platform Testing

### Web (React Native Web)
- [ ] Registration flow works
- [ ] Login works
- [ ] Dashboard loads correctly
- [ ] File upload works
- [ ] Stripe integration works
- [ ] Responsive design (mobile, tablet, desktop)

### iOS (if applicable)
- [ ] App launches successfully
- [ ] Registration/login works
- [ ] File picker works
- [ ] Camera integration works
- [ ] Push notifications work
- [ ] Stripe native component works

### Android (if applicable)
- [ ] App launches successfully
- [ ] Registration/login works
- [ ] File picker works
- [ ] Camera integration works
- [ ] Push notifications work
- [ ] Stripe native component works

---

## 14. 🐛 Error Handling

### Network Errors
- [ ] Test with airplane mode
- [ ] Test with slow connection
- [ ] Verify timeout handling
- [ ] Check offline indicators

### Form Validation
- [ ] Required field validation
- [ ] Email format validation
- [ ] Phone number format validation
- [ ] Password strength validation
- [ ] Date format validation

### Error Messages
- [ ] Errors are user-friendly
- [ ] No technical jargon exposed
- [ ] No stack traces in production
- [ ] Proper error codes returned

---

## 15. 📱 Mobile-Specific Features

### Device Integration
- [ ] Document picker works
- [ ] Camera works for photos
- [ ] Photo library access
- [ ] Calendar integration (if implemented)
- [ ] Contact picker (if implemented)

### Performance
- [ ] App loads within acceptable time (<3 seconds)
- [ ] Images load efficiently
- [ ] No memory leaks
- [ ] Smooth animations
- [ ] Offline data persistence

---

## 16. 🔄 Data Integrity

### Database Consistency
- [ ] Foreign key constraints work
- [ ] Cascading deletes work correctly
- [ ] No orphaned records
- [ ] Data types are correct
- [ ] Indexes improve query performance

### Data Validation
- [ ] Email uniqueness enforced
- [ ] Firm codes are unique
- [ ] User IDs are properly linked
- [ ] Timestamps are accurate

---

## 17. 🎯 Edge Cases

### Boundary Testing
- [ ] Test with maximum file size (49.9 MB)
- [ ] Test with minimum valid inputs
- [ ] Test with very long text fields
- [ ] Test with special characters in names
- [ ] Test with international characters

### Race Conditions
- [ ] Multiple simultaneous logins
- [ ] Concurrent file uploads
- [ ] Simultaneous coin purchases

### Data Migration
- [ ] Test user account deletion
- [ ] Test law firm deletion (should set client FK to NULL)
- [ ] Test data export (if implemented)

---

## 18. ♿ Accessibility (if applicable)

- [ ] Screen reader compatibility
- [ ] Keyboard navigation
- [ ] Color contrast ratios
- [ ] Font size accessibility
- [ ] Alt text for images

---

## 19. 📈 Performance Testing

### Load Testing
- [ ] Test with 100 users (if possible)
- [ ] Test with large file uploads (multiple concurrent)
- [ ] Test database query performance
- [ ] Monitor server resource usage

### Optimization
- [ ] Images are compressed
- [ ] API responses are fast (<500ms)
- [ ] Pagination works for large datasets
- [ ] Caching is implemented where appropriate

---

## 20. 🚀 Deployment & Configuration

### Environment Variables
- [ ] All required vars are set
- [ ] Stripe test keys are configured
- [ ] Database connection works
- [ ] JWT secret is secure
- [ ] Encryption key is set

### Server Health
- [ ] Health endpoint responds
- [ ] Database migrations ran successfully
- [ ] All services are running
- [ ] Logs are being captured

---

## 📝 Bug Reporting

When you find a bug, please report:
1. **What happened**: Describe the issue
2. **Expected behavior**: What should have happened
3. **Steps to reproduce**: Exact steps to recreate
4. **User type**: Client, law firm, or medical provider
5. **Platform**: Web, iOS, or Android
6. **Screenshots**: If applicable
7. **Error messages**: Exact error text
8. **Severity**: Critical, High, Medium, Low

---

## ✅ Sign-Off

### Tester Information:
- **Name**: _________________
- **Date**: _________________
- **Version Tested**: _________________

### Overall Assessment:
- [ ] Ready for production
- [ ] Needs minor fixes
- [ ] Needs major fixes
- [ ] Not ready for production

**Comments:**
_____________________________________
_____________________________________
_____________________________________

---

**Thank you for beta testing VerdictPath! Your feedback is invaluable in making this app secure, reliable, and user-friendly.** 🎉
