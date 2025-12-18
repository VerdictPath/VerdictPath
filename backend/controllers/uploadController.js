const { pool } = require('../config/db');
const auditLogger = require('../services/auditLogger');
const documentAccessService = require('../services/documentAccessService');
const encryptionService = require('../services/encryption');
const storageService = require('../services/storageService');
const { validateFileContent } = require('../middleware/fileUpload');
const { sendDocumentUploadedEmail } = require('../services/emailService');
const path = require('path');
const fs = require('fs');

// Mapping of document types to litigation substage IDs
const DOCUMENT_TO_SUBSTAGE_MAP = {
  // Medical uploads
  'Medical Record': 'pre-9',
  'Medical Bill': 'pre-8',
  
  // Evidence types that map to specific substages
  'Police Report': 'pre-1',
  'Accident Report': 'pre-1',
  'Body Camera': 'pre-2',
  'Body Cam Footage': 'pre-2',
  'Dash Camera': 'pre-3',
  'Dash Cam Footage': 'pre-3',
  'Photos': 'pre-4',
  'Pictures': 'pre-4',
  'Accident Photos': 'pre-4',
  'Health Insurance': 'pre-5',
  'Insurance Card': 'pre-5'
};

// Helper function to auto-complete substages when documents are uploaded
const autoCompleteSubstage = async (userId, documentType) => {
  try {
    const substageId = DOCUMENT_TO_SUBSTAGE_MAP[documentType];
    
    if (!substageId) {
      // No matching substage for this document type
      return;
    }
    
    // Call the litigation substage completion API internally
    const result = await pool.query(
      `INSERT INTO litigation_substage_completions (user_id, substage_id, completed_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id, substage_id) DO NOTHING
       RETURNING *`,
      [userId, substageId]
    );
    
    if (result.rows.length > 0) {
      console.log(`Auto-completed substage ${substageId} for user ${userId} after uploading ${documentType}`);
      
      // Award coins for completing this substage
      const substageCoins = getSubstageCoins(substageId);
      
      if (substageCoins > 0) {
        await pool.query(
          `UPDATE users 
           SET total_coins = total_coins + $1 
           WHERE id = $2`,
          [substageCoins, userId]
        );
      }
      
      // Recalculate litigation progress (current stage, percentage, totals)
      await recalculateLitigationProgress(userId);
    }
  } catch (error) {
    console.error('Error auto-completing substage:', error);
    // Don't throw - document upload should succeed even if substage completion fails
  }
};

// Complete mapping of all 9 litigation stages and their substages
// Matches the authoritative schema in src/constants/mockData.js
const LITIGATION_STAGES_MAP = [
  { id: 1, name: 'Pre-Litigation', substages: ['pre-1', 'pre-2', 'pre-3', 'pre-4', 'pre-5', 'pre-6', 'pre-7', 'pre-8', 'pre-9', 'pre-10', 'pre-11'] },
  { id: 2, name: 'Complaint Filed', substages: ['cf-1', 'cf-2', 'cf-3', 'cf-4'] },
  { id: 3, name: 'Discovery Begins', substages: ['disc-1', 'disc-2', 'disc-3', 'disc-4', 'disc-5'] },
  { id: 4, name: 'Depositions', substages: ['dep-1', 'dep-2', 'dep-3', 'dep-4'] },
  { id: 5, name: 'Mediation', substages: ['med-1', 'med-2', 'med-3'] },
  { id: 6, name: 'Trial Prep', substages: ['tp-1', 'tp-2', 'tp-3', 'tp-4', 'tp-5'] },
  { id: 7, name: 'Trial', substages: ['trial-1', 'trial-2', 'trial-3', 'trial-4', 'trial-5', 'trial-6', 'trial-7', 'trial-8', 'trial-9', 'trial-10', 'trial-11', 'trial-12', 'trial-13', 'trial-14', 'trial-15', 'trial-16'] },
  { id: 8, name: 'Settlement', substages: ['settle-1', 'settle-2', 'settle-3', 'settle-4', 'settle-5', 'settle-6', 'settle-7', 'settle-8', 'settle-9', 'settle-10'] },
  { id: 9, name: 'Case Resolved', substages: ['cr-1', 'cr-2'] }
];
// Total substages: 11 + 4 + 5 + 4 + 3 + 5 + 16 + 10 + 2 = 60

