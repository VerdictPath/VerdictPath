const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const changePasswordController = require('../controllers/changePasswordController');
const { checkAccountLockout } = require('../middleware/security');
const { authLimiter } = require('../middleware/rateLimiter');

// SECURITY: Rate limiting on registration endpoints (prevent spam accounts)
router.post('/register/client', authLimiter, authController.registerClient);
router.post('/register/lawfirm', authLimiter, authController.registerLawFirm);
router.post('/register/medicalprovider', authLimiter, authController.registerMedicalProvider);

// SECURITY: Rate limiting + account lockout on login endpoints (prevent brute force)
router.post('/login', authLimiter, checkAccountLockout, authController.login);
router.post('/login/lawfirm-user', authLimiter, checkAccountLockout, authController.loginLawFirmUser);
router.post('/login/medicalprovider-user', authLimiter, checkAccountLockout, authController.loginMedicalProviderUser);

// Password change endpoint for first-time login
router.post('/change-password/first-login', authLimiter, changePasswordController.changePasswordFirstLogin);

module.exports = router;
