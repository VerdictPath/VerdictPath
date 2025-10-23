# HIPAA Implementation - Next Steps

## 🚨 CRITICAL: PHI Is Still Unencrypted!

The encryption infrastructure is built, but **not yet protecting your data**. Follow these steps to complete Phase 1.

---

## Step 1: Set Up Encryption Key (REQUIRED)

### Generate the Key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Add to Replit Secrets

1. Open Replit Secrets tab (lock icon in sidebar)
2. Click "Add new secret"
3. Name: `ENCRYPTION_KEY`
4. Value: Paste the 64-character hex string you generated
5. Save

**SECURITY: Never share, commit, or log this key!**

---

## Step 2: Update Database Schema for Encrypted Fields

You need to add encrypted columns to your existing tables. Run this SQL:

```sql
-- Add encrypted PHI columns to users table
ALTER TABLE users 
  ADD COLUMN first_name_encrypted TEXT,
  ADD COLUMN last_name_encrypted TEXT,
  ADD COLUMN email_hash VARCHAR(64),
  ADD COLUMN phone_encrypted TEXT,
  ADD COLUMN date_of_birth_encrypted TEXT,
  ADD COLUMN ssn_encrypted TEXT,
  ADD COLUMN street_encrypted TEXT,
  ADD COLUMN city_encrypted TEXT,
  ADD COLUMN zip_code_encrypted TEXT;

-- Add index for searching by email hash
CREATE INDEX idx_users_email_hash ON users(email_hash);

-- Add encrypted fields to medical_records
ALTER TABLE medical_records
  ADD COLUMN description_encrypted TEXT,
  ADD COLUMN facility_name_encrypted TEXT,
  ADD COLUMN provider_name_encrypted TEXT;

-- Add encrypted fields to medical_billing
ALTER TABLE medical_billing
  ADD COLUMN description_encrypted TEXT,
  ADD COLUMN provider_name_encrypted TEXT,
  ADD COLUMN insurance_info_encrypted TEXT;
```

---

## Step 3: Create Data Migration Script

Create `backend/scripts/migrate-encrypt-phi.js`:

```javascript
const db = require('../config/db');
const encryption = require('../services/encryption');

async function migratePHI() {
  console.log('Starting PHI encryption migration...');
  
  try {
    // Migrate users
    const users = await db.query('SELECT id, first_name, last_name, email FROM users');
    
    for (const user of users.rows) {
      const encrypted = {
        first_name: encryption.encrypt(user.first_name),
        last_name: encryption.encrypt(user.last_name),
        email_hash: encryption.hash(user.email)
      };
      
      await db.query(
        `UPDATE users 
         SET first_name_encrypted = $1, 
             last_name_encrypted = $2,
             email_hash = $3
         WHERE id = $4`,
        [encrypted.first_name, encrypted.last_name, encrypted.email_hash, user.id]
      );
      
      console.log(`Encrypted user ${user.id}`);
    }
    
    console.log('Migration complete!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

migratePHI().then(() => process.exit(0)).catch(() => process.exit(1));
```

Run it:
```bash
node backend/scripts/migrate-encrypt-phi.js
```

---

## Step 4: Update Controllers to Use Encryption

### Example: Update authController.js