// Recalculate litigation progress after substage completion
const recalculateLitigationProgress = async (userId) => {
  try {
    // Get all completed substages for this user
    const completedSubstages = await pool.query(
      `SELECT substage_id FROM litigation_substage_completions WHERE user_id = $1`,
      [userId]
    );
    
    const completedIds = completedSubstages.rows.map(row => row.substage_id);
    const totalCompleted = completedIds.length;
    
    // Determine current stage by checking which stages have all substages completed
    let currentStageId = 1;
    let currentStageName = 'Pre-Litigation';
    
    for (const stage of LITIGATION_STAGES_MAP) {
      const stageSubstages = stage.substages;
      const completedInStage = stageSubstages.filter(id => completedIds.includes(id)).length;
      
      if (completedInStage === stageSubstages.length && stage.id < 9) {
        // All substages in this stage are complete, move to next stage
        const nextStage = LITIGATION_STAGES_MAP[stage.id]; // Next stage (id is 0-indexed in array)
        if (nextStage) {
          currentStageId = nextStage.id;
          currentStageName = nextStage.name;
        }
      } else if (completedInStage > 0) {
        // Some substages in this stage are complete, this is the current stage
        currentStageId = stage.id;
        currentStageName = stage.name;
        break;
      }
    }
    
    // Special case: if all stages are complete, we're at Case Resolution
    const allStagesComplete = LITIGATION_STAGES_MAP.slice(0, 8).every(stage => 
      stage.substages.every(id => completedIds.includes(id))
    );
    if (allStagesComplete) {
      currentStageId = 9;
      currentStageName = 'Case Resolution';
    }
    
    // Calculate total substages across all 9 stages
    const totalSubstages = LITIGATION_STAGES_MAP.reduce((sum, stage) => sum + stage.substages.length, 0);
    
    // Calculate overall progress percentage
    const progressPercentage = Math.min(100, Math.round((totalCompleted / totalSubstages) * 100));
    
    // Calculate total coins earned from substages
    const totalCoinsEarned = completedIds.reduce((sum, id) => sum + getSubstageCoins(id), 0);
    
    // Update user_litigation_progress with recalculated values
    await pool.query(
      `INSERT INTO user_litigation_progress 
         (user_id, current_stage_id, current_stage_name, progress_percentage, total_coins_earned, total_substages_completed, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (user_id) DO UPDATE 
       SET current_stage_id = $2,
           current_stage_name = $3,
           progress_percentage = $4,
           total_coins_earned = $5,
           total_substages_completed = $6,
           updated_at = NOW()`,
      [userId, currentStageId, currentStageName, progressPercentage, totalCoinsEarned, totalCompleted]
    );
    
    console.log(`Recalculated litigation progress for user ${userId}: Stage ${currentStageId} (${currentStageName}), ${progressPercentage}% complete, ${totalCompleted}/${totalSubstages} substages`);
  } catch (error) {
    console.error('Error recalculating litigation progress:', error);
  }
};

// Helper to get coin rewards for each substage
const getSubstageCoins = (substageId) => {
  const coinMap = {
    'pre-1': 10, 'pre-2': 10, 'pre-3': 10, 'pre-4': 5, 'pre-5': 5,
    'pre-6': 5, 'pre-7': 5, 'pre-8': 15, 'pre-9': 35, 'pre-10': 15, 'pre-11': 10
  };
  return coinMap[substageId] || 0;
};

