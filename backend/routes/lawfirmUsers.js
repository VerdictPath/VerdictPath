const express = require('express');
const router = express.Router();
const lawfirmUserController = require('../controllers/lawfirmUserController');
const { verifyAndRequirePermission, verifyAndRequireAdmin } = require('../middleware/lawFirmAuth');
const { logActivity } = require('../middleware/activityLogger');

// Create new law firm user (admin only)
router.post('/',
  ...verifyAndRequireAdmin,
  logActivity('user_created', 'user'),
  lawfirmUserController.createLawFirmUser
);

// Get all law firm users (all authenticated users)
router.get('/',
  ...verifyAndRequirePermission('canManageUsers'),
  lawfirmUserController.getLawFirmUsers
);

// Update law firm user (admin only)
router.put('/:userId',
  ...verifyAndRequireAdmin,
  logActivity('user_updated', 'user'),
  lawfirmUserController.updateLawFirmUser
);

// Deactivate law firm user (admin only)
router.post('/:userId/deactivate',
  ...verifyAndRequireAdmin,
  logActivity('user_deactivated', 'user'),
  lawfirmUserController.deactivateLawFirmUser
);

// Reactivate law firm user (admin only)
router.post('/:userId/reactivate',
  ...verifyAndRequireAdmin,
  logActivity('user_reactivated', 'user'),
  lawfirmUserController.reactivateLawFirmUser
);

module.exports = router;
