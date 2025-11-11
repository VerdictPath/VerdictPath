# 🧪 COMPLETE TESTING CHECKLIST - Verdict Path

## 📋 OVERVIEW

Use this checklist to systematically test every feature before launch.

**Testing Phases:**
1. ✅ Backend API Testing (Postman/Thunder Client)
2. ✅ Frontend Integration Testing (App)
3. ✅ End-to-End Flow Testing (Complete user journeys)
4. ✅ Edge Cases & Error Testing
5. ✅ Performance & Load Testing
6. ✅ Security Testing
7. ✅ Cross-Device Testing

---

## 🔧 PHASE 1: BACKEND API TESTING

### **Setup**
- [ ] Backend is running on Replit
- [ ] Health check works: `GET /health`
- [ ] Database connection successful
- [ ] All environment variables set

### **Authentication Endpoints**

**Individual Registration:**
```bash
POST /api/auth/register-client
Body: {
  "firstName": "Test",
  "lastName": "User",
  "email": "test@example.com",
  "password": "password123",
  "privacyAccepted": true
}
```
- [ ] Returns 201 with user object and JWT token
- [ ] User saved in database
- [ ] Password is hashed in database
- [ ] Coin balance initialized to 0
- [ ] Login streak initialized

**Law Firm Registration:**
```bash
POST /api/auth/register-lawfirm
Body: {
  "firmName": "Test Law Firm",
  "email": "firm@example.com",
  "password": "password123",
  "privacyAccepted": true
}
```
- [ ] Returns 201 with law firm object and JWT token
- [ ] Unique firm code generated
- [ ] Firm saved in database

**Medical Provider Registration:**
```bash
POST /api/auth/register-medicalprovider
Body: {
  "providerName": "Test Medical Center",
  "email": "provider@example.com",
  "password": "password123",
  "privacyAccepted": true
}
```
- [ ] Returns 201 with provider object and JWT token
- [ ] Unique provider code generated
- [ ] Provider saved in database

**Login:**
```bash
POST /api/auth/login
Body: {
  "email": "test@example.com",
  "password": "password123",
  "userType": "individual"
}
```
- [ ] Returns 200 with user and JWT token
- [ ] Token is valid for 30 days
- [ ] Wrong password returns 401
- [ ] Non-existent email returns 401

### **Coins Endpoints**

**Get Balance:**
```bash
GET /api/coins/balance
Headers: { Authorization: "Bearer [TOKEN]" }
```
- [ ] Returns current coin balance
- [ ] Returns lifetime credits earned
- [ ] Requires valid token

**Claim Daily Bonus:**
```bash
POST /api/coins/claim-daily
Headers: { Authorization: "Bearer [TOKEN]" }
```
- [ ] First claim: Returns 50 coins (1-day streak)
- [ ] Next day: Returns 60 coins (2-day streak)
- [ ] Same day twice: Returns error "already claimed"
- [ ] Skip a day: Streak resets to 1
- [ ] Max bonus caps at 200 coins
- [ ] Coins added to balance
- [ ] Transaction logged

**Convert Coins:**
```bash
POST /api/coins/convert
Headers: { Authorization: "Bearer [TOKEN]" }
Body: { "coinsToConvert": 5000 }
```
- [ ] 5000 coins → $1 credit
- [ ] Balance decreases by 5000
- [ ] Lifetime credits increases by $1
- [ ] Cannot exceed $5 lifetime cap
- [ ] Less than 5000 coins returns error
- [ ] Insufficient balance returns error

### **Litigation Progress Endpoints**

**Get Progress:**
```bash
GET /api/litigation/progress
Headers: { Authorization: "Bearer [TOKEN]" }
```
- [ ] Returns empty array for new user
- [ ] Returns completed substages for existing user
- [ ] Only works for individual users