// Upload medical records
const uploadMedicalRecord = async (req, res) => {
  try {
    const userId = req.user.id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const validation = await validateFileContent(file.buffer, file.mimetype, file.originalname);
    if (!validation.valid) {
      await auditLogger.log({
        userId,
        action: 'UPLOAD_REJECTED',
        resourceType: 'medical_record',
        details: {
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          rejectionReasons: validation.errors,
          fileHash: validation.fileHash
        },
        ipAddress: req.ip
      });
      return res.status(400).json({ 
        error: 'File validation failed',
        details: validation.errors
      });
    }

    const { recordType, facilityName, providerName, dateOfService, description } = req.body;

    const uploadResult = await storageService.uploadFile(
      file.buffer,
      userId,
      'medical-records',
      file.originalname,
      file.mimetype
    );

    const result = await pool.query(
      `INSERT INTO medical_records 
       (user_id, record_type, facility_name, provider_name, date_of_service, description, 
        document_url, file_name, file_size, mime_type, s3_bucket, s3_key, s3_region, s3_etag, storage_type) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) 
       RETURNING *`,
      [
        userId,
        recordType || 'Medical Record',
        facilityName || null,
        providerName || null,
        dateOfService || null,
        description || null,
        uploadResult.location,
        file.originalname,
        uploadResult.fileSize,
        uploadResult.mimeType,
        uploadResult.bucket,
        uploadResult.key,
        uploadResult.region,
        uploadResult.etag,
        uploadResult.storageType
      ]
    );

    await auditLogger.log({
      userId,
      action: 'UPLOAD_MEDICAL_RECORD',
      resourceType: 'medical_record',
      resourceId: result.rows[0].id,
      details: {
        fileName: file.originalname,
        fileSize: uploadResult.fileSize,
        recordType: recordType || 'Medical Record',
        storageKey: uploadResult.key,
        storageType: uploadResult.storageType
      },
      ipAddress: req.ip
    });

    const lawFirmQuery = await pool.query(
      `SELECT lf.id, lf.email, lf.firm_name 
       FROM law_firms lf 
       JOIN law_firm_clients lfc ON lfc.law_firm_id = lf.id 
       WHERE lfc.client_id = $1`,
      [userId]
    );
    
    if (lawFirmQuery.rows[0]) {
      await documentAccessService.createDocumentNotification(
        userId,
        lawFirmQuery.rows[0].id,
        'medical_records',
        result.rows[0].id,
        userId,
        'client'
      );

      // Send email notification to law firm (non-blocking)
      if (lawFirmQuery.rows[0].email) {
        const uploaderResult = await pool.query(
          'SELECT first_name, last_name FROM users WHERE id = $1',
          [userId]
        );
        const uploaderName = uploaderResult.rows[0] 
          ? `${uploaderResult.rows[0].first_name} ${uploaderResult.rows[0].last_name}` 
          : 'Client';
        
        sendDocumentUploadedEmail(
          lawFirmQuery.rows[0].email,
          lawFirmQuery.rows[0].firm_name || 'Law Firm',
          uploaderName,
          recordType || 'Medical Record',
          file.originalname
        ).catch(err => console.error('Error sending document upload email:', err));
      }
    }

    await autoCompleteSubstage(userId, 'Medical Record');

    res.json({
      success: true,
      message: `Medical record uploaded successfully (${uploadResult.storageType})`,
      document: result.rows[0],
      location: uploadResult.location,
      storageType: uploadResult.storageType,
      substageCompleted: true
    });
  } catch (error) {
    console.error('Error uploading medical record:', error);
    res.status(500).json({ error: 'Failed to upload medical record' });
  }
};

