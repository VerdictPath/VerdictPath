const express = require('express');
const router = express.Router();
const upload = require('../middleware/fileUpload');
const uploadController = require('../controllers/uploadController');
const { authenticateToken } = require('../middleware/auth');

// All upload routes require authentication
router.use(authenticateToken);

// Upload medical record
router.post('/medical-record', upload.single('file'), uploadController.uploadMedicalRecord);

// Upload medical bill
router.post('/medical-bill', upload.single('file'), uploadController.uploadMedicalBill);

// Upload evidence
router.post('/evidence', upload.single('file'), uploadController.uploadEvidence);

// Download file with authentication (HIPAA compliant)
router.get('/download/:type/:fileId', uploadController.downloadFile);

module.exports = router;