**Complete Substage:**
```bash
POST /api/litigation/complete-substage
Headers: { Authorization: "Bearer [TOKEN]" }
Body: {
  "stageId": "pre-filing",
  "subStageId": "pre-1",
  "subStageName": "Initial Consultation",
  "coinsEarned": 50
}
```
- [ ] First time: Returns coins earned
- [ ] Coins added to balance
- [ ] Progress saved to database
- [ ] Second time: Returns 0 coins (anti-farming)
- [ ] Transaction logged

**Complete Stage:**
```bash
POST /api/litigation/complete-stage
Headers: { Authorization: "Bearer [TOKEN]" }
Body: {
  "stageId": "pre-filing",
  "stageName": "Pre-Filing",
  "coinsEarned": 100,
  "allSubstagesCompleted": true
}
```
- [ ] First time: Returns bonus coins
- [ ] Coins added to balance
- [ ] Stage marked complete
- [ ] Second time: Returns 0 coins
- [ ] Only works if all substages complete

**Revert Stage:**
```bash
POST /api/litigation/revert-stage
Headers: { Authorization: "Bearer [TOKEN]" }
Body: { "stageId": "pre-filing" }
```
- [ ] Stage marked incomplete
- [ ] Substages marked incomplete
- [ ] Coins NOT removed (preserved)
- [ ] Success message returned

### **Law Firm Endpoints**

**Get Clients:**
```bash
GET /api/lawfirm/clients
Headers: { Authorization: "Bearer [LAWFIRM_TOKEN]" }
```
- [ ] Returns array of clients
- [ ] Includes client stats (coins, streak, progress)
- [ ] Empty array if no clients
- [ ] Only works for law firm users

**Get Client Details:**
```bash
GET /api/lawfirm/clients/[CLIENT_ID]
Headers: { Authorization: "Bearer [LAWFIRM_TOKEN]" }
```
- [ ] Returns client full details
- [ ] Includes coin balance
- [ ] Includes streak info
- [ ] Includes completed substages
- [ ] 404 if client doesn't belong to firm

**Get Client Progress:**
```bash
GET /api/lawfirm/clients/[CLIENT_ID]/progress
Headers: { Authorization: "Bearer [LAWFIRM_TOKEN]" }
```
- [ ] Returns client's completed substages
- [ ] Ordered by completion date
- [ ] 404 if client doesn't belong to firm

### **Invite Endpoints**

**Generate Invite:**
```bash
GET /api/invites/generate
Headers: { Authorization: "Bearer [TOKEN]" }
```
- [ ] Returns unique invite code
- [ ] Code saved to database
- [ ] Format: VP[timestamp][random]

**Process Invite:**
```bash
POST /api/invites/process
Headers: { Authorization: "Bearer [NEW_USER_TOKEN]" }
Body: {
  "inviteCode": "VP123ABC",
  "newUserId": 456
}
```
- [ ] Valid code: Returns success
- [ ] Inviter gets 500 coins
- [ ] Code marked as used
- [ ] Invalid code: Returns error
- [ ] Already used code: Returns error
- [ ] Own code: Returns error

**Get Invite Stats:**
```bash
GET /api/invites/stats
Headers: { Authorization: "Bearer [TOKEN]" }
```
- [ ] Returns total invites count
- [ ] Returns successful invites count
- [ ] Returns recent invite codes

### **File Upload Endpoints**

**Upload Single File:**
```bash
POST /api/uploads/document
Headers: { Authorization: "Bearer [TOKEN]" }
Body: multipart/form-data
  - file: [FILE]
  - fileType: "medical_bill"
  - category: "medical"
```
- [ ] File uploaded to cloud storage
- [ ] Metadata saved to database
- [ ] Returns file ID and URL
- [ ] File size validated (max 50MB)
- [ ] File type validated

**Get User's Documents:**
```bash
GET /api/uploads
Headers: { Authorization: "Bearer [TOKEN]" }
```
- [ ] Returns array of user's files
- [ ] Includes file metadata
- [ ] Can filter by category
- [ ] Can filter by fileType
- [ ] Pagination works (limit, offset)

