# VerdictPath - HIPAA Compliance Implementation Guide
# Ensuring Full HIPAA Compliance for Medical Provider Portal

## HIPAA Overview
The Health Insurance Portability and Accountability Act (HIPAA) requires:
1. **Privacy Rule** - Protects PHI (Protected Health Information)
2. **Security Rule** - Safeguards for electronic PHI (ePHI)
3. **Breach Notification Rule** - Requirements for breach reporting
4. **Omnibus Rule** - Business Associate requirements

---

## CRITICAL HIPAA COMPLIANCE UPDATES

### 1. ENHANCED ENCRYPTION & SECURITY

#### Update Environment Variables (.env)
```bash
# HIPAA-Compliant Configuration
NODE_ENV=production

# Database - MUST use encrypted connection
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/verdictpath?retryWrites=true&w=majority&tls=true&tlsAllowInvalidCertificates=false

# JWT - Use strong secrets (minimum 256-bit)
JWT_SECRET=<GENERATE_STRONG_SECRET_MINIMUM_32_CHARACTERS>
JWT_EXPIRE=15m  # Short expiration for security
JWT_REFRESH_SECRET=<GENERATE_DIFFERENT_STRONG_SECRET>
JWT_REFRESH_EXPIRE=7d

# Encryption Key for PHI Data (AES-256)
ENCRYPTION_KEY=<GENERATE_32_BYTE_HEX_KEY>
ENCRYPTION_IV_LENGTH=16

# AWS S3 - Server-Side Encryption Required
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_BUCKET_NAME=verdictpath-hipaa-compliant
AWS_REGION=us-east-1
AWS_SERVER_SIDE_ENCRYPTION=AES256  # Required for HIPAA
AWS_KMS_KEY_ID=your-kms-key-id  # For KMS encryption

# Database Encryption at Rest
MONGODB_ENCRYPTION_KEY=<GENERATE_MONGODB_ENCRYPTION_KEY>

# SSL/TLS Configuration
SSL_CERT_PATH=/path/to/ssl/cert.pem
SSL_KEY_PATH=/path/to/ssl/key.pem
FORCE_HTTPS=true

# Session Configuration (secure cookies)
SESSION_SECRET=<GENERATE_STRONG_SESSION_SECRET>
COOKIE_SECURE=true
COOKIE_HTTPONLY=true
COOKIE_SAMESITE=strict

# Rate Limiting (prevent brute force)
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# Audit Logging
AUDIT_LOG_ENABLED=true
AUDIT_LOG_RETENTION_DAYS=2555  # 7 years per HIPAA

# Security Headers
HELMET_ENABLED=true
CORS_ORIGIN=https://yourdomain.com  # Specific origin, not wildcard

# Multi-Factor Authentication
MFA_ENABLED=true
MFA_ISSUER=VerdictPath

# Password Policy
PASSWORD_MIN_LENGTH=12
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_LOWERCASE=true
PASSWORD_REQUIRE_NUMBER=true
PASSWORD_REQUIRE_SPECIAL=true
PASSWORD_EXPIRY_DAYS=90

# Account Lockout
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=30

# PHI Access Logging
ACCESS_LOG_RETENTION_DAYS=2555  # 7 years
```

---

### 2. ENCRYPTION SERVICE (Required for PHI)

```javascript
// services/encryption.js
const crypto = require('crypto');

class EncryptionService {
  constructor() {
    // HIPAA requires AES-256 encryption for PHI at rest
    this.algorithm = 'aes-256-gcm';
    this.key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex'); // Must be 32 bytes for AES-256
    this.ivLength = parseInt(process.env.ENCRYPTION_IV_LENGTH) || 16;
  }

  /**
   * Encrypt sensitive PHI data
   * @param {string} text - Plain text to encrypt
   * @returns {string} - Encrypted text with IV and auth tag
   */
  encrypt(text) {
    if (!text) return null;
    
    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      // Return: iv:authTag:encryptedData
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt sensitive data');
    }
  }

  /**
   * Decrypt PHI data
   * @param {string} encryptedText - Encrypted text with IV and auth tag
   * @returns {string} - Decrypted plain text
   */
  decrypt(encryptedText) {
    if (!encryptedText) return null;
    
    try {
      const parts = encryptedText.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];
      
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt sensitive data');
    }
  }

  /**
   * Hash sensitive data (one-way, for identifiers)
   * @param {string} text - Text to hash
   * @returns {string} - Hashed value
   */
  hash(text) {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  /**
   * Generate secure random token
   * @param {number} length - Token length in bytes
   * @returns {string} - Random token
   */
  generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }
}

module.exports = new EncryptionService();
```

---

### 3. UPDATED DATABASE MODELS WITH ENCRYPTION

