const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/register/client', authController.registerClient);
router.post('/register/lawfirm', authController.registerLawFirm);
router.post('/login', authController.login);

module.exports = router;
