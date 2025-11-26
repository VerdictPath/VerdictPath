# Firebase Real-time Notifications - Test Guide

## 🐛 Issue Identified

Firebase real-time listeners were not being initialized properly due to a **race condition** in the NotificationContext's useEffect dependency array.

---

## 🔧 Fix Applied

### **File:** `src/contexts/NotificationContext.js`

### **Change Made:**

**Before (Line 346):**
```javascript
}, [user?.id, user?.userType, authToken]);
```

**After (Line 376):**
```javascript
}, [user?.id, user?.userType, user?.token]);
```

### **Why This Fixes It:**

The issue was that the useEffect was watching `authToken` (a state variable) instead of `user?.token` (the direct prop). When a user logged in:

1. ✅ `user` object updated with token
2. ❌ `authToken` state hadn't updated yet (race condition)
3. ❌ useEffect didn't re-run because `authToken` hadn't changed
4. ❌ Firebase listeners never initialized

Now with `user?.token` in dependencies:
1. ✅ `user` object updates with token
2. ✅ useEffect immediately re-runs (detects `user?.token` change)
3. ✅ Firebase listeners initialize
4. ✅ Real-time notifications work!

---

## 📝 Enhanced Logging Added

I've added comprehensive logging to help debug Firebase initialization:

```javascript
console.log('🔍 NotificationContext useEffect triggered:', {
  userId: user?.id,
  userType: user?.userType,
  hasUserToken: !!user?.token,
  hasAuthToken: !!authToken,
  hasToken: !!token,
  timestamp: new Date().toISOString()
});

console.log('🚀 STARTING notification initialization for user:', {...});

console.log('✅ Step 1/4: Registering for push notifications...');
console.log('✅ Step 2/4: Registering device with backend...');
console.log('✅ Step 3/4: Setting up Firebase real-time listeners...');
console.log('✅ Step 4/4: Refreshing unread count...');
console.log('✅ Notification initialization complete!');
```

---

## 🧪 How to Test Real-time Notifications

### **Test 1: Login and Check Firebase Initialization**

1. **Open the app** in your browser
2. **Open DevTools Console** (F12 → Console tab)
3. **Click "Sign In"** and login as:
   - Email: `testclient@example.com`
   - Password: `password123`

4. **Watch the console** - You should see:
```
🔍 NotificationContext useEffect triggered: {
  userId: 25,
  userType: "individual",
  hasUserToken: true,
  hasAuthToken: false,
  hasToken: true
}

🚀 STARTING notification initialization for user: {
  userType: "individual",
  userId: 25,
  hasToken: true
}

✅ Step 1/4: Registering for push notifications...
✅ Step 2/4: Registering device with backend...
✅ Step 3/4: Setting up Firebase real-time listeners...

🔥 Firebase Service Loaded - Config: { ... }
🔥 Initializing Firebase with config
✅ Firebase initialized successfully
🔑 Requesting Firebase custom token from backend...
✓ Received Firebase custom token, signing in...
✅ Successfully authenticated to Firebase, UID: 25

📡 Setting up Firebase listeners for path: users/25/notifications
✅ Firebase listeners setup complete for individual 25

✅ Firebase listeners successfully initialized!
✅ Step 4/4: Refreshing unread count...
✅ Notification initialization complete!
```

### **Test 2: Real-time Notification Delivery**

#### **Setup:**
1. **User logged in** as `testclient@example.com` (ID: 25)
2. **DevTools Console open**
3. **On notifications screen** or any screen

#### **Send Notification via Terminal:**

```bash
# Login as law firm
curl -X POST "http://localhost:5000/api/auth/login/lawfirm-user" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testfirm@test.com",
    "password": "Test123!",
    "firmCode": "FIRM-ABC123"
  }' > /tmp/firm_login.json

# Extract token
FIRM_TOKEN=$(cat /tmp/firm_login.json | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# Send notification to client (ID 25)
curl -X POST "http://localhost:5000/api/notifications/send-to-clients" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $FIRM_TOKEN" \
  -d '{
    "clientIds": [25],
    "title": "Real-time Test 🚀",
    "body": "If you see this without refreshing, Firebase works!",
    "type": "general",
    "priority": "high"
  }'
```

#### **Expected Result (No Page Refresh):**

**Console Logs:**
```
🔔 FIREBASE CALLBACK: Notifications update received! {
  count: 1,
  notifications: [
    { id: 456, title: "Real-time Test 🚀" }
  ]
}

🔢 FIREBASE CALLBACK: Unread count update received! {
  newCount: 1,
  oldCount: 0
}
```

**UI Updates (Instantly):**
- ✅ Badge count updates (0 → 1)
- ✅ Notification appears in inbox
- ✅ No page refresh needed!

---

## 🔍 Troubleshooting

### **Issue 1: Still see "No auth token or user ID available"**

**Cause:** Browser cached old code  
**Fix:** Hard refresh the page
- Chrome/Edge: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Firefox: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)

### **Issue 2: Don't see enhanced logging**

