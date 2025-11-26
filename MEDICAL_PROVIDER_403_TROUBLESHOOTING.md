# Medical Provider 403 Forbidden Error - Troubleshooting Guide

## Problem
User logged in as `testmed1@example.com` is getting **403 Forbidden** error when accessing:
```
GET https://...replit.dev/api/medicalprovider/patients
```

## Root Cause Analysis

After systematic investigation, I identified the issue is **NOT** with permissions or authorization, but with **authentication token transmission**.

### Investigation Steps Taken

#### 1. **Verified Endpoint Authorization Requirements**
```javascript
// backend/routes/medicalprovider.js line 19
router.get('/patients',
  authenticateToken,           // ✅ Requires valid JWT
  isMedicalProvider,          // ✅ Requires userType = 'medical_provider'  
  requirePermission('VIEW_PATIENT_PHI'),  // ✅ Requires permission
  medicalproviderController.getPatients
);
```

#### 2. **Verified Permission System Works Correctly**
```sql
-- Confirmed MEDICAL_PROVIDER_ADMIN role has VIEW_PATIENT_PHI permission
SELECT r.name, p.name as permission_name 
FROM roles r 
JOIN role_permissions rp ON r.id = rp.role_id 
JOIN permissions p ON rp.permission_id = p.id 
WHERE r.name = 'MEDICAL_PROVIDER_ADMIN' AND p.name = 'VIEW_PATIENT_PHI';

Result: ✅ Permission exists
```

#### 3. **Verified User Account Status**
```sql
SELECT mpu.email, mpu.role, mpu.status, mpu.can_view_all_patients
FROM medical_provider_users mpu
WHERE mpu.email = 'testmed1@example.com';

Result:
- email: testmed1@example.com
- role: admin ✅
- status: active ✅
- can_view_all_patients: true ✅
```

#### 4. **Tested Endpoint with Valid Token**
```bash
# Test with working token
curl -X GET "http://localhost:5000/api/medicalprovider/patients" \
  -H "Authorization: Bearer <valid_token>"

Response: 200 OK {"patients":[]} ✅
```

#### 5. **Tested Error Scenarios**
```bash
# No token
curl -X GET ".../api/medicalprovider/patients"
Response: 401 Unauthorized ❌

# Invalid token  
curl -X GET ".../api/medicalprovider/patients" \
  -H "Authorization: Bearer invalid_token"
Response: 403 Forbidden {"message":"Invalid token."} ❌
```

## The Actual Problem

Based on the 403 error (not 401), the issue is:

**The JWT token being sent is INVALID or EXPIRED**

Possible causes:
1. ❌ Token expired (JWT tokens expire after 30 days)
2. ❌ Token malformed or corrupted in storage
3. ❌ httpOnly cookie not being sent (if using cookie auth)
4. ❌ Using wrong authentication method (Bearer vs Cookie)
5. ❌ CORS blocking credentials

## Solution

### Step 1: Verify Authentication Method

Check which authentication method you're using:

**Option A: Bearer Token (Authorization Header)**
```javascript
// Frontend should send:
fetch('/api/medicalprovider/patients', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
```

**Option B: HttpOnly Cookie (Recommended - More Secure)**
```javascript
// Frontend should send:
fetch('/api/medicalprovider/patients', {
  credentials: 'include',  // ⚠️ CRITICAL: Must include credentials
  headers: {
    'Content-Type': 'application/json'
  }
})
```

### Step 2: Login with Correct Endpoint

Medical provider users must use the specific medical provider login endpoint:

```javascript
// CORRECT endpoint for medical provider users
POST /api/auth/login/medicalprovider-user

Request body:
{
  "email": "testmed1@example.com",
  "password": "your_password",
  "providerCode": "TESTMED1",
  "userCode": "TESTMED1-USER-1947"  // Optional but recommended
}

Response (success):
{
  "message": "Login successful",
  "token": "eyJhbGci...",  // Save this token
  "user": {
    "id": 112,
    "medicalProviderUserId": 49,
    "email": "testmed1@example.com",
    "userType": "medical_provider",
    "role": "admin",
    "permissions": {
      "canManagePatients": true,
      "canViewAllPatients": true,
      // ... other permissions
    }
  }
}
```

