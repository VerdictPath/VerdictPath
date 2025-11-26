# HttpOnly Cookie Authentication - Medical Provider Fix

## ✅ What Was Fixed

The medical provider 403 error has been resolved by implementing proper endpoint routing and httpOnly cookie authentication.

### Changes Made:

1. **Updated API Configuration** (`src/config/api.js`)
   - Added `LOGIN_LAWFIRM_USER` endpoint
   - Added `LOGIN_MEDICALPROVIDER_USER` endpoint

2. **Updated Login Function** (`App.js`)
   - Routes medical provider users to `/api/auth/login/medicalprovider-user`
   - Routes law firm users to `/api/auth/login/lawfirm-user`
   - Routes individual users to `/api/auth/login`
   - Sends appropriate credentials based on user type

3. **Updated Login Screen** (`src/screens/LoginScreen.js`)
   - Added conditional code input field
   - Shows "Medical Provider Code" field when medical provider is selected
   - Shows "Law Firm Code" field when law firm is selected

4. **Backend Already Configured**
   - HttpOnly signed cookies with XSS protection ✅
   - Dual authentication support (cookies + Bearer tokens) ✅
   - `credentials: 'include'` in all API requests ✅

---

## 🧪 How to Test

### Step 1: Open the Login Screen

1. Navigate to the login page in your app
2. Click on "Medical Provider" user type

### Step 2: Enter Medical Provider Credentials

Use the test account:

```
Email: testmedical@test.com
Password: Test123!
Medical Provider Code: MED-75236D
```

OR use your account:

```
Email: testmed1@example.com
Password: <your_password>
Medical Provider Code: TESTMED1
```

### Step 3: Click "Sign In"

The app will:
1. Call `/api/auth/login/medicalprovider-user` with credentials
2. Backend validates and sets httpOnly cookie `authToken`
3. Backend returns user data and token
4. Frontend stores user data
5. Frontend navigates to medical provider dashboard

### Step 4: Verify Authentication Works

After login, try accessing a protected endpoint:

1. Navigate to "Patients" tab
2. The app should load patients without any 403 error
3. All API requests automatically include the httpOnly cookie

---

## 🔍 Verify in Browser DevTools

### Check Cookie Was Set:

1. Open DevTools (F12)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Click on **Cookies** → Select your site URL
4. Look for: `authToken` cookie
5. Verify:
   - ✅ **HttpOnly**: Yes
   - ✅ **Secure**: Yes (in production)
   - ✅ **SameSite**: Lax
   - ✅ **Value**: Signed JWT token

### Check Cookie Is Sent With Requests:

1. Open DevTools (F12)
2. Go to **Network** tab
3. Navigate to "Patients" or any protected page
4. Click on the API request (e.g., `/api/medicalprovider/patients`)
5. Go to **Headers** tab
6. Look for **Request Headers** section
7. Find: `Cookie: authToken=s%3AeyJhbGci...`

This confirms the httpOnly cookie is being sent automatically!

---

## 🎯 Expected Results

### ✅ Successful Login Flow:

```
1. User enters credentials
   ↓
2. Frontend calls /api/auth/login/medicalprovider-user
   ↓
3. Backend validates credentials
   ↓
4. Backend sets httpOnly cookie: authToken
   ↓
5. Backend returns user data
   ↓
6. Frontend stores user data and navigates to dashboard
   ↓
7. All subsequent requests include cookie automatically
   ↓
8. ✅ Success: 200 OK responses
```

### ❌ Old Behavior (Before Fix):

```
1. User logs in via generic /api/auth/login
   ↓
2. Token not properly set or invalid
   ↓
3. Requests fail with 403 Forbidden
   ↓
4. ❌ Error: "Invalid token" or "Access denied"
```

---

## 🔐 Security Improvements

### HttpOnly Cookie Protection:

- **XSS Protection**: Cookie cannot be accessed by JavaScript
- **CSRF Protection**: SameSite=Lax prevents cross-site attacks
- **Signed Cookie**: Cookie signature prevents tampering
- **Automatic Transmission**: Browser sends cookie with every request

### Dual Authentication Support:

During the migration period, the system supports both:

1. **HttpOnly Cookie** (New, Recommended)
   - Automatically sent with `credentials: 'include'`
   - More secure (XSS protected)
   
2. **Bearer Token** (Legacy, Backward Compatible)
   - Sent via `Authorization: Bearer <token>` header
   - Maintains compatibility with existing mobile apps

---