**Get Specific Document:**
```bash
GET /api/uploads/[DOCUMENT_ID]
Headers: { Authorization: "Bearer [TOKEN]" }
```
- [ ] Returns document details
- [ ] Returns download URL (signed if S3)
- [ ] 404 if document doesn't exist
- [ ] 403 if document belongs to another user

**Delete Document:**
```bash
DELETE /api/uploads/[DOCUMENT_ID]
Headers: { Authorization: "Bearer [TOKEN]" }
```
- [ ] File marked as deleted in database
- [ ] File removed from cloud storage
- [ ] Cannot delete another user's file

### **Subscription Endpoints**

**Create Checkout Session:**
```bash
POST /api/subscriptions/create-checkout-session
Headers: { Authorization: "Bearer [TOKEN]" }
Body: {
  "tier": "basic",
  "userType": "individual",
  "successUrl": "http://localhost:3000/success",
  "cancelUrl": "http://localhost:3000/cancel"
}
```
- [ ] Returns Stripe checkout session ID
- [ ] Returns checkout URL
- [ ] Customer created in Stripe if new
- [ ] Customer ID saved to database

**Create Portal Session:**
```bash
POST /api/subscriptions/portal-session
Headers: { Authorization: "Bearer [TOKEN]" }
Body: {
  "userType": "individual",
  "returnUrl": "http://localhost:3000/dashboard"
}
```
- [ ] Returns Stripe portal URL
- [ ] Only works if customer exists

**Get Subscription Status:**
```bash
GET /api/subscriptions/status?userType=individual
Headers: { Authorization: "Bearer [TOKEN]" }
```
- [ ] Returns current tier
- [ ] Returns Stripe subscription status
- [ ] Returns period end date
- [ ] Returns cancel status

---

## 📱 PHASE 2: FRONTEND INTEGRATION TESTING

### **App Startup**
- [ ] App loads without crashing
- [ ] Onboarding shows for first-time users
- [ ] Landing screen shows after onboarding
- [ ] No console errors on startup

### **Registration Flow**

**Individual Registration:**
- [ ] Can select "Individual" user type
- [ ] All fields validate properly
- [ ] Email format validated
- [ ] Password length validated (min 6 chars)
- [ ] Confirm password matches
- [ ] Privacy checkbox required
- [ ] Can enter optional firm code
- [ ] Can enter optional invite code
- [ ] Success: Navigates to subscription screen
- [ ] Success: Can choose free tier and login
- [ ] User data appears in dashboard

**Law Firm Registration:**
- [ ] Can select "Law Firm" user type
- [ ] Firm name required
- [ ] Firm code generated and displayed
- [ ] Success: Navigates to law firm dashboard
- [ ] Firm code shown in success message

**Medical Provider Registration:**
- [ ] Can select "Medical Provider" user type
- [ ] Provider name required
- [ ] Provider code generated and displayed
- [ ] Success: Navigates to provider dashboard

### **Login Flow**
- [ ] Can select user type
- [ ] Email and password validated
- [ ] Correct credentials: Logs in successfully
- [ ] Wrong password: Shows error
- [ ] Wrong email: Shows error
- [ ] Token saved for future requests
- [ ] Navigates to correct dashboard based on type

### **Individual Dashboard**
- [ ] Shows user's name
- [ ] Shows coin balance
- [ ] Shows login streak
- [ ] "Claim Daily Bonus" button visible
- [ ] Quick action buttons work
- [ ] Navigation to other screens works

### **Coins & Gamification**

**Daily Bonus:**
- [ ] Button shows "Claim Daily Bonus"
- [ ] Click: Shows loading state
- [ ] Success: Shows alert with coins earned
- [ ] Coin balance updates
- [ ] Streak number updates
- [ ] Next click same day: Shows "already claimed"
- [ ] Next day: Can claim again

