const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET } = require('../middleware/auth');
const auditLogger = require('../services/auditLogger');
const { generateUniqueCode } = require('../utils/codeGenerator');

exports.createLawFirmUser = async (req, res) => {
  try {
    const lawFirmId = req.user.id;
    const requesterRole = req.user.lawFirmUserRole;
    const {
      firstName,
      lastName,
      email,
      password,
      role,
      permissions,
      phoneNumber,
      title,
      barNumber,
      department
    } = req.body;

    // Bootstrap scenario: allow creation if lawFirmUserId is -1 (no users exist yet)
    const isBootstrap = req.user.lawFirmUserId === -1;
    
    if (!isBootstrap) {
      const requesterResult = await db.query(
        'SELECT can_manage_users FROM law_firm_users WHERE id = $1',
        [req.user.lawFirmUserId]
      );

      if (requesterResult.rows.length === 0 || !requesterResult.rows[0].can_manage_users) {
        return res.status(403).json({ message: 'You do not have permission to create users' });
      }
    }

    const lawFirmResult = await db.query(
      'SELECT id, firm_code, max_users FROM law_firms WHERE id = $1',
      [lawFirmId]
    );

    if (lawFirmResult.rows.length === 0) {
      return res.status(404).json({ message: 'Law firm not found' });
    }

    const lawFirm = lawFirmResult.rows[0];

    const userCountResult = await db.query(
      'SELECT COUNT(*) as count FROM law_firm_users WHERE law_firm_id = $1 AND status != $2',
      [lawFirmId, 'deactivated']
    );

    const userCount = parseInt(userCountResult.rows[0].count);
    if (userCount >= lawFirm.max_users) {
      return res.status(403).json({ 
        message: `Maximum users (${lawFirm.max_users}) reached for your subscription tier. Please upgrade or deactivate existing users.` 
      });
    }

    const emailCheckResult = await db.query(
      'SELECT id FROM law_firm_users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (emailCheckResult.rows.length > 0) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let userCode = '';
    let isUnique = false;
    while (!isUnique) {
      const randomCode = generateUniqueCode(4);
      userCode = `${lawFirm.firm_code}-USER-${randomCode}`;
      const codeCheck = await db.query(
        'SELECT id FROM law_firm_users WHERE user_code = $1',
        [userCode]
      );
      isUnique = codeCheck.rows.length === 0;
    }

    const permissionsObj = permissions || {};
    const result = await db.query(
      `INSERT INTO law_firm_users (
        law_firm_id, first_name, last_name, email, password, user_code, role,
        can_manage_users, can_manage_clients, can_view_all_clients, 
        can_send_notifications, can_manage_disbursements, can_view_analytics, 
        can_manage_settings, phone_number, title, bar_number, department, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING id, law_firm_id, first_name, last_name, email, user_code, role, status, created_at`,
      [
        lawFirmId,
        firstName,
        lastName,
        email.toLowerCase(),
        hashedPassword,
        userCode,
        role || 'attorney',
        permissionsObj.canManageUsers || false,
        permissionsObj.canManageClients !== false,
        permissionsObj.canViewAllClients !== false,
        permissionsObj.canSendNotifications !== false,
        permissionsObj.canManageDisbursements || false,
        permissionsObj.canViewAnalytics !== false,
        permissionsObj.canManageSettings || false,
        phoneNumber || null,
        title || null,
        barNumber || null,
        department || null,
        isBootstrap ? null : req.user.lawFirmUserId
      ]
    );

    const newUser = result.rows[0];

    await auditLogger.log({
      actorId: isBootstrap ? null : req.user.lawFirmUserId,
      actorType: 'lawfirm_user',
      action: 'CREATE_USER',
      entityType: 'LawFirmUser',
      entityId: newUser.id,
      status: 'SUCCESS',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      metadata: { email: newUser.email, role: newUser.role, userCode: newUser.user_code, isBootstrap }
    });

    res.status(201).json({
      message: 'Law firm user created successfully',
      user: {
        id: newUser.id,
        firstName: newUser.first_name,
        lastName: newUser.last_name,
        email: newUser.email,
        userCode: newUser.user_code,
        role: newUser.role,
        status: newUser.status,
        createdAt: newUser.created_at
      }
    });
  } catch (error) {
    console.error('Error creating law firm user:', error);
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
};

exports.getLawFirmUsers = async (req, res) => {
  try {
    const lawFirmId = req.user.id;

    const result = await db.query(
      `SELECT 
        lfu.id, lfu.first_name, lfu.last_name, lfu.email, lfu.user_code, lfu.role,
        lfu.can_manage_users, lfu.can_manage_clients, lfu.can_view_all_clients,
        lfu.can_send_notifications, lfu.can_manage_disbursements, lfu.can_view_analytics,
        lfu.can_manage_settings, lfu.status, lfu.last_login, lfu.last_activity,
        lfu.phone_number, lfu.title, lfu.bar_number, lfu.department, lfu.created_at,
        creator.first_name as created_by_first_name, creator.last_name as created_by_last_name
      FROM law_firm_users lfu
      LEFT JOIN law_firm_users creator ON lfu.created_by = creator.id
      WHERE lfu.law_firm_id = $1 AND lfu.status != $2
      ORDER BY lfu.created_at DESC`,
      [lawFirmId, 'deactivated']
    );

    const users = result.rows.map(user => ({
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      userCode: user.user_code,
      role: user.role,
      permissions: {
        canManageUsers: user.can_manage_users,
        canManageClients: user.can_manage_clients,
        canViewAllClients: user.can_view_all_clients,
        canSendNotifications: user.can_send_notifications,
        canManageDisbursements: user.can_manage_disbursements,
        canViewAnalytics: user.can_view_analytics,
        canManageSettings: user.can_manage_settings
      },
      status: user.status,
      lastLogin: user.last_login,
      lastActivity: user.last_activity,
      phoneNumber: user.phone_number,
      title: user.title,
      barNumber: user.bar_number,
      department: user.department,
      createdAt: user.created_at,
      createdBy: user.created_by_first_name ? `${user.created_by_first_name} ${user.created_by_last_name}` : null
    }));

    res.json({ users });
  } catch (error) {
    console.error('Error fetching law firm users:', error);
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
};

exports.updateLawFirmUser = async (req, res) => {
  try {
    const lawFirmId = req.user.id;
    const { userId } = req.params;
    const {
      firstName,
      lastName,
      role,
      permissions,
      phoneNumber,
      title,
      barNumber,
      department,
      status
    } = req.body;

    const requesterResult = await db.query(
      'SELECT can_manage_users FROM law_firm_users WHERE id = $1',
      [req.user.lawFirmUserId]
    );

    if (requesterResult.rows.length === 0 || !requesterResult.rows[0].can_manage_users) {
      return res.status(403).json({ message: 'You do not have permission to update users' });
    }

    const userCheck = await db.query(
      'SELECT id FROM law_firm_users WHERE id = $1 AND law_firm_id = $2',
      [userId, lawFirmId]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const permissionsObj = permissions || {};
    const result = await db.query(
      `UPDATE law_firm_users SET
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        role = COALESCE($3, role),
        can_manage_users = COALESCE($4, can_manage_users),
        can_manage_clients = COALESCE($5, can_manage_clients),
        can_view_all_clients = COALESCE($6, can_view_all_clients),
        can_send_notifications = COALESCE($7, can_send_notifications),
        can_manage_disbursements = COALESCE($8, can_manage_disbursements),
        can_view_analytics = COALESCE($9, can_view_analytics),
        can_manage_settings = COALESCE($10, can_manage_settings),
        phone_number = COALESCE($11, phone_number),
        title = COALESCE($12, title),
        bar_number = COALESCE($13, bar_number),
        department = COALESCE($14, department),
        status = COALESCE($15, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $16 AND law_firm_id = $17
      RETURNING id, first_name, last_name, email, role, status`,
      [
        firstName,
        lastName,
        role,
        permissionsObj.canManageUsers,
        permissionsObj.canManageClients,
        permissionsObj.canViewAllClients,
        permissionsObj.canSendNotifications,
        permissionsObj.canManageDisbursements,
        permissionsObj.canViewAnalytics,
        permissionsObj.canManageSettings,
        phoneNumber,
        title,
        barNumber,
        department,
        status,
        userId,
        lawFirmId
      ]
    );

    const updatedUser = result.rows[0];

    await auditLogger.log({
      actorId: req.user.lawFirmUserId,
      actorType: 'lawfirm_user',
      action: 'UPDATE_USER',
      entityType: 'LawFirmUser',
      entityId: userId,
      status: 'SUCCESS',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      metadata: { updatedFields: Object.keys(req.body) }
    });

    res.json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating law firm user:', error);
    res.status(500).json({ message: 'Error updating user', error: error.message });
  }
};

exports.deactivateLawFirmUser = async (req, res) => {
  try {
    const lawFirmId = req.user.id;
    const { userId } = req.params;
    const { reason } = req.body;

    const requesterResult = await db.query(
      'SELECT can_manage_users FROM law_firm_users WHERE id = $1',
      [req.user.lawFirmUserId]
    );

    if (requesterResult.rows.length === 0 || !requesterResult.rows[0].can_manage_users) {
      return res.status(403).json({ message: 'You do not have permission to deactivate users' });
    }

    if (parseInt(userId) === req.user.lawFirmUserId) {
      return res.status(400).json({ message: 'You cannot deactivate yourself' });
    }

    const result = await db.query(
      `UPDATE law_firm_users SET
        status = 'deactivated',
        deactivated_at = CURRENT_TIMESTAMP,
        deactivated_by = $1,
        deactivation_reason = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND law_firm_id = $4 AND status != 'deactivated'
      RETURNING id, email`,
      [req.user.lawFirmUserId, reason || null, userId, lawFirmId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found or already deactivated' });
    }

    await auditLogger.log({
      actorId: req.user.lawFirmUserId,
      actorType: 'lawfirm_user',
      action: 'DEACTIVATE_USER',
      entityType: 'LawFirmUser',
      entityId: userId,
      status: 'SUCCESS',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      metadata: { reason }
    });

    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating law firm user:', error);
    res.status(500).json({ message: 'Error deactivating user', error: error.message });
  }
};

exports.reactivateLawFirmUser = async (req, res) => {
  try {
    const lawFirmId = req.user.id;
    const { userId } = req.params;

    const requesterResult = await db.query(
      'SELECT can_manage_users FROM law_firm_users WHERE id = $1',
      [req.user.lawFirmUserId]
    );

    if (requesterResult.rows.length === 0 || !requesterResult.rows[0].can_manage_users) {
      return res.status(403).json({ message: 'You do not have permission to reactivate users' });
    }

    const result = await db.query(
      `UPDATE law_firm_users SET
        status = 'active',
        deactivated_at = NULL,
        deactivated_by = NULL,
        deactivation_reason = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND law_firm_id = $2 AND status = 'deactivated'
      RETURNING id, email`,
      [userId, lawFirmId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found or not deactivated' });
    }

    await auditLogger.log({
      actorId: req.user.lawFirmUserId,
      actorType: 'lawfirm_user',
      action: 'REACTIVATE_USER',
      entityType: 'LawFirmUser',
      entityId: userId,
      status: 'SUCCESS',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent')
    });

    res.json({ message: 'User reactivated successfully' });
  } catch (error) {
    console.error('Error reactivating law firm user:', error);
    res.status(500).json({ message: 'Error reactivating user', error: error.message });
  }
};
