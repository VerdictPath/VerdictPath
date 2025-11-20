const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { logActivity } = require('../middleware/medicalProviderActivityLogger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Generate unique user code
function generateUserCode(providerCode) {
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${providerCode}-USER-${random}`;
}

// Create new medical provider user
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
      permissions = {}
    } = req.body;

    const medicalProviderId = req.medicalProviderId;
    const createdBy = req.medicalProviderUser.id;

    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'First name, last name, email, and password are required'
      });
    }

    // Check if email already exists
    const emailCheck = await client.query(
      'SELECT id FROM medical_provider_users WHERE email = $1',
      [email]
    );

    if (emailCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email already in use'
      });
    }

    // Check user limit
    const providerResult = await client.query(
      'SELECT max_users FROM medical_providers WHERE id = $1',
      [medicalProviderId]
    );

    const maxUsers = providerResult.rows[0]?.max_users || 5;

    const userCount = await client.query(
      'SELECT COUNT(*) as count FROM medical_provider_users WHERE medical_provider_id = $1 AND status = $2',
      [medicalProviderId, 'active']
    );

    if (parseInt(userCount.rows[0].count) >= maxUsers) {
      return res.status(403).json({
        success: false,
        message: `Maximum users (${maxUsers}) reached for your subscription tier. Please upgrade or deactivate existing users.`
      });
    }

    // Get provider code for generating user code
    const providerData = await client.query(
      'SELECT provider_code FROM medical_providers WHERE id = $1',
      [medicalProviderId]
    );
    const providerCode = providerData.rows[0].provider_code;
    const userCode = generateUserCode(providerCode);

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Set permissions based on role
    let userPermissions = {
      canManageUsers: permissions.canManageUsers || false,
      canManagePatients: permissions.canManagePatients !== false, // Default true
      canViewAllPatients: permissions.canViewAllPatients !== false, // Default true
      canSendNotifications: permissions.canSendNotifications !== false, // Default true
      canManageBilling: permissions.canManageBilling || false,
      canViewAnalytics: permissions.canViewAnalytics !== false, // Default true
      canManageSettings: permissions.canManageSettings || false
    };

    // Admin gets all permissions
    if (role === 'admin') {
      userPermissions = {
        canManageUsers: true,
        canManagePatients: true,
        canViewAllPatients: true,
        canSendNotifications: true,
        canManageBilling: true,
        canViewAnalytics: true,
        canManageSettings: true
      };
    }

    // Create user
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
        can_manage_users,
        can_manage_patients,
        can_view_all_patients,
        can_send_notifications,
        can_manage_billing,
        can_view_analytics,
        can_manage_settings,
        status,
        created_by,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, CURRENT_TIMESTAMP)
      RETURNING 
        id, first_name, last_name, email, user_code, role, title, 
        npi_number, license_number, specialty, phone_number, department,
        can_manage_users, can_manage_patients, can_view_all_patients,
        can_send_notifications, can_manage_billing, can_view_analytics,
        can_manage_settings, status, created_at
    `, [
      medicalProviderId,
      firstName,
      lastName,
      email,
      hashedPassword,
      userCode,
      role,
      title,
      npiNumber,
      licenseNumber,
      specialty,
      phoneNumber,
      department,
      userPermissions.canManageUsers,
      userPermissions.canManagePatients,
      userPermissions.canViewAllPatients,
      userPermissions.canSendNotifications,
      userPermissions.canManageBilling,
      userPermissions.canViewAnalytics,
      userPermissions.canManageSettings,
      'active',
      createdBy
    ]);

    const newUser = result.rows[0];

    // Log activity
    await logActivity({
      medicalProviderId,
      userId: createdBy,
      userEmail: req.medicalProviderUser.email,
      userName: `${req.medicalProviderUser.first_name} ${req.medicalProviderUser.last_name}`,
      action: 'user_created',
      targetType: 'medical_provider_user',
      targetId: newUser.id,
      targetName: `${newUser.first_name} ${newUser.last_name}`,
      metadata: {
        role: newUser.role,
        email: newUser.email,
        permissions: userPermissions
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({
      success: true,
      message: 'Medical provider user created successfully',
      user: newUser
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: error.message
    });
  } finally {
    client.release();
  }
};

// Get all users for medical provider
exports.getAllUsers = async (req, res) => {
  try {
    const medicalProviderId = req.medicalProviderId;
    const { status = 'active', role } = req.query;

    let query = `
      SELECT 
        id, first_name, last_name, email, user_code, role, title,
        npi_number, license_number, specialty, phone_number, department,
        can_manage_users, can_manage_patients, can_view_all_patients,
        can_send_notifications, can_manage_billing, can_view_analytics,
        can_manage_settings, status, last_login, created_at
      FROM medical_provider_users
      WHERE medical_provider_id = $1
    `;
    const params = [medicalProviderId];

    if (status) {
      query += ` AND status = $${params.length + 1}`;
      params.push(status);
    }

    if (role) {
      query += ` AND role = $${params.length + 1}`;
      params.push(role);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      users: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users'
    });
  }
};

// Get single user details
exports.getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const medicalProviderId = req.medicalProviderId;

    const result = await pool.query(`
      SELECT 
        id, first_name, last_name, email, user_code, role, title,
        npi_number, license_number, specialty, phone_number, department,
        can_manage_users, can_manage_patients, can_view_all_patients,
        can_send_notifications, can_manage_billing, can_view_analytics,
        can_manage_settings, status, last_login, created_at,
        deactivated_at, deactivation_reason
      FROM medical_provider_users
      WHERE id = $1 AND medical_provider_id = $2
    `, [userId, medicalProviderId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user'
    });
  }
};