// Upload medical bills
const uploadMedicalBill = async (req, res) => {
  try {
    const userId = req.user.id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const validation = await validateFileContent(file.buffer, file.mimetype, file.originalname);
    if (!validation.valid) {
      await auditLogger.log({
        userId,
        action: 'UPLOAD_REJECTED',
        resourceType: 'medical_billing',
        details: {
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          rejectionReasons: validation.errors,
          fileHash: validation.fileHash
        },
        ipAddress: req.ip
      });
      return res.status(400).json({ 
        error: 'File validation failed',
        details: validation.errors
      });
    }

    const { 
      billingType, 
      facilityName, 
      billNumber, 
      dateOfService, 
      billDate,
      totalAmount,
      description 
    } = req.body;

    const uploadResult = await storageService.uploadFile(
      file.buffer,
      userId,
      'medical-bills',
      file.originalname,
      file.mimetype
    );

    const result = await pool.query(
      `INSERT INTO medical_billing 
       (user_id, billing_type, facility_name, bill_number, date_of_service, bill_date,
        total_amount, amount_due, description, document_url, file_name, file_size, mime_type, s3_bucket, s3_key, s3_region, s3_etag, storage_type) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) 
       RETURNING *`,
      [
        userId,
        billingType || 'Medical Bill',
        facilityName || null,
        billNumber || null,
        dateOfService || null,
        billDate || null,
        totalAmount || 0,
        totalAmount || 0,
        description || null,
        uploadResult.location,
        file.originalname,
        uploadResult.fileSize,
        uploadResult.mimeType,
        uploadResult.bucket,
        uploadResult.key,
        uploadResult.region,
        uploadResult.etag,
        uploadResult.storageType
      ]
    );

    await auditLogger.log({
      userId,
      action: 'UPLOAD_MEDICAL_BILL',
      resourceType: 'medical_billing',
      resourceId: result.rows[0].id,
      details: {
        fileName: file.originalname,
        fileSize: uploadResult.fileSize,
        billingType: billingType || 'Medical Bill',
        storageKey: uploadResult.key,
        storageType: uploadResult.storageType
      },
      ipAddress: req.ip
    });

    const lawFirmQuery = await pool.query(
      `SELECT connected_law_firm_id FROM users WHERE id = $1`,
      [userId]
    );
    
    if (lawFirmQuery.rows[0]?.connected_law_firm_id) {
      await documentAccessService.createDocumentNotification(
        userId,
        lawFirmQuery.rows[0].connected_law_firm_id,
        'medical_billing',
        result.rows[0].id,
        userId,
        'client'
      );
    }

    await autoCompleteSubstage(userId, 'Medical Bill');

    res.json({
      success: true,
      message: `Medical bill uploaded successfully (${uploadResult.storageType})`,
      document: result.rows[0],
      location: uploadResult.location,
      storageType: uploadResult.storageType,
      substageCompleted: true
    });
  } catch (error) {
    console.error('Error uploading medical bill:', error);
    res.status(500).json({ error: 'Failed to upload medical bill' });
  }
};

// Upload evidence document
const uploadEvidence = async (req, res) => {
  try {
    const userId = req.user.id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const validation = await validateFileContent(file.buffer, file.mimetype, file.originalname);
    if (!validation.valid) {
      await auditLogger.log({
        userId,
        action: 'UPLOAD_REJECTED',
        resourceType: 'evidence',
        details: {
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          rejectionReasons: validation.errors,
          fileHash: validation.fileHash
        },
        ipAddress: req.ip
      });
      return res.status(400).json({ 
        error: 'File validation failed',
        details: validation.errors
      });
    }

    const { 
      evidenceType, 
      title, 
      description, 
      dateOfIncident, 
      location 
    } = req.body;

    const uploadResult = await storageService.uploadFile(
      file.buffer,
      userId,
      'evidence',
      file.originalname,
      file.mimetype
    );

    const titleValue = title || file.originalname;
    const titleEncrypted = encryptionService.encrypt(titleValue);
    const descriptionEncrypted = description ? encryptionService.encrypt(description) : null;
    const locationEncrypted = location ? encryptionService.encrypt(location) : null;

    const result = await pool.query(
      `INSERT INTO evidence 
       (user_id, evidence_type, title, description, date_of_incident, location,
        title_encrypted, description_encrypted, location_encrypted,
        document_url, file_name, file_size, mime_type, s3_bucket, s3_key, s3_region, s3_etag, storage_type) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) 
       RETURNING *`,
      [
        userId,
        evidenceType || 'Document',
        titleValue,
        description || null,
        dateOfIncident || null,
        location || null,
        titleEncrypted,
        descriptionEncrypted,
        locationEncrypted,
        uploadResult.location,
        file.originalname,
        uploadResult.fileSize,
        uploadResult.mimeType,
        uploadResult.bucket,
        uploadResult.key,
        uploadResult.region,
        uploadResult.etag,
        uploadResult.storageType
      ]
    );

    await auditLogger.log({
      userId,
      action: 'UPLOAD_EVIDENCE',
      resourceType: 'evidence',
      resourceId: result.rows[0].id,
      details: {
        fileName: file.originalname,
        fileSize: uploadResult.fileSize,
        evidenceType: evidenceType || 'Document',
        storageKey: uploadResult.key,
        storageType: uploadResult.storageType
      },
      ipAddress: req.ip
    });

    const lawFirmQuery = await pool.query(
      `SELECT connected_law_firm_id FROM users WHERE id = $1`,
      [userId]
    );
    
    if (lawFirmQuery.rows[0]?.connected_law_firm_id) {
      await documentAccessService.createDocumentNotification(
        userId,
        lawFirmQuery.rows[0].connected_law_firm_id,
        'evidence',
        result.rows[0].id,
        userId,
        'client'
      );
    }

    await autoCompleteSubstage(userId, evidenceType || title || 'Document');

    res.json({
      success: true,
      message: `Evidence uploaded successfully (${uploadResult.storageType})`,
      document: result.rows[0],
      location: uploadResult.location,
      storageType: uploadResult.storageType,
      substageCompleted: true
    });
  } catch (error) {
    console.error('Error uploading evidence:', error);
    res.status(500).json({ error: 'Failed to upload evidence' });
  }
};

