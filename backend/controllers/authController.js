const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET } = require('../middleware/auth');
const encryption = require('../services/encryption');
const auditLogger = require('../services/auditLogger');
const { handleFailedLogin, handleSuccessfulLogin } = require('../middleware/security');
const consentController = require('./consentController');
const { generateUniqueCode } = require('../utils/codeGenerator');

exports.registerClient = async (req, res) => {
  try {
    const { firstName, lastName, email, password, lawFirmCode, avatarType, subscriptionTier, subscriptionPrice } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // HIPAA: Encrypt PHI fields
    const encryptedFirstName = encryption.encrypt(firstName);
    const encryptedLastName = encryption.encrypt(lastName);
    const emailHash = encryption.hash(email.toLowerCase());
    
    let connectedLawFirmId = null;
    
    if (lawFirmCode) {
      const lawFirmResult = await db.query(
        'SELECT id, subscription_tier FROM law_firms WHERE firm_code = $1',
        [lawFirmCode.toUpperCase()]
      );
      
      if (lawFirmResult.rows.length > 0) {
        const lawFirm = lawFirmResult.rows[0];
        connectedLawFirmId = lawFirm.id;
        
        // Check client limit for free trial accounts
        if (lawFirm.subscription_tier === 'free') {
          const clientCountResult = await db.query(
            'SELECT COUNT(*) as count FROM law_firm_clients WHERE law_firm_id = $1',
            [connectedLawFirmId]
          );
          
          const clientCount = parseInt(clientCountResult.rows[0].count);
          if (clientCount >= 10) {
            return res.status(403).json({ 
              message: 'This law firm has reached the maximum number of clients (10) for their free trial account. They need to upgrade to add more clients.' 
            });
          }
        }
      }
    }
    
    const userResult = await db.query(
      `INSERT INTO users (first_name, last_name, email, email_hash, password, user_type, law_firm_code, 
       connected_law_firm_id, avatar_type, subscription_tier, subscription_price,
       first_name_encrypted, last_name_encrypted) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) 
       RETURNING id, email, first_name, last_name, user_type`,
      [firstName, lastName, email.toLowerCase(), emailHash, hashedPassword, 'client', 
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
    
    const token = jwt.sign(
      { id: user.id, email: user.email, userType: user.user_type },
      JWT_SECRET,
      { expiresIn: '30d' }
    );
    
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
    if (error.code === '23505') {
      return res.status(400).json({ message: 'Email already exists' });
    }
    res.status(500).json({ message: 'Error registering user', error: error.message });
  }
};

exports.registerLawFirm = async (req, res) => {
  try {
    const { firmName, email, password, barNumber, phoneNumber, address } = req.body;
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Generate unique firm code automatically
    const firmCode = await generateUniqueCode('lawfirm');
    
    const result = await db.query(
      `INSERT INTO law_firms (firm_name, firm_code, email, password, bar_number, phone_number, 
       street, city, state, zip_code, subscription_tier) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
       RETURNING id, firm_name, firm_code, email, subscription_tier`,
      [firmName, firmCode, email.toLowerCase(), hashedPassword, barNumber || null, 
       phoneNumber || null, address?.street || null, address?.city || null, 
       address?.state || null, address?.zipCode || null, 'free']
    );
    
    const lawFirm = result.rows[0];
    
    // HIPAA Phase 2: Assign default LAW_FIRM_ADMIN role
    try {
      const permissionService = require('../services/permissionService');
      await permissionService.assignRole(lawFirm.id, 'LAW_FIRM_ADMIN');
    } catch (roleError) {
      console.error('Error assigning LAW_FIRM_ADMIN role:', roleError);
      // Don't fail registration if role assignment fails
    }
    
    const token = jwt.sign(
      { id: lawFirm.id, email: lawFirm.email, userType: 'lawfirm', firmCode: lawFirm.firm_code },
      JWT_SECRET,
      { expiresIn: '30d' }
    );
    
    res.status(201).json({
      message: 'Law firm registered successfully',
      token,
      lawFirm: {
        id: lawFirm.id,
        firmName: lawFirm.firm_name,
        firmCode: lawFirm.firm_code,
        email: lawFirm.email
      }
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ message: 'Firm code or email already exists' });
    }
    res.status(500).json({ message: 'Error registering law firm', error: error.message });
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
      licenseNumber
    } = req.body;

    if (!providerName || !email || !password) {
      return res.status(400).json({ 
        message: 'Provider name, email, and password are required' 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate unique provider code automatically
    const providerCode = await generateUniqueCode('medicalprovider');

    const result = await db.query(
      `INSERT INTO medical_providers 
       (provider_name, provider_code, email, password, npi_number, specialty, phone_number, 
        street, city, state, zip_code, license_number, subscription_tier) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) 
       RETURNING id, provider_name, provider_code, email, subscription_tier`,
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
        'free'
      ]
    );

    const medicalProvider = result.rows[0];

    // HIPAA Phase 2: Assign default MEDICAL_PROVIDER_ADMIN role
    try {
      const permissionService = require('../services/permissionService');
      await permissionService.assignRole(medicalProvider.id, 'MEDICAL_PROVIDER_ADMIN');
    } catch (roleError) {
      console.error('Error assigning MEDICAL_PROVIDER_ADMIN role:', roleError);
      // Don't fail registration if role assignment fails
    }

    const token = jwt.sign(
      { 
        id: medicalProvider.id, 
        email: medicalProvider.email, 
        userType: 'medical_provider',
        providerCode: medicalProvider.provider_code
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      message: 'Medical provider registered successfully',
      token,
      medicalProvider: {
        id: medicalProvider.id,
        providerName: medicalProvider.provider_name,
        providerCode: medicalProvider.provider_code,
        email: medicalProvider.email
      }
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ message: 'Provider code or email already exists' });
    }
    res.status(500).json({ message: 'Error registering medical provider', error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, userType } = req.body;
    
    let query, result;
    
    if (userType === 'lawfirm') {
      result = await db.query(
        'SELECT id, firm_name as name, email, password, firm_code FROM law_firms WHERE email = $1',
        [email.toLowerCase()]
      );
    } else if (userType === 'medical_provider') {
      result = await db.query(
        'SELECT id, provider_name as name, email, password, provider_code FROM medical_providers WHERE email = $1',
        [email.toLowerCase()]
      );
    } else {
      result = await db.query(
        'SELECT id, first_name, last_name, email, password, user_type FROM users WHERE email = $1',
        [email.toLowerCase()]
      );
    }
    
    if (result.rows.length === 0) {
      // HIPAA: Log failed login attempt
      await auditLogger.logAuth({
        userId: null,
        email: email,
        action: 'LOGIN_FAILED',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        success: false,
        failureReason: 'User not found'
      });
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const account = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, account.password);
    
    if (!isValidPassword) {
      // HIPAA: Log failed login and increment attempts
      await handleFailedLogin(account.id, userType || account.user_type);
      await auditLogger.logAuth({
        userId: account.id,
        email: email,
        action: 'LOGIN_FAILED',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        success: false,
        failureReason: 'Invalid password'
      });
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    let tokenPayload;
    if (userType === 'lawfirm') {
      tokenPayload = { id: account.id, email: account.email, userType: 'lawfirm', firmCode: account.firm_code };
    } else if (userType === 'medical_provider') {
      tokenPayload = { id: account.id, email: account.email, userType: 'medical_provider', providerCode: account.provider_code };
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
    
    if (userType !== 'lawfirm' && userType !== 'medical_provider') {
      await db.query(
        'UPDATE users SET last_login_date = CURRENT_DATE WHERE id = $1',
        [account.id]
      );
    }
    
    let responseData;
    if (userType === 'lawfirm') {
      responseData = {
        id: account.id,
        firmName: account.name,
        email: account.email,
        userType: 'lawfirm',
        firmCode: account.firm_code
      };
    } else if (userType === 'medical_provider') {
      responseData = {
        id: account.id,
        providerName: account.name,
        email: account.email,
        userType: 'medical_provider',
        providerCode: account.provider_code
      };
    } else {
      responseData = {
        id: account.id,
        firstName: account.first_name,
        lastName: account.last_name,
        email: account.email,
        userType: account.user_type
      };
    }
    
    res.json({
      message: 'Login successful',
      token,
      user: responseData
    });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
};