**Cause:** Code changes not deployed  
**Fix:**
```bash
# Restart the workflow
# The development server should hot-reload automatically
# If not, restart the "Verdict Path Web" workflow
```

### **Issue 3: Firebase authentication fails**

**Console Error:**
```
❌ Failed to get Firebase token: 401
```

**Cause:** Backend not generating Firebase custom tokens  
**Fix:** Check backend logs for Firebase Admin SDK errors

**Console Error:**
```
❌ Firebase initialization error: [Firebase config missing]
```

**Cause:** Firebase config not loaded  
**Fix:** Check `src/config/firebase.js` exists and has valid config

### **Issue 4: Notifications only update on page refresh**

**Console Shows:**
```
Firebase setup failed, starting REST polling fallback
```

**Cause:** Firebase listeners didn't initialize  
**Debug:**
1. Check if Firebase custom token request succeeded
2. Check Firebase security rules in Console
3. Verify user type matches Firebase path (user/lawfirm/provider)

### **Issue 5: "Permission denied" in Firebase**

**Console Error:**
```
❌ Firebase listener error: PERMISSION_DENIED
```

**Cause:** Firebase security rules blocking access  
**Fix:** 
1. Check Firebase Console → Realtime Database → Rules
2. Verify custom token has correct `uid` and `userType`
3. User UID should match the path (e.g., UID "25" → `/users/25/`)

---

## 📊 Debugging Commands

### **Check Firebase Data (via Firebase Console)**

1. Go to: https://console.firebase.google.com/
2. Select project: **verdict-path**
3. Navigate to: **Realtime Database → Data**
4. Expand: `/users/25/` to see notifications

### **Check Backend Firebase Sync**

**Backend logs should show:**
```
✅ Synced notification 456 to Firebase at /users/25/notifications/456
✅ Synced unread count (1) to Firebase for user 25
```

### **Check Frontend Firebase Connection**

**Console command:**
```javascript
// In browser DevTools Console
window.__vpNotifyStatus
```

**Should return:**
```javascript
{
  hasUser: true,
  userId: 25,
  userType: "individual",
  hasToken: true,
  unreadCount: 1,
  useFirebase: true,
  hasFirebaseUnsubscribe: true,
  hasPollInterval: false,
  timestamp: "2025-11-23T13:00:00.000Z"
}
```

---

## ✅ Success Criteria

Firebase real-time notifications are working if:

1. ✅ **On login:** See "Firebase listeners successfully initialized!" in console
2. ✅ **On new notification:** See "FIREBASE CALLBACK: Notifications update" in console
3. ✅ **No refresh needed:** Badge count and notifications update instantly
4. ✅ **Multi-device sync:** Mark as read on one device, updates on another device instantly
5. ✅ **No polling:** Console doesn't show "starting REST polling fallback"

---

## 🎯 Testing Checklist

- [ ] Hard refresh browser to load new code
- [ ] Login as individual user
- [ ] See enhanced logging in console
- [ ] See "Firebase listeners successfully initialized!"
- [ ] Send notification via terminal/API
- [ ] Notification appears WITHOUT page refresh
- [ ] Badge count updates instantly
- [ ] Mark notification as read
- [ ] Badge count decreases instantly
- [ ] No "REST polling" messages in console

---

## 🔄 If Still Not Working

### **Step 1: Verify Code Changes**

```bash
# Check if fix is in place
grep "user?.token" src/contexts/NotificationContext.js

# Should output line 376:
# }, [user?.id, user?.userType, user?.token]);
```

### **Step 2: Clear Browser Cache**

```bash
# Chrome DevTools
# 1. F12 → Network tab
# 2. Check "Disable cache"
# 3. Right-click refresh button → "Empty Cache and Hard Reload"
```

### **Step 3: Restart Everything**

```bash
# Restart the workflow
# Then hard refresh browser
# Then login again
```

### **Step 4: Check Backend Token Generation**

```bash
# Backend should have this endpoint
curl -X GET "http://localhost:5000/api/notifications/firebase-token" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Should return:
# {"token":"eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."}
```

---

## 📚 Related Files

- `src/contexts/NotificationContext.js` - Main notification context (FIXED)
- `src/services/firebaseService.js` - Firebase client-side service
- `backend/services/firebaseSync.js` - Backend Firebase sync
- `backend/controllers/notificationsController.js` - Notification endpoints
- `firebase-database-rules.json` - Firebase security rules

---

## 🎉 Expected Behavior After Fix

**Before Fix:**
```
User logs in → No Firebase listeners → Must refresh to see notifications
```

**After Fix:**
```
User logs in → Firebase listeners initialize → Real-time updates work!
```

---

**Fix Applied:** November 23, 2025  
**Files Modified:** 1 (NotificationContext.js)  
**Lines Changed:** 1 (dependency array)  
**Impact:** Critical - Enables real-time functionality  

**Test Status:** ⏳ Pending user verification  
**Next Step:** Hard refresh browser and test with checklist above