## 📋 Authentication Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Login Screen (Medical Provider Selected)                    │
│                                                              │
│ Email: testmedical@test.com                                 │
│ Password: ********                                          │
│ Medical Provider Code: MED-75236D                           │
│                                                              │
│ [Sign In Button]                                            │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Frontend: App.js → handleLogin()                            │
│                                                              │
│ const loginEndpoint = API_ENDPOINTS.AUTH.                   │
│     LOGIN_MEDICALPROVIDER_USER                              │
│                                                              │
│ const requestBody = {                                       │
│   email: "testmedical@test.com",                            │
│   password: "Test123!",                                     │
│   providerCode: "MED-75236D"                                │
│ }                                                            │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ API Request:                                                 │
│ POST /api/auth/login/medicalprovider-user                   │
│                                                              │
│ Headers:                                                     │
│   Content-Type: application/json                            │
│   credentials: 'include'                                    │
│                                                              │
│ Body:                                                        │
│   { email, password, providerCode }                         │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Backend: authController.loginMedicalProviderUser()          │
│                                                              │
│ 1. Validate credentials                                     │
│ 2. Find medical_provider by providerCode                    │
│ 3. Find medical_provider_user by email                      │
│ 4. Verify password with bcrypt                              │
│ 5. Check account status = 'active'                          │
│ 6. Generate JWT token (expires in 30 days)                  │
│ 7. Set httpOnly cookie: authToken                           │
│ 8. Return user data + token                                 │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Response:                                                    │
│                                                              │
│ Set-Cookie: authToken=s:eyJhbGci...; HttpOnly; Secure;      │
│             SameSite=Lax; Path=/; Max-Age=2592000           │
│                                                              │
│ Body:                                                        │
│ {                                                            │
│   "message": "Login successful",                            │
│   "token": "eyJhbGci...",                                   │
│   "user": {                                                  │
│     "id": 112,                                               │
│     "medicalProviderUserId": 49,                            │
│     "email": "testmedical@test.com",                        │
│     "userType": "medical_provider",                         │
│     "role": "admin",                                         │
│     "permissions": { ... }                                   │
│   }                                                          │
│ }                                                            │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Frontend: App.js → handleLogin() (continued)                │
│                                                              │
│ 1. Store user data in state                                 │
│ 2. Navigate to medical provider dashboard                   │
│ 3. httpOnly cookie now stored in browser                    │
│ 4. All subsequent requests include cookie automatically     │
└─────────────────────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Medical Provider Dashboard                                   │
│                                                              │
│ Fetches: GET /api/medicalprovider/patients                  │
│                                                              │
│ Request automatically includes:                              │
│ Cookie: authToken=s:eyJhbGci...                             │
│                                                              │
│ Backend:                                                     │
│ 1. authenticateToken middleware extracts cookie             │
│ 2. Verifies JWT signature                                   │
│ 3. Decodes to req.user                                      │
│ 4. isMedicalProvider checks userType                        │
│ 5. requirePermission checks RBAC                            │
│ 6. Controller returns patients                              │
│                                                              │
│ ✅ Response: 200 OK { "patients": [...] }                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Troubleshooting

### Issue: Still Getting 403 Error

**Solution 1: Clear Cookies and Re-Login**

1. Open DevTools (F12)
2. Go to Application → Cookies
3. Delete all cookies for your site
4. Refresh the page
5. Login again with correct credentials

**Solution 2: Verify Provider Code**

The medical provider code must match exactly:

```sql
-- To find your provider code:
SELECT provider_code 
FROM medical_providers 
WHERE id IN (
  SELECT medical_provider_id 
  FROM medical_provider_users 
  WHERE email = 'your_email@example.com'
);
```

**Solution 3: Check Browser Console**

1. Open DevTools (F12)
2. Go to Console tab
3. Look for login-related errors
4. Check if the correct endpoint is being called

### Issue: Cookie Not Being Set

**Check `credentials: 'include'` is present:**

```javascript
// In src/config/api.js
export async function apiRequest(url, options = {}) {
  const defaultOptions = {
    credentials: 'include',  // ✅ Must be present
    // ...
  };
  // ...
}
```

### Issue: Wrong Endpoint Being Called

**Verify in Network tab:**

1. Open DevTools (F12)
2. Go to Network tab
3. Look for the login request
4. Verify URL is: `/api/auth/login/medicalprovider-user`
5. NOT: `/api/auth/login`

---

## 📊 Test Account Details

### Medical Provider Test Account:

```
Email: testmedical@test.com
Password: Test123!
Provider Code: MED-75236D
Provider Name: Test Medical Clinic
Role: admin
Status: active

Permissions:
✅ Can manage users
✅ Can manage patients
✅ Can view all patients
✅ Can send notifications
✅ Can manage billing
✅ Can view analytics
✅ Can manage settings
```

### Your Existing Account:

```
Email: testmed1@example.com
Password: <your_password>
Provider Code: TESTMED1
Role: admin
Status: active

All permissions: ✅ Granted
```

---

## ✨ Summary

The 403 error was caused by using the wrong login endpoint and missing provider code input. With the fix:

✅ Medical provider users now use `/api/auth/login/medicalprovider-user`  
✅ Login screen includes provider code input field  
✅ HttpOnly cookies are set and sent automatically  
✅ All protected endpoints work correctly  
✅ Enhanced XSS protection with httpOnly cookies  
✅ Backward compatible with Bearer token authentication  

**The authentication system is now fully functional and secure!**

---

**Last Updated:** November 23, 2025  
**Status:** ✅ Fixed and Verified  
**Test Account:** testmedical@test.com (password: Test123!)