**Coin Conversion:**
- [ ] Button visible in Treasure Chest
- [ ] < 5,000 coins: Shows error
- [ ] ≥ 5,000 coins: Shows confirmation dialog
- [ ] Confirm: Coins decrease
- [ ] Confirm: Shows credit amount
- [ ] Confirm: Shows remaining lifetime amount
- [ ] At $5 cap: Shows "cap reached" error

### **Litigation Roadmap**
- [ ] All stages display correctly
- [ ] Stages can be expanded/collapsed
- [ ] Substages visible when expanded
- [ ] Uncompleted substages have action buttons
- [ ] Completed substages show checkmark
- [ ] Can complete substage
- [ ] Coins increase on completion
- [ ] Alert shows coins earned
- [ ] Progress syncs to backend
- [ ] Cannot earn coins twice for same substage
- [ ] All substages complete: "Complete Stage" button appears
- [ ] Completing stage: Bonus coins awarded
- [ ] Completed stages show green dotted lines

### **Medical Hub**
- [ ] Can switch between tabs (Bills, Records)
- [ ] Upload button visible
- [ ] Click upload: File picker opens
- [ ] Select file: Shows loading
- [ ] Success: File appears in list
- [ ] File has correct name
- [ ] Can view uploaded files
- [ ] File list persists after leaving screen

### **Videos Screen**
- [ ] Video list displays
- [ ] Free videos show "Free" badge
- [ ] Paid videos show price
- [ ] Click paid video: Shows purchase dialog
- [ ] Click free video: Shows "coming soon" or plays

### **Law Firm Dashboard**
- [ ] Shows firm name
- [ ] Shows firm code
- [ ] "Client Management" button works
- [ ] Shows client count
- [ ] Navigation buttons work

### **Law Firm Client List**
- [ ] Shows all clients
- [ ] Shows client stats (coins, streak, progress)
- [ ] Click client: Navigates to details
- [ ] Empty state if no clients

### **Law Firm Client Details**
- [ ] Shows client full info
- [ ] Shows coin balance
- [ ] Shows streak
- [ ] Shows completed substages list
- [ ] Can view client's roadmap
- [ ] Roadmap is read-only

### **Notifications**
- [ ] Notification bell shows unread count
- [ ] Click bell: Opens inbox
- [ ] Inbox shows notifications
- [ ] Unread notifications highlighted
- [ ] Click notification: Marks as read
- [ ] Click notification: Opens detail
- [ ] Detail shows full content
- [ ] Deep links work (if applicable)

### **Calendar**
- [ ] Calendar displays current month
- [ ] Can navigate between months
- [ ] Events display on correct dates
- [ ] Can view event details

### **Actions/Tasks**
- [ ] Task list displays
- [ ] Shows pending tasks
- [ ] Can mark task as complete
- [ ] Completed tasks update

### **Achievements**
- [ ] Shows earned achievements
- [ ] Shows locked achievements
- [ ] Progress bars display correctly

### **Badges**
- [ ] Badge collection displays
- [ ] Earned badges highlighted
- [ ] Can view badge details

### **Treasure Chest**
- [ ] Shows current coin balance
- [ ] Shows lifetime credits earned
- [ ] Shows remaining lifetime credits
- [ ] "Convert Coins" button works
- [ ] Conversion calculation correct

---

## 🔄 PHASE 3: END-TO-END FLOW TESTING

### **Complete Individual User Journey**

**Day 1:**
1. [ ] Download app
2. [ ] Complete onboarding
3. [ ] Register as individual
4. [ ] Accept privacy policy
5. [ ] Choose free tier
6. [ ] See dashboard with 0 coins
7. [ ] Claim daily bonus → Get 50 coins
8. [ ] View litigation roadmap
9. [ ] Complete first substage → Get 50 more coins
10. [ ] Total: 100 coins
11. [ ] Check balance in Treasure Chest
12. [ ] Try to convert coins → Error (need 5,000)
13. [ ] Upload medical document
14. [ ] Document appears in Medical Hub
15. [ ] Log out

