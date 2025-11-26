const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET } = require('../middleware/auth');
const auditLogger = require('../services/auditLogger');
const { sendPasswordChangeConfirmation } = require('../services/emailService');
const { sendPasswordChangeSMS } = require('../services/smsService');
const { validatePasswordComplexity } = require('../utils/passwordValidator');

exports.changePasswordFirstLogin = async (req, res) => {
  try {
    const { changePasswordToken, newPassword } = req.body;

    if (!changePasswordToken || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Change password token and new password are required' 
      });
    }

    const passwordValidation = validatePasswordComplexity(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message,
        errors: passwordValidation.errors
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(changePasswordToken, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    if (!decoded.mustChangePassword || !decoded.tempAuth) {
      return res.status(403).json({
        success: false,
        message: 'This token is not valid for password change'
      });
    }

    const userId = decoded.id;
    const userType = decoded.userType;
    const email = decoded.email;

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    let updateQuery;
    let userResult;
    let userName;
    let phoneNumber;

    if (userType === 'lawfirm') {
      updateQuery = `
        UPDATE law_firm_users 
        SET password = $1, 
            must_change_password = FALSE, 
            temporary_password_expires_at = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING id, email, first_name, last_name, phone_number
      `;
      userResult = await db.query(updateQuery, [hashedPassword, userId]);
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const user = userResult.rows[0];
      userName = `${user.first_name} ${user.last_name}`;
      phoneNumber = user.phone_number;

    } else if (userType === 'medical_provider') {
      updateQuery = `
        UPDATE medical_provider_users 
        SET password = $1, 
            must_change_password = FALSE, 
            temporary_password_expires_at = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING id, email, first_name, last_name, phone_number
      `;
      userResult = await db.query(updateQuery, [hashedPassword, userId]);
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const user = userResult.rows[0];
      userName = `${user.first_name} ${user.last_name}`;
      phoneNumber = user.phone_number;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid user type for password change'
      });
    }

    await auditLogger.log({
      actorId: userId,
      actorType: userType === 'lawfirm' ? 'lawfirm' : 'medical_provider',
      action: 'PASSWORD_CHANGED',
      entityType: userType === 'lawfirm' ? 'LawFirmUser' : 'MedicalProviderUser',
      entityId: userId,
      status: 'SUCCESS',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      metadata: { firstLogin: true }
    });

    await sendPasswordChangeConfirmation(email, userName, userType);
    
    if (phoneNumber) {
      await sendPasswordChangeSMS(phoneNumber, userName);
    }

    const token = jwt.sign(
      { 
        id: userId,
        email: email,
        userType: userType
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
      token,
      user: {
        id: userId,
        email: email
      }
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error changing password', 
      error: error.message 
    });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.lawFirmUserId || req.user.medicalProviderUserId;
    const userType = req.user.userType;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Current password and new password are required' 
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password'
      });
    }

    const passwordValidation = validatePasswordComplexity(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message,
        errors: passwordValidation.errors
      });
    }

    let userResult;
    let userName;
    let phoneNumber;
    let email;

    if (userType === 'lawfirm') {
      userResult = await db.query(
        'SELECT id, email, password, first_name, last_name, phone_number FROM law_firm_users WHERE id = $1',
        [userId]
      );
    } else if (userType === 'medical_provider') {
      userResult = await db.query(
        'SELECT id, email, password, first_name, last_name, phone_number FROM medical_provider_users WHERE id = $1',
        [userId]
      );
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid user type'
      });
    }

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = userResult.rows[0];
    userName = `${user.first_name} ${user.last_name}`;
    phoneNumber = user.phone_number;
    email = user.email;

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    let updateQuery;
    if (userType === 'lawfirm') {
      updateQuery = `
        UPDATE law_firm_users 
        SET password = $1, 
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `;
    } else {
      updateQuery = `
        UPDATE medical_provider_users 
        SET password = $1, 
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `;
    }

    await db.query(updateQuery, [hashedPassword, userId]);

    await auditLogger.log({
      actorId: userId,
      actorType: userType === 'lawfirm' ? 'lawfirm' : 'medical_provider',
      action: 'PASSWORD_CHANGED',
      entityType: userType === 'lawfirm' ? 'LawFirmUser' : 'MedicalProviderUser',
      entityId: userId,
      status: 'SUCCESS',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      metadata: { voluntaryChange: true }
    });

    await sendPasswordChangeConfirmation(email, userName, userType);
    
    if (phoneNumber) {
      await sendPasswordChangeSMS(phoneNumber, userName);
    }

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error changing password', 
      error: error.message 
    });
  }
};