// Download file with authentication and authorization (returns presigned URL)
const downloadFile = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.userType;
    const { fileId, type } = req.params;

    let documentType;
    
    switch(type) {
      case 'medical-record':
        documentType = 'medical_records';
        break;
      case 'medical-bill':
        documentType = 'medical_billing';
        break;
      case 'evidence':
        documentType = 'evidence';
        break;
      default:
        return res.status(400).json({ error: 'Invalid file type' });
    }

    let document;
    let patientId;
    let accessReason;

    const ownerCheck = await pool.query(
      `SELECT * FROM ${documentType} WHERE id = $1 AND user_id = $2`,
      [fileId, userId]
    );

    if (ownerCheck.rows.length > 0) {
      document = ownerCheck.rows[0];
      patientId = userId;
      accessReason = 'OWNER_ACCESS';
    } 
    else if (userType === 'lawfirm' || userType === 'law_firm') {
      const lawFirmResult = await pool.query(
        `SELECT id FROM law_firms WHERE email = $1`,
        [req.user.email]
      );

      if (lawFirmResult.rows.length === 0) {
        await documentAccessService.logDocumentAccess({
          userId, userType, documentType, documentId: fileId,
          action: 'VIEW', success: false, failureReason: 'Law firm not found',
          ipAddress: req.ip, userAgent: req.get('User-Agent')
        });
        return res.status(403).json({ error: 'Law firm not found' });
      }

      const lawFirmId = lawFirmResult.rows[0].id;
      
      const docResult = await pool.query(
        `SELECT user_id FROM ${documentType} WHERE id = $1`,
        [fileId]
      );

      if (docResult.rows.length === 0) {
        await documentAccessService.logDocumentAccess({
          userId, userType, documentType, documentId: fileId,
          action: 'VIEW', success: false, failureReason: 'Document not found',
          ipAddress: req.ip, userAgent: req.get('User-Agent')
        });
        return res.status(404).json({ error: 'Document not found' });
      }

      patientId = docResult.rows[0].user_id;

      const authResult = await documentAccessService.authorizeLawFirmDocumentAccess(
        lawFirmId,
        patientId,
        documentType,
        fileId
      );

      if (!authResult.authorized) {
        await documentAccessService.logDocumentAccess({
          userId, userType, documentType, documentId: fileId, patientId,
          action: 'VIEW', success: false, failureReason: authResult.reason,
          ipAddress: req.ip, userAgent: req.get('User-Agent')
        });
        return res.status(403).json({ 
          error: 'Access denied',
          reason: authResult.reason
        });
      }

      document = authResult.document;
      accessReason = `LAW_FIRM_ACCESS_${authResult.consentType}`;
    }
    else if (userType === 'medical_provider') {
      const providerResult = await pool.query(
        `SELECT id FROM medical_providers WHERE email = $1`,
        [req.user.email]
      );

      if (providerResult.rows.length === 0) {
        await documentAccessService.logDocumentAccess({
          userId, userType, documentType, documentId: fileId,
          action: 'VIEW', success: false, failureReason: 'Medical provider not found',
          ipAddress: req.ip, userAgent: req.get('User-Agent')
        });
        return res.status(403).json({ error: 'Medical provider not found' });
      }

      const providerId = providerResult.rows[0].id;
      
      const docResult = await pool.query(
        `SELECT user_id FROM ${documentType} WHERE id = $1`,
        [fileId]
      );

      if (docResult.rows.length === 0) {
        await documentAccessService.logDocumentAccess({
          userId, userType, documentType, documentId: fileId,
          action: 'VIEW', success: false, failureReason: 'Document not found',
          ipAddress: req.ip, userAgent: req.get('User-Agent')
        });
        return res.status(404).json({ error: 'Document not found' });
      }

      patientId = docResult.rows[0].user_id;

      const authResult = await documentAccessService.authorizeMedicalProviderDocumentAccess(
        providerId,
        patientId,
        documentType,
        fileId
      );

      if (!authResult.authorized) {
        await documentAccessService.logDocumentAccess({
          userId, userType, documentType, documentId: fileId, patientId,
          action: 'VIEW', success: false, failureReason: authResult.reason,
          ipAddress: req.ip, userAgent: req.get('User-Agent')
        });
        return res.status(403).json({ 
          error: 'Access denied',
          reason: authResult.reason
        });
      }

      document = authResult.document;
      accessReason = `MEDICAL_PROVIDER_ACCESS_${authResult.consentType}`;
    }
    else {
      await documentAccessService.logDocumentAccess({
        userId, userType, documentType, documentId: fileId,
        action: 'VIEW', success: false, failureReason: 'Invalid user type',
        ipAddress: req.ip, userAgent: req.get('User-Agent')
      });
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!document.s3_key || document.storage_type === 'local') {
      const fileKey = document.s3_key || document.document_url?.replace('/uploads/', '');
      const filePath = path.resolve(__dirname, '..', 'uploads', fileKey);
      
      if (!fs.existsSync(filePath)) {
        console.error(`[Download] File not found: ${filePath}`);
        return res.status(404).json({ error: 'File not found on server' });
      }

      await Promise.all([
        auditLogger.log({
          userId,
          action: 'DOWNLOAD_FILE',
          resourceType: documentType,
          resourceId: fileId,
          details: {
            fileName: document.file_name,
            fileType: type,
            accessReason: accessReason,
            patientId: patientId,
            accessedBy: userType,
            storageType: 'local'
          },
          ipAddress: req.ip,
          targetUserId: patientId
        }),
        documentAccessService.logDocumentAccess({
          userId, userType, documentType, documentId: fileId, patientId,
          action: 'DOWNLOAD', accessReason, success: true,
          ipAddress: req.ip, userAgent: req.get('User-Agent')
        })
      ]);

      const localUrl = `/api/uploads/stream/${fileKey}`;
      
      return res.json({
        success: true,
        presignedUrl: localUrl,
        fileName: document.file_name,
        mimeType: document.mime_type,
        fileSize: document.file_size,
        expiresIn: null,
        expiresAt: null,
        storageType: 'local'
      });
    }

    const presignedUrlData = await storageService.generateDownloadUrl(
      document.s3_key,
      300,
      document.file_name,
      document.storage_type || 's3'
    );

    await Promise.all([
      auditLogger.log({
        userId,
        action: 'DOWNLOAD_FILE',
        resourceType: documentType,
        resourceId: fileId,
        details: {
          fileName: document.file_name,
          fileType: type,
          accessReason: accessReason,
          patientId: patientId,
          accessedBy: userType,
          s3Key: document.s3_key,
          s3Bucket: document.s3_bucket,
          storageType: 's3',
          presignedUrlExpiry: presignedUrlData.expiresAt
        },
        ipAddress: req.ip,
        targetUserId: patientId
      }),
      documentAccessService.logDocumentAccess({
        userId, userType, documentType, documentId: fileId, patientId,
        action: 'GENERATE_PRESIGNED_URL', accessReason, success: true,
        ipAddress: req.ip, userAgent: req.get('User-Agent')
      })
    ]);

    res.json({
      success: true,
      presignedUrl: presignedUrlData.url,
      fileName: document.file_name,
      mimeType: document.mime_type,
      fileSize: document.file_size,
      expiresIn: presignedUrlData.expiresIn,
      expiresAt: presignedUrlData.expiresAt
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
};

module.exports = {
  uploadMedicalRecord,
  uploadMedicalBill,
  uploadEvidence,
  downloadFile
};
