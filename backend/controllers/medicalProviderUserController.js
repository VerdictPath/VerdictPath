const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { logActivity } = require('../middleware/medicalProviderActivityLogger');
const auditLogger = require('../services/auditLogger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

function generateUserCode(providerCode) {
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${providerCode}-USER-${random}`;
}

exports.createUser = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      role = 'staff',
      title,
      npiNumber,
      licenseNumber,
      specialty,
      phoneNumber,
      department,
      credentials,
      trainingDate,
      trainingExpiry,
      permissions = {}
    } = req.body;

    const medicalProviderId = req.medicalProviderId;
    
    const isBootstrap = req.medicalProviderUser.id === -1;
    let createdBy = req.medicalProviderUser.id;
    let requesterName = 'System';
    
    if (!isBootstrap) {
      const requesterResult = await client.query(
        'SELECT can_manage_users, first_name, last_name FROM medical_provider_users WHERE id = $1',
        [req.medicalProviderUser.id]
      );

      if (requesterResult.rows.length === 0 || !requesterResult.rows[0].can_manage_users) {
        await auditLogger.log({
          actorId: req.medicalProviderUser.id,
          actorType: 'medical_provider_user',
          action: 'CREATE_USER',
          entityType: 'MedicalProviderUser',
          entityId: null,
          status: 'DENIED',
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('user-agent'),
          metadata: { reason: 'Insufficient permissions' }
        });
        
        return res.status(403).json({ success: false, message: 'You do not have permission to create users' });
      }
      
      requesterName = `${requesterResult.rows[0].first_name} ${requesterResult.rows[0].last_name}`;
    }

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, email, and password are required'
      });
    }

    const emailCheck = await client.query(
      'SELECT id FROM medical_provider_users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (emailCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email already in use'
      });
    }

    const providerResult = await client.query(
      'SELECT max_users, provider_code FROM medical_providers WHERE id = $1',
      [medicalProviderId]
    );

    if (providerResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Medical provider not found' });
    }

    const maxUsers = providerResult.rows[0].max_users || 5;
    const providerCode = providerResult.rows[0].provider_code;

    const userCount = await client.query(
      'SELECT COUNT(*) as count FROM medical_provider_users WHERE medical_provider_id = $1 AND status != $2',
      [medicalProviderId, 'deactivated']
    );

    if (parseInt(userCount.rows[0].count) >= maxUsers) {
      return res.status(403).json({
        success: false,
        message: `Maximum users (${maxUsers}) reached for your subscription tier. Please upgrade or deactivate existing users.`
      });
    }

    let userCode = '';
    let isUnique = false;
    while (!isUnique) {
      userCode = generateUserCode(providerCode);
      const codeCheck = await client.query(
        'SELECT id FROM medical_provider_users WHERE user_code = $1',
        [userCode]
      );
      isUnique = codeCheck.rows.length === 0;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let userPermissions = {
      canManageUsers: permissions.canManageUsers || false,
      canManagePatients: permissions.canManagePatients !== false,
      canViewAllPatients: permissions.canViewAllPatients !== false,
      canSendNotifications: permissions.canSendNotifications !== false,
      canManageBilling: permissions.canManageBilling || false,
      canViewAnalytics: permissions.canViewAnalytics !== false,
      canManageSettings: permissions.canManageSettings || false,
      canAccessPhi: permissions.canAccessPhi !== false,
      canViewMedicalRecords: permissions.canViewMedicalRecords !== false,
      canEditMedicalRecords: permissions.canEditMedicalRecords || false
    };

    if (role === 'admin') {
      userPermissions = {
        canManageUsers: true,
        canManagePatients: true,
        canViewAllPatients: true,
        canSendNotifications: true,
        canManageBilling: true,
        canViewAnalytics: true,
        canManageSettings: true,
        canAccessPhi: true,
        canViewMedicalRecords: true,
        canEditMedicalRecords: true
      };
    }

    const result = await client.query(`
      INSERT INTO medical_provider_users (
        medical_provider_id,
        first_name,
        last_name,
        email,
        password,
        user_code,
        role,
        title,
        npi_number,
        license_number,
        specialty,
        phone_number,
        department,
        credentials,
        hipaa_training_date,
        hipaa_training_expiry,
        can_manage_users,
        can_manage_patients,
        can_view_all_patients,
        can_send_notifications,
        can_manage_billing,
        can_view_analytics,
        can_manage_settings,
        can_access_phi,
        can_view_medical_records,
        can_edit_medical_records,
        status,
        created_by,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, CURRENT_TIMESTAMP)
      RETURNING 
        id, first_name, last_name, email, user_code, role, title, 
        npi_number, license_number, specialty, phone_number, department, credentials,
        hipaa_training_date, hipaa_training_expiry,
        can_manage_users, can_manage_patients, can_view_all_patients,
        can_send_notifications, can_manage_billing, can_view_analytics,
        can_manage_settings, can_access_phi, can_view_medical_records,
        can_edit_medical_records, status, created_at
    `, [
      medicalProviderId,
      firstName,
      lastName,
      email.toLowerCase(),
      hashedPassword,
      userCode,
      role,
      title,
      npiNumber,
      licenseNumber,
      specialty,
      phoneNumber,
      department,
      credentials,
      trainingDate,
      trainingExpiry,
      userPermissions.canManageUsers,
      userPermissions.canManagePatients,
      userPermissions.canViewAllPatients,
      userPermissions.canSendNotifications,
      userPermissions.canManageBilling,
      userPermissions.canViewAnalytics,
      userPermissions.canManageSettings,
      userPermissions.canAccessPhi,
      userPermissions.canViewMedicalRecords,
      userPermissions.canEditMedicalRecords,
      'active',
      isBootstrap ? null : createdBy
    ]);

    const newUser = result.rows[0];

    await auditLogger.log({
      actorId: isBootstrap ? null : createdBy,
      actorType: 'medical_provider_user',
      action: 'CREATE_USER',
      entityType: 'MedicalProviderUser',
      entityId: newUser.id,
      status: 'SUCCESS',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      metadata: { 
        email: newUser.email, 
        role: newUser.role, 
        userCode: newUser.user_code,
        isBootstrap 
      }
    });

    await logActivity({
      medicalProviderId,
      userId: isBootstrap ? null : createdBy,
      userEmail: req.medicalProviderUser.email,
      userName: requesterName,
      action: 'user_created',
      targetType: 'medical_provider_user',
      targetId: newUser.id,
      targetName: `${newUser.first_name} ${newUser.last_name}`,
      metadata: {
        role: newUser.role,
        email: newUser.email,
        permissions: userPermissions
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({
      success: true,
      message: 'Medical provider user created successfully',
      user: {
        id: newUser.id,
        firstName: newUser.first_name,
        lastName: newUser.last_name,
        email: newUser.email,
        userCode: newUser.user_code,
        role: newUser.role,
        title: newUser.title,
        npiNumber: newUser.npi_number,
        licenseNumber: newUser.license_number,
        specialty: newUser.specialty,
        phoneNumber: newUser.phone_number,
        department: newUser.department,
        credentials: newUser.credentials,
        hipaaTrainingDate: newUser.hipaa_training_date,
        hipaaTrainingExpiry: newUser.hipaa_training_expiry,
        permissions: {
          canManageUsers: newUser.can_manage_users,
          canManagePatients: newUser.can_manage_patients,
          canViewAllPatients: newUser.can_view_all_patients,
          canSendNotifications: newUser.can_send_notifications,
          canManageBilling: newUser.can_manage_billing,
          canViewAnalytics: newUser.can_view_analytics,
          canManageSettings: newUser.can_manage_settings,
          canAccessPhi: newUser.can_access_phi,
          canViewMedicalRecords: newUser.can_view_medical_records,
          canEditMedicalRecords: newUser.can_edit_medical_records
        },
        status: newUser.status,
        createdAt: newUser.created_at
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    
    await auditLogger.log({
      actorId: req.medicalProviderUser?.id || null,
      actorType: 'medical_provider_user',
      action: 'CREATE_USER',
      entityType: 'MedicalProviderUser',
      entityId: null,
      status: 'FAILURE',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      metadata: { error: error.message }
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: error.message
    });
  } finally {
    client.release();
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const medicalProviderId = req.medicalProviderId;
    const { status = 'active', role } = req.query;

    let query = `
      SELECT 
        mpu.id, mpu.first_name, mpu.last_name, mpu.email, mpu.user_code, mpu.role, mpu.title,
        mpu.npi_number, mpu.license_number, mpu.specialty, mpu.phone_number, mpu.department,
        mpu.credentials, mpu.hipaa_training_date, mpu.hipaa_training_expiry,
        mpu.can_manage_users, mpu.can_manage_patients, mpu.can_view_all_patients,
        mpu.can_send_notifications, mpu.can_manage_billing, mpu.can_view_analytics,
        mpu.can_manage_settings, mpu.can_access_phi, mpu.can_view_medical_records,
        mpu.can_edit_medical_records, mpu.status, mpu.last_login, mpu.created_at,
        creator.first_name as created_by_first_name, creator.last_name as created_by_last_name
      FROM medical_provider_users mpu
      LEFT JOIN medical_provider_users creator ON mpu.created_by = creator.id
      WHERE mpu.medical_provider_id = $1
    `;
    const params = [medicalProviderId];

    if (status && status !== 'all') {
      query += ` AND mpu.status = $${params.length + 1}`;
      params.push(status);
    }

    if (role) {
      query += ` AND mpu.role = $${params.length + 1}`;
      params.push(role);
    }

    query += ' ORDER BY mpu.created_at DESC';

    const result = await pool.query(query, params);

    const users = result.rows.map(user => ({
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      userCode: user.user_code,
      role: user.role,
      title: user.title,
      npiNumber: user.npi_number,
      licenseNumber: user.license_number,
      specialty: user.specialty,
      phoneNumber: user.phone_number,
      department: user.department,
      credentials: user.credentials,
      hipaaTrainingDate: user.hipaa_training_date,
      hipaaTrainingExpiry: user.hipaa_training_expiry,
      permissions: {
        canManageUsers: user.can_manage_users,
        canManagePatients: user.can_manage_patients,
        canViewAllPatients: user.can_view_all_patients,
        canSendNotifications: user.can_send_notifications,
        canManageBilling: user.can_manage_billing,
        canViewAnalytics: user.can_view_analytics,
        canManageSettings: user.can_manage_settings,
        canAccessPhi: user.can_access_phi,
        canViewMedicalRecords: user.can_view_medical_records,
        canEditMedicalRecords: user.can_edit_medical_records
      },
      status: user.status,
      lastLogin: user.last_login,
      createdAt: user.created_at,
      createdBy: user.created_by_first_name ? `${user.created_by_first_name} ${user.created_by_last_name}` : null
    }));

    res.json({
      success: true,
      users,
      count: users.length
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users'
    });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const medicalProviderId = req.medicalProviderId;

    const result = await pool.query(`
      SELECT 
        mpu.id, mpu.first_name, mpu.last_name, mpu.email, mpu.user_code, mpu.role, mpu.title,
        mpu.npi_number, mpu.license_number, mpu.specialty, mpu.phone_number, mpu.department,
        mpu.credentials, mpu.hipaa_training_date, mpu.hipaa_training_expiry,
        mpu.can_manage_users, mpu.can_manage_patients, mpu.can_view_all_patients,
        mpu.can_send_notifications, mpu.can_manage_billing, mpu.can_view_analytics,
        mpu.can_manage_settings, mpu.can_access_phi, mpu.can_view_medical_records,
        mpu.can_edit_medical_records, mpu.status, mpu.last_login,
        mpu.created_at, mpu.deactivated_at, mpu.deactivation_reason,
        creator.first_name as created_by_first_name, creator.last_name as created_by_last_name
      FROM medical_provider_users mpu
      LEFT JOIN medical_provider_users creator ON mpu.created_by = creator.id
      WHERE mpu.id = $1 AND mpu.medical_provider_id = $2
    `, [userId, medicalProviderId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        userCode: user.user_code,
        role: user.role,
        title: user.title,
        npiNumber: user.npi_number,
        licenseNumber: user.license_number,
        specialty: user.specialty,
        phoneNumber: user.phone_number,
        department: user.department,
        credentials: user.credentials,
        hipaaTrainingDate: user.hipaa_training_date,
        hipaaTrainingExpiry: user.hipaa_training_expiry,
        permissions: {
          canManageUsers: user.can_manage_users,
          canManagePatients: user.can_manage_patients,
          canViewAllPatients: user.can_view_all_patients,
          canSendNotifications: user.can_send_notifications,
          canManageBilling: user.can_manage_billing,
          canViewAnalytics: user.can_view_analytics,
          canManageSettings: user.can_manage_settings,
          canAccessPhi: user.can_access_phi,
          canViewMedicalRecords: user.can_view_medical_records,
          canEditMedicalRecords: user.can_edit_medical_records
        },
        status: user.status,
        lastLogin: user.last_login,
        createdAt: user.created_at,
        createdBy: user.created_by_first_name ? `${user.created_by_first_name} ${user.created_by_last_name}` : null,
        deactivatedAt: user.deactivated_at,
        deactivationReason: user.deactivation_reason
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user'
    });
  }
};

exports.updateUser = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { userId } = req.params;
    const medicalProviderId = req.medicalProviderId;
    const {
      firstName,
      lastName,
      title,
      npiNumber,
      licenseNumber,
      specialty,
      phoneNumber,
      department,
      credentials,
      trainingDate,
      trainingExpiry,
      role,
      permissions
    } = req.body;

    const requesterResult = await client.query(
      'SELECT can_manage_users, first_name, last_name FROM medical_provider_users WHERE id = $1',
      [req.medicalProviderUser.id]
    );

    if (requesterResult.rows.length === 0 || !requesterResult.rows[0].can_manage_users) {
      await auditLogger.log({
        actorId: req.medicalProviderUser.id,
        actorType: 'medical_provider_user',
        action: 'UPDATE_USER',
        entityType: 'MedicalProviderUser',
        entityId: userId,
        status: 'DENIED',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        metadata: { reason: 'Insufficient permissions' }
      });
      
      return res.status(403).json({ success: false, message: 'You do not have permission to update users' });
    }
    
    const requesterName = `${requesterResult.rows[0].first_name} ${requesterResult.rows[0].last_name}`;

    const updates = [];
    const params = [userId, medicalProviderId];
    let paramIndex = 3;

    if (firstName) {
      updates.push(`first_name = $${paramIndex++}`);
      params.push(firstName);
    }
    if (lastName) {
      updates.push(`last_name = $${paramIndex++}`);
      params.push(lastName);
    }
    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      params.push(title);
    }
    if (npiNumber !== undefined) {
      updates.push(`npi_number = $${paramIndex++}`);
      params.push(npiNumber);
    }
    if (licenseNumber !== undefined) {
      updates.push(`license_number = $${paramIndex++}`);
      params.push(licenseNumber);
    }
    if (specialty !== undefined) {
      updates.push(`specialty = $${paramIndex++}`);
      params.push(specialty);
    }
    if (phoneNumber !== undefined) {
      updates.push(`phone_number = $${paramIndex++}`);
      params.push(phoneNumber);
    }
    if (department !== undefined) {
      updates.push(`department = $${paramIndex++}`);
      params.push(department);
    }
    if (credentials !== undefined) {
      updates.push(`credentials = $${paramIndex++}`);
      params.push(credentials);
    }
    if (trainingDate !== undefined) {
      updates.push(`hipaa_training_date = $${paramIndex++}`);
      params.push(trainingDate);
    }
    if (trainingExpiry !== undefined) {
      updates.push(`hipaa_training_expiry = $${paramIndex++}`);
      params.push(trainingExpiry);
    }
    if (role) {
      updates.push(`role = $${paramIndex++}`);
      params.push(role);
    }

    if (permissions) {
      if (permissions.canManageUsers !== undefined) {
        updates.push(`can_manage_users = $${paramIndex++}`);
        params.push(permissions.canManageUsers);
      }
      if (permissions.canManagePatients !== undefined) {
        updates.push(`can_manage_patients = $${paramIndex++}`);
        params.push(permissions.canManagePatients);
      }
      if (permissions.canViewAllPatients !== undefined) {
        updates.push(`can_view_all_patients = $${paramIndex++}`);
        params.push(permissions.canViewAllPatients);
      }
      if (permissions.canSendNotifications !== undefined) {
        updates.push(`can_send_notifications = $${paramIndex++}`);
        params.push(permissions.canSendNotifications);
      }
      if (permissions.canManageBilling !== undefined) {
        updates.push(`can_manage_billing = $${paramIndex++}`);
        params.push(permissions.canManageBilling);
      }
      if (permissions.canViewAnalytics !== undefined) {
        updates.push(`can_view_analytics = $${paramIndex++}`);
        params.push(permissions.canViewAnalytics);
      }
      if (permissions.canManageSettings !== undefined) {
        updates.push(`can_manage_settings = $${paramIndex++}`);
        params.push(permissions.canManageSettings);
      }
      if (permissions.canAccessPhi !== undefined) {
        updates.push(`can_access_phi = $${paramIndex++}`);
        params.push(permissions.canAccessPhi);
      }
      if (permissions.canViewMedicalRecords !== undefined) {
        updates.push(`can_view_medical_records = $${paramIndex++}`);
        params.push(permissions.canViewMedicalRecords);
      }
      if (permissions.canEditMedicalRecords !== undefined) {
        updates.push(`can_edit_medical_records = $${paramIndex++}`);
        params.push(permissions.canEditMedicalRecords);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    const query = `
      UPDATE medical_provider_users
      SET ${updates.join(', ')}
      WHERE id = $1 AND medical_provider_id = $2
      RETURNING 
        id, first_name, last_name, email, role, status
    `;

    const result = await client.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const updatedUser = result.rows[0];

    await auditLogger.log({
      actorId: req.medicalProviderUser.id,
      actorType: 'medical_provider_user',
      action: 'UPDATE_USER',
      entityType: 'MedicalProviderUser',
      entityId: userId,
      status: 'SUCCESS',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      metadata: { updatedFields: Object.keys(req.body) }
    });

    await logActivity({
      medicalProviderId,
      userId: req.medicalProviderUser.id,
      userEmail: req.medicalProviderUser.email,
      userName: requesterName,
      action: 'user_updated',
      targetType: 'medical_provider_user',
      targetId: updatedUser.id,
      targetName: `${updatedUser.first_name} ${updatedUser.last_name}`,
      metadata: { 
        targetEmail: updatedUser.email,
        updatedFields: Object.keys(req.body) 
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent')
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      user: {
        id: updatedUser.id,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        email: updatedUser.email,
        role: updatedUser.role,
        status: updatedUser.status
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    
    await auditLogger.log({
      actorId: req.medicalProviderUser?.id || null,
      actorType: 'medical_provider_user',
      action: 'UPDATE_USER',
      entityType: 'MedicalProviderUser',
      entityId: req.params.userId,
      status: 'FAILURE',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      metadata: { error: error.message }
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  } finally {
    client.release();
  }
};

exports.deactivateUser = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    const medicalProviderId = req.medicalProviderId;
    const deactivatedBy = req.medicalProviderUser.id;

    const requesterResult = await client.query(
      'SELECT can_manage_users, first_name, last_name FROM medical_provider_users WHERE id = $1',
      [deactivatedBy]
    );

    if (requesterResult.rows.length === 0 || !requesterResult.rows[0].can_manage_users) {
      await auditLogger.log({
        actorId: deactivatedBy,
        actorType: 'medical_provider_user',
        action: 'DEACTIVATE_USER',
        entityType: 'MedicalProviderUser',
        entityId: userId,
        status: 'DENIED',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        metadata: { reason: 'Insufficient permissions' }
      });
      
      return res.status(403).json({ success: false, message: 'You do not have permission to deactivate users' });
    }
    
    const requesterName = `${requesterResult.rows[0].first_name} ${requesterResult.rows[0].last_name}`;

    if (parseInt(userId) === deactivatedBy) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account'
      });
    }

    const result = await client.query(`
      UPDATE medical_provider_users
      SET 
        status = 'deactivated',
        deactivated_at = CURRENT_TIMESTAMP,
        deactivated_by = $1,
        deactivation_reason = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND medical_provider_id = $4 AND status != 'deactivated'
      RETURNING id, email, first_name, last_name
    `, [deactivatedBy, reason || null, userId, medicalProviderId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found or already deactivated'
      });
    }

    const deactivatedUser = result.rows[0];

    await auditLogger.log({
      actorId: deactivatedBy,
      actorType: 'medical_provider_user',
      action: 'DEACTIVATE_USER',
      entityType: 'MedicalProviderUser',
      entityId: userId,
      status: 'SUCCESS',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      metadata: { reason }
    });

    await logActivity({
      medicalProviderId,
      userId: deactivatedBy,
      userEmail: req.medicalProviderUser.email,
      userName: requesterName,
      action: 'user_deactivated',
      targetType: 'medical_provider_user',
      targetId: parseInt(userId),
      targetName: `${deactivatedUser.first_name} ${deactivatedUser.last_name}`,
      metadata: { 
        targetEmail: deactivatedUser.email,
        reason 
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent')
    });

    res.json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    console.error('Deactivate user error:', error);
    
    await auditLogger.log({
      actorId: req.medicalProviderUser?.id || null,
      actorType: 'medical_provider_user',
      action: 'DEACTIVATE_USER',
      entityType: 'MedicalProviderUser',
      entityId: req.params.userId,
      status: 'FAILURE',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      metadata: { error: error.message }
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate user'
    });
  } finally {
    client.release();
  }
};

exports.reactivateUser = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { userId } = req.params;
    const medicalProviderId = req.medicalProviderId;

    const requesterResult = await client.query(
      'SELECT can_manage_users, first_name, last_name FROM medical_provider_users WHERE id = $1',
      [req.medicalProviderUser.id]
    );

    if (requesterResult.rows.length === 0 || !requesterResult.rows[0].can_manage_users) {
      await auditLogger.log({
        actorId: req.medicalProviderUser.id,
        actorType: 'medical_provider_user',
        action: 'REACTIVATE_USER',
        entityType: 'MedicalProviderUser',
        entityId: userId,
        status: 'DENIED',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        metadata: { reason: 'Insufficient permissions' }
      });
      
      return res.status(403).json({ success: false, message: 'You do not have permission to reactivate users' });
    }
    
    const requesterName = `${requesterResult.rows[0].first_name} ${requesterResult.rows[0].last_name}`;

    const result = await client.query(`
      UPDATE medical_provider_users
      SET 
        status = 'active',
        deactivated_at = NULL,
        deactivated_by = NULL,
        deactivation_reason = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND medical_provider_id = $2 AND status = 'deactivated'
      RETURNING id, email, first_name, last_name
    `, [userId, medicalProviderId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found or not deactivated'
      });
    }

    const reactivatedUser = result.rows[0];

    await auditLogger.log({
      actorId: req.medicalProviderUser.id,
      actorType: 'medical_provider_user',
      action: 'REACTIVATE_USER',
      entityType: 'MedicalProviderUser',
      entityId: userId,
      status: 'SUCCESS',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent')
    });

    await logActivity({
      medicalProviderId,
      userId: req.medicalProviderUser.id,
      userEmail: req.medicalProviderUser.email,
      userName: requesterName,
      action: 'user_reactivated',
      targetType: 'medical_provider_user',
      targetId: parseInt(userId),
      targetName: `${reactivatedUser.first_name} ${reactivatedUser.last_name}`,
      metadata: { 
        targetEmail: reactivatedUser.email 
      },
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent')
    });

    res.json({
      success: true,
      message: 'User reactivated successfully'
    });
  } catch (error) {
    console.error('Reactivate user error:', error);
    
    await auditLogger.log({
      actorId: req.medicalProviderUser?.id || null,
      actorType: 'medical_provider_user',
      action: 'REACTIVATE_USER',
      entityType: 'MedicalProviderUser',
      entityId: req.params.userId,
      status: 'FAILURE',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      metadata: { error: error.message }
    });
    
    res.status(500).json({
      success: false,
      message: 'Failed to reactivate user'
    });
  } finally {
    client.release();
  }
};
