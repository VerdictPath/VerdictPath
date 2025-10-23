# Phase 2: RBAC & Patient Consent - Design Document

## Overview
Phase 2 adds Role-Based Access Control (RBAC) and Patient Consent Management to ensure granular control over PHI access and HIPAA-compliant consent tracking.

## Architecture

### 1. Role-Based Access Control (RBAC)

#### Roles
```
CLIENT (Patient)
├─ Permissions: VIEW_OWN_PHI, EDIT_OWN_PHI, MANAGE_CONSENT, VIEW_OWN_AUDIT_LOGS

LAW_FIRM_ADMIN
├─ Permissions: VIEW_CLIENT_PHI, EDIT_CLIENT_PHI, VIEW_MEDICAL_RECORDS, 
│               EDIT_MEDICAL_RECORDS, VIEW_BILLING, EDIT_BILLING,
│               MANAGE_LITIGATION, VIEW_AUDIT_LOGS, MANAGE_FIRM_USERS

LAW_FIRM_STAFF
├─ Permissions: VIEW_CLIENT_PHI (read-only), VIEW_MEDICAL_RECORDS,
│               VIEW_BILLING

MEDICAL_PROVIDER_ADMIN
├─ Permissions: VIEW_PATIENT_PHI, EDIT_PATIENT_PHI, UPLOAD_MEDICAL_RECORDS,
│               VIEW_AUDIT_LOGS, MANAGE_PROVIDER_USERS

MEDICAL_PROVIDER_STAFF
├─ Permissions: VIEW_PATIENT_PHI (read-only), UPLOAD_MEDICAL_RECORDS

SYSTEM_ADMIN
└─ Permissions: ALL (full system access)
```

#### Permissions List
```
PHI Access:
- VIEW_OWN_PHI: View own medical data (patients)
- EDIT_OWN_PHI: Edit own medical data (patients)
- VIEW_CLIENT_PHI: View client medical data (law firms)
- EDIT_CLIENT_PHI: Edit client medical data (law firms)
- VIEW_PATIENT_PHI: View patient medical data (providers)
- EDIT_PATIENT_PHI: Edit patient medical data (providers)

Medical Records:
- VIEW_MEDICAL_RECORDS: View medical records
- EDIT_MEDICAL_RECORDS: Edit medical records
- UPLOAD_MEDICAL_RECORDS: Upload new medical records
- DELETE_MEDICAL_RECORDS: Delete medical records

Billing:
- VIEW_BILLING: View billing information
- EDIT_BILLING: Edit billing information
- UPLOAD_BILLING: Upload billing documents

Litigation:
- VIEW_LITIGATION: View litigation stages
- EDIT_LITIGATION: Edit litigation stages
- MANAGE_LITIGATION: Full litigation management

Consent Management:
- MANAGE_CONSENT: Grant/revoke consent (patients only)
- OVERRIDE_CONSENT: System admin emergency access

Audit & Users:
- VIEW_AUDIT_LOGS: View audit trail
- VIEW_ALL_AUDIT_LOGS: View all system audit logs (admin)
- MANAGE_FIRM_USERS: Manage law firm users
- MANAGE_PROVIDER_USERS: Manage medical provider users
- MANAGE_SYSTEM_USERS: Manage all system users (admin)
```

### 2. Patient Consent Management

#### Consent Types
```
FULL_ACCESS: All PHI (medical records, billing, litigation)
MEDICAL_RECORDS_ONLY: Only medical records
BILLING_ONLY: Only billing information
LITIGATION_ONLY: Only litigation-related data
CUSTOM: Specific data types selected by patient
```

#### Consent Status
```
ACTIVE: Consent is active and valid
EXPIRED: Consent has passed expiration date
REVOKED: Patient revoked consent
PENDING: Awaiting patient approval
```

#### Consent Workflow
```
1. Patient Registration
   └─> Default: No consent (data private)

2. Law Firm Invitation
   ├─> Law firm sends consent request
   ├─> Patient receives notification
   └─> Patient approves/denies

3. Active Consent
   ├─> Law firm can access specified PHI
   ├─> All access logged in audit trail
   └─> Patient can revoke at any time

4. Consent Expiration
   ├─> Automatic expiration (e.g., 1 year)
   ├─> Patient notified before expiration
   └─> Can be renewed by patient
```

### 3. Database Schema

#### Roles Table
```sql
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  is_system_role BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Permissions Table
```sql
CREATE TABLE permissions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  category VARCHAR(50) NOT NULL, -- PHI_ACCESS, MEDICAL_RECORDS, BILLING, etc.
  description TEXT,
  is_sensitive BOOLEAN DEFAULT false, -- Requires extra logging
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Role-Permissions Junction
```sql
CREATE TABLE role_permissions (
  id SERIAL PRIMARY KEY,
  role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  granted_by INTEGER REFERENCES users(id),
  UNIQUE(role_id, permission_id)
);
```

#### User-Roles Junction
```sql
CREATE TABLE user_roles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assigned_by INTEGER REFERENCES users(id),
  expires_at TIMESTAMP, -- Optional role expiration
  UNIQUE(user_id, role_id)
);
```

