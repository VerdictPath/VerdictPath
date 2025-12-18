const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const upload = require('../middleware/fileUpload');
const uploadController = require('../controllers/uploadController');
const storageService = require('../services/storageService');
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

router.get('/my-evidence', async (req, res) => {
  try {
    const db = require('../config/db');
    const userId = req.user.id;
    
    const result = await db.query(
      `SELECT id, evidence_type, title, description, file_name, mime_type, uploaded_at 
       FROM evidence 
       WHERE user_id = $1 
       ORDER BY uploaded_at DESC`,
      [userId]
    );
    
    res.json({ evidence: result.rows });
  } catch (error) {
    console.error('Error fetching user evidence:', error);
    res.status(500).json({ error: 'Failed to fetch evidence' });
  }
});

router.get('/download/:type/:fileId', 
  burstProtectionLimiter,
  downloadRateLimiter,
  uploadController.downloadFile
);

router.get('/download/*', async (req, res) => {
  try {
    const localKey = req.params[0];
    
    if (!localKey || localKey.includes('..')) {
      return res.status(400).json({ error: 'Invalid file path' });
    }

    const filePath = storageService.getLocalFilePath(localKey);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.heic': 'image/heic',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };

    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    const fileName = path.basename(filePath);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error serving local file:', error);
    res.status(500).json({ error: 'Failed to serve file' });
  }
});

router.get('/stream/*', async (req, res) => {
  try {
    const localKey = req.params[0];
    
    if (!localKey || localKey.includes('..')) {
      return res.status(400).json({ error: 'Invalid file path' });
    }

    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const filePath = path.join(uploadsDir, localKey);

    if (!fs.existsSync(filePath)) {
      console.error(`[Stream] File not found: ${filePath}`);
      return res.status(404).json({ error: 'File not found' });
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.heic': 'image/heic',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };

    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    const fileName = path.basename(filePath);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error streaming local file:', error);
    res.status(500).json({ error: 'Failed to stream file' });
  }
});

module.exports = router;
