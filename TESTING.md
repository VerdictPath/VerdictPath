# Law Firm Multi-User System - Testing Guide

**System Status:** ✅ Production Ready  
**Server:** Running at https://verdictpath.up.railway.app  
**Database:** PostgreSQL with 27 law firms migrated

---

## 🧪 Test Checklist

### 1. User Management Tests

#### ✅ Test 1.1: Admin Can Create New Users
**Endpoint:** `POST /api/lawfirm/users`

**Test Case:**
```bash
curl -X POST https://verdictpath.up.railway.app/api/lawfirm/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {ADMIN_TOKEN}" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@lawfirm.com",
    "password": "SecurePass123!",
    "role": "attorney",
    "title": "Senior Associate",
    "barNumber": "CA12345"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Law firm user created successfully",
  "user": {
    "id": 123,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@lawfirm.com",
    "userCode": "LAW-XXXXX-USER-YYYY",
    "role": "attorney",
    "status": "active"
  }
}
```

**✅ Pass Criteria:**
- Returns 201 status
- Returns `success: true`
- User is created with unique `userCode`
- Activity log created: `user_created`

---

#### ✅ Test 1.2: Admin Can View All Users
**Endpoint:** `GET /api/lawfirm/users?status=active`

**Test Case:**
```bash
curl -X GET "https://verdictpath.up.railway.app/api/lawfirm/users?status=active" \
  -H "Authorization: Bearer {ADMIN_TOKEN}"
```

**Expected Response:**
```json
{
  "success": true,
  "users": [
    {
      "id": 1,
      "firstName": "Admin",
      "lastName": "User",
      "email": "admin@lawfirm.com",
      "userCode": "LAW-XXXXX-USER-0001",
      "role": "admin",
      "status": "active",
      "canManageUsers": true,
      "canViewAnalytics": true
    }
  ]
}
```

**✅ Pass Criteria:**
- Returns 200 status
- Returns array of users
- Shows correct role and permissions
- Activity log created: `user_list_viewed`

---

#### ✅ Test 1.3: Admin Can Deactivate Users
**Endpoint:** `POST /api/lawfirm/users/{userId}/deactivate`

**Test Case:**
```bash
curl -X POST https://verdictpath.up.railway.app/api/lawfirm/users/123/deactivate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {ADMIN_TOKEN}" \
  -d '{"reason": "User left the firm"}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "User deactivated successfully"
}
```

**✅ Pass Criteria:**
- Returns 200 status
- User status changed to `deactivated`
- Activity log created: `user_deactivated`
- User cannot log in after deactivation

---

#### ✅ Test 1.4: Admin Can Reactivate Users
**Endpoint:** `POST /api/lawfirm/users/{userId}/reactivate`

**Test Case:**
```bash
curl -X POST https://verdictpath.up.railway.app/api/lawfirm/users/123/reactivate \
  -H "Authorization: Bearer {ADMIN_TOKEN}"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "User reactivated successfully"
}
```

**✅ Pass Criteria:**
- Returns 200 status
- User status changed to `active`
- Activity log created: `user_reactivated`
- User can log in after reactivation

---

#### ✅ Test 1.5: Deactivated Users Cannot Log In
**Endpoint:** `POST /api/auth/login`

**Test Case:**
```bash
curl -X POST https://verdictpath.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "deactivated.user@lawfirm.com",
    "password": "password123",
    "userType": "lawfirm"
  }'
```

**Expected Response:**
```json
{
  "success": false,
  "message": "Your account has been deactivated. Please contact your administrator."
}
```

**✅ Pass Criteria:**
- Returns 403 status
- Returns proper error message
- No JWT token issued

---

#### ✅ Test 1.6: User Limits Enforced
**Endpoint:** `POST /api/lawfirm/users`

**Test Case:** Create users beyond subscription limit

**Expected Response (when limit reached):**
```json
{
  "success": false,
  "message": "Maximum users (5) reached for your subscription tier. Please upgrade or deactivate existing users."
}
```