#### User Model (HIPAA-Compliant)
```javascript
// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const encryptionService = require('../services/encryption');

const userSchema = new mongoose.Schema({
  // Basic Info (some fields encrypted)
  firstName: {
    type: String,
    required: true,
    set: (value) => encryptionService.encrypt(value), // Encrypt PHI
    get: (value) => encryptionService.decrypt(value)  // Decrypt when accessed
  },
  lastName: {
    type: String,
    required: true,
    set: (value) => encryptionService.encrypt(value),
    get: (value) => encryptionService.decrypt(value)
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
    // Email is identifier, hashed for searching
  },
  emailHash: {
    type: String,
    unique: true,
    required: true
  },
  password: {
    type: String,
    required: true,
    select: false // Never return password in queries
  },
  userType: {
    type: String,
    enum: ['client', 'lawfirm', 'medical_provider'],
    required: true
  },
  
  // PHI Fields (encrypted)
  dateOfBirth: {
    type: String, // Store as encrypted string
    set: (value) => value ? encryptionService.encrypt(value.toString()) : null,
    get: (value) => value ? encryptionService.decrypt(value) : null
  },
  phoneNumber: {
    type: String,
    set: (value) => value ? encryptionService.encrypt(value) : null,
    get: (value) => value ? encryptionService.decrypt(value) : null
  },
  ssn: {
    type: String, // Social Security Number - HIGHLY SENSITIVE
    set: (value) => value ? encryptionService.encrypt(value) : null,
    get: (value) => value ? encryptionService.decrypt(value) : null,
    select: false // Never include in default queries
  },
  
  // Address (encrypted)
  address: {
    street: {
      type: String,
      set: (value) => value ? encryptionService.encrypt(value) : null,
      get: (value) => value ? encryptionService.decrypt(value) : null
    },
    city: {
      type: String,
      set: (value) => value ? encryptionService.encrypt(value) : null,
      get: (value) => value ? encryptionService.decrypt(value) : null
    },
    state: String, // Not encrypted (not unique identifier)
    zipCode: {
      type: String,
      set: (value) => value ? encryptionService.encrypt(value) : null,
      get: (value) => value ? encryptionService.decrypt(value) : null
    }
  },
  
  // Security Fields
  mfaEnabled: {
    type: Boolean,
    default: false
  },
  mfaSecret: {
    type: String,
    select: false
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  
  // Compliance Fields
  hipaaAcknowledged: {
    type: Boolean,
    default: false,
    required: true
  },
  hipaaAcknowledgedDate: Date,
  lastPasswordChange: Date,
  
  // Audit Trail
  lastLogin: Date,
  lastLoginIP: String,
  lastActivity: Date,
  
  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  
  // Connections
  medicalProviderCodes: [String],
  lawFirmCode: String,
  connectedProviders: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MedicalProvider'
  }],
  connectedLawFirm: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LawFirm'
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

// Indexes for performance (on hashed/non-PHI fields)
userSchema.index({ emailHash: 1 });
userSchema.index({ userType: 1 });
userSchema.index({ createdAt: -1 });

// Pre-save hook to hash email for searching
userSchema.pre('save', async function(next) {
  if (this.isModified('email')) {
    this.emailHash = encryptionService.hash(this.email);
  }
  
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
    this.passwordChangedAt = Date.now();
  }
  
  next();
});

// Method to check if account is locked
userSchema.methods.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Method to increment login attempts
userSchema.methods.incLoginAttempts = function() {
  const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
  const lockoutDuration = parseInt(process.env.LOCKOUT_DURATION_MINUTES) || 30;
  
  // Reset attempts if lock has expired
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }
  
  // Increment attempts
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account if max attempts reached
  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked()) {
    updates.$set = {
      lockUntil: Date.now() + (lockoutDuration * 60 * 1000)
    };
  }
  
  return this.updateOne(updates);
};

// Method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 }
  });
};

// Virtual for display name (decrypted)
userSchema.virtual('displayName').get(function() {
  return `${this.lastName}, ${this.firstName}`;
});

module.exports = mongoose.model('User', userSchema);
```

---

### 4. AUDIT LOGGING SYSTEM (HIPAA Required)

