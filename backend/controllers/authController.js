const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET } = require('../middleware/auth');
const encryption = require('../services/encryption');
const auditLogger = require('../services/auditLogger');
const activityLogger = require('../services/activityLogger');
const { handleFailedLogin, handleSuccessfulLogin } = require('../middleware/security');
const consentController = require('./consentController');
const { generateUniqueCode } = require('../utils/codeGenerator');
const { checkLawFirmLimit } = require('../utils/subscriptionLimits');
const { sendCredentialSMS, sendAccountCreationSMS } = require('../services/smsService');
const { sendWelcomeEmail, sendPasswordChangedEmail, sendSecurityAlertEmail, sendPasswordResetEmail, sendPasswordResetConfirmationEmail } = require('../services/emailService');
const crypto = require('crypto');
const { sendErrorResponse, sendSuccessResponse, handleDatabaseError, errorCodes } = require('../utils/errorResponse');

// Helper function to set httpOnly authentication cookie
const TOKEN_EXPIRY = '7d';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

const setAuthCookie = (res, token) => {
  res.cookie('authToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    signed: true
  });
};

exports.registerClient = async (req, res) => {
  try {
    const { firstName, lastName, phoneNumber, email, password, lawFirmCode, avatarType, subscriptionTier, subscriptionPrice, privacyAccepted } = req.body;
    
    // Privacy policy acceptance check temporarily disabled
    // if (!privacyAccepted) {
    //   return res.status(400).json({ message: 'You must accept the Privacy Policy to create an account' });
    // }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // HIPAA: Encrypt PHI fields
    const encryptedFirstName = encryption.encrypt(firstName);
    const encryptedLastName = encryption.encrypt(lastName);
    const encryptedPhone = phoneNumber ? encryption.encrypt(phoneNumber) : null;
    const emailHash = encryption.hash(email.toLowerCase());
    
    let connectedLawFirmId = null;
    
    if (lawFirmCode) {
      const lawFirmResult = await db.query(
        'SELECT id, subscription_tier, firm_size FROM law_firms WHERE firm_code = $1',
        [lawFirmCode.toUpperCase()]
      );
      
      if (lawFirmResult.rows.length > 0) {
        const lawFirm = lawFirmResult.rows[0];
        connectedLawFirmId = lawFirm.id;
        
        const clientCountResult = await db.query(
          'SELECT COUNT(*) as count FROM law_firm_clients WHERE law_firm_id = $1',
          [connectedLawFirmId]
        );
        
        const clientCount = parseInt(clientCountResult.rows[0].count);
        const limitCheck = checkLawFirmLimit(clientCount, lawFirm.subscription_tier, lawFirm.firm_size);
        
        if (!limitCheck.withinLimit) {
          let errorMessage;
          if (lawFirm.subscription_tier === 'free') {
            errorMessage = 'Blimey! This law firm\'s ship be full to the brim! They\'ve reached the maximum crew of 10 clients on their free trial voyage. Tell \'em to upgrade their vessel to bring more mateys aboard!';
          } else {
            const firmSizeName = lawFirm.firm_size ? lawFirm.firm_size.charAt(0).toUpperCase() + lawFirm.firm_size.slice(1) : 'current';
            errorMessage = `Avast! This law firm has reached their ${firmSizeName} tier limit of ${limitCheck.limit} clients. Time to upgrade the ship to a larger vessel!`;
          }
          return res.status(403).json({ message: errorMessage });
        }
      }
    }
    
    const userResult = await db.query(
      `INSERT INTO users (first_name, last_name, phone_encrypted, email, email_hash, password, user_type, law_firm_code, 
       connected_law_firm_id, avatar_type, subscription_tier, subscription_price,
       first_name_encrypted, last_name_encrypted, privacy_accepted_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP) 
       RETURNING id, email, first_name, last_name, user_type`,
      [firstName, lastName, encryptedPhone, email.toLowerCase(), emailHash, hashedPassword, 'client', 
       lawFirmCode ? lawFirmCode.toUpperCase() : null, connectedLawFirmId, 
       avatarType || 'captain', subscriptionTier || 'free', subscriptionPrice || 0,
       encryptedFirstName, encryptedLastName]
    );
    
    const user = userResult.rows[0];
    
    if (connectedLawFirmId) {
      await db.query(
        'INSERT INTO law_firm_clients (law_firm_id, client_id) VALUES ($1, $2)',
        [connectedLawFirmId, user.id]
      );
      
      // HIPAA Phase 2: Auto-grant consent to law firm
      try {
        await consentController.autoGrantConsentToFirm(user.id, connectedLawFirmId);
      } catch (consentError) {
        console.error('Error auto-granting consent:', consentError);
        // Don't fail registration if consent grant fails
      }
    }
    
    // HIPAA: Assign default CLIENT role
    try {
      const permissionService = require('../services/permissionService');
      await permissionService.assignRole(user.id, 'CLIENT');
    } catch (roleError) {
      console.error('Error assigning CLIENT role:', roleError);
      // Don't fail registration if role assignment fails
    }
    
    // HIPAA: Log account creation
    await auditLogger.logAuth({
      userId: user.id,
      email: user.email,
      action: 'ACCOUNT_CREATED',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      success: true
    });
    
    // Send welcome SMS if phone number provided
    if (encryptedPhone) {
      try {
        const decryptedPhone = encryption.decrypt(encryptedPhone);
        if (decryptedPhone) {
          await sendAccountCreationSMS(decryptedPhone, firstName);
        }
      } catch (smsError) {
        console.error('Error sending account creation SMS (non-fatal):', smsError);
        // Don't fail registration if SMS fails
      }
    }

    // Send welcome email (fire-and-forget, non-blocking)
    sendWelcomeEmail(user.email, firstName, 'client')
      .catch(err => console.error('Error sending welcome email:', err));
    
    const token = jwt.sign(
      { id: user.id, email: user.email, userType: user.user_type },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );
    
    setAuthCookie(res, token);
    
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        userType: user.user_type
      }
    });
  } catch (error) {
    console.error('[Register Client] Error:', error.message);
    
    if (error.code?.startsWith('23')) {
      return handleDatabaseError(error, res);
    }
    
    return sendErrorResponse(res, 500, 'Error registering user', {
      code: errorCodes.INTERNAL_ERROR
    });
  }
};

