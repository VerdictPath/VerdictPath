# Migration Scripts

## migrateLawFirms.js

Bootstrap admin users for existing law firms that were created before the multi-user system was implemented.

### What it does:
1. Finds all existing law firms in the database
2. Checks if each firm already has an admin user
3. Creates an admin user with full permissions if one doesn't exist
4. Sets appropriate user limits based on subscription tier

### Usage:

```bash
node backend/scripts/migrateLawFirms.js
```

### Safety:
- ✅ Idempotent - can be run multiple times safely
- ✅ Skips firms that already have admin users
- ✅ Uses existing hashed passwords from law_firms table
- ✅ Generates unique user codes

### Admin User Details:
- **Role:** admin
- **Permissions:** All permissions enabled
- **Email:** Uses law firm's registered email
- **Password:** Uses law firm's existing hashed password
- **User Code:** `{FIRM_CODE}-USER-{RANDOM}`

### User Limits by Tier:
- Free: 1 user
- Basic: 5 users
- Premium: 25 users
- Enterprise: 100 users