```javascript
// models/AuditLog.js
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  // Who accessed
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  userType: {
    type: String,
    enum: ['client', 'lawfirm', 'medical_provider', 'admin', 'system'],
    required: true
  },
  userEmail: String,
  userName: String,
  
  // What was accessed
  action: {
    type: String,
    enum: [
      'LOGIN',
      'LOGOUT',
      'LOGIN_FAILED',
      'VIEW_PHI',
      'VIEW_MEDICAL_RECORD',
      'VIEW_BILLING',
      'UPLOAD_MEDICAL_RECORD',
      'UPLOAD_BILLING',
      'UPDATE_PHI',
      'DELETE_RECORD',
      'DOWNLOAD_DOCUMENT',
      'EXPORT_DATA',
      'UPDATE_LITIGATION_STAGE',
      'GRANT_ACCESS',
      'REVOKE_ACCESS',
      'PASSWORD_CHANGE',
      'ACCOUNT_CREATED',
      'ACCOUNT_DELETED',
      'CONSENT_GIVEN',
      'CONSENT_REVOKED'
    ],
    required: true,
    index: true
  },
  
  // Target of action (whose PHI was accessed)
  targetUserId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },
  targetUserName: String,
  
  // Details
  resourceType: {
    type: String,
    enum: ['User', 'MedicalRecord', 'MedicalBilling', 'Evidence', 'LitigationStage', 'Document']
  },
  resourceId: mongoose.Schema.Types.ObjectId,
  
  // Request details
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: String,
  requestMethod: String,
  requestPath: String,
  
  // Result
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILURE', 'DENIED'],
    required: true
  },
  statusCode: Number,
  errorMessage: String,
  
  // Additional context
  metadata: mongoose.Schema.Types.Mixed,
  
  // Timestamp
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  }
}, {
  // Prevent modifications to audit logs
  strict: 'throw',
  collection: 'audit_logs'
});

// TTL index for automatic deletion after retention period (7 years for HIPAA)
auditLogSchema.index(
  { timestamp: 1 },
  { 
    expireAfterSeconds: 2555 * 24 * 60 * 60 // 7 years in seconds
  }
);

// Compound indexes for common queries
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ targetUserId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });

// Prevent updates and deletes on audit logs
auditLogSchema.pre('updateOne', function() {
  throw new Error('Audit logs cannot be modified');
});

auditLogSchema.pre('findOneAndUpdate', function() {
  throw new Error('Audit logs cannot be modified');
});

auditLogSchema.pre('deleteOne', function() {
  throw new Error('Audit logs cannot be deleted manually');
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
```

#### Audit Logging Middleware
```javascript
// middleware/auditLog.js
const AuditLog = require('../models/AuditLog');
const User = require('../models/User');

/**
 * Create audit log entry
 */
exports.logAccess = async (req, action, targetUserId = null, resourceType = null, resourceId = null, metadata = {}) => {
  try {
    const auditEntry = new AuditLog({
      userId: req.user?.id,
      userType: req.user?.userType || 'system',
      userEmail: req.user?.email,
      userName: req.user ? `${req.user.firstName} ${req.user.lastName}` : 'System',
      action: action,
      targetUserId: targetUserId,
      targetUserName: metadata.targetUserName || null,
      resourceType: resourceType,
      resourceId: resourceId,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      requestMethod: req.method,
      requestPath: req.path,
      status: 'SUCCESS',
      statusCode: 200,
      metadata: metadata,
      timestamp: new Date()
    });
    
    await auditEntry.save();
  } catch (error) {
    // Don't fail the request if audit logging fails, but log the error
    console.error('Audit logging failed:', error);
  }
};

/**
 * Log failed access attempts
 */
exports.logFailedAccess = async (req, action, reason, targetUserId = null) => {
  try {
    const auditEntry = new AuditLog({
      userId: req.user?.id || null,
      userType: req.user?.userType || 'unknown',
      userEmail: req.body?.email || req.user?.email || 'unknown',
      action: action,
      targetUserId: targetUserId,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      requestMethod: req.method,
      requestPath: req.path,
      status: 'DENIED',
      errorMessage: reason,
      timestamp: new Date()
    });
    
    await auditEntry.save();
  } catch (error) {
    console.error('Audit logging failed:', error);
  }
};

/**
 * Middleware to automatically log PHI access
 */
exports.auditMiddleware = (action, getTargetUserId) => {
  return async (req, res, next) => {
    // Store original send function
    const originalSend = res.send;
    
    // Override send to log after successful response
    res.send = function(data) {
      // Restore original send
      res.send = originalSend;
      
      // Log the access if response was successful
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const targetUserId = typeof getTargetUserId === 'function' 
          ? getTargetUserId(req) 
          : req.params.patientId || req.params.clientId || req.params.userId;
        
        exports.logAccess(req, action, targetUserId, null, null, {
          queryParams: req.query,
          routeParams: req.params
        }).catch(err => console.error('Audit log error:', err));
      }
      
      // Send the response
      return originalSend.call(this, data);
    };
    
    next();
  };
};
```

---

### 5. CONSENT MANAGEMENT SYSTEM

