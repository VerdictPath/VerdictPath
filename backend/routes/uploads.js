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

// Stream route needs to handle auth via query param (for React Native Image component)
// So we'll handle auth manually in the route
const db = require('../config/db');

router.get('/stream/*', async (req, res) => {
  try {
    const token = req.query.token || req.headers.authorization?.replace('Bearer ', '');
    
    let decoded;
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const { JWT_SECRET } = require('../middleware/auth');
        decoded = jwt.verify(token, JWT_SECRET);
      } catch (tokenError) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
    } else {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const localKey = req.params[0];
    
    if (!localKey || localKey.includes('..') || localKey.startsWith('/') || /[<>|&;$`\\]/.test(localKey)) {
      return res.status(400).json({ error: 'Invalid file path' });
    }

    const uploadsDir = path.resolve(__dirname, '..', 'uploads');
    const filePath = path.resolve(uploadsDir, localKey);

    if (!filePath.startsWith(uploadsDir)) {
      return res.status(400).json({ error: 'Invalid file path' });
    }

    if (!fs.existsSync(filePath)) {
      console.error(`[Stream] File not found: ${filePath}`);
      return res.status(404).json({ error: 'File not found' });
    }

    const userId = decoded.id || decoded.userId;
    const userType = decoded.userType;
    const fileName = path.basename(localKey);
    const fileOwnerMatch = fileName.match(/^user[_]?(\d+)_/);
    
    let fileOwnerId = null;
    
    if (fileOwnerMatch) {
      fileOwnerId = parseInt(fileOwnerMatch[1]);
    } else {
      const dbLookup = await db.query(
        `SELECT user_id FROM (
          SELECT user_id, file_name FROM medical_records
          UNION ALL SELECT user_id, file_name FROM medical_billing
          UNION ALL SELECT user_id, file_name FROM evidence
        ) AS all_files WHERE file_name = $1 LIMIT 1`,
        [fileName]
      );
      if (dbLookup.rows.length > 0) {
        fileOwnerId = dbLookup.rows[0].user_id;
      }
    }
    
    if (fileOwnerId === null) {
      console.warn(`[Stream] Access denied: cannot determine owner for file ${fileName}`);
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (parseInt(fileOwnerId) !== parseInt(userId)) {
      let hasAccess = false;
      
      if (userType === 'lawfirm') {
        const clientCheck = await db.query(
          `SELECT 1 FROM law_firm_clients WHERE law_firm_id = $1 AND client_id = $2 LIMIT 1`,
          [userId, fileOwnerId]
        );
        hasAccess = clientCheck.rows.length > 0;
      } else if (userType === 'medical_provider') {
        const patientCheck = await db.query(
          `SELECT 1 FROM medical_provider_patients WHERE medical_provider_id = $1 AND patient_id = $2 LIMIT 1`,
          [userId, fileOwnerId]
        );
        hasAccess = patientCheck.rows.length > 0;
      }
      
      if (!hasAccess) {
        console.warn(`[Stream] Access denied: user ${userId} (${userType}) tried to access file owned by user ${fileOwnerId}`);
        return res.status(403).json({ error: 'Access denied' });
      }
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
    const streamFileName = path.basename(filePath);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${streamFileName}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(filePath);
  } catch (error) {
    console.error('Error streaming local file:', error);
    res.status(500).json({ error: 'Failed to stream file' });
  }
});

// All other routes require authentication
router.use(authenticateToken);

const multer = require('multer');

const handleMulterError = (req, res, next) => {
  return (err) => {
    if (err instanceof multer.MulterError) {
      console.error('[Upload] Multer error:', err.code, err.message);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Maximum size is 50MB.' });
      }
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      console.error('[Upload] File filter error:', err.message);
      return res.status(400).json({ error: err.message });
    }
    next();
  };
};

const wrapUpload = (uploadMiddleware) => (req, res, next) => {
  console.log('[Upload] Processing upload request:', req.path);
  uploadMiddleware(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      console.error('[Upload] Multer error:', err.code, err.message);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Maximum size is 50MB.' });
      }
      return res.status(400).json({ error: `Upload error: ${err.message}` });
    } else if (err) {
      console.error('[Upload] File filter error:', err.message);
      return res.status(400).json({ error: err.message });
    }
    console.log('[Upload] File received:', req.file ? { name: req.file.originalname, size: req.file.size, mime: req.file.mimetype } : 'NO FILE');
    next();
  });
};

router.post('/medical-record', 
  burstProtectionLimiter,
  uploadRateLimiter,
  strictUploadRateLimiter,
  wrapUpload(upload.single('file')), 
  uploadController.uploadMedicalRecord
);

router.post('/medical-bill', 
  burstProtectionLimiter,
  uploadRateLimiter,
  strictUploadRateLimiter,
  wrapUpload(upload.single('file')), 
  uploadController.uploadMedicalBill
);

router.post('/evidence', 
  burstProtectionLimiter,
  uploadRateLimiter,
  strictUploadRateLimiter,
  wrapUpload(upload.single('file')), 
  uploadController.uploadEvidence
);

router.get('/my-medical-records', uploadController.getMyMedicalRecords);
router.get('/my-medical-bills', uploadController.getMyMedicalBills);
router.get('/medical/:type/:id/view', uploadController.viewMedicalDocument);
router.get('/evidence/:id/view', uploadController.viewEvidenceDocument);
router.delete('/medical/:type/:id', uploadController.deleteMedicalDocument);

router.post('/client/:clientId/medical-record',
  burstProtectionLimiter,
  uploadRateLimiter,
  strictUploadRateLimiter,
  wrapUpload(upload.single('file')),
  uploadController.uploadMedicalRecordOnBehalf
);

router.post('/client/:clientId/medical-bill',
  burstProtectionLimiter,
  uploadRateLimiter,
  strictUploadRateLimiter,
  wrapUpload(upload.single('file')),
  uploadController.uploadMedicalBillOnBehalf
);

router.get('/client/:clientId/medical-records', uploadController.getClientMedicalRecords);
router.get('/client/:clientId/medical-bills', uploadController.getClientMedicalBills);

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
    
    if (!localKey || localKey.includes('..') || localKey.startsWith('/') || /[<>|&;$`\\]/.test(localKey)) {
      return res.status(400).json({ error: 'Invalid file path' });
    }

    const uploadsDir = path.resolve(__dirname, '..', 'uploads');
    const filePath = path.resolve(uploadsDir, localKey);

    if (!filePath.startsWith(uploadsDir)) {
      return res.status(400).json({ error: 'Invalid file path' });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const userId = req.user?.id || req.user?.userId;
    const userType = req.user?.userType;
    const dlFileName = path.basename(localKey);
    const dlOwnerMatch = dlFileName.match(/^user[_]?(\d+)_/);
    
    let dlFileOwnerId = null;
    
    if (dlOwnerMatch) {
      dlFileOwnerId = parseInt(dlOwnerMatch[1]);
    } else {
      const dbLookup = await db.query(
        `SELECT user_id FROM (
          SELECT user_id, file_name FROM medical_records
          UNION ALL SELECT user_id, file_name FROM medical_billing
          UNION ALL SELECT user_id, file_name FROM evidence
        ) AS all_files WHERE file_name = $1 LIMIT 1`,
        [dlFileName]
      );
      if (dbLookup.rows.length > 0) {
        dlFileOwnerId = dbLookup.rows[0].user_id;
      }
    }
    
    if (dlFileOwnerId === null) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (parseInt(dlFileOwnerId) !== parseInt(userId)) {
      let hasAccess = false;
      if (userType === 'lawfirm') {
        const check = await db.query(
          `SELECT 1 FROM law_firm_clients WHERE law_firm_id = $1 AND client_id = $2 LIMIT 1`,
          [userId, dlFileOwnerId]
        );
        hasAccess = check.rows.length > 0;
      } else if (userType === 'medical_provider') {
        const check = await db.query(
          `SELECT 1 FROM medical_provider_patients WHERE medical_provider_id = $1 AND patient_id = $2 LIMIT 1`,
          [userId, dlFileOwnerId]
        );
        hasAccess = check.rows.length > 0;
      }
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }
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

module.exports = router;