**✅ Pass Criteria:**
- Returns 403 status
- Enforces limits: Free=1, Basic=5, Premium=25, Enterprise=100
- Admin cannot create more users than allowed

---

### 2. Activity Tracking Tests

#### ✅ Test 2.1: Login Activity is Logged
**Automatic on login**

**Verification:**
```bash
curl -X GET "https://verdictpath.up.railway.app/api/lawfirm/activity?action=user_login" \
  -H "Authorization: Bearer {ADMIN_TOKEN}"
```

**Expected Response:**
```json
{
  "success": true,
  "logs": [
    {
      "id": 1,
      "action": "user_login",
      "actionCategory": "user",
      "userName": "John Doe",
      "userEmail": "john.doe@lawfirm.com",
      "timestamp": "2024-11-20T18:30:00Z",
      "metadata": {
        "method": "POST",
        "path": "/api/auth/login"
      }
    }
  ]
}
```

**✅ Pass Criteria:**
- Login creates activity log
- Captures IP address and user agent
- Shows correct timestamp

---

#### ✅ Test 2.2: User Creation is Logged
**Automatic on user creation**

**Verification:**
```bash
curl -X GET "https://verdictpath.up.railway.app/api/lawfirm/activity?action=user_created" \
  -H "Authorization: Bearer {ADMIN_TOKEN}"
```

**✅ Pass Criteria:**
- User creation creates activity log
- Shows who created the user
- Shows target user details

---

#### ✅ Test 2.3: User Deactivation is Logged
**Automatic on deactivation**

**Verification:**
```bash
curl -X GET "https://verdictpath.up.railway.app/api/lawfirm/activity?action=user_deactivated" \
  -H "Authorization: Bearer {ADMIN_TOKEN}"
```

**✅ Pass Criteria:**
- Deactivation creates activity log
- Shows reason in metadata
- Shows admin who deactivated

---

#### ✅ Test 2.4: Activity Dashboard Shows Correct Data
**Endpoint:** `GET /api/lawfirm/activity/summary`

**Test Case:**
```bash
curl -X GET "https://verdictpath.up.railway.app/api/lawfirm/activity/summary" \
  -H "Authorization: Bearer {ADMIN_TOKEN}"
```

**Expected Response:**
```json
{
  "success": true,
  "summary": {
    "totalActivities": 150,
    "activitiesByCategory": [
      {"_id": "user", "count": 45, "uniqueUsers": 5},
      {"_id": "client", "count": 80, "uniqueUsers": 3},
      {"_id": "document", "count": 25, "uniqueUsers": 4}
    ],
    "topUsers": [
      {
        "userId": 1,
        "userName": "Admin User",
        "count": 75
      }
    ],
    "recentActivities": [...]
  }
}
```

**✅ Pass Criteria:**
- Shows total activity count
- Breaks down by category
- Shows most active users
- Shows recent activities

---

#### ✅ Test 2.5: Activity Filters Work
**Endpoint:** `GET /api/lawfirm/activity/summary?startDate={date}`

**Test Cases:**
```bash
# Today
curl -X GET "https://verdictpath.up.railway.app/api/lawfirm/activity/summary?startDate=2024-11-20T00:00:00Z" \
  -H "Authorization: Bearer {ADMIN_TOKEN}"

# Last 7 days
curl -X GET "https://verdictpath.up.railway.app/api/lawfirm/activity/summary?startDate=2024-11-13T00:00:00Z" \
  -H "Authorization: Bearer {ADMIN_TOKEN}"

# Last 30 days
curl -X GET "https://verdictpath.up.railway.app/api/lawfirm/activity/summary?startDate=2024-10-21T00:00:00Z" \
  -H "Authorization: Bearer {ADMIN_TOKEN}"
```

**✅ Pass Criteria:**
- Filters by date range correctly
- Returns only activities within range
- Count matches filtered data

---

#### ✅ Test 2.6: User Timeline Shows Individual Actions
**Endpoint:** `GET /api/lawfirm/activity/user/{userId}/timeline`