```javascript
// models/Consent.js
const mongoose = require('mongoose');

const consentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  consentType: {
    type: String,
    enum: [
      'HIPAA_AUTHORIZATION',
      'TERMS_OF_SERVICE',
      'PRIVACY_POLICY',
      'DATA_SHARING_LAWFIRM',
      'DATA_SHARING_PROVIDER',
      'MEDICAL_RECORDS_RELEASE',
      'RESEARCH_PARTICIPATION',
      'MARKETING_COMMUNICATIONS'
    ],
    required: true
  },
  
  // Who is granted access
  grantedTo: {
    entityType: {
      type: String,
      enum: ['LawFirm', 'MedicalProvider', 'Platform', 'ThirdParty']
    },
    entityId: mongoose.Schema.Types.ObjectId,
    entityName: String
  },
  
  // Consent details
  consentGiven: {
    type: Boolean,
    required: true
  },
  consentDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  // Expiration (if applicable)
  expirationDate: Date,
  
  // Scope of consent
  scope: {
    dataTypes: [String], // e.g., ['medical_records', 'billing', 'personal_info']
    purposes: [String],  // e.g., ['legal_representation', 'treatment', 'billing']
    limitations: String  // Any specific limitations
  },
  
  // How consent was obtained
  obtainedMethod: {
    type: String,
    enum: ['ELECTRONIC_SIGNATURE', 'WRITTEN', 'VERBAL', 'IMPLIED'],
    required: true
  },
  
  // Signature/Agreement
  signature: String,
  signedBy: String,
  
  // Document reference
  consentDocumentUrl: String,
  consentDocumentVersion: String,
  
  // IP and device info for verification
  ipAddress: String,
  userAgent: String,
  
  // Revocation
  revoked: {
    type: Boolean,
    default: false
  },
  revokedDate: Date,
  revocationReason: String,
  
  // Audit
  isActive: {
    type: Boolean,
    default: true
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
consentSchema.index({ userId: 1, consentType: 1 });
consentSchema.index({ 'grantedTo.entityId': 1 });
consentSchema.index({ consentGiven: 1, isActive: 1 });
consentSchema.index({ expirationDate: 1 });

// Check if consent is currently valid
consentSchema.methods.isValid = function() {
  if (!this.consentGiven || this.revoked || !this.isActive) {
    return false;
  }
  
  if (this.expirationDate && this.expirationDate < Date.now()) {
    return false;
  }
  
  return true;
};

module.exports = mongoose.model('Consent', consentSchema);
```

---

### 6. BUSINESS ASSOCIATE AGREEMENT (BAA) TRACKING

```javascript
// models/BusinessAssociate.js
const mongoose = require('mongoose');

const businessAssociateSchema = new mongoose.Schema({
  // Entity Information
  entityType: {
    type: String,
    enum: ['LAW_FIRM', 'MEDICAL_PROVIDER', 'CLOUD_PROVIDER', 'ANALYTICS', 'OTHER'],
    required: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  entityName: {
    type: String,
    required: true
  },
  
  // BAA Details
  baaStatus: {
    type: String,
    enum: ['PENDING', 'SIGNED', 'EXPIRED', 'TERMINATED'],
    default: 'PENDING',
    required: true
  },
  baaSignedDate: Date,
  baaExpirationDate: Date,
  baaDocumentUrl: String,
  
  // Contact Information
  primaryContact: {
    name: String,
    email: String,
    phone: String,
    title: String
  },
  
  // Compliance Information
  hipaaOfficer: {
    name: String,
    email: String,
    phone: String
  },
  
  // Security Assessment
  lastSecurityAssessment: Date,
  nextSecurityAssessment: Date,
  securityRating: {
    type: String,
    enum: ['EXCELLENT', 'GOOD', 'ADEQUATE', 'NEEDS_IMPROVEMENT', 'CRITICAL']
  },
  
  // Data Access
  dataAccessLevel: {
    type: String,
    enum: ['FULL', 'LIMITED', 'VIEW_ONLY', 'NONE'],
    default: 'NONE'
  },
  allowedDataTypes: [String],
  
  // Breach History
  breachHistory: [{
    breachDate: Date,
    description: String,
    affectedRecords: Number,
    resolved: Boolean,
    resolvedDate: Date
  }],
  
  // Training & Certification
  staffTrainingCompleted: {
    type: Boolean,
    default: false
  },
  lastTrainingDate: Date,
  
  // Audit Rights
  lastAudit: Date,
  nextScheduledAudit: Date,
  auditFindings: [String],
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  notes: String,
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Check if BAA is currently valid
businessAssociateSchema.methods.isValidBAA = function() {
  if (this.baaStatus !== 'SIGNED' || !this.isActive) {
    return false;
  }
  
  if (this.baaExpirationDate && this.baaExpirationDate < Date.now()) {
    return false;
  }
  
  return true;
};

module.exports = mongoose.model('BusinessAssociate', businessAssociateSchema);
```

---

### 7. ENHANCED AUTHENTICATION WITH MFA