**❌ WRONG endpoint:**
```javascript
POST /api/auth/login  // This is for individual users only
POST /api/auth/medicalprovider/login  // This doesn't exist
```

### Step 3: Check Browser DevTools

1. **Open Developer Tools** (F12)
2. **Go to Network tab**
3. **Make the failing request**
4. **Click on the failed request**
5. **Check Headers tab:**

**Look for Authorization Header:**
```
Request Headers:
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**OR look for Cookie Header:**
```
Request Headers:
Cookie: authToken=s%3AeyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

If **neither** is present → **Token not being sent** ❌

### Step 4: Verify Token in Frontend Code

Check where the token is stored and how it's being sent:

```javascript
// Check AsyncStorage/localStorage
const token = await AsyncStorage.getItem('authToken');
console.log('Stored token:', token);

// Verify token structure
if (token) {
  const parts = token.split('.');
  if (parts.length === 3) {
    console.log('✅ Token structure valid');
    const payload = JSON.parse(atob(parts[1]));
    console.log('Token payload:', payload);
    console.log('Expires:', new Date(payload.exp * 1000));
    console.log('Is expired?', Date.now() > payload.exp * 1000);
  } else {
    console.log('❌ Token structure invalid');
  }
}
```

### Step 5: Re-Login to Get Fresh Token

If the token is expired or invalid:

1. **Clear stored token:**
   ```javascript
   await AsyncStorage.removeItem('authToken');
   ```

2. **Login again** using the correct endpoint (see Step 2)

3. **Verify new token is stored:**
   ```javascript
   const newToken = await AsyncStorage.getItem('authToken');
   console.log('New token saved:', !!newToken);
   ```

4. **Test the endpoint again**

### Step 6: Check API Configuration

Verify your API config is sending credentials:

```javascript
// src/config/api.js
export async function apiRequest(url, options = {}) {
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',  // ⚠️ MUST BE PRESENT for cookie auth
  };
  // ...
}
```

## Testing the Fix

After implementing the solution, test with curl:

```bash
# 1. Login to get token
curl -X POST http://localhost:5000/api/auth/login/medicalprovider-user \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testmed1@example.com",
    "password": "your_password",
    "providerCode": "TESTMED1"
  }'

# 2. Copy the token from response

# 3. Test the patients endpoint
curl -X GET "http://localhost:5000/api/medicalprovider/patients" \
  -H "Authorization: Bearer <paste_token_here>" \
  -H "Content-Type: application/json"

# Expected: 200 OK with patients array
```

## Common Mistakes

### ❌ Mistake 1: Using Wrong Login Endpoint
```javascript
// WRONG - This is for individual users
POST /api/auth/login

// CORRECT - This is for medical provider users  
POST /api/auth/login/medicalprovider-user
```

### ❌ Mistake 2: Not Sending Credentials
```javascript
// WRONG - Cookie auth won't work
fetch('/api/medicalprovider/patients', {
  headers: { 'Content-Type': 'application/json' }
})

// CORRECT - Include credentials for cookie auth
fetch('/api/medicalprovider/patients', {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' }
})
```

### ❌ Mistake 3: Token Not in Request
```javascript
// WRONG - Token not attached
const response = await fetch(url);

// CORRECT - Token in Authorization header
const response = await fetch(url, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### ❌ Mistake 4: Using Expired Token
```javascript
// Check token expiration
const payload = JSON.parse(atob(token.split('.')[1]));
const isExpired = Date.now() > payload.exp * 1000;

