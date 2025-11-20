const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { checkAccountLockout } = require('../middleware/security');

router.post('/register/client', authController.registerClient);
router.post('/register/lawfirm', authController.registerLawFirm);
router.post('/register/medicalprovider', authController.registerMedicalProvider);

// HIPAA: Add account lockout middleware to login route
router.post('/login', checkAccountLockout, authController.login);
router.post('/login/lawfirm-user', checkAccountLockout, authController.loginLawFirmUser);

module.exports = router;