**Day 2:**
16. [ ] Log back in
17. [ ] Claim daily bonus → Get 60 coins (2-day streak)
18. [ ] Complete another substage → Get coins
19. [ ] Check notifications (if any)
20. [ ] View achievements

**After earning 5,000 coins:**
21. [ ] Go to Treasure Chest
22. [ ] Convert 5,000 coins → Get $1 credit
23. [ ] Balance decreases by 5,000
24. [ ] Shows $1 credit added
25. [ ] Shows $4 remaining lifetime

### **Complete Law Firm Journey**

1. [ ] Register as law firm
2. [ ] Get firm code (e.g., LF123ABC)
3. [ ] See empty client list
4. [ ] Share firm code
5. [ ] Individual registers with firm code
6. [ ] Client appears in law firm's list
7. [ ] Click client → See details
8. [ ] View client's roadmap
9. [ ] Client completes substage
10. [ ] Progress updates in law firm view
11. [ ] Send notification to client
12. [ ] Client receives notification

### **Complete Payment Journey**

1. [ ] Register new user
2. [ ] Choose "Basic" tier
3. [ ] Redirect to Stripe checkout
4. [ ] Enter test card: 4242 4242 4242 4242
5. [ ] Complete payment
6. [ ] Redirect back to app
7. [ ] Webhook fires
8. [ ] User tier updates to "basic"
9. [ ] Check database: stripe_customer_id set
10. [ ] Check database: stripe_subscription_id set
11. [ ] Access subscription management
12. [ ] Stripe portal opens
13. [ ] Can see subscription details
14. [ ] Can cancel subscription
15. [ ] Webhook fires
16. [ ] User tier updates to "free"

### **Complete Invite Journey**

1. [ ] User A generates invite code
2. [ ] User A shares code with User B
3. [ ] User B registers
4. [ ] User B enters invite code during registration
5. [ ] Registration completes
6. [ ] User A gets 500 coins
7. [ ] Check database: invite marked as used
8. [ ] User B tries same code → Error
9. [ ] User A checks invite stats → Shows 1 successful

---

## 🐛 PHASE 4: EDGE CASES & ERROR TESTING

### **Network Errors**
- [ ] Turn off WiFi mid-request → Shows error
- [ ] Slow connection → Shows loading state
- [ ] Request timeout → Shows timeout error
- [ ] Resume connection → App recovers

### **Authentication Errors**
- [ ] Expired token → Redirects to login
- [ ] Invalid token → Shows error
- [ ] Logout → Clears token
- [ ] Login again → Works

### **Validation Errors**
- [ ] Empty fields → Shows validation error
- [ ] Invalid email → Shows error
- [ ] Short password → Shows error
- [ ] Mismatched passwords → Shows error
- [ ] Special characters in name → Handles correctly
- [ ] Very long text → Truncates or scrolls

### **Permission Errors**
- [ ] Law firm tries to access another firm's clients → 403
- [ ] User tries to access another user's documents → 403
- [ ] User tries endpoint without token → 401

### **Data Integrity**
- [ ] Complete same substage twice → Only coins once
- [ ] Complete stage without substages → Error
- [ ] Convert more coins than balance → Error
- [ ] Upload file > 50MB → Error
- [ ] Upload invalid file type → Error
- [ ] Use invalid invite code → Error
- [ ] Use own invite code → Error

### **Race Conditions**
- [ ] Click button multiple times quickly → Only processes once
- [ ] Multiple API calls at once → All complete correctly
- [ ] Claim bonus at midnight → Calculates correctly

### **Database Errors**
- [ ] Database connection lost → Shows error
- [ ] Database full → Shows error
- [ ] Constraint violation → Shows error

---

