# Firebase Realtime Database - Data Architecture & Constraints

## 📊 Overview

Firebase Realtime Database serves as a **sync layer** for real-time notification delivery. It is **NOT** the source of truth - PostgreSQL is the authoritative data store. Firebase provides real-time push capabilities for instant notification updates.

---

## 🎯 Core Principle: PostgreSQL as Source of Truth

```
┌─────────────────────────────────────────────────────────────┐
│ ARCHITECTURAL PATTERN: Dual-Write System                    │
│                                                              │
│ PostgreSQL (Source of Truth)     Firebase (Sync Layer)      │
│     ↓                                   ↓                    │
│ ✅ Permanent storage              ✅ Real-time sync          │
│ ✅ Complex queries                ✅ Push notifications      │
│ ✅ Relational data                ✅ Instant updates         │
│ ✅ ACID compliance                ✅ Offline support         │
│ ✅ Backup & recovery              ✅ Low latency             │
│                                                              │
│ ALL writes go to PostgreSQL FIRST, then sync to Firebase    │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Firebase Data Structure

### Path Hierarchy:

```
firebase-realtime-database/
│
├── users/
│   └── {userId}/
│       ├── notifications/
│       │   └── {notificationId}/
│       │       ├── id
│       │       ├── sender_type
│       │       ├── sender_id
│       │       ├── sender_name
│       │       ├── recipient_type
│       │       ├── recipient_id
│       │       ├── title
│       │       ├── body
│       │       ├── type
│       │       ├── priority
│       │       ├── action_url
│       │       ├── action_data
│       │       ├── status
│       │       ├── is_read
│       │       ├── is_clicked
│       │       ├── created_at
│       │       ├── sent_at
│       │       ├── read_at
│       │       ├── clicked_at
│       │       └── synced_at
│       │
│       └── unread_count (integer)
│
├── lawfirms/
│   └── {firmId}/
│       ├── notifications/
│       │   └── {notificationId}/ (same structure as above)
│       │
│       └── unread_count (integer)
│
└── providers/
    └── {providerId}/
        ├── notifications/
        │   └── {notificationId}/ (same structure as above)
        │
        └── unread_count (integer)
