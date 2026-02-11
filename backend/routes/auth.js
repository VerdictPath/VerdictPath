const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const changePasswordController = require('../controllers/changePasswordController');
const { checkAccountLockout } = require('../middleware/security');
const { authLimiter } = require('../middleware/rateLimiter');
const { authenticateToken } = require('../middleware/auth');

// SECURITY: Rate limiting on registration endpoints (prevent spam accounts)
router.post('/register/client', authLimiter, authController.registerClient);
router.post('/register/lawfirm', authLimiter, authController.registerLawFirm);
router.post('/register/medicalprovider', authLimiter, authController.registerMedicalProvider);
router.post('/join/medicalprovider', authLimiter, authController.joinMedicalProvider);

// SECURITY: Rate limiting + account lockout on login endpoints (prevent brute force)
router.post('/login', authLimiter, checkAccountLockout, authController.login);
router.post('/login/lawfirm-user', authLimiter, checkAccountLockout, authController.loginLawFirmUser);
router.post('/login/medicalprovider-user', authLimiter, checkAccountLockout, authController.loginMedicalProviderUser);

// Password change endpoint for first-time login
router.post('/change-password/first-login', authLimiter, changePasswordController.changePasswordFirstLogin);

// Password change endpoint for authenticated users
router.post('/change-password', authenticateToken, changePasswordController.changePassword);

// Forgot password - request reset link
router.post('/forgot-password', authLimiter, authController.forgotPassword);

// Reset password - set new password with token
router.post('/reset-password', authLimiter, authController.resetPassword);

// Verify reset token - check if token is valid
router.get('/verify-reset-token', authController.verifyResetToken);

// Token refresh - issue new token using valid existing token
router.post('/refresh-token', authenticateToken, authController.refreshToken);

module.exports = router;