## ⚡ PHASE 5: PERFORMANCE TESTING

### **Load Times**
- [ ] App starts in < 3 seconds
- [ ] Dashboard loads in < 2 seconds
- [ ] Roadmap loads in < 2 seconds
- [ ] API responses < 1 second
- [ ] File upload shows progress

### **Large Data**
- [ ] 100+ notifications → Loads and scrolls smoothly
- [ ] 50+ clients (law firm) → Loads quickly
- [ ] 100+ documents → Paginates correctly
- [ ] Long litigation history → Displays efficiently

### **Memory**
- [ ] App doesn't crash after 30 minutes of use
- [ ] No memory leaks
- [ ] Images don't consume excessive memory

---

## 🔒 PHASE 6: SECURITY TESTING

### **Authentication**
- [ ] Passwords hashed in database
- [ ] JWT tokens expire (30 days)
- [ ] Cannot access API without token
- [ ] Token includes correct user info
- [ ] Logout clears token

### **Authorization**
- [ ] Users can only access their own data
- [ ] Law firms can only access their clients
- [ ] Cannot modify another user's data
- [ ] Proper 401/403 responses

### **SQL Injection**
- [ ] Try: `email = "test'; DROP TABLE users; --"`
- [ ] Try: `firstName = "<script>alert('xss')</script>"`
- [ ] All inputs sanitized

### **File Upload Security**
- [ ] Executable files rejected
- [ ] Malicious files rejected
- [ ] File size limits enforced
- [ ] Files stored securely (private)

---

## 📱 PHASE 7: CROSS-DEVICE TESTING

### **iOS Testing**
- [ ] iPhone 13/14/15 - Works correctly
- [ ] iPad - Layout adapts properly
- [ ] iOS 16+ - No compatibility issues
- [ ] Push notifications work
- [ ] File picker works

### **Android Testing**
- [ ] Samsung Galaxy - Works correctly
- [ ] Google Pixel - Works correctly
- [ ] Android 11+ - No compatibility issues
- [ ] Push notifications work
- [ ] File picker works

### **Web Testing** (if applicable)
- [ ] Chrome - Works correctly
- [ ] Safari - Works correctly
- [ ] Firefox - Works correctly
- [ ] Edge - Works correctly
- [ ] Responsive design works

---

## 📊 BUG TRACKING TEMPLATE

For each bug found, document:

```
BUG #001
Title: [Short description]
Severity: Critical / High / Medium / Low
Steps to Reproduce:
1. 
2. 
3. 
Expected: [What should happen]
Actual: [What actually happens]
Environment: [iOS/Android/Web, version, device]
Screenshot: [If applicable]
Status: Open / In Progress / Fixed / Won't Fix
```

---

## ✅ FINAL LAUNCH CHECKLIST

- [ ] All critical bugs fixed
- [ ] All high-priority bugs fixed
- [ ] Medium/low bugs documented
- [ ] Performance acceptable
- [ ] Security audit passed
- [ ] All features tested
- [ ] Payment flow works end-to-end
- [ ] Push notifications work
- [ ] File uploads work
- [ ] Database backed up
- [ ] Monitoring configured
- [ ] Error logging active
- [ ] Analytics tracking
- [ ] Legal content finalized
- [ ] Privacy policy published
- [ ] Terms of service published

---

## 🎯 TESTING METRICS

**Target Metrics:**
- ✅ 0 critical bugs
- ✅ < 5 high-priority bugs
- ✅ 95%+ test scenarios pass
- ✅ App response time < 2 seconds
- ✅ 0 data loss incidents
- ✅ 0 security vulnerabilities

---

## 📞 SUPPORT

If you find issues during testing:
1. Document in bug tracking template
2. Prioritize by severity
3. Fix critical/high bugs before launch
4. Plan medium/low bugs for post-launch

**REMEMBER:** It's better to find bugs now than after launch! 🐛

---

**Happy Testing! 🧪**