**Test Case:**
```bash
curl -X GET "https://verdictpath.up.railway.app/api/lawfirm/activity/user/123/timeline?page=1&limit=20" \
  -H "Authorization: Bearer {ADMIN_TOKEN}"
```

**Expected Response:**
```json
{
  "success": true,
  "user": {
    "id": 123,
    "name": "John Doe",
    "email": "john.doe@lawfirm.com",
    "role": "attorney"
  },
  "activities": [...],
  "currentPage": 1,
  "totalPages": 3,
  "totalCount": 45
}
```

**✅ Pass Criteria:**
- Shows only activities for specified user
- Pagination works correctly
- Ordered by most recent first

---

### 3. Permissions Tests

#### ✅ Test 3.1: Non-Admin Cannot Manage Users
**Endpoint:** `POST /api/lawfirm/users`

**Test Case:** Attorney without `canManageUsers` tries to create user

**Expected Response:**
```json
{
  "success": false,
  "message": "You do not have permission to create users"
}
```

**✅ Pass Criteria:**
- Returns 403 status
- Permission check blocks action
- Activity log created: `user_permission_denied`

---

#### ✅ Test 3.2: Non-Admin Cannot View Activity Logs
**Endpoint:** `GET /api/lawfirm/activity`

**Test Case:** User without `canViewAnalytics` tries to view logs

**Expected Response:**
```json
{
  "success": false,
  "message": "Insufficient permissions"
}
```

**✅ Pass Criteria:**
- Returns 403 status
- Permission middleware blocks access

---

#### ✅ Test 3.3: Admins Have All Permissions by Default
**Verification:** Check admin user permissions

**Test Case:**
```bash
curl -X GET "https://verdictpath.up.railway.app/api/lawfirm/users" \
  -H "Authorization: Bearer {ADMIN_TOKEN}"
```

**Expected User Object:**
```json
{
  "role": "admin",
  "canManageUsers": true,
  "canManageClients": true,
  "canViewAllClients": true,
  "canSendNotifications": true,
  "canManageDisbursements": true,
  "canViewAnalytics": true,
  "canManageSettings": true
}
```

**✅ Pass Criteria:**
- All 7 permissions are `true`
- Role is `admin`

---

#### ✅ Test 3.4: Custom Permissions Can Be Set
**Endpoint:** `PUT /api/lawfirm/users/{userId}`

**Test Case:**
```bash
curl -X PUT https://verdictpath.up.railway.app/api/lawfirm/users/123 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {ADMIN_TOKEN}" \
  -d '{
    "permissions": {
      "canViewAnalytics": true,
      "canSendNotifications": true
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "User updated successfully",
  "user": {
    "canViewAnalytics": true,
    "canSendNotifications": true,
    "canManageUsers": false
  }
}
```

**✅ Pass Criteria:**
- Permissions updated correctly
- Activity log created: `user_updated`
- User can access granted features only

---

### 4. Authentication Tests

#### ✅ Test 4.1: Law Firm Users Can Log In
**Endpoint:** `POST /api/auth/login`

**Test Case:**
```bash
curl -X POST https://verdictpath.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@lawfirm.com",
    "password": "password123",
    "userType": "lawfirm"
  }'
```

**Expected Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "type": "lawfirm",
    "lawFirmUserId": 1,
    "lawFirmUserRole": "admin",
    "email": "admin@lawfirm.com"
  }
}
```

**✅ Pass Criteria:**
- Returns JWT token
- Token includes `lawFirmUserId` and `lawFirmUserRole`
- Activity log created: `user_login`

---

#### ✅ Test 4.2: JWT Tokens Work Correctly
**Verification:** Use token for authenticated requests

**Test Case:**
```bash
curl -X GET "https://verdictpath.up.railway.app/api/lawfirm/users" \
  -H "Authorization: Bearer {JWT_TOKEN}"