```javascript
const encryption = require('../services/encryption');

// In register function:
const hashedPassword = await bcrypt.hash(password, 10);

// Encrypt PHI
const encryptedFirstName = encryption.encrypt(firstName);
const encryptedLastName = encryption.encrypt(lastName);
const emailHash = encryption.hash(email);

const insertQuery = `
  INSERT INTO users (
    first_name, last_name, email, email_hash,
    first_name_encrypted, last_name_encrypted,
    password, user_type
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  RETURNING id
`;

await db.query(insertQuery, [
  firstName,  // Keep plaintext temporarily during migration
  lastName,   // Keep plaintext temporarily during migration
  email.toLowerCase(),
  emailHash,
  encryptedFirstName,
  encryptedLastName,
  hashedPassword,
  userType
]);

// Later, after migration is complete, drop plaintext columns
```

---

## Step 5: Wire Audit Middleware to Routes

### Example: Update lawfirmController routes

```javascript
const { logPhiAccess } = require('../middleware/audit');

// Add audit logging to PHI routes
router.get(
  '/client/:clientId',
  authenticate,
  logPhiAccess('VIEW_PHI', 'Client'),  // <-- Add this
  lawfirmController.getClientDetails
);

router.get(
  '/client/:clientId/medical-records',
  authenticate,
  logPhiAccess('VIEW_MEDICAL_RECORD', 'MedicalRecord'),  // <-- Add this
  lawfirmController.getMedicalRecords
);
```

---

## Step 6: Integrate Account Lockout

### Update authController.js login function:

```javascript
const { checkAccountLockout, handleFailedLogin, handleSuccessfulLogin } = require('../middleware/security');

// Add checkAccountLockout middleware to login route
router.post('/login', checkAccountLockout, authController.login);

// In login controller:
const user = await db.query('SELECT * FROM users WHERE email = $1', [email]);

if (!user.rows[0]) {
  return res.status(401).json({ message: 'Invalid credentials' });
}

const validPassword = await bcrypt.compare(password, user.rows[0].password);

if (!validPassword) {
  // Handle failed login
  await handleFailedLogin(user.rows[0].id, user.rows[0].user_type);
  return res.status(401).json({ message: 'Invalid credentials' });
}

// Handle successful login
await handleSuccessfulLogin(user.rows[0].id, user.rows[0].user_type, req.ip);
```

---

## Step 7: Test Encryption

### Create a test script:

```javascript
const encryption = require('./backend/services/encryption');

// Test encryption
const original = 'John Doe';
const encrypted = encryption.encrypt(original);
const decrypted = encryption.decrypt(encrypted);

console.log('Original:', original);
console.log('Encrypted:', encrypted);
console.log('Decrypted:', decrypted);
console.log('Match:', original === decrypted ? '✅ PASS' : '❌ FAIL');

// Test hashing
const email = 'test@example.com';
const hash1 = encryption.hash(email);
const hash2 = encryption.hash(email);
console.log('Hash 1:', hash1);
console.log('Hash 2:', hash2);
console.log('Hashes match:', hash1 === hash2 ? '✅ PASS' : '❌ FAIL');
```

---

## Step 8: Verify Audit Logging

### Check audit logs in database:

```sql
-- View recent audit logs
SELECT 
  id,
  actor_id,
  action,
  entity_type,
  target_user_id,
  ip_address,
  timestamp
FROM audit_logs
ORDER BY timestamp DESC
LIMIT 20;

-- Check failed login attempts
SELECT 
  metadata->>'email' as email,
  ip_address,
  COUNT(*) as attempts
FROM audit_logs
WHERE action = 'LOGIN_FAILED'
  AND timestamp > NOW() - INTERVAL '24 hours'
GROUP BY metadata->>'email', ip_address
HAVING COUNT(*) >= 3;
```

---

## ✅ Phase 1 Completion Checklist

- [ ] Encryption key added to Replit Secrets
- [ ] Database schema updated with encrypted columns
- [ ] Migration script created and tested
- [ ] Existing data encrypted
- [ ] Controllers updated to encrypt new data
- [ ] Audit middleware wired to all PHI routes
- [ ] Account lockout integrated into login flow
- [ ] Encryption tested (encrypt/decrypt works)
- [ ] Audit logs capturing PHI access
- [ ] All plaintext PHI columns dropped (after verification)

**When all checkboxes are complete, Phase 1 is done and you have basic HIPAA compliance!**

---

## Phase 2: Access Controls (Next)

After Phase 1 is complete, implement:
- Patient consent management
- Role-based access control (RBAC)
- Minimum necessary access principle
- Break-the-glass emergency access

See HIPAA-IMPLEMENTATION.md for full Phase 2-4 roadmap.

---

## Need Help?

- **Encryption not working?** Check that ENCRYPTION_KEY is exactly 64 hex characters
- **Migration failing?** Run schema updates first, then migration script
- **Audit logs empty?** Make sure middleware is added to routes
- **Account lockout not working?** Check that security middleware is on login route

**Remember: PHI is not protected until ALL Phase 1 tasks are complete!**