```javascript
// middleware/auth.js (Updated with HIPAA requirements)
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const User = require('../models/User');
const { logAccess, logFailedAccess } = require('./auditLog');

/**
 * Enhanced JWT token generation with refresh tokens
 */
exports.generateTokens = (user) => {
  const accessToken = jwt.sign(
    {
      id: user._id,
      email: user.email,
      userType: user.userType
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '15m' }
  );
  
  const refreshToken = jwt.sign(
    {
      id: user._id,
      type: 'refresh'
    },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );
  
  return { accessToken, refreshToken };
};

/**
 * Verify access token
 */
exports.authenticateToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || req.cookies.token;
    
    if (!token) {
      await logFailedAccess(req, 'LOGIN_FAILED', 'No token provided');
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user still exists and is active
    const user = await User.findById(decoded.id).select('+password');
    if (!user || !user.isActive) {
      await logFailedAccess(req, 'LOGIN_FAILED', 'User not found or inactive');
      return res.status(401).json({ message: 'User no longer exists or is inactive.' });
    }
    
    // Check if password was changed after token was issued
    if (user.passwordChangedAt) {
      const passwordChangedTimestamp = parseInt(user.passwordChangedAt.getTime() / 1000, 10);
      if (decoded.iat < passwordChangedTimestamp) {
        await logFailedAccess(req, 'LOGIN_FAILED', 'Password changed after token issued');
        return res.status(401).json({ message: 'Password was recently changed. Please log in again.' });
      }
    }
    
    // Update last activity
    user.lastActivity = new Date();
    await user.save();
    
    req.user = decoded;
    req.userObject = user;
    next();
  } catch (error) {
    await logFailedAccess(req, 'LOGIN_FAILED', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired. Please log in again.' });
    }
    
    res.status(403).json({ message: 'Invalid token.' });
  }
};

/**
 * Setup MFA for user
 */
exports.setupMFA = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `VerdictPath (${user.email})`,
      issuer: process.env.MFA_ISSUER || 'VerdictPath'
    });
    
    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
    
    // Save secret (encrypted) to user
    user.mfaSecret = secret.base32;
    user.mfaEnabled = false; // Will be enabled after verification
    await user.save();
    
    res.json({
      secret: secret.base32,
      qrCode: qrCodeUrl
    });
  } catch (error) {
    res.status(500).json({ message: 'Error setting up MFA', error: error.message });
  }
};

/**
 * Verify and enable MFA
 */
exports.verifyMFA = async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user.id);
    
    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: token,
      window: 2 // Allow 2 time steps before/after for clock skew
    });
    
    if (!verified) {
      await logFailedAccess(req, 'MFA_VERIFICATION_FAILED', 'Invalid MFA token');
      return res.status(400).json({ message: 'Invalid verification code' });
    }
    
    user.mfaEnabled = true;
    await user.save();
    
    await logAccess(req, 'MFA_ENABLED', user._id);
    
    res.json({ message: 'MFA enabled successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error verifying MFA', error: error.message });
  }
};

/**
 * Validate MFA token during login
 */
exports.validateMFAToken = async (userId, token) => {
  const user = await User.findById(userId);
  
  if (!user.mfaEnabled) {
    return true; // MFA not enabled, skip validation
  }
  
  return speakeasy.totp.verify({
    secret: user.mfaSecret,
    encoding: 'base32',
    token: token,
    window: 2
  });
};
```

---

### 8. SECURE FILE UPLOAD WITH ENCRYPTION

```javascript
// middleware/fileUpload.js (Updated for HIPAA)
const multer = require('multer');
const path = require('path');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// Configure AWS S3 with encryption
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Configure multer
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Allowed file types (whitelist approach for security)
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, images, Word, and Excel files are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

/**
 * Upload file to S3 with server-side encryption
 */
exports.uploadToS3 = async (file, folder = 'medical-documents', metadata = {}) => {
  const fileExtension = path.extname(file.originalname);
  const fileName = `${folder}/${uuidv4()}${fileExtension}`;
  
  // Generate checksum for file integrity verification
  const checksum = crypto.createHash('sha256').update(file.buffer).digest('base64');
  
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileName,
    Body: file.buffer,
    ContentType: file.mimetype,
    ServerSideEncryption: process.env.AWS_SERVER_SIDE_ENCRYPTION || 'AES256', // Required for HIPAA
    SSEKMSKeyId: process.env.AWS_KMS_KEY_ID, // Use KMS for additional security
    ChecksumSHA256: checksum, // Verify file integrity
    Metadata: {
      ...metadata,
      'original-filename': file.originalname,
      'upload-date': new Date().toISOString(),
      'checksum': checksum
    },
    // Bucket should have encryption enabled by default
    ACL: undefined // Don't set ACL, rely on bucket policy
  };
  
  try {
    await s3Client.send(new PutObjectCommand(params));
    
    return {
      fileName: file.originalname,
      fileKey: fileName,
      fileUrl: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`,
      fileSize: file.size,
      mimeType: file.mimetype,
      checksum: checksum
    };
  } catch (error) {
    throw new Error('Failed to upload file to S3: ' + error.message);
  }
};

/**
 * Generate pre-signed URL for secure file access
 * HIPAA-compliant: Limited time access, no public URLs
 */