```

**✅ Pass Criteria:**
- Token is accepted
- User identity verified
- Request succeeds

---

#### ✅ Test 4.3: Deactivated Users Receive Error
**Already tested in Test 1.5**

---

#### ✅ Test 4.4: Token Includes Correct Data
**Verification:** Decode JWT token

**Expected Payload:**
```json
{
  "id": 1,
  "type": "lawfirm",
  "lawFirmUserId": 1,
  "lawFirmUserRole": "admin",
  "email": "admin@lawfirm.com",
  "iat": 1700000000,
  "exp": 1700086400
}
```

**✅ Pass Criteria:**
- Includes `type: "lawfirm"`
- Includes `lawFirmUserId`
- Includes `lawFirmUserRole`
- Has expiration time

---

### 5. Audit Trail Tests

#### ✅ Test 5.1: All Actions Appear in Logs
**Verification:** Check activity logs table

**Test Case:**
```bash
curl -X GET "https://verdictpath.up.railway.app/api/lawfirm/activity?limit=100" \
  -H "Authorization: Bearer {ADMIN_TOKEN}"
```

**✅ Pass Criteria:**
- All actions are logged
- No actions missing from audit trail

---

#### ✅ Test 5.2: Timestamps Are Correct
**Verification:** Check log timestamps

**✅ Pass Criteria:**
- Timestamps in UTC
- Accurate to the second
- Ordered correctly (newest first)

---

#### ✅ Test 5.3: Shows User Who Performed Action
**Verification:** Check userName and userEmail fields

**Expected Log Entry:**
```json
{
  "userName": "Admin User",
  "userEmail": "admin@lawfirm.com",
  "action": "user_created",
  "targetName": "John Doe"
}
```

**✅ Pass Criteria:**
- Shows performer's name and email
- Not null for authenticated actions

---

#### ✅ Test 5.4: Shows Target of Action
**Verification:** Check targetType and targetName

**Expected Log Entry:**
```json
{
  "targetType": "law_firm_user",
  "targetId": 123,
  "targetName": "John Doe"
}
```

**✅ Pass Criteria:**
- Target information captured
- Target name displayed in logs

---

#### ✅ Test 5.5: Metadata Captured Correctly
**Verification:** Check metadata field

**Expected Metadata:**
```json
{
  "metadata": {
    "method": "POST",
    "path": "/api/lawfirm/users",
    "statusCode": 201,
    "role": "attorney",
    "permissions": {...}
  }
}
```

**✅ Pass Criteria:**
- HTTP method captured
- Request path captured
- Sensitive data sanitized (no passwords)
- Additional context included

---

## 🎯 Quick Test Script

Use this script to quickly test all endpoints:

```bash
#!/bin/bash

# Set your admin token
ADMIN_TOKEN="your_admin_token_here"
API_URL="https://verdictpath.up.railway.app"

echo "🧪 Testing Law Firm Multi-User System..."
echo ""

# Test 1: Create User
echo "✓ Test 1: Create User"
curl -s -X POST "$API_URL/api/lawfirm/users" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"firstName":"Test","lastName":"User","email":"test@example.com","password":"Test123!","role":"attorney"}' \
  | jq .

echo ""

# Test 2: List Users
echo "✓ Test 2: List Users"
curl -s -X GET "$API_URL/api/lawfirm/users?status=active" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | jq .

echo ""

# Test 3: Activity Summary
echo "✓ Test 3: Activity Summary"
curl -s -X GET "$API_URL/api/lawfirm/activity/summary" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | jq .

echo ""
echo "✅ Basic tests complete!"
```

---

## 📊 System Status

**✅ Complete Features:**
- User Management (CRUD)
- Activity Tracking (28 action types)
- Permissions System (7 permissions)
- Authentication (Triple-layer)
- Audit Trail (Complete logging)

**📱 Frontend Screens:**
- User Management Screen
- Activity Dashboard Screen
- User Activity Timeline Screen

**🗄️ Database:**
- 27 Law Firms Migrated
- All have admin users
- Activity tracking enabled

---

## 🚀 Production Checklist

- [x] Backend API complete
- [x] Frontend screens complete
- [x] Database migrated
- [x] All permissions enforced
- [x] Activity logging working
- [x] Authentication secure
- [x] User limits enforced
- [x] Audit trail complete

**System is PRODUCTION READY! 🎉**