exports.registerLawFirm = async (req, res) => {
  try {
    const { firmName, email, password, barNumber, phoneNumber, address, subscriptionTier, firmSize, privacyAccepted } = req.body;
    
    // Privacy policy acceptance check temporarily disabled
    // if (!privacyAccepted) {
    //   return res.status(400).json({ message: 'You must accept the Privacy Policy to create an account' });
    // }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Generate unique firm code automatically
    const firmCode = await generateUniqueCode('lawfirm');
    
    // Parse subscription tier to canonical format (free|paid + size)
    const inputTier = subscriptionTier || 'free';
    let canonicalTier, canonicalSize;
    
    if (inputTier === 'free') {
      canonicalTier = 'free';
      canonicalSize = null;
    } else {
      // Convert compound tiers like "soloshingle" to canonical format
      canonicalTier = 'paid';
      
      // Map tier names to database-accepted values
      const tierNameMapping = {
        'Solo/Shingle': 'shingle',
        'Boutique': 'boutique',
        'Small Firm': 'small',
        'Medium-Small': 'medium',
        'Medium': 'medium',
        'Medium-Large': 'medium',
        'Large': 'large',
        'Regional': 'large',
        'Enterprise': 'enterprise'
      };
      
      // Extract firm size - handle both string and object formats
      if (firmSize) {
        if (typeof firmSize === 'string') {
          // Direct string: "medium", "shingle", etc.
          canonicalSize = (tierNameMapping[firmSize] || firmSize).toLowerCase();
        } else if (firmSize.tierName) {
          // Object with tierName property
          canonicalSize = (tierNameMapping[firmSize.tierName] || firmSize.tierName).toLowerCase();
        }
      } 
      
      // If size not found from firmSize, try to extract from compound tier name
      if (!canonicalSize) {
        const sizeMatch = inputTier.match(/(shingle|boutique|small|medium|large|enterprise)$/i);
        canonicalSize = sizeMatch ? sizeMatch[1].toLowerCase() : null;
      }
      
      // Validate that paid tiers have a valid size
      if (!canonicalSize) {
        return res.status(400).json({ 
          message: 'Paid subscription requires a valid firm size (shingle, boutique, small, medium, large, or enterprise)',
          receivedTier: inputTier,
          receivedSize: firmSize
        });
      }
      
      // Validate that the extracted size is recognized (same as update)
      const validSizes = ['shingle', 'boutique', 'small', 'medium', 'large', 'enterprise'];
      if (!validSizes.includes(canonicalSize)) {
        return res.status(400).json({ 
          message: 'Invalid firm size. Must be one of: shingle, boutique, small, medium, large, enterprise',
          receivedSize: canonicalSize,
          receivedTier: inputTier,
          receivedFirmSize: firmSize
        });
      }
    }
    
    const result = await db.query(
      `INSERT INTO law_firms (firm_name, firm_code, email, password, bar_number, phone_number, 
       street, city, state, zip_code, subscription_tier, firm_size, privacy_accepted_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP) 
       RETURNING id, firm_name, firm_code, email, subscription_tier, firm_size`,
      [firmName, firmCode, email.toLowerCase(), hashedPassword, barNumber || null, 
       phoneNumber || null, address?.street || null, address?.city || null, 
       address?.state || null, address?.zipCode || null, canonicalTier, canonicalSize]
    );
    
    const lawFirm = result.rows[0];
    
    // Auto-create admin user for the law firm
    const adminUserCode = `${lawFirm.firm_code}-USER-0001`;
    const adminUserResult = await db.query(
      `INSERT INTO law_firm_users (
        law_firm_id, first_name, last_name, email, password, user_code, role,
        can_manage_users, can_manage_clients, can_view_all_clients,
        can_send_notifications, can_manage_disbursements, can_view_analytics,
        can_manage_settings, title, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING id`,
      [
        lawFirm.id,
        'Admin',
        'User',
        lawFirm.email,
        hashedPassword,
        adminUserCode,
        'admin',
        true, true, true, true, true, true, true,
        'Firm Administrator',
        'active'
      ]
    );
    
    const adminUser = adminUserResult.rows[0];
    
    // Update law firm with admin user ID
    await db.query(
      'UPDATE law_firms SET admin_user_id = $1 WHERE id = $2',
      [adminUser.id, lawFirm.id]
    );
    
    const token = jwt.sign(
      { 
        id: lawFirm.id,
        lawFirmUserId: adminUser.id,
        email: lawFirm.email,
        userType: 'lawfirm',
        firmCode: lawFirm.firm_code,
        lawFirmUserRole: 'admin',
        isLawFirmUser: true
      },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );
    
    // Set httpOnly cookie for secure authentication
    setAuthCookie(res, token);
    
    // Send credentials via SMS if phone number provided
    let smsResult = { sent: false };
    if (phoneNumber) {
      try {
        smsResult = await sendCredentialSMS(
          phoneNumber,
          {
            firstName: 'Admin',
            lastName: 'User',
            email: lawFirm.email
          },
          password,  // Send the original password (not hashed)
          'lawfirm'
        );
      } catch (smsError) {
        console.error('❌ Error sending registration SMS:', smsError);
        // Don't fail registration if SMS fails
      }
    }

    // Send welcome email (fire-and-forget, non-blocking)
    sendWelcomeEmail(lawFirm.email, firmName, 'law_firm')
      .catch(err => console.error('Error sending law firm welcome email:', err));
    
    res.status(201).json({
      message: 'Law firm registered successfully',
      token,  // TEMPORARY: Keep for backward compatibility during migration
      lawFirm: {
        id: lawFirm.id,
        lawFirmUserId: adminUser.id,
        firmName: lawFirm.firm_name,
        firmCode: lawFirm.firm_code,
        email: lawFirm.email,
        subscriptionTier: lawFirm.subscription_tier,
        firmSize: lawFirm.firm_size,
        userCode: adminUserCode,
        role: 'admin',
        isLawFirmUser: true
      },
      smsSent: smsResult.success || false
    });
  } catch (error) {
    console.error('[Register Law Firm] Error:', error.message);
    if (error.code?.startsWith('23')) {
      return handleDatabaseError(error, res);
    }
    return sendErrorResponse(res, 500, 'Error registering law firm', {
      code: errorCodes.INTERNAL_ERROR
    });
  }
};