#### Consent Records
```sql
CREATE TABLE consent_records (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  granted_to_type VARCHAR(20) NOT NULL, -- 'lawfirm' or 'medical_provider'
  granted_to_id INTEGER NOT NULL, -- ID of law firm or medical provider
  consent_type VARCHAR(50) NOT NULL, -- FULL_ACCESS, MEDICAL_RECORDS_ONLY, etc.
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, expired, revoked, pending
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP, -- NULL = no expiration
  revoked_at TIMESTAMP,
  revoked_reason TEXT,
  consent_method VARCHAR(50), -- electronic, written, verbal
  ip_address VARCHAR(45), -- IP when consent was granted
  signature_data TEXT, -- Electronic signature or confirmation
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_patient_consent (patient_id, granted_to_type, granted_to_id),
  INDEX idx_consent_status (status, expires_at)
);
```

#### Consent Scope (for CUSTOM consent)
```sql
CREATE TABLE consent_scope (
  id SERIAL PRIMARY KEY,
  consent_id INTEGER REFERENCES consent_records(id) ON DELETE CASCADE,
  data_type VARCHAR(50) NOT NULL, -- medical_records, billing, evidence, etc.
  can_view BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(consent_id, data_type)
);
```

### 4. Permission Check Flow

```
Request to Access PHI
├─> Authenticate User
│   └─> Get JWT token, extract user ID and type
├─> Check User Roles
│   └─> Query user_roles -> Get role IDs
├─> Check Role Permissions
│   └─> Query role_permissions -> Get permissions
├─> Check Required Permission
│   └─> Does user have required permission?
│       ├─> NO: Deny access, log failure
│       └─> YES: Continue to consent check
├─> Check Patient Consent (if accessing other's PHI)
│   └─> Query consent_records
│       ├─> Status = active?
│       ├─> Not expired?
│       ├─> Covers requested data type?
│       ├─> NO: Deny access, log consent failure
│       └─> YES: Allow access
├─> Log PHI Access
│   └─> Audit log with permission & consent info
└─> Return Decrypted PHI
```

### 5. API Endpoints

#### Consent Management
```
POST   /api/consent/grant          - Patient grants consent to law firm/provider
POST   /api/consent/revoke/:id     - Patient revokes consent
GET    /api/consent/my-consents    - Patient views all active consents
GET    /api/consent/requests       - Patient views pending consent requests
POST   /api/consent/request        - Law firm requests consent from patient

GET    /api/lawfirm/consent-status/:clientId  - Check if consent is valid
```

#### Role Management (Admin only)
```
GET    /api/admin/roles            - List all roles
POST   /api/admin/roles            - Create new role
POST   /api/admin/roles/:id/permissions  - Assign permissions to role
GET    /api/admin/users/:id/roles  - Get user's roles
POST   /api/admin/users/:id/roles  - Assign role to user
```

### 6. Middleware Architecture

```javascript
// middleware/permissions.js
const requirePermission = (permissionName) => {
  return async (req, res, next) => {
    // 1. Get user from JWT
    const userId = req.user.id;
    const userType = req.user.userType;
    
    // 2. Check if user has permission
    const hasPermission = await permissionService.checkPermission(userId, permissionName);
    
    if (!hasPermission) {
      await auditLogger.log({
        action: 'PERMISSION_DENIED',
        userId,
        permission: permissionName,
        status: 'FAILURE'
      });
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    
    // 3. Permission granted, continue
    next();
  };
};

// middleware/consent.js
const requireConsent = (options) => {
  return async (req, res, next) => {
    const { patientId, grantedToId, grantedToType, dataType } = options;
    
    // Check if valid consent exists
    const hasConsent = await consentService.checkConsent({
      patientId,
      grantedToId,
      grantedToType,
      dataType
    });
    
    if (!hasConsent) {
      await auditLogger.log({
        action: 'CONSENT_DENIED',
        patientId,
        grantedToId,
        status: 'FAILURE'
      });
      return res.status(403).json({ message: 'No valid consent found' });
    }
    
    next();
  };
};
```

### 7. Usage Examples

```javascript
// Law firm viewing client details - requires both permission AND consent
router.get('/clients/:clientId',
  auth,  // Authenticate
  requirePermission('VIEW_CLIENT_PHI'),  // Check permission
  requireConsent({
    patientId: req.params.clientId,
    grantedToId: req.user.id,
    grantedToType: 'lawfirm',
    dataType: 'medical_records'
  }),  // Check consent
  lawfirmController.getClientDetails
);

// Patient viewing own data - only needs permission, no consent check
router.get('/my-records',
  auth,
  requirePermission('VIEW_OWN_PHI'),
  clientController.getMyRecords
);
```

## Implementation Steps

1. ✅ Design schema and architecture
2. Create database tables and indexes
3. Seed default roles and permissions
4. Build permission service
5. Build consent service
6. Create permission middleware
7. Create consent middleware
8. Update existing routes with middleware
9. Create consent management API
10. Test end-to-end flows
11. Document all changes

## Security Considerations

- **Consent Expiration**: All consents should have expiration dates (recommend 1 year)
- **Audit Everything**: Log all permission checks and consent changes
- **IP Tracking**: Record IP address when consent is granted
- **Signature Data**: Store electronic signature or confirmation method
- **Revocation Immediate**: When consent is revoked, access is immediately denied
- **Emergency Access**: System admins can override consent in emergencies (logged)

## HIPAA Compliance

Phase 2 addresses these HIPAA requirements:
- ✅ **164.502(a)** - Minimum necessary standard (RBAC ensures minimum access)
- ✅ **164.506** - Uses and disclosures with patient consent
- ✅ **164.508** - Authorization for uses and disclosures
- ✅ **164.524** - Individual's right to access their own PHI
- ✅ **164.526** - Right to amend PHI
- ✅ **164.528** - Accounting of disclosures (audit logs)

---

**Next**: Implement database schema and services