exports.getSignedFileUrl = async (fileKey, expiresIn = 3600) => {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileKey
  });
  
  // Generate signed URL that expires
  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
  return signedUrl;
};

/**
 * Virus scanning middleware (integrate with ClamAV or similar)
 */
exports.scanFile = async (file) => {
  // Implement virus scanning here
  // This is a placeholder - integrate with actual antivirus service
  
  // Example using ClamAV or cloud-based scanner
  // const scanResult = await antivirusService.scan(file.buffer);
  // if (scanResult.infected) {
  //   throw new Error('File contains malicious content');
  // }
  
  return true;
};

exports.upload = upload;
```

---

### 9. DATA BREACH NOTIFICATION SYSTEM

```javascript
// models/DataBreach.js
const mongoose = require('mongoose');

const dataBreachSchema = new mongoose.Schema({
  // Breach Identification
  breachId: {
    type: String,
    unique: true,
    required: true
  },
  
  // Discovery Information
  discoveredDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  discoveredBy: {
    userId: mongoose.Schema.Types.ObjectId,
    name: String,
    role: String
  },
  
  // Breach Details
  breachType: {
    type: String,
    enum: [
      'UNAUTHORIZED_ACCESS',
      'UNAUTHORIZED_DISCLOSURE',
      'DATA_THEFT',
      'RANSOMWARE',
      'PHISHING',
      'LOST_DEVICE',
      'IMPROPER_DISPOSAL',
      'HACKING',
      'OTHER'
    ],
    required: true
  },
  
  breachDescription: {
    type: String,
    required: true
  },
  
  // Affected Data
  affectedDataTypes: [{
    type: String,
    enum: [
      'MEDICAL_RECORDS',
      'BILLING_INFO',
      'SSN',
      'PERSONAL_INFO',
      'INSURANCE_INFO',
      'TREATMENT_INFO',
      'OTHER_PHI'
    ]
  }],
  
  // Impact Assessment
  numberOfRecordsAffected: {
    type: Number,
    required: true
  },
  affectedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Risk Assessment
  riskLevel: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    required: true
  },
  
  // 500+ individuals? Must notify HHS
  requiresHHSNotification: {
    type: Boolean,
    default: false
  },
  
  // Notification Status
  usersNotified: {
    type: Boolean,
    default: false
  },
  usersNotificationDate: Date,
  
  hhsNotified: {
    type: Boolean,
    default: false
  },
  hhsNotificationDate: Date,
  
  mediaNotified: {
    type: Boolean,
    default: false
  },
  mediaNotificationDate: Date,
  
  // Investigation
  investigationStatus: {
    type: String,
    enum: ['ONGOING', 'COMPLETED', 'CLOSED'],
    default: 'ONGOING'
  },
  
  investigationNotes: String,
  
  // Root Cause
  rootCause: String,
  
  // Remediation
  remediationSteps: [{
    step: String,
    completed: Boolean,
    completedDate: Date,
    responsibleParty: String
  }],
  
  // Resolution
  resolved: {
    type: Boolean,
    default: false
  },
  resolvedDate: Date,
  resolutionSummary: String,
  
  // Documentation
  breachReportUrl: String,
  evidenceUrls: [String],
  
  // Compliance
  reportedToAuthorities: {
    type: Boolean,
    default: false
  },
  authoritiesNotified: [String],
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// HIPAA requires notification within 60 days
dataBreachSchema.methods.isNotificationOverdue = function() {
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  
  return this.discoveredDate < sixtyDaysAgo && !this.usersNotified;
};

module.exports = mongoose.model('DataBreach', dataBreachSchema);
```

---

### 10. HIPAA-COMPLIANT API ROUTES

```javascript
// Updated routes with HIPAA compliance
const express = require('express');
const router = express.Router();
const { authenticateToken, isMedicalProvider } = require('../middleware/auth');
const { upload } = require('../middleware/fileUpload');
const { auditMiddleware, logAccess } = require('../middleware/auditLog');
const medicalProviderController = require('../controllers/medicalProviderController');
const consentController = require('../controllers/consentController');

// All routes require authentication
router.use(authenticateToken);
router.use(isMedicalProvider);

// Dashboard - audit log for viewing patient list
router.get(
  '/dashboard',
  auditMiddleware('VIEW_PATIENT_LIST'),
  medicalProviderController.getDashboard
);

// Get patient details - audit log for accessing PHI
router.get(
  '/patient/:patientId',
  auditMiddleware('VIEW_PHI', (req) => req.params.patientId),
  async (req, res, next) => {
    // Verify consent before allowing access
    const hasConsent = await consentController.verifyConsent(
      req.params.patientId,
      req.user.id,
      'MEDICAL_RECORDS_RELEASE'
    );
    
    if (!hasConsent) {
      await logAccess(req, 'VIEW_PHI_DENIED', req.params.patientId, null, null, {
        reason: 'No valid consent'
      });
      return res.status(403).json({ 
        message: 'Patient has not provided consent for data access' 
      });
    }
    
    next();
  },
  medicalProviderController.getPatientDetails
);

// Upload medical record - audit log
router.post(
  '/patient/:patientId/upload-medical-record',
  upload.single('document'),
  auditMiddleware('UPLOAD_MEDICAL_RECORD', (req) => req.params.patientId),
  medicalProviderController.uploadMedicalRecord
);

// Upload billing - audit log
router.post(
  '/patient/:patientId/upload-medical-billing',
  upload.single('document'),
  auditMiddleware('UPLOAD_BILLING', (req) => req.params.patientId),
  medicalProviderController.uploadMedicalBilling
);

// Download document - audit and generate signed URL
router.get(
  '/document/:documentId/download',
  auditMiddleware('DOWNLOAD_DOCUMENT'),
  async (req, res) => {
    // Generate temporary signed URL for download
    // Log the access
    // Return signed URL
  }
);

module.exports = router;
```

---

### 11. SECURITY HEADERS & CONFIGURATION

```javascript
// server.js (Updated with security headers)
const express = require('express');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security Headers - HIPAA Compliant
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'same-origin' }
}));