exports.registerMedicalProvider = async (req, res) => {
  try {
    const {
      providerName,
      email,
      password,
      npiNumber,
      specialty,
      phoneNumber,
      address,
      licenseNumber,
      subscriptionTier,
      providerSize,
      privacyAccepted
    } = req.body;

    if (!providerName || !email || !password) {
      return res.status(400).json({ 
        message: 'Provider name, email, and password are required' 
      });
    }
    
    // Privacy policy acceptance check temporarily disabled
    // if (!privacyAccepted) {
    //   return res.status(400).json({ message: 'You must accept the Privacy Policy to create an account' });
    // }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate unique provider code automatically
    const providerCode = await generateUniqueCode('medicalprovider');

    const tier = subscriptionTier || 'free';
    // Map tier names to database-accepted values
    const tierNameMapping = {
      'Shingle Provider': 'small',
      'Boutique Provider': 'medium',
      'Medium Provider': 'medium',
      'Large Provider': 'large'
    };
    const size = (tier !== 'free' && providerSize && providerSize.tierName) 
      ? (tierNameMapping[providerSize.tierName] || providerSize.tierName.toLowerCase()) 
      : null;

    const result = await db.query(
      `INSERT INTO medical_providers 
       (provider_name, provider_code, email, password, npi_number, specialty, phone_number, 
        street, city, state, zip_code, license_number, subscription_tier, provider_size, privacy_accepted_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP) 
       RETURNING id, provider_name, provider_code, email, subscription_tier, provider_size`,
      [
        providerName,
        providerCode,
        email.toLowerCase(),
        hashedPassword,
        npiNumber || null,
        specialty || null,
        phoneNumber || null,
        address?.street || null,
        address?.city || null,
        address?.state || null,
        address?.zipCode || null,
        licenseNumber || null,
        tier,
        size
      ]
    );

    const medicalProvider = result.rows[0];

    // Auto-create admin user for the medical provider
    const adminUserCode = `${medicalProvider.provider_code}-USER-0001`;
    const adminUserResult = await db.query(
      `INSERT INTO medical_provider_users (
        medical_provider_id, first_name, last_name, email, password, user_code, role,
        can_manage_users, can_manage_patients, can_view_all_patients,
        can_access_phi, can_view_medical_records, can_edit_medical_records,
        can_manage_billing, can_view_analytics, can_manage_settings,
        can_send_notifications, title, status, hipaa_training_date, hipaa_training_expiry
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING id`,
      [
        medicalProvider.id,
        'Admin',
        'User',
        medicalProvider.email,
        hashedPassword,
        adminUserCode,
        'admin',
        true, true, true, true, true, true, true, true, true, true,
        'Provider Administrator',
        'active',
        new Date().toISOString().split('T')[0], // Today's date
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 1 year from now
      ]
    );
    
    const adminUser = adminUserResult.rows[0];

    const token = jwt.sign(
      { 
        id: medicalProvider.id,
        medicalProviderUserId: adminUser.id,
        email: medicalProvider.email, 
        userType: 'medical_provider',
        providerCode: medicalProvider.provider_code,
        medicalProviderUserRole: 'admin',
        isMedicalProviderUser: true
      },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    // Set httpOnly cookie for secure authentication
    setAuthCookie(res, token);

    // Send welcome email (fire-and-forget, non-blocking)
    sendWelcomeEmail(medicalProvider.email, providerName, 'medical_provider')
      .catch(err => console.error('Error sending medical provider welcome email:', err));

    res.status(201).json({
      message: 'Medical provider registered successfully',
      token,  // TEMPORARY: Keep for backward compatibility during migration
      medicalProvider: {
        id: medicalProvider.id,
        medicalProviderUserId: adminUser.id,
        providerName: medicalProvider.provider_name,
        providerCode: medicalProvider.provider_code,
        email: medicalProvider.email,
        userCode: adminUserCode,
        role: 'admin',
        isMedicalProviderUser: true
      }
    });
  } catch (error) {
    console.error('[Register Medical Provider] Error:', error.message);
    if (error.code?.startsWith('23')) {
      return handleDatabaseError(error, res);
    }
    return sendErrorResponse(res, 500, 'Error registering medical provider', {
      code: errorCodes.INTERNAL_ERROR
    });
  }
};

exports.joinMedicalProvider = async (req, res) => {
  try {
    const {
      providerCode,
      firstName,
      lastName,
      email,
      password,
      requestedRole
    } = req.body;

    if (!providerCode || !firstName || !lastName || !email || !password) {
      return res.status(400).json({ 
        message: 'Provider code, first name, last name, email, and password are required' 
      });
    }

    const providerResult = await db.query(
      `SELECT id, provider_name, provider_code, subscription_tier FROM medical_providers WHERE provider_code = $1`,
      [providerCode.toUpperCase()]
    );

    if (providerResult.rows.length === 0) {
      return res.status(404).json({ message: 'Provider code not found. Please check the code and try again.' });
    }

    const medicalProvider = providerResult.rows[0];

    const existingUser = await db.query(
      `SELECT id FROM medical_provider_users WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userCountResult = await db.query(
      `SELECT COUNT(*) as count FROM medical_provider_users WHERE medical_provider_id = $1`,
      [medicalProvider.id]
    );
    const userCount = parseInt(userCountResult.rows[0].count, 10);
    const userNumber = String(userCount + 1).padStart(4, '0');
    const userCode = `${medicalProvider.provider_code}-USER-${userNumber}`;

    const role = requestedRole || 'staff';
    const validRoles = ['physician', 'nurse', 'staff', 'billing'];
    const finalRole = validRoles.includes(role) ? role : 'staff';

    const rolePermissions = {
      physician: {
        canManageUsers: false,
        canManagePatients: true,
        canViewAllPatients: true,
        canAccessPhi: true,
        canViewMedicalRecords: true,
        canEditMedicalRecords: true,
        canManageBilling: false,
        canViewAnalytics: true,
        canManageSettings: false,
        canSendNotifications: true
      },
      nurse: {
        canManageUsers: false,
        canManagePatients: true,
        canViewAllPatients: true,
        canAccessPhi: true,
        canViewMedicalRecords: true,
        canEditMedicalRecords: false,
        canManageBilling: false,
        canViewAnalytics: false,
        canManageSettings: false,
        canSendNotifications: true
      },
      staff: {
        canManageUsers: false,
        canManagePatients: false,
        canViewAllPatients: false,
        canAccessPhi: false,
        canViewMedicalRecords: false,
        canEditMedicalRecords: false,
        canManageBilling: false,
        canViewAnalytics: false,
        canManageSettings: false,
        canSendNotifications: false
      },
      billing: {
        canManageUsers: false,
        canManagePatients: false,
        canViewAllPatients: true,
        canAccessPhi: false,
        canViewMedicalRecords: false,
        canEditMedicalRecords: false,
        canManageBilling: true,
        canViewAnalytics: true,
        canManageSettings: false,
        canSendNotifications: false
      }
    };

    const perms = rolePermissions[finalRole];

    const newUserResult = await db.query(
      `INSERT INTO medical_provider_users (
        medical_provider_id, first_name, last_name, email, password, user_code, role,
        can_manage_users, can_manage_patients, can_view_all_patients,
        can_access_phi, can_view_medical_records, can_edit_medical_records,
        can_manage_billing, can_view_analytics, can_manage_settings,
        can_send_notifications, status, hipaa_training_date, hipaa_training_expiry
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING id, first_name, last_name, email, user_code, role, status`,
      [
        medicalProvider.id,
        firstName,
        lastName,
        email.toLowerCase(),
        hashedPassword,
        userCode,
        finalRole,
        perms.canManageUsers,
        perms.canManagePatients,
        perms.canViewAllPatients,
        perms.canAccessPhi,
        perms.canViewMedicalRecords,
        perms.canEditMedicalRecords,
        perms.canManageBilling,
        perms.canViewAnalytics,
        perms.canManageSettings,
        perms.canSendNotifications,
        'active',
        new Date().toISOString().split('T')[0],
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      ]
    );

    const newUser = newUserResult.rows[0];

    const token = jwt.sign(
      { 
        id: medicalProvider.id,
        medicalProviderUserId: newUser.id,
        email: newUser.email, 
        userType: 'medical_provider',
        providerCode: medicalProvider.provider_code,
        medicalProviderUserRole: finalRole,
        isMedicalProviderUser: true
      },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    setAuthCookie(res, token);

    sendWelcomeEmail(newUser.email, `${firstName} ${lastName}`, 'medical_provider')
      .catch(err => console.error('Error sending welcome email:', err));

    res.status(201).json({
      message: 'Successfully joined medical provider',
      token,
      medicalProvider: {
        id: medicalProvider.id,
        medicalProviderUserId: newUser.id,
        providerName: medicalProvider.provider_name,
        providerCode: medicalProvider.provider_code,
        email: newUser.email,
        userCode: newUser.user_code,
        role: newUser.role,
        isMedicalProviderUser: true
      }
    });
  } catch (error) {
    console.error('[Join Medical Provider] Error:', error.message);
    if (error.code?.startsWith('23')) {
      return handleDatabaseError(error, res);
    }
    return sendErrorResponse(res, 500, 'Error joining medical provider', {
      code: errorCodes.INTERNAL_ERROR
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    // Normalize userType: accept both 'medicalprovider' and 'medical_provider'
    const userType = req.body.userType === 'medicalprovider' ? 'medical_provider' : req.body.userType;
    
    let query, result;
    let isSubUser = false;
    
    if (userType === 'lawfirm') {
      result = await db.query(
        `SELECT lf.id, lf.firm_name as name, lf.email, lf.password, lf.firm_code,
                lfu.id as law_firm_user_id, lfu.role as law_firm_user_role
         FROM law_firms lf
         LEFT JOIN law_firm_users lfu ON lfu.law_firm_id = lf.id AND lfu.email = lf.email AND lfu.status = 'active'
         WHERE lf.email = $1`,
        [email.toLowerCase()]
      );
      
      if (result.rows.length === 0) {
        const subUserResult = await db.query(
          `SELECT lfu.id, lfu.law_firm_id, lfu.first_name, lfu.last_name, lfu.email, 
                  lfu.password, lfu.user_code, lfu.role, lfu.status,
                  lfu.can_manage_users, lfu.can_manage_clients, lfu.can_view_all_clients,
                  lfu.can_send_notifications, lfu.can_manage_disbursements, 
                  lfu.can_view_analytics, lfu.can_manage_settings,
                  lfu.must_change_password, lfu.temporary_password_expires_at,
                  lf.firm_code, lf.firm_name
           FROM law_firm_users lfu
           JOIN law_firms lf ON lfu.law_firm_id = lf.id
           WHERE lfu.email = $1`,
          [email.toLowerCase()]
        );
        
        if (subUserResult.rows.length > 0) {
          isSubUser = true;
          result = subUserResult;
        }
      }
    } else if (userType === 'medical_provider') {
      result = await db.query(
        `SELECT mp.id, mp.provider_name as name, mp.email, mp.password, mp.provider_code,
                mpu.id as medical_provider_user_id, mpu.role as medical_provider_user_role
         FROM medical_providers mp
         LEFT JOIN medical_provider_users mpu ON mpu.medical_provider_id = mp.id AND mpu.email = mp.email AND mpu.status = 'active'
         WHERE mp.email = $1`,
        [email.toLowerCase()]
      );
      
      if (result.rows.length === 0) {
        const subUserResult = await db.query(
          `SELECT mpu.id, mpu.medical_provider_id, mpu.first_name, mpu.last_name, mpu.email, 
                  mpu.password, mpu.user_code, mpu.role, mpu.status,
                  mpu.can_manage_users, mpu.can_manage_patients, mpu.can_view_all_patients,
                  mpu.can_send_notifications, mpu.can_manage_billing, 
                  mpu.can_view_analytics, mpu.can_manage_settings,
                  mpu.must_change_password, mpu.temporary_password_expires_at,
                  mp.provider_code, mp.provider_name
           FROM medical_provider_users mpu
           JOIN medical_providers mp ON mpu.medical_provider_id = mp.id
           WHERE mpu.email = $1`,
          [email.toLowerCase()]
        );
        
        if (subUserResult.rows.length > 0) {
          isSubUser = true;
          result = subUserResult;
        }
      }
    } else {
      result = await db.query(
        'SELECT id, first_name, last_name, email, password, user_type, total_coins, coins_spent, purchased_coins, purchased_coins_spent, login_streak, avatar_type, music_preference FROM users WHERE email = $1',
        [email.toLowerCase()]
      );
    }
    
    if (result.rows.length === 0) {
      const emailLower = email.toLowerCase();
      let correctPortal = null;

      if (userType !== 'lawfirm') {
        const lfCheck = await db.query(
          'SELECT 1 FROM law_firms WHERE email = $1 UNION SELECT 1 FROM law_firm_users WHERE email = $1 LIMIT 1',
          [emailLower]
        );
        if (lfCheck.rows.length > 0) correctPortal = 'Law Firm';
      }
      if (!correctPortal && userType !== 'medical_provider') {
        const mpCheck = await db.query(
          'SELECT 1 FROM medical_providers WHERE email = $1 UNION SELECT 1 FROM medical_provider_users WHERE email = $1 LIMIT 1',
          [emailLower]
        );
        if (mpCheck.rows.length > 0) correctPortal = 'Medical Provider';
      }
      if (!correctPortal && userType !== 'individual') {
        const indCheck = await db.query(
          'SELECT 1 FROM users WHERE email = $1 LIMIT 1',
          [emailLower]
        );
        if (indCheck.rows.length > 0) correctPortal = 'Individual';
      }

      await auditLogger.logAuth({
        userId: null,
        email: email,
        action: 'LOGIN_FAILED',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        success: false,
        failureReason: correctPortal ? 'Wrong portal selected' : 'User not found'
      });

      if (correctPortal) {
        const selectedPortalName = userType === 'lawfirm' ? 'Law Firm' : 
                                    userType === 'medical_provider' ? 'Medical Provider' : 'Individual';
        return res.status(401).json({ 
          message: `This email is registered under the ${correctPortal} portal, but you selected ${selectedPortalName}. Please switch to the ${correctPortal} portal and try again.`,
          code: 'WRONG_PORTAL',
          correctPortal: correctPortal.toLowerCase().replace(' ', '_')
        });
      }

      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const account = result.rows[0];
    
    if (isSubUser && userType === 'lawfirm' && account.status !== 'active') {
      await auditLogger.logAuth({
        userId: account.id,
        email: email,
        action: 'LAWFIRM_USER_LOGIN_FAILED',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        success: false,
        failureReason: `Account ${account.status}`
      });
      return res.status(403).json({ 
        message: `Account is ${account.status}. Please contact your administrator.` 
      });
    }
    
    if (isSubUser && userType === 'medical_provider' && account.status !== 'active') {
      await auditLogger.logAuth({
        userId: account.id,
        email: email,
        action: 'MEDICALPROVIDER_USER_LOGIN_FAILED',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        success: false,
        failureReason: `Account ${account.status}`
      });
      return res.status(403).json({ 
        message: `Account is ${account.status}. Please contact your administrator.` 
      });
    }
    
    const isValidPassword = await bcrypt.compare(password, account.password);
    
    if (!isValidPassword) {
      const lockoutInfo = await handleFailedLogin(account.id, userType || account.user_type);
      await auditLogger.logAuth({
        userId: account.id,
        email: email,
        action: 'LOGIN_FAILED',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        success: false,
        failureReason: 'Invalid password'
      });

      if (lockoutInfo && lockoutInfo.locked) {
        return res.status(423).json({
          message: `Account locked for ${lockoutInfo.lockoutMinutes} minute${lockoutInfo.lockoutMinutes > 1 ? 's' : ''} due to too many failed attempts. Use "Forgot Password" if you need to reset your password.`,
          locked: true,
          lockoutMinutes: lockoutInfo.lockoutMinutes,
          showForgotPassword: true
        });
      }

      const remaining = lockoutInfo ? lockoutInfo.remaining : null;
      let warningMessage = 'The password you entered is incorrect. Please try again.';
      if (remaining !== null && remaining <= 3) {
        warningMessage = `Incorrect password. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining before your account is locked.`;
      }

      return res.status(401).json({
        message: warningMessage,
        code: 'INCORRECT_PASSWORD',
        remainingAttempts: remaining,
        showForgotPassword: true
      });
    }

    // Check for temporary password expiry
    if (isSubUser && account.temporary_password_expires_at) {
      const expiryDate = new Date(account.temporary_password_expires_at);
      const now = new Date();
      
      if (now > expiryDate) {
        await auditLogger.logAuth({
          userId: account.id,
          email: email,
          action: 'LOGIN_FAILED',
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('user-agent'),
          success: false,
          failureReason: 'Temporary password expired'
        });
        return res.status(403).json({ 
          message: 'Your temporary password has expired. Please contact your administrator to reset your password.',
          passwordExpired: true
        });
      }
    }

    // Check if password change is required
    if (isSubUser && account.must_change_password) {
      await auditLogger.logAuth({
        userId: account.id,
        email: email,
        action: 'LOGIN_REQUIRES_PASSWORD_CHANGE',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        success: true,
        metadata: { mustChangePassword: true }
      });
      
      // Generate a special token for password change flow
      const changePasswordToken = jwt.sign(
        { 
          id: account.id,
          email: account.email,
          userType: userType,
          mustChangePassword: true,
          tempAuth: true
        },
        JWT_SECRET,
        { expiresIn: '30m' }
      );
      
      return res.status(200).json({
        mustChangePassword: true,
        changePasswordToken,
        message: 'You must change your password before accessing your account',
        user: {
          email: account.email,
          firstName: account.first_name,
          lastName: account.last_name
        }
      });
    }
    
    let tokenPayload;
    if (userType === 'lawfirm') {
      if (isSubUser) {
        tokenPayload = { 
          id: account.law_firm_id, 
          lawFirmUserId: account.id,
          email: account.email, 
          userType: 'lawfirm', 
          firmCode: account.firm_code,
          lawFirmUserRole: account.role,
          isLawFirmUser: true
        };
      } else {
        let lawFirmUserId = account.law_firm_user_id;
        let lawFirmUserRole = account.law_firm_user_role;
        
        if (!lawFirmUserId) {
          const fallbackUserResult = await db.query(
            `SELECT id, role FROM law_firm_users 
             WHERE law_firm_id = $1 AND status = 'active' AND role = 'admin'
             LIMIT 1`,
            [account.id]
          );
          
          if (fallbackUserResult.rows.length > 0) {
            lawFirmUserId = fallbackUserResult.rows[0].id;
            lawFirmUserRole = fallbackUserResult.rows[0].role;
          } else {
            lawFirmUserId = -1;
            lawFirmUserRole = 'admin';
          }
        }
        
        tokenPayload = { 
          id: account.id, 
          email: account.email, 
          userType: 'lawfirm', 
          firmCode: account.firm_code,
          lawFirmUserId: lawFirmUserId || null,
          lawFirmUserRole: lawFirmUserRole || null,
          isLawFirmUser: !!lawFirmUserId
        };
      }
    } else if (userType === 'medical_provider') {
      if (isSubUser) {
        tokenPayload = { 
          id: account.medical_provider_id, 
          medicalProviderUserId: account.id,
          email: account.email, 
          userType: 'medical_provider', 
          providerCode: account.provider_code,
          medicalProviderUserRole: account.role,
          isMedicalProviderUser: true
        };
      } else {
        let medicalProviderUserId = account.medical_provider_user_id;
        let medicalProviderUserRole = account.medical_provider_user_role;
        
        if (!medicalProviderUserId) {
          const fallbackUserResult = await db.query(
            `SELECT id, role FROM medical_provider_users 
             WHERE medical_provider_id = $1 AND status = 'active' AND role = 'admin'
             LIMIT 1`,
            [account.id]
          );
          
          if (fallbackUserResult.rows.length > 0) {
            medicalProviderUserId = fallbackUserResult.rows[0].id;
            medicalProviderUserRole = fallbackUserResult.rows[0].role;
          } else {
            medicalProviderUserId = -1;
            medicalProviderUserRole = 'admin';
          }
        }
        
        tokenPayload = { 
          id: account.id, 
          email: account.email, 
          userType: 'medical_provider', 
          providerCode: account.provider_code,
          medicalProviderUserId: medicalProviderUserId || null,
          medicalProviderUserRole: medicalProviderUserRole || null,
          isMedicalProviderUser: !!medicalProviderUserId
        };
      }
    } else {
      tokenPayload = { id: account.id, email: account.email, userType: account.user_type };
    }
    
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '30d' });
    
    // HIPAA: Handle successful login (reset attempts, update timestamp)
    await handleSuccessfulLogin(account.id, userType || account.user_type, req.ip || req.connection.remoteAddress);
    
    // HIPAA: Log successful login
    await auditLogger.logAuth({
      userId: account.id,
      email: email,
      action: 'LOGIN',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      success: true
    });
    
    if (userType === 'lawfirm' && isSubUser) {
      await db.query(
        'UPDATE law_firm_users SET last_login = CURRENT_TIMESTAMP, last_activity = CURRENT_TIMESTAMP WHERE id = $1',
        [account.id]
      );
    } else if (userType === 'medical_provider' && isSubUser) {
      await db.query(
        'UPDATE medical_provider_users SET last_login = CURRENT_TIMESTAMP, last_activity = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [account.id]
      );
    } else if (userType !== 'lawfirm' && userType !== 'medical_provider') {
      await db.query(
        'UPDATE users SET last_login_date = CURRENT_DATE WHERE id = $1',
        [account.id]
      );
    }
    
    let responseData;
    if (userType === 'lawfirm') {
      if (isSubUser) {
        responseData = {
          id: account.law_firm_id,
          lawFirmUserId: account.id,
          firstName: account.first_name,
          lastName: account.last_name,
          firmName: account.firm_name,
          email: account.email,
          userType: 'lawfirm',
          firmCode: account.firm_code,
          role: account.role,
          userCode: account.user_code,
          isLawFirmUser: true
        };
      } else {
        responseData = {
          id: account.id,
          lawFirmUserId: tokenPayload.lawFirmUserId || null,
          firmName: account.name,
          email: account.email,
          userType: 'lawfirm',
          firmCode: account.firm_code,
          role: tokenPayload.lawFirmUserRole || null,
          isLawFirmUser: tokenPayload.isLawFirmUser
        };
      }
    } else if (userType === 'medical_provider') {
      if (isSubUser) {
        responseData = {
          id: account.medical_provider_id,
          medicalProviderUserId: account.id,
          firstName: account.first_name,
          lastName: account.last_name,
          providerName: account.provider_name,
          email: account.email,
          userType: 'medical_provider',
          providerCode: account.provider_code,
          role: account.role,
          userCode: account.user_code,
          isMedicalProviderUser: true
        };
      } else {
        responseData = {
          id: account.id,
          medicalProviderUserId: tokenPayload.medicalProviderUserId || null,
          providerName: account.name,
          email: account.email,
          userType: 'medical_provider',
          providerCode: account.provider_code,
          role: tokenPayload.medicalProviderUserRole || null,
          isMedicalProviderUser: tokenPayload.isMedicalProviderUser
        };
      }
    } else {
      const totalCoins = (parseInt(account.total_coins) || 0) - (parseInt(account.coins_spent) || 0);
      const purchasedCoins = (parseInt(account.purchased_coins) || 0) - (parseInt(account.purchased_coins_spent) || 0);
      responseData = {
        id: account.id,
        firstName: account.first_name,
        lastName: account.last_name,
        email: account.email,
        userType: account.user_type,
        coins: totalCoins + purchasedCoins,
        loginStreak: parseInt(account.login_streak) || 0,
        avatarType: account.avatar_type || 'captain',
        musicPreference: account.music_preference || 'off'
      };
    }
    
    // Set httpOnly cookie for secure authentication
    setAuthCookie(res, token);
    
    res.json({
      message: 'Login successful',
      token,  // TEMPORARY: Keep for backward compatibility during migration
      user: responseData
    });
  } catch (error) {
    console.error('[Login] Error:', error.message);
    return sendErrorResponse(res, 500, 'Error logging in', {
      code: errorCodes.INTERNAL_ERROR
    });
  }
};

exports.loginLawFirmUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await db.query(
      `SELECT lfu.id, lfu.law_firm_id, lfu.first_name, lfu.last_name, lfu.email, 
              lfu.password, lfu.user_code, lfu.role, lfu.status,
              lfu.can_manage_users, lfu.can_manage_clients, lfu.can_view_all_clients,
              lfu.can_send_notifications, lfu.can_manage_disbursements, 
              lfu.can_view_analytics, lfu.can_manage_settings,
              lf.firm_code, lf.firm_name
       FROM law_firm_users lfu
       JOIN law_firms lf ON lfu.law_firm_id = lf.id
       WHERE lfu.email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      await auditLogger.logAuth({
        userId: null,
        email: email,
        action: 'LAWFIRM_USER_LOGIN_FAILED',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        success: false,
        failureReason: 'User not found'
      });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const lawFirmUser = result.rows[0];

    if (lawFirmUser.status !== 'active') {
      await auditLogger.logAuth({
        userId: lawFirmUser.id,
        email: email,
        action: 'LAWFIRM_USER_LOGIN_FAILED',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        success: false,
        failureReason: `Account ${lawFirmUser.status}`
      });
      return res.status(403).json({ 
        message: `Account is ${lawFirmUser.status}. Please contact your administrator.` 
      });
    }

    const isValidPassword = await bcrypt.compare(password, lawFirmUser.password);

    if (!isValidPassword) {
      await auditLogger.logAuth({
        userId: lawFirmUser.id,
        email: email,
        action: 'LAWFIRM_USER_LOGIN_FAILED',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        success: false,
        failureReason: 'Invalid password'
      });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    await db.query(
      'UPDATE law_firm_users SET last_login = CURRENT_TIMESTAMP, last_activity = CURRENT_TIMESTAMP WHERE id = $1',
      [lawFirmUser.id]
    );

    const token = jwt.sign(
      { 
        id: lawFirmUser.law_firm_id,
        lawFirmUserId: lawFirmUser.id,
        email: lawFirmUser.email,
        userType: 'lawfirm',
        firmCode: lawFirmUser.firm_code,
        lawFirmUserRole: lawFirmUser.role,
        isLawFirmUser: true
      },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    await auditLogger.logAuth({
      userId: lawFirmUser.id,
      email: email,
      action: 'LAWFIRM_USER_LOGIN',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      success: true
    });

    // Log activity
    await activityLogger.log({
      lawFirmId: lawFirmUser.law_firm_id,
      userId: lawFirmUser.id,
      userEmail: lawFirmUser.email,
      userName: `${lawFirmUser.first_name} ${lawFirmUser.last_name}`,
      action: 'user_login',
      actionCategory: 'user',
      metadata: { role: lawFirmUser.role },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      status: 'success'
    });

    // Set httpOnly cookie for secure authentication
    setAuthCookie(res, token);
    
    res.json({
      message: 'Login successful',
      token,  // TEMPORARY: Keep for backward compatibility during migration
      user: {
        id: lawFirmUser.law_firm_id,
        lawFirmUserId: lawFirmUser.id,
        firmName: lawFirmUser.firm_name,
        firstName: lawFirmUser.first_name,
        lastName: lawFirmUser.last_name,
        email: lawFirmUser.email,
        userType: 'lawfirm',
        firmCode: lawFirmUser.firm_code,
        userCode: lawFirmUser.user_code,
        role: lawFirmUser.role,
        isLawFirmUser: true,
        permissions: {
          canManageUsers: lawFirmUser.can_manage_users,
          canManageClients: lawFirmUser.can_manage_clients,
          canViewAllClients: lawFirmUser.can_view_all_clients,
          canSendNotifications: lawFirmUser.can_send_notifications,
          canManageDisbursements: lawFirmUser.can_manage_disbursements,
          canViewAnalytics: lawFirmUser.can_view_analytics,
          canManageSettings: lawFirmUser.can_manage_settings
        }
      }
    });
  } catch (error) {
    console.error('[Login Law Firm User] Error:', error.message);
    return sendErrorResponse(res, 500, 'Error logging in', {
      code: errorCodes.INTERNAL_ERROR
    });
  }
};

exports.loginMedicalProviderUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await db.query(
      `SELECT mpu.id, mpu.medical_provider_id, mpu.first_name, mpu.last_name, mpu.email, 
              mpu.password, mpu.user_code, mpu.role, mpu.status,
              mpu.can_manage_users, mpu.can_manage_patients, mpu.can_view_all_patients,
              mpu.can_send_notifications, mpu.can_manage_billing, 
              mpu.can_view_analytics, mpu.can_manage_settings,
              mp.provider_code, mp.provider_name
       FROM medical_provider_users mpu
       JOIN medical_providers mp ON mpu.medical_provider_id = mp.id
       WHERE mpu.email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      await auditLogger.logAuth({
        userId: null,
        email: email,
        action: 'MEDICALPROVIDER_USER_LOGIN_FAILED',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        success: false,
        failureReason: 'User not found'
      });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const medicalProviderUser = result.rows[0];

    if (medicalProviderUser.status !== 'active') {
      await auditLogger.logAuth({
        userId: medicalProviderUser.id,
        email: email,
        action: 'MEDICALPROVIDER_USER_LOGIN_FAILED',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        success: false,
        failureReason: `Account ${medicalProviderUser.status}`
      });
      return res.status(403).json({ 
        message: `Account is ${medicalProviderUser.status}. Please contact your administrator.` 
      });
    }

    const isValidPassword = await bcrypt.compare(password, medicalProviderUser.password);

    if (!isValidPassword) {
      await auditLogger.logAuth({
        userId: medicalProviderUser.id,
        email: email,
        action: 'MEDICALPROVIDER_USER_LOGIN_FAILED',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        success: false,
        failureReason: 'Invalid password'
      });
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    await db.query(
      'UPDATE medical_provider_users SET last_login = CURRENT_TIMESTAMP, last_activity = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [medicalProviderUser.id]
    );

    const token = jwt.sign(
      { 
        id: medicalProviderUser.medical_provider_id,
        medicalProviderUserId: medicalProviderUser.id,
        email: medicalProviderUser.email,
        userType: 'medical_provider',
        providerCode: medicalProviderUser.provider_code,
        medicalProviderUserRole: medicalProviderUser.role,
        isMedicalProviderUser: true
      },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    await auditLogger.logAuth({
      userId: medicalProviderUser.id,
      email: email,
      action: 'MEDICALPROVIDER_USER_LOGIN',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      success: true
    });

    // Log activity to medical provider activity logs
    const { logActivity } = require('../middleware/medicalProviderActivityLogger');
    await logActivity({
      medicalProviderId: medicalProviderUser.medical_provider_id,
      userId: medicalProviderUser.id,
      userEmail: medicalProviderUser.email,
      userName: `${medicalProviderUser.first_name} ${medicalProviderUser.last_name}`,
      action: 'user_login',
      metadata: { role: medicalProviderUser.role },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      status: 'success'
    });

    // Set httpOnly cookie for secure authentication
    setAuthCookie(res, token);
    
    res.json({
      message: 'Login successful',
      token,  // TEMPORARY: Keep for backward compatibility during migration
      user: {
        id: medicalProviderUser.medical_provider_id,
        medicalProviderUserId: medicalProviderUser.id,
        providerName: medicalProviderUser.provider_name,
        firstName: medicalProviderUser.first_name,
        lastName: medicalProviderUser.last_name,
        email: medicalProviderUser.email,
        userType: 'medical_provider',
        providerCode: medicalProviderUser.provider_code,
        userCode: medicalProviderUser.user_code,
        role: medicalProviderUser.role,
        isMedicalProviderUser: true,
        permissions: {
          canManageUsers: medicalProviderUser.can_manage_users,
          canManagePatients: medicalProviderUser.can_manage_patients,
          canViewAllPatients: medicalProviderUser.can_view_all_patients,
          canSendNotifications: medicalProviderUser.can_send_notifications,
          canManageBilling: medicalProviderUser.can_manage_billing,
          canViewAnalytics: medicalProviderUser.can_view_analytics,
          canManageSettings: medicalProviderUser.can_manage_settings
        }
      }
    });
  } catch (error) {
    console.error('[Login Medical Provider User] Error:', error.message);
    return sendErrorResponse(res, 500, 'Error logging in', {
      code: errorCodes.INTERNAL_ERROR
    });
  }
};

exports.logout = async (req, res) => {
  try {
    // Clear the new httpOnly authentication cookie
    res.clearCookie('authToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      signed: true
    });
    
    // Also clear the legacy portal cookie for full session termination
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      signed: true
    });
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('[Logout] Error:', error.message);
    return sendErrorResponse(res, 500, 'Error logging out', {
      code: errorCodes.INTERNAL_ERROR
    });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email, userType } = req.body;
    
    if (!email || !userType) {
      return res.status(400).json({ message: 'Email and user type are required' });
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedUserType = userType.toLowerCase();
    
    let userExists = false;
    let tableName;
    
    if (normalizedUserType === 'individual') {
      tableName = 'users';
      const result = await db.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
      userExists = result.rows.length > 0;
    } else if (normalizedUserType === 'lawfirm') {
      tableName = 'law_firms';
      const result = await db.query('SELECT id FROM law_firms WHERE email = $1', [normalizedEmail]);
      userExists = result.rows.length > 0;
    } else if (normalizedUserType === 'medicalprovider') {
      tableName = 'medical_providers';
      const result = await db.query('SELECT id FROM medical_providers WHERE email = $1', [normalizedEmail]);
      userExists = result.rows.length > 0;
    } else {
      return res.status(400).json({ message: 'Invalid user type' });
    }
    
    if (!userExists) {
      return res.json({ 
        message: 'If an account with that email exists, a password reset link has been sent.' 
      });
    }
    
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    
    await db.query(
      `INSERT INTO password_reset_tokens (email, token, user_type, expires_at) 
       VALUES ($1, $2, $3, $4)`,
      [normalizedEmail, resetToken, normalizedUserType, expiresAt]
    );
    
    try {
      await sendPasswordResetEmail(normalizedEmail, resetToken, normalizedUserType);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError.message);
    }
    
    res.json({ 
      message: 'If an account with that email exists, a password reset link has been sent.' 
    });
    
  } catch (error) {
    console.error('[Forgot Password] Error:', error.message);
    return sendErrorResponse(res, 500, 'Error processing request', {
      code: errorCodes.INTERNAL_ERROR
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }
    
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }
    
    const tokenResult = await db.query(
      `SELECT * FROM password_reset_tokens 
       WHERE token = $1 AND used = false AND expires_at > NOW()`,
      [token]
    );
    
    if (tokenResult.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }
    
    const resetData = tokenResult.rows[0];
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    let updateQuery;
    if (resetData.user_type === 'individual') {
      updateQuery = 'UPDATE users SET password = $1 WHERE email = $2';
    } else if (resetData.user_type === 'lawfirm') {
      updateQuery = 'UPDATE law_firms SET password = $1 WHERE email = $2';
      await db.query('UPDATE law_firm_users SET password = $1 WHERE email = $2', [hashedPassword, resetData.email]);
    } else if (resetData.user_type === 'medicalprovider') {
      updateQuery = 'UPDATE medical_providers SET password = $1 WHERE email = $2';
      await db.query('UPDATE medical_provider_users SET password = $1 WHERE email = $2', [hashedPassword, resetData.email]);
    }
    
    await db.query(updateQuery, [hashedPassword, resetData.email]);
    
    await db.query(
      'UPDATE password_reset_tokens SET used = true WHERE id = $1',
      [resetData.id]
    );
    
    try {
      await sendPasswordResetConfirmationEmail(resetData.email, resetData.user_type);
    } catch (emailError) {
      console.error('Failed to send password reset confirmation:', emailError.message);
    }
    
    res.json({ message: 'Password has been reset successfully' });
    
  } catch (error) {
    console.error('[Reset Password] Error:', error.message);
    return sendErrorResponse(res, 500, 'Error resetting password', {
      code: errorCodes.INTERNAL_ERROR
    });
  }
};

exports.verifyResetToken = async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({ valid: false, message: 'Token is required' });
    }
    
    const result = await db.query(
      `SELECT email, user_type FROM password_reset_tokens 
       WHERE token = $1 AND used = false AND expires_at > NOW()`,
      [token]
    );
    
    if (result.rows.length === 0) {
      return res.json({ valid: false, message: 'Invalid or expired token' });
    }
    
    res.json({ 
      valid: true, 
      email: result.rows[0].email,
      userType: result.rows[0].user_type
    });
    
  } catch (error) {
    console.error('[Verify Reset Token] Error:', error.message);
    return sendErrorResponse(res, 500, 'Error verifying token', {
      code: errorCodes.INTERNAL_ERROR
    });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const user = req.user;
    
    let tokenPayload;
    if (user.userType === 'lawfirm' && user.isLawFirmUser) {
      tokenPayload = {
        id: user.id,
        lawFirmUserId: user.lawFirmUserId,
        email: user.email,
        userType: user.userType,
        firmCode: user.firmCode,
        lawFirmUserRole: user.lawFirmUserRole,
        isLawFirmUser: true,
        permissions: user.permissions
      };
    } else if (user.userType === 'medical_provider' && user.isMedicalProviderUser) {
      tokenPayload = {
        id: user.id,
        medicalProviderUserId: user.medicalProviderUserId,
        email: user.email,
        userType: user.userType,
        providerCode: user.providerCode,
        medicalProviderUserRole: user.medicalProviderUserRole,
        isMedicalProviderUser: true,
        permissions: user.permissions
      };
    } else {
      tokenPayload = {
        id: user.id,
        email: user.email,
        userType: user.userType
      };
    }

    const newToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
    setAuthCookie(res, newToken);

    res.json({
      message: 'Token refreshed successfully',
      token: newToken
    });
  } catch (error) {
    console.error('[Refresh Token] Error:', error.message);
    res.status(500).json({ message: 'Failed to refresh token' });
  }
};