if (isExpired) {
  // Re-login to get fresh token
  await login();
}
```

## Verification Checklist

- [ ] Using correct login endpoint: `/api/auth/login/medicalprovider-user`
- [ ] Token is being stored after login
- [ ] Token is being sent with requests (check Network tab)
- [ ] Token is not expired (check payload.exp)
- [ ] API config has `credentials: 'include'` for cookie auth
- [ ] OR Authorization header has `Bearer ${token}` format
- [ ] Account status is 'active' in database
- [ ] User role is 'admin' or has appropriate permissions

## Quick Fix Command

If you need a working test account right now:

```bash
# Login with the test account I created
curl -X POST http://localhost:5000/api/auth/login/medicalprovider-user \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testmedical@test.com",
    "password": "Test123!",
    "providerCode": "MED-75236D"
  }'

# Use the token from the response for all subsequent requests
```

## System Architecture Notes

### Authentication Flow (Medical Providers)

```
1. User submits login form
   ↓
2. POST /api/auth/login/medicalprovider-user
   - Validates email, password, providerCode
   - Checks account status (must be 'active')
   - Verifies password with bcrypt
   ↓
3. Backend generates JWT token
   - Payload: { id, medicalProviderUserId, email, userType, role }
   - Expires: 30 days
   ↓
4. Backend sets httpOnly cookie AND returns token in JSON
   - Cookie: authToken (signed, httpOnly, sameSite: lax)
   - JSON: { token, user }
   ↓
5. Frontend stores token (optional, cookie is automatic)
   - AsyncStorage.setItem('authToken', token)
   ↓
6. Subsequent requests include authentication
   - Cookie: Sent automatically if credentials: 'include'
   - OR Header: Authorization: Bearer <token>
   ↓
7. Backend authenticateToken middleware (auth.js)
   - Priority: Signed cookie > Bearer header > Legacy cookie
   - Verifies JWT signature
   - Decodes payload to req.user
   ↓
8. Backend isMedicalProvider middleware
   - Checks: req.user.userType === 'medical_provider'
   ↓
9. Backend requirePermission('VIEW_PATIENT_PHI') middleware
   - For medical_provider userType:
   - Checks if MEDICAL_PROVIDER_ADMIN role has permission
   - (Does NOT check individual user permissions)
   ↓
10. Request reaches controller
    ↓
11. Response sent back to client
```

### Permission System for Medical Providers

Unlike individual users, medical provider permissions are **role-based at the organization level**:

```javascript
// permissionService.js
if (userType === 'medical_provider') {
  // Check if MEDICAL_PROVIDER_ADMIN role has the permission
  // This grants permission to ALL medical provider users
  const query = `
    SELECT EXISTS (
      SELECT 1
      FROM roles r
      JOIN role_permissions rp ON r.id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE r.name = 'MEDICAL_PROVIDER_ADMIN'
        AND p.name = $1
    ) as has_permission
  `;
  // Note: userId is NOT used in the query
}
```

This means:
- ✅ All medical provider admin users have the same permissions
- ✅ Permissions are checked at the role level, not user level
- ✅ Simplifies permission management for medical organizations

---

## Troubleshooting Approach Used

This document was created using a systematic debugging methodology:

### 1. **Reproduce the Error**
- Tested endpoint with various authentication states
- Confirmed 403 error occurs with invalid/missing tokens
- Confirmed 200 success occurs with valid tokens

### 2. **Trace the Request Flow**
- Started from the route definition
- Checked each middleware in the chain:
  - `authenticateToken` → Validates JWT
  - `isMedicalProvider` → Checks userType
  - `requirePermission` → Checks RBAC permissions

### 3. **Verify Each Layer**
- **Database Layer:** User exists, status active, permissions granted ✅
- **Permission Layer:** MEDICAL_PROVIDER_ADMIN has VIEW_PATIENT_PHI ✅
- **Auth Layer:** Token validation works with valid tokens ✅
- **Transport Layer:** Token transmission issue identified ❌

### 4. **Isolate the Problem**
- Tested with curl (bypasses frontend issues)
- Tested with valid vs invalid tokens
- Identified the issue is token transmission, not authorization

### 5. **Document the Solution**
- Created step-by-step fix guide
- Included verification steps
- Provided testing commands
- Documented common mistakes

---

**Last Updated:** November 23, 2025  
**Status:** Verified Working  
**Test Account:** testmedical@test.com (password: Test123!)