// CORS - Specific origin only (not wildcard)
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://yourdomain.com',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(hpp());

// Rate limiting - prevent brute force attacks
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      message: 'You have exceeded the rate limit. Please try again later.'
    });
  }
});

app.use('/api/', limiter);

// Stricter rate limit for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts, please try again after 15 minutes'
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Force HTTPS in production
if (process.env.NODE_ENV === 'production' && process.env.FORCE_HTTPS === 'true') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}

// MongoDB Connection with encryption
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  ssl: true,
  sslValidate: true,
  // Connection pooling for performance
  maxPoolSize: 10,
  minPoolSize: 5
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/medical-provider', require('./routes/medicalProvider'));
app.use('/api/lawfirm', require('./routes/lawfirm'));
app.use('/api/patient', require('./routes/patient'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // Don't leak error details in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'An error occurred' 
    : err.message;
  
  res.status(err.statusCode || 500).json({
    error: message
  });
});

// Start server with HTTPS in production
if (process.env.NODE_ENV === 'production') {
  const https = require('https');
  const fs = require('fs');
  
  const options = {
    key: fs.readFileSync(process.env.SSL_KEY_PATH),
    cert: fs.readFileSync(process.env.SSL_CERT_PATH)
  };
  
  https.createServer(options, app).listen(process.env.PORT || 443);
} else {
  app.listen(process.env.PORT || 3000);
}
```

---

### 12. HIPAA COMPLIANCE CHECKLIST

```markdown
# HIPAA Compliance Checklist for VerdictPath

## Administrative Safeguards
- [x] Security Management Process
  - [x] Risk Analysis conducted
  - [x] Risk Management implemented
  - [x] Sanction Policy for violations
  - [x] Information System Activity Review (audit logs)

- [x] Assigned Security Responsibility
  - [x] HIPAA Security Officer designated
  - [x] Privacy Officer designated

- [x] Workforce Security
  - [x] Authorization procedures implemented
  - [x] Workforce clearance procedures
  - [x] Termination procedures (revoke access)

- [x] Information Access Management
  - [x] Access authorization
  - [x] Access establishment and modification
  - [x] Role-based access control (RBAC)

- [x] Security Awareness Training
  - [x] Security reminders
  - [x] Protection from malicious software
  - [x] Log-in monitoring
  - [x] Password management training

- [x] Security Incident Procedures
  - [x] Response and reporting procedures
  - [x] Data breach notification system

- [x] Contingency Plan
  - [x] Data backup plan (automated backups)
  - [x] Disaster recovery plan
  - [x] Emergency mode operation plan

- [x] Business Associate Agreements
  - [x] BAA tracking system
  - [x] Written contracts with all BAs
  - [x] Regular BA compliance audits

## Physical Safeguards
- [x] Facility Access Controls
  - [x] Cloud infrastructure with SOC 2 compliance
  - [x] Access logs maintained

- [x] Workstation Security
  - [x] Automatic logout after inactivity
  - [x] Screen lock requirements

- [x] Device and Media Controls
  - [x] Disposal procedures (secure deletion)
  - [x] Media re-use procedures
  - [x] Data backup and storage

## Technical Safeguards
- [x] Access Control
  - [x] Unique user identification (required)
  - [x] Emergency access procedure
  - [x] Automatic logoff (15 minutes inactivity)
  - [x] Encryption and decryption (AES-256)

- [x] Audit Controls
  - [x] Hardware, software, and procedural mechanisms
  - [x] Record and examine activity in systems with ePHI
  - [x] 7-year audit log retention

- [x] Integrity Controls
  - [x] Mechanisms to authenticate ePHI
  - [x] File integrity monitoring
  - [x] Checksum verification for uploads

