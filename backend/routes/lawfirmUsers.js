const express = require('express');
const router = express.Router();
const { authenticateToken, isLawFirm } = require('../middleware/auth');
const lawfirmUserController = require('../controllers/lawfirmUserController');

router.use(authenticateToken);
router.use(isLawFirm);

router.post('/users', lawfirmUserController.createLawFirmUser);
router.get('/users', lawfirmUserController.getLawFirmUsers);
router.put('/users/:userId', lawfirmUserController.updateLawFirmUser);
router.post('/users/:userId/deactivate', lawfirmUserController.deactivateLawFirmUser);
router.post('/users/:userId/reactivate', lawfirmUserController.reactivateLawFirmUser);

module.exports = router;