// Update user
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
      role,
      permissions
    } = req.body;

    // Build update query dynamically
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
    if (role) {
      updates.push(`role = $${paramIndex++}`);
      params.push(role);
    }

    // Handle permissions
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
        id, first_name, last_name, email, user_code, role, title,
        can_manage_users, can_manage_patients, can_view_all_patients,
        can_send_notifications, can_manage_billing, can_view_analytics,
        can_manage_settings
    `;

    const result = await client.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const updatedUser = result.rows[0];

    // Log activity
    await logActivity({
      medicalProviderId,
      userId: req.medicalProviderUser.id,
      userEmail: req.medicalProviderUser.email,
      userName: `${req.medicalProviderUser.first_name} ${req.medicalProviderUser.last_name}`,
      action: 'user_updated',
      targetType: 'medical_provider_user',
      targetId: updatedUser.id,
      targetName: `${updatedUser.first_name} ${updatedUser.last_name}`,
      metadata: req.body,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  } finally {
    client.release();
  }
};

// Deactivate user
exports.deactivateUser = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    const medicalProviderId = req.medicalProviderId;
    const deactivatedBy = req.medicalProviderUser.id;

    // Prevent self-deactivation
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
      WHERE id = $3 AND medical_provider_id = $4
      RETURNING first_name, last_name
    `, [deactivatedBy, reason, userId, medicalProviderId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const deactivatedUser = result.rows[0];

    // Log activity
    await logActivity({
      medicalProviderId,
      userId: deactivatedBy,
      userEmail: req.medicalProviderUser.email,
      userName: `${req.medicalProviderUser.first_name} ${req.medicalProviderUser.last_name}`,
      action: 'user_deactivated',
      targetType: 'medical_provider_user',
      targetId: parseInt(userId),
      targetName: `${deactivatedUser.first_name} ${deactivatedUser.last_name}`,
      metadata: { reason },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to deactivate user'
    });
  } finally {
    client.release();
  }
};

// Reactivate user
exports.reactivateUser = async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { userId } = req.params;
    const medicalProviderId = req.medicalProviderId;

    const result = await client.query(`
      UPDATE medical_provider_users
      SET 
        status = 'active',
        deactivated_at = NULL,
        deactivated_by = NULL,
        deactivation_reason = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND medical_provider_id = $2
      RETURNING first_name, last_name
    `, [userId, medicalProviderId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const reactivatedUser = result.rows[0];

    // Log activity
    await logActivity({
      medicalProviderId,
      userId: req.medicalProviderUser.id,
      userEmail: req.medicalProviderUser.email,
      userName: `${req.medicalProviderUser.first_name} ${req.medicalProviderUser.last_name}`,
      action: 'user_reactivated',
      targetType: 'medical_provider_user',
      targetId: parseInt(userId),
      targetName: `${reactivatedUser.first_name} ${reactivatedUser.last_name}`,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      success: true,
      message: 'User reactivated successfully'
    });
  } catch (error) {
    console.error('Reactivate user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reactivate user'
    });
  } finally {
    client.release();
  }
};