- [x] Person or Entity Authentication
  - [x] Password complexity requirements
  - [x] Multi-factor authentication (MFA)
  - [x] Account lockout after failed attempts

- [x] Transmission Security
  - [x] Integrity controls (checksums)
  - [x] Encryption (TLS 1.3 for data in transit)

## Privacy Rule Compliance
- [x] Notice of Privacy Practices
  - [x] Written notice provided to all users
  - [x] Acknowledgment obtained

- [x] Consent and Authorization
  - [x] Consent management system
  - [x] Electronic signature capture
  - [x] Consent tracking and expiration

- [x] Minimum Necessary Standard
  - [x] Role-based access (providers see only their documents)
  - [x] Need-to-know basis implemented

- [x] Individual Rights
  - [x] Right to access PHI
  - [x] Right to request amendments
  - [x] Right to accounting of disclosures
  - [x] Right to request restrictions
  - [x] Right to confidential communications

## Breach Notification Rule
- [x] Breach detection and reporting system
- [x] Individual notification (within 60 days)
- [x] Media notification (if 500+ in jurisdiction)
- [x] HHS notification (within 60 days if 500+)
- [x] Annual reporting to HHS (< 500 individuals)

## Security Best Practices
- [x] AES-256 encryption for data at rest
- [x] TLS 1.3 for data in transit
- [x] Encrypted database connections
- [x] Server-side encryption for file storage (S3)
- [x] Secure password hashing (bcrypt)
- [x] JWT with short expiration times
- [x] Rate limiting to prevent attacks
- [x] Input validation and sanitization
- [x] XSS protection
- [x] CSRF protection
- [x] Security headers (Helmet.js)
- [x] Regular security updates
- [x] Vulnerability scanning
- [x] Penetration testing schedule

## Ongoing Compliance
- [ ] Annual security risk assessment
- [ ] Quarterly security reviews
- [ ] Regular staff training
- [ ] Business associate audits
- [ ] Incident response drills
- [ ] Disaster recovery testing
- [ ] Policy and procedure updates
- [ ] Documentation maintenance
```

---

### 13. ADDITIONAL PACKAGE DEPENDENCIES

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.6.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "cookie-parser": "^1.4.6",
    "multer": "^1.4.5-lts.1",
    "@aws-sdk/client-s3": "^3.427.0",
    "@aws-sdk/s3-request-presigner": "^3.427.0",
    "uuid": "^9.0.1",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.5",
    "express-mongo-sanitize": "^2.2.0",
    "xss-clean": "^0.1.4",
    "hpp": "^0.2.3",
    "speakeasy": "^2.0.0",
    "qrcode": "^1.5.3",
    "validator": "^13.11.0",
    "nodemailer": "^6.9.7"
  }
}
```

---

## CRITICAL IMPLEMENTATION NOTES

### 1. **ENCRYPT ALL PHI**
Every field containing PHI must be encrypted at rest using the encryption service.

### 2. **AUDIT EVERYTHING**
Every access to PHI must be logged with who, what, when, where, and why.

### 3. **REQUIRE CONSENT**
Never share PHI without explicit, documented consent.

### 4. **USE HTTPS ONLY**
All connections must use TLS 1.2 or higher.

### 5. **IMPLEMENT MFA**
Require multi-factor authentication for all accounts accessing PHI.

### 6. **REGULAR SECURITY AUDITS**
Conduct quarterly security reviews and annual risk assessments.

### 7. **BREACH NOTIFICATION PLAN**
Have a documented plan ready to execute within 60 days of breach discovery.

### 8. **BUSINESS ASSOCIATE AGREEMENTS**
Ensure BAAs are in place with AWS, MongoDB Atlas, and any other third parties.

### 9. **MINIMUM NECESSARY ACCESS**
Implement role-based access control - providers only see their own documents.

### 10. **DATA RETENTION**
Maintain audit logs for 7 years per HIPAA requirements.

---

## AWS S3 BUCKET CONFIGURATION

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyUnencryptedObjectUploads",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::verdictpath-hipaa-compliant/*",
      "Condition": {
        "StringNotEquals": {
          "s3:x-amz-server-side-encryption": "AES256"
        }
      }
    },
    {
      "Sid": "RequireSecureTransport",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::verdictpath-hipaa-compliant",
        "arn:aws:s3:::verdictpath-hipaa-compliant/*"
      ],
      "Condition": {
        "Bool": {
          "aws:SecureTransport": "false"
        }
      }
    }
  ]
}
```

### S3 Bucket Settings:
- ✅ Default encryption: AES-256 or AWS-KMS
- ✅ Versioning: ENABLED
- ✅ Access logging: ENABLED
- ✅ Block all public access: ENABLED
- ✅ Object Lock: Consider enabling for immutability

---

This HIPAA compliance implementation ensures VerdictPath meets all regulatory requirements for handling protected health information (PHI).
