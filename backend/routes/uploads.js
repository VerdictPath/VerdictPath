const express = require('express');
const router = express.Router();
const upload = require('../middleware/fileUpload');
const uploadController = require('../controllers/uploadController');
const { authenticateToken } = require('../middleware/auth');
const { 
  uploadRateLimiter, 
  downloadRateLimiter, 
  strictUploadRateLimiter,
  burstProtectionLimiter 
} = require('../middleware/uploadRateLimiter');

router.use(authenticateToken);

router.post('/medical-record', 
  burstProtectionLimiter,
  uploadRateLimiter,
  strictUploadRateLimiter,
  upload.single('file'), 
  uploadController.uploadMedicalRecord
);

router.post('/medical-bill', 
  burstProtectionLimiter,
  uploadRateLimiter,
  strictUploadRateLimiter,
  upload.single('file'), 
  uploadController.uploadMedicalBill
);

router.post('/evidence', 
  burstProtectionLimiter,
  uploadRateLimiter,
  strictUploadRateLimiter,
  upload.single('file'), 
  uploadController.uploadEvidence
);

router.get('/download/:type/:fileId', 
  burstProtectionLimiter,
  downloadRateLimiter,
  uploadController.downloadFile
);

module.exports = router;