```

---

## 📝 Data Saved to Firebase

### 1. Notification Objects

**Location:** `/users/{userId}/notifications/{notificationId}`

**Fields Synced:**
```javascript
{
  id: 123,                              // Notification ID from PostgreSQL
  sender_type: "law_firm",              // Who sent it: law_firm, medical_provider, system
  sender_id: 5,                         // Sender's entity ID
  sender_name: "Smith & Associates",    // Display name of sender
  recipient_type: "user",               // Who receives: user, law_firm, medical_provider
  recipient_id: 45,                     // Recipient's entity ID
  title: "New Task Assigned",           // Notification title
  body: "Please review your documents", // Notification body
  type: "task",                         // Type: general, task, appointment, etc.
  priority: "high",                     // Priority: low, medium, high, urgent
  action_url: "/tasks/123",             // Deep link URL
  action_data: "{\"taskId\":123}",      // Additional data as JSON string
  status: "sent",                       // Status: pending, sent, read, failed
  is_read: false,                       // Boolean flag for read status
  is_clicked: false,                    // Boolean flag for click status
  created_at: "2025-11-23T10:30:00Z",  // ISO 8601 timestamp
  sent_at: "2025-11-23T10:30:05Z",     // When notification was sent
  read_at: null,                        // When user marked as read
  clicked_at: null,                     // When user clicked notification
  synced_at: "2025-11-23T10:30:06Z"    // When synced to Firebase (metadata)
}
```

### 2. Unread Count

**Location:** `/users/{userId}/unread_count`

**Data Type:** `integer`

**Example:**
```javascript
/users/45/unread_count: 3
```

This is updated whenever:
- New notification is created
- Notification is marked as read
- Notification is deleted

---

## 🔒 Security Constraints (Firebase Rules)

### Rule #1: Tenant Isolation (Critical)

**Constraint:** Users can ONLY access their own data.

```json
// Individual Users
"users": {
  "$userId": {
    ".read": "auth != null && auth.uid == $userId && auth.token.userType == 'user'",
    ".write": "auth != null && auth.uid == $userId && auth.token.userType == 'user'"
  }
}
```

**What This Means:**
- User ID 45 can ONLY read/write `/users/45/*`
- User ID 45 CANNOT access `/users/46/*` or `/lawfirms/5/*`
- Must be authenticated with custom Firebase token
- Token must contain matching `uid` and correct `userType`

### Rule #2: User Type Validation

**Constraint:** Each entity type can only access their designated path.

```json
// Law Firms
"lawfirms": {
  "$firmId": {
    ".read": "auth != null && auth.uid == $firmId && auth.token.userType == 'law_firm'"
  }
}

// Medical Providers
"providers": {
  "$providerId": {
    ".read": "auth != null && auth.uid == $providerId && auth.token.userType == 'medical_provider'"
  }
}
```

**What This Means:**
- Law firms can ONLY access `/lawfirms/{their_id}/*`
- Medical providers can ONLY access `/providers/{their_id}/*`
- Individual users can ONLY access `/users/{their_id}/*`
- Cross-type access is completely blocked

### Rule #3: Authentication Required

**Constraint:** ALL Firebase access requires valid authentication.

```json
"auth != null"
```

**What This Means:**
- Anonymous access is completely blocked
- Must have valid Firebase custom token
- Token issued by backend after successful login
- Token contains: `uid`, `userType`, `email`

### Rule #4: Path-Level Permissions

**Constraint:** Notifications and unread counts have separate access rules.

```json
"notifications": {
  "$notificationId": {
    ".read": "auth != null && auth.uid == $userId && auth.token.userType == 'user'",
    ".write": "auth != null && auth.uid == $userId && auth.token.userType == 'user'"
  }
},
"unread_count": {
  ".read": "auth != null && auth.uid == $userId && auth.token.userType == 'user'",
  ".write": "auth != null && auth.uid == $userId && auth.token.userType == 'user'"
}
```

**What This Means:**
- Users can read/write their own notifications
- Users can read/write their own unread count
- Backend also has admin access via Firebase Admin SDK

---

## 🔄 Data Sync Operations

### Operation #1: Create Notification (Dual-Write)

**When:** New notification is created

**Process:**
```javascript
// 1. Write to PostgreSQL (Source of Truth)
const notification = await pool.query(
  `INSERT INTO notifications (...) VALUES (...) RETURNING *`
);

// 2. Sync to Firebase (Real-time Layer)
await syncNotificationToFirebase(notification.rows[0]);
```

**Firebase Write:**
```javascript
/users/{userId}/notifications/{notificationId} ← Full notification object
/users/{userId}/unread_count ← Incremented by 1
```

### Operation #2: Mark as Read

**When:** User opens/reads notification

**Process:**
```javascript
// 1. Update PostgreSQL
await pool.query(
  `UPDATE notifications SET status = 'read', read_at = NOW() WHERE id = $1`
);

// 2. Sync status to Firebase
await syncStatusUpdateToFirebase(recipientType, recipientId, notificationId, {
  status: 'read',
  read_at: new Date().toISOString()
});
```

**Firebase Write:**
```javascript
/users/{userId}/notifications/{notificationId} ← { 
  status: 'read', 
  is_read: true, 
  read_at: '2025-11-23T10:35:00Z',
  synced_at: '2025-11-23T10:35:01Z'
}
/users/{userId}/unread_count ← Decremented by 1
```

### Operation #3: Delete Notification

**When:** User deletes notification

**Process:**
```javascript
// 1. Delete from PostgreSQL
await pool.query(`DELETE FROM notifications WHERE id = $1`);

// 2. Delete from Firebase
await deleteNotificationFromFirebase(recipientType, recipientId, notificationId);
```

**Firebase Write:**
```javascript
/users/{userId}/notifications/{notificationId} ← REMOVED
/users/{userId}/unread_count ← Updated to reflect deletion
```

### Operation #4: Batch Sync

**When:** Initial load or recovery after Firebase downtime

**Process:**
```javascript
// 1. Fetch all notifications from PostgreSQL
const notifications = await pool.query(
  `SELECT * FROM notifications WHERE recipient_id = $1`
);

// 2. Batch sync to Firebase
await batchSyncNotifications(notifications.rows);
```

**Firebase Write:**
```javascript
{
  "/users/{userId}/notifications/{id1}": { ... },
  "/users/{userId}/notifications/{id2}": { ... },
  "/users/{userId}/notifications/{id3}": { ... }
}
// Single atomic update for performance
```

---

## ⚖️ Data Governance Rules

### Rule #1: PostgreSQL Always Wins

**Constraint:** In case of conflict, PostgreSQL data is authoritative.

**Implications:**
- Firebase is ephemeral - can be wiped and rebuilt from PostgreSQL
- Data loss in Firebase is recoverable
- Data loss in PostgreSQL is catastrophic

### Rule #2: No Business Logic in Firebase

**Constraint:** Firebase only stores display data, no calculations.

**What's NOT in Firebase:**
- User profiles
- Patient relationships
- Medical records
- Billing information
- Analytics data
- Complex queries

**What IS in Firebase:**
- Notification display data
- Unread counts
- Real-time sync metadata

### Rule #3: Minimal Data Transfer

**Constraint:** Only sync what's needed for real-time display.

**Excluded Fields:**
- `failed_reason` (error details not needed in real-time view)
- `metadata` (backend-only tracking data)
- Internal PostgreSQL fields (`created_by`, `updated_by`)

### Rule #4: JSON Serialization for Complex Data

**Constraint:** `action_data` is always stored as JSON string.

```javascript
// PostgreSQL: JSONB type
action_data: { taskId: 123, requiresSignature: true }

// Firebase: Serialized string
action_data: "{\"taskId\":123,\"requiresSignature\":true}"
```

**Reason:** Firebase doesn't support complex nested objects reliably.

---

## 🔐 Authentication Flow

### Custom Token Generation

When user logs in, backend generates Firebase custom token:

```javascript
// backend/services/firebaseService.js
const admin = require('firebase-admin');

async function generateCustomToken(userId, userType, email) {
  const customToken = await admin.auth().createCustomToken(userId.toString(), {
    userType: userType,     // 'user', 'law_firm', or 'medical_provider'
    email: email
  });
  
  return customToken;
}
```

**Token Payload:**
```javascript
{
  uid: "45",                    // Entity ID as string
  userType: "user",             // Enforced in security rules
  email: "sarah@example.com",
  iat: 1700000000,
  exp: 1700003600
}
```

### Client-Side Authentication

```javascript
// Frontend: src/services/firebaseService.js
import { getAuth, signInWithCustomToken } from 'firebase/auth';

const auth = getAuth();
await signInWithCustomToken(auth, customToken);

// Now Firebase SDK automatically includes this token in all requests
// Security rules validate: auth.uid == $userId && auth.token.userType == 'user'
```

---

## 📊 Data Size Constraints

### Firebase Limitations:

1. **Path Length:** Max 768 bytes
   - Our paths: `/users/123/notifications/456` ≈ 30 bytes ✅

2. **Node Size:** Max 32MB per node
   - Our notifications: ≈ 1-2KB each ✅

3. **Connections:** Max 100,000 concurrent connections
   - Our scale: Thousands of users ✅

4. **Bandwidth:** 10GB/month free tier
   - Our usage: ~1MB per 1000 notifications ✅

### Our Constraints:

**Notification Retention:**
- Firebase: Last 90 days of notifications (configurable)
- PostgreSQL: Forever (source of truth)

**Batch Size:**
- Max 1000 notifications per batch sync
- Prevents Firebase write quota exhaustion

**Update Frequency:**
- Immediate sync for new notifications
- Debounced sync for unread count (max 1/second)

---

## 🔄 Fallback Strategy

### If Firebase is Down:

1. ✅ **Notifications still work** - PostgreSQL handles all writes
2. ✅ **Push notifications still sent** - Direct via Expo
3. ❌ **Real-time sync disabled** - Users must refresh manually
4. ✅ **Data preserved** - Everything in PostgreSQL

### Recovery Process:

```javascript
// When Firebase comes back online:
// 1. Fetch all notifications from PostgreSQL
const notifications = await pool.query(
  `SELECT * FROM notifications WHERE created_at > $1`,
  [lastSyncTime]
);

// 2. Batch sync to Firebase
await batchSyncNotifications(notifications.rows);

// 3. Resume normal operation
```

---

## 📈 Performance Optimizations

### 1. Indexed Queries

Firebase automatically indexes these paths:
- `/users/{userId}/notifications` - List all notifications
- `/users/{userId}/unread_count` - Get badge count

### 2. Pagination Support

```javascript
// Client-side pagination
const query = ref(db, `/users/${userId}/notifications`);
const limitedQuery = query(query, orderByChild('created_at'), limitToLast(20));
```

### 3. Real-time Listeners

```javascript
// Frontend listens to specific paths only
const notificationsRef = ref(db, `/users/${userId}/notifications`);
onValue(notificationsRef, (snapshot) => {
  // Real-time updates without polling PostgreSQL
});
```

### 4. Offline Persistence

```javascript
// Firebase SDK caches data locally
import { enableNetwork, disableNetwork } from 'firebase/database';

// Automatically works offline, syncs when online
```

---

## 🎯 Use Cases

### ✅ What Firebase Realtime Database Does:

1. **Real-time Notification Delivery**
   - User opens app → Instant badge count update
   - New notification sent → Appears immediately without refresh

2. **Offline-First Experience**
   - User offline → Cached notifications still visible
   - User comes online → Automatic sync

3. **Multi-Device Sync**
   - User reads notification on phone → Badge count updates on tablet
   - Real-time synchronization across all devices

4. **Reduced Server Load**
   - No polling required
   - WebSocket-based push updates
   - PostgreSQL only queried for complex operations

### ❌ What Firebase Does NOT Do:

1. **Business Logic**
   - No calculations or validation
   - No patient association checks
   - No permission enforcement (done in backend)

2. **Source of Truth**
   - Cannot query "all notifications for law firm X"
   - Cannot generate reports
   - Cannot perform analytics

3. **Sensitive Data Storage**
   - No PHI (Protected Health Information)
   - No financial data
   - No authentication credentials

---

## 🔍 Monitoring & Debugging

### Check Firebase Sync Status:

```javascript
// Backend logs
console.log('✅ Synced notification 123 to Firebase at /users/45/notifications/123');

// Firebase Console
// View data in real-time at: https://console.firebase.google.com/
// Navigate to: Realtime Database → Data
```

### Verify Security Rules:

```javascript
// Firebase Console → Realtime Database → Rules
// Test rules with Firebase Simulator
```

### Debug Sync Issues:

```javascript
// Check if notification was synced
const db = getDatabase();
const snapshot = await db.ref(`/users/45/notifications/123`).once('value');
const data = snapshot.val();

if (!data) {
  console.error('❌ Notification not synced to Firebase');
  // Trigger manual sync
  await syncNotificationToFirebase(notificationFromPostgres);
}
```

---

## 📚 Summary

### Data Saved to Firebase:
✅ Notification objects (display data only)  
✅ Unread counts (integer)  
✅ Sync metadata (`synced_at` timestamps)  

### Data NOT Saved to Firebase:
❌ User profiles  
❌ Patient relationships  
❌ Medical records  
❌ Billing information  
❌ Historical analytics  
❌ Audit logs  

### Security Constraints:
🔒 Tenant isolation (users can only access their own data)  
🔒 User type validation (`user`, `law_firm`, `medical_provider`)  
🔒 Authentication required (custom Firebase tokens)  
🔒 Path-level permissions (notifications & unread_count)  

### Architectural Principles:
1️⃣ PostgreSQL is source of truth  
2️⃣ Firebase is real-time sync layer  
3️⃣ Dual-write pattern (PostgreSQL first, then Firebase)  
4️⃣ Fallback gracefully if Firebase is down  
5️⃣ No business logic in Firebase  

---

**Architecture Status:** ✅ Production-Ready  
**HIPAA Compliance:** ✅ No PHI in Firebase  
**Data Integrity:** ✅ PostgreSQL source of truth  
**Real-time Performance:** ✅ WebSocket-based push updates  

**Last Updated:** November 23, 2025
