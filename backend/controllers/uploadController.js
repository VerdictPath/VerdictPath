const { pool } = require('../config/db');
const auditLogger = require('../services/auditLogger');
const documentAccessService = require('../services/documentAccessService');
const encryptionService = require('../services/encryption');
const storageService = require('../services/storageService');
const { validateFileContent } = require('../middleware/fileUpload');
const { sendDocumentUploadedEmail } = require('../services/emailService');
const path = require('path');
const fs = require('fs');

const getMedicalProviderId = async (reqUser) => {
  if (reqUser.isMedicalProviderUser) {
    return reqUser.id;
  }
  const result = await pool.query('SELECT id FROM medical_providers WHERE email = $1', [reqUser.email]);
  return result.rows.length > 0 ? result.rows[0].id : null;
};

// Mapping of document types to litigation substage IDs (includes all substage IDs from RoadmapScreen)
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
  'Insurance Card': 'pre-5',
  
  // Pre-Litigation substages
  'pre-1': 'pre-1', 'pre-2': 'pre-2', 'pre-3': 'pre-3', 'pre-4': 'pre-4', 'pre-5': 'pre-5',
  'pre-6': 'pre-6', 'pre-7': 'pre-7', 'pre-8': 'pre-8', 'pre-9': 'pre-9', 'pre-10': 'pre-10', 'pre-11': 'pre-11',
  
  // Complaint Filed substages
  'cf-1': 'cf-1', 'cf-2': 'cf-2', 'cf-3': 'cf-3', 'cf-4': 'cf-4',
  
  // Discovery substages
  'disc-1': 'disc-1', 'disc-2': 'disc-2', 'disc-3': 'disc-3', 'disc-4': 'disc-4', 'disc-5': 'disc-5',
  
  // Depositions substages
  'dep-1': 'dep-1', 'dep-2': 'dep-2', 'dep-3': 'dep-3', 'dep-4': 'dep-4',
  
  // Mediation substages
  'med-1': 'med-1', 'med-2': 'med-2', 'med-3': 'med-3',
  
  // Trial Prep substages
  'tp-1': 'tp-1', 'tp-2': 'tp-2', 'tp-3': 'tp-3', 'tp-4': 'tp-4', 'tp-5': 'tp-5',
  
  // Trial substages
  'trial-1': 'trial-1', 'trial-2': 'trial-2', 'trial-3': 'trial-3', 'trial-4': 'trial-4',
  'trial-5': 'trial-5', 'trial-6': 'trial-6', 'trial-7': 'trial-7', 'trial-8': 'trial-8',
  'trial-9': 'trial-9', 'trial-10': 'trial-10', 'trial-11': 'trial-11', 'trial-12': 'trial-12',
  'trial-13': 'trial-13', 'trial-14': 'trial-14', 'trial-15': 'trial-15', 'trial-16': 'trial-16',
  
  // Settlement substages
  'settle-1': 'settle-1', 'settle-2': 'settle-2', 'settle-3': 'settle-3', 'settle-4': 'settle-4',
  'settle-5': 'settle-5', 'settle-6': 'settle-6', 'settle-7': 'settle-7', 'settle-8': 'settle-8',
  'settle-9': 'settle-9', 'settle-10': 'settle-10',
  
  // Case Resolved substages
  'cr-1': 'cr-1', 'cr-2': 'cr-2'
};

// Complete substage metadata for all 60 substages across 9 stages
const SUBSTAGE_METADATA = {
  // Stage 1: Pre-Litigation (11 substages)
  'pre-1': { stageId: 1, stageName: 'Pre-Litigation', substageName: 'Police Report', substageType: 'upload' },
  'pre-2': { stageId: 1, stageName: 'Pre-Litigation', substageName: 'Body Cam Footage', substageType: 'upload' },
  'pre-3': { stageId: 1, stageName: 'Pre-Litigation', substageName: 'Dash Cam Footage', substageType: 'upload' },
  'pre-4': { stageId: 1, stageName: 'Pre-Litigation', substageName: 'Pictures', substageType: 'upload' },
  'pre-5': { stageId: 1, stageName: 'Pre-Litigation', substageName: 'Health Insurance Card', substageType: 'upload' },
  'pre-6': { stageId: 1, stageName: 'Pre-Litigation', substageName: 'Auto Insurance Company', substageType: 'data_entry' },
  'pre-7': { stageId: 1, stageName: 'Pre-Litigation', substageName: 'Auto Insurance Policy Number', substageType: 'data_entry' },
  'pre-8': { stageId: 1, stageName: 'Pre-Litigation', substageName: 'Medical Bills', substageType: 'upload' },
  'pre-9': { stageId: 1, stageName: 'Pre-Litigation', substageName: 'Medical Records', substageType: 'upload' },
  'pre-10': { stageId: 1, stageName: 'Pre-Litigation', substageName: 'Demand Sent', substageType: 'upload' },
  'pre-11': { stageId: 1, stageName: 'Pre-Litigation', substageName: 'Demand Rejected', substageType: 'upload' },
  
  // Stage 2: Complaint Filed (4 substages)
  'cf-1': { stageId: 2, stageName: 'Complaint Filed', substageName: 'Draft Complaint', substageType: 'task' },
  'cf-2': { stageId: 2, stageName: 'Complaint Filed', substageName: 'File with Court', substageType: 'task' },
  'cf-3': { stageId: 2, stageName: 'Complaint Filed', substageName: 'Serve Defendant', substageType: 'task' },
  'cf-4': { stageId: 2, stageName: 'Complaint Filed', substageName: 'Answer Filed', substageType: 'task' },
  
  // Stage 3: Discovery Begins (5 substages)
  'disc-1': { stageId: 3, stageName: 'Discovery Begins', substageName: 'Interrogatories', substageType: 'task' },
  'disc-2': { stageId: 3, stageName: 'Discovery Begins', substageName: 'Request for Production of Documents', substageType: 'task' },
  'disc-3': { stageId: 3, stageName: 'Discovery Begins', substageName: 'Request for Admissions', substageType: 'task' },
  'disc-4': { stageId: 3, stageName: 'Discovery Begins', substageName: 'Entry Upon Land for Inspection', substageType: 'task' },
  'disc-5': { stageId: 3, stageName: 'Discovery Begins', substageName: 'Experts', substageType: 'task' },
  
  // Stage 4: Depositions (4 substages)
  'dep-1': { stageId: 4, stageName: 'Depositions', substageName: 'Plaintiff Deposition', substageType: 'task' },
  'dep-2': { stageId: 4, stageName: 'Depositions', substageName: 'Defendant Deposition', substageType: 'task' },
  'dep-3': { stageId: 4, stageName: 'Depositions', substageName: 'Witness Depositions', substageType: 'task' },
  'dep-4': { stageId: 4, stageName: 'Depositions', substageName: 'Expert Depositions', substageType: 'task' },
  
  // Stage 5: Mediation (3 substages)
  'med-1': { stageId: 5, stageName: 'Mediation', substageName: 'Schedule Mediation', substageType: 'task' },
  'med-2': { stageId: 5, stageName: 'Mediation', substageName: 'Attend Mediation', substageType: 'task' },
  'med-3': { stageId: 5, stageName: 'Mediation', substageName: 'Mediation Outcome', substageType: 'task' },
  
  // Stage 6: Trial Prep (5 substages)
  'tp-1': { stageId: 6, stageName: 'Trial Prep', substageName: 'Pre-trial Conference', substageType: 'task' },
  'tp-2': { stageId: 6, stageName: 'Trial Prep', substageName: 'Exhibit Preparation', substageType: 'task' },
  'tp-3': { stageId: 6, stageName: 'Trial Prep', substageName: 'Witness Preparation', substageType: 'task' },
  'tp-4': { stageId: 6, stageName: 'Trial Prep', substageName: 'Motions in Limine', substageType: 'task' },
  'tp-5': { stageId: 6, stageName: 'Trial Prep', substageName: 'Trial Briefs', substageType: 'task' },
  
  // Stage 7: Trial (16 substages)
  'trial-1': { stageId: 7, stageName: 'Trial', substageName: 'Jury selection', substageType: 'task' },
  'trial-2': { stageId: 7, stageName: 'Trial', substageName: 'Jury seated', substageType: 'task' },
  'trial-3': { stageId: 7, stageName: 'Trial', substageName: 'Opening statements', substageType: 'task' },
  'trial-4': { stageId: 7, stageName: 'Trial', substageName: 'Plaintiff witness testimony', substageType: 'task' },
  'trial-5': { stageId: 7, stageName: 'Trial', substageName: 'Plaintiff evidence', substageType: 'task' },
  'trial-6': { stageId: 7, stageName: 'Trial', substageName: 'Plaintiff rests', substageType: 'task' },
  'trial-7': { stageId: 7, stageName: 'Trial', substageName: 'Motions', substageType: 'task' },
  'trial-8': { stageId: 7, stageName: 'Trial', substageName: 'Defense witness testimony', substageType: 'task' },
  'trial-9': { stageId: 7, stageName: 'Trial', substageName: 'Defense evidence', substageType: 'task' },
  'trial-10': { stageId: 7, stageName: 'Trial', substageName: 'Defense rests', substageType: 'task' },
  'trial-11': { stageId: 7, stageName: 'Trial', substageName: 'Motions after defense', substageType: 'task' },
  'trial-12': { stageId: 7, stageName: 'Trial', substageName: 'Closing arguments', substageType: 'task' },
  'trial-13': { stageId: 7, stageName: 'Trial', substageName: 'Jury instructions', substageType: 'task' },
  'trial-14': { stageId: 7, stageName: 'Trial', substageName: 'Jury deliberations', substageType: 'task' },
  'trial-15': { stageId: 7, stageName: 'Trial', substageName: 'Jury questions', substageType: 'task' },
  'trial-16': { stageId: 7, stageName: 'Trial', substageName: 'Verdict', substageType: 'task' },
  
  // Stage 8: Settlement (10 substages)
  'settle-1': { stageId: 8, stageName: 'Settlement', substageName: 'Negotiations', substageType: 'task' },
  'settle-2': { stageId: 8, stageName: 'Settlement', substageName: 'Agreement to settle', substageType: 'task' },
  'settle-3': { stageId: 8, stageName: 'Settlement', substageName: 'Settlement release', substageType: 'task' },
  'settle-4': { stageId: 8, stageName: 'Settlement', substageName: 'Lien affidavit', substageType: 'task' },
  'settle-5': { stageId: 8, stageName: 'Settlement', substageName: 'Settlement statement', substageType: 'task' },
  'settle-6': { stageId: 8, stageName: 'Settlement', substageName: 'Check received', substageType: 'task' },
  'settle-7': { stageId: 8, stageName: 'Settlement', substageName: 'Check deposited', substageType: 'task' },
  'settle-8': { stageId: 8, stageName: 'Settlement', substageName: 'Funds cleared', substageType: 'task' },
  'settle-9': { stageId: 8, stageName: 'Settlement', substageName: 'Liens paid', substageType: 'task' },
  'settle-10': { stageId: 8, stageName: 'Settlement', substageName: 'Disbursement', substageType: 'task' },
  
  // Stage 9: Case Resolved (2 substages)
  'cr-1': { stageId: 9, stageName: 'Case Resolved', substageName: 'Case Closed', substageType: 'task' },
  'cr-2': { stageId: 9, stageName: 'Case Resolved', substageName: 'Final Documentation', substageType: 'task' }
};

// Helper function to auto-complete substages when documents are uploaded
const autoCompleteSubstage = async (userId, documentType) => {
  try {
    const substageId = DOCUMENT_TO_SUBSTAGE_MAP[documentType];
    
    if (!substageId) {
      // No matching substage for this document type
      return;
    }
    
    const metadata = SUBSTAGE_METADATA[substageId];
    if (!metadata) {
      return;
    }
    
    // Insert with all required NOT NULL columns
    const result = await pool.query(
      `INSERT INTO litigation_substage_completions 
       (user_id, stage_id, stage_name, substage_id, substage_name, substage_type, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (user_id, stage_id, substage_id) DO NOTHING
       RETURNING *`,
      [userId, metadata.stageId, metadata.stageName, substageId, metadata.substageName, metadata.substageType]
    );
    
    if (result.rows.length > 0) {
      
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
        actorId: userId,
        actorType: req.user?.userType || 'client',
        action: 'UPLOAD_REJECTED',
        entityType: 'medical_record',
        status: 'FAILURE',
        metadata: {
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          rejectionReasons: validation.errors,
          fileHash: validation.fileHash
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
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
      actorId: userId,
      actorType: req.user?.userType || 'client',
      action: 'UPLOAD_MEDICAL_RECORD',
      entityType: 'medical_record',
      entityId: result.rows[0].id,
      metadata: {
        fileName: file.originalname,
        fileSize: uploadResult.fileSize,
        recordType: recordType || 'Medical Record',
        storageKey: uploadResult.key,
        storageType: uploadResult.storageType
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
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
        actorId: userId,
        actorType: req.user?.userType || 'client',
        action: 'UPLOAD_REJECTED',
        entityType: 'medical_billing',
        status: 'FAILURE',
        metadata: {
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          rejectionReasons: validation.errors,
          fileHash: validation.fileHash
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
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
      actorId: userId,
      actorType: req.user?.userType || 'client',
      action: 'UPLOAD_MEDICAL_BILL',
      entityType: 'medical_billing',
      entityId: result.rows[0].id,
      metadata: {
        fileName: file.originalname,
        fileSize: uploadResult.fileSize,
        billingType: billingType || 'Medical Bill',
        storageKey: uploadResult.key,
        storageType: uploadResult.storageType
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
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
      console.error('[Upload Evidence] No file in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const validation = await validateFileContent(file.buffer, file.mimetype, file.originalname);
    
    if (!validation.valid) {
      await auditLogger.log({
        actorId: userId,
        actorType: req.user?.userType || 'client',
        action: 'UPLOAD_REJECTED',
        entityType: 'evidence',
        status: 'FAILURE',
        metadata: {
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          rejectionReasons: validation.errors,
          fileHash: validation.fileHash
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
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

    const AUTO_APPROVED_EVIDENCE_TYPES = ['pre-1', 'pre-2', 'pre-3', 'pre-4', 'pre-5'];
    const evTypeNormalized = (evidenceType || '').trim();
    const evidenceTypeLower = evTypeNormalized.toLowerCase();
    const isAutoApproved = AUTO_APPROVED_EVIDENCE_TYPES.includes(evTypeNormalized) ||
      evidenceTypeLower.includes('police') || evidenceTypeLower.includes('body cam') ||
      evidenceTypeLower.includes('dash cam') || evidenceTypeLower.includes('picture') ||
      evidenceTypeLower.includes('photo') || evidenceTypeLower.includes('health insurance') ||
      evidenceTypeLower.includes('insurance card');

    const result = await pool.query(
      `INSERT INTO evidence 
       (user_id, evidence_type, title, description, date_of_incident, location,
        title_encrypted, description_encrypted, location_encrypted,
        document_url, file_name, file_size, mime_type, s3_bucket, s3_key, s3_region, s3_etag, storage_type,
        uploaded_by, uploaded_by_type, accessible_by_medical_provider) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21) 
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
        uploadResult.storageType,
        userId,
        'individual',
        isAutoApproved
      ]
    );

    await auditLogger.log({
      actorId: userId,
      actorType: req.user?.userType || 'client',
      action: 'UPLOAD_EVIDENCE',
      entityType: 'evidence',
      entityId: result.rows[0].id,
      metadata: {
        fileName: file.originalname,
        fileSize: uploadResult.fileSize,
        evidenceType: evidenceType || 'Document',
        storageKey: uploadResult.key,
        storageType: uploadResult.storageType
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
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
      const providerId = await getMedicalProviderId(req.user);

      if (!providerId) {
        await documentAccessService.logDocumentAccess({
          userId, userType, documentType, documentId: fileId,
          action: 'VIEW', success: false, failureReason: 'Medical provider not found',
          ipAddress: req.ip, userAgent: req.get('User-Agent')
        });
        return res.status(403).json({ error: 'Medical provider not found' });
      }
      
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

    let presignedUrlData;
    try {
      presignedUrlData = await storageService.generateDownloadUrl(
        document.s3_key,
        300,
        document.file_name,
        document.storage_type || 's3'
      );
    } catch (s3Error) {
      console.error('[Download] S3 presigned URL generation failed:', s3Error.message);
      if (document.document_url) {
        console.log('[Download] Falling back to document_url');
        presignedUrlData = {
          url: document.document_url,
          expiresIn: null,
          expiresAt: null,
          storageType: 'fallback'
        };
      } else {
        return res.status(500).json({ error: 'Failed to generate secure document link' });
      }
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
          s3Key: document.s3_key,
          s3Bucket: document.s3_bucket,
          storageType: presignedUrlData.storageType || 's3',
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
      expiresAt: presignedUrlData.expiresAt,
      storageType: presignedUrlData.storageType || 's3'
    });
  } catch (error) {
    console.error('Error downloading file:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to download file' });
  }
};

const getMyMedicalRecords = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT mr.id, mr.record_type, mr.facility_name, mr.provider_name, mr.date_of_service, mr.description,
              mr.file_name, mr.file_size, mr.mime_type, mr.uploaded_at, mr.storage_type, mr.s3_key,
              mr.uploaded_by, mr.uploaded_by_type,
              CASE 
                WHEN mr.uploaded_by_type = 'lawfirm' OR mr.uploaded_by_type = 'law_firm' THEN 
                  (SELECT lf.firm_name FROM law_firms lf JOIN users u ON u.email = lf.email WHERE u.id = mr.uploaded_by LIMIT 1)
                WHEN mr.uploaded_by_type = 'medical_provider' THEN 
                  (SELECT mp.provider_name FROM medical_providers mp JOIN users u ON u.email = mp.email WHERE u.id = mr.uploaded_by LIMIT 1)
                WHEN mr.uploaded_by_type = 'individual' THEN 
                  (SELECT CONCAT(u.first_name, ' ', u.last_name) FROM users u WHERE u.id = mr.uploaded_by LIMIT 1)
                ELSE NULL
              END as uploaded_by_name
       FROM medical_records mr
       WHERE mr.user_id = $1
       ORDER BY mr.uploaded_at DESC`,
      [userId]
    );
    res.json({ records: result.rows });
  } catch (error) {
    console.error('Error fetching medical records:', error);
    res.status(500).json({ error: 'Failed to fetch medical records' });
  }
};

const getMyMedicalBills = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT mb.id, mb.billing_type, mb.facility_name, mb.bill_number, mb.date_of_service, mb.bill_date, 
              mb.due_date, mb.total_amount, mb.amount_paid, mb.amount_due, mb.description,
              mb.file_name, mb.file_size, mb.mime_type, mb.uploaded_at, mb.storage_type, mb.s3_key,
              mb.uploaded_by, mb.uploaded_by_type,
              CASE 
                WHEN mb.uploaded_by_type = 'lawfirm' OR mb.uploaded_by_type = 'law_firm' THEN 
                  (SELECT lf.firm_name FROM law_firms lf JOIN users u ON u.email = lf.email WHERE u.id = mb.uploaded_by LIMIT 1)
                WHEN mb.uploaded_by_type = 'medical_provider' THEN 
                  (SELECT mp.provider_name FROM medical_providers mp JOIN users u ON u.email = mp.email WHERE u.id = mb.uploaded_by LIMIT 1)
                WHEN mb.uploaded_by_type = 'individual' THEN 
                  (SELECT CONCAT(u.first_name, ' ', u.last_name) FROM users u WHERE u.id = mb.uploaded_by LIMIT 1)
                ELSE NULL
              END as uploaded_by_name
       FROM medical_billing mb
       WHERE mb.user_id = $1
       ORDER BY mb.uploaded_at DESC`,
      [userId]
    );
    res.json({ bills: result.rows });
  } catch (error) {
    console.error('Error fetching medical bills:', error);
    res.status(500).json({ error: 'Failed to fetch medical bills' });
  }
};

const deleteMedicalDocument = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, id } = req.params;

    let tableName;
    if (type === 'record') {
      tableName = 'medical_records';
    } else if (type === 'bill') {
      tableName = 'medical_billing';
    } else {
      return res.status(400).json({ error: 'Invalid document type' });
    }

    const existing = await pool.query(
      `SELECT id, file_name, s3_key, storage_type FROM ${tableName} WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const doc = existing.rows[0];

    if (doc.s3_key) {
      try {
        await storageService.deleteFile(doc.s3_key, doc.storage_type);
      } catch (e) {
        console.warn('Failed to delete file from storage:', e.message);
      }
    }

    await pool.query(`DELETE FROM ${tableName} WHERE id = $1 AND user_id = $2`, [id, userId]);

    await auditLogger.log({
      actorId: userId,
      actorType: req.user?.userType || 'client',
      action: 'DELETE_MEDICAL_DOCUMENT',
      entityType: tableName,
      entityId: id,
      metadata: { fileName: doc.file_name, documentType: type },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting medical document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
};

const deleteMedicalDocumentForPatient = async (req, res) => {
  try {
    const uploaderUserId = req.user.id;
    const uploaderType = req.user.userType;
    const { clientId, type, id } = req.params;

    if (uploaderType !== 'medical_provider') {
      return res.status(403).json({ error: 'Only medical providers can use this endpoint' });
    }

    let tableName;
    if (type === 'record') {
      tableName = 'medical_records';
    } else if (type === 'bill') {
      tableName = 'medical_billing';
    } else {
      return res.status(400).json({ error: 'Invalid document type' });
    }

    const providerId = await getMedicalProviderId(req.user);
    if (!providerId) {
      return res.status(403).json({ error: 'Medical provider not found' });
    }

    const isAuthorized = await documentAccessService.verifyMedicalProviderPatientRelationship(providerId, clientId);
    if (!isAuthorized) {
      return res.status(403).json({ error: 'Not authorized to manage documents for this patient' });
    }

    const existing = await pool.query(
      `SELECT id, file_name, s3_key, storage_type FROM ${tableName} WHERE id = $1 AND user_id = $2`,
      [id, clientId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const doc = existing.rows[0];

    if (doc.s3_key) {
      try {
        await storageService.deleteFile(doc.s3_key, doc.storage_type);
      } catch (e) {
        console.warn('Failed to delete file from storage:', e.message);
      }
    }

    await pool.query(`DELETE FROM ${tableName} WHERE id = $1 AND user_id = $2`, [id, clientId]);

    await auditLogger.log({
      actorId: uploaderUserId,
      actorType: 'medical_provider',
      action: 'DELETE_PATIENT_MEDICAL_DOCUMENT',
      entityType: tableName,
      entityId: id,
      metadata: { fileName: doc.file_name, documentType: type, clientId, providerId },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting patient medical document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
};

const viewMedicalDocument = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.userType;
    const { type, id } = req.params;

    let tableName;
    let documentType;
    if (type === 'record') {
      tableName = 'medical_records';
      documentType = 'medical_records';
    } else if (type === 'bill') {
      tableName = 'medical_billing';
      documentType = 'medical_billing';
    } else {
      return res.status(400).json({ error: 'Invalid document type' });
    }

    let doc = null;
    let accessReason = 'OWNER_ACCESS';

    const ownerCheck = await pool.query(
      `SELECT id, file_name, mime_type, s3_key, storage_type, document_url FROM ${tableName} WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (ownerCheck.rows.length > 0) {
      doc = ownerCheck.rows[0];
    } else if (userType === 'lawfirm' || userType === 'law_firm') {
      const lawFirmResult = await pool.query('SELECT id FROM law_firms WHERE email = $1', [req.user.email]);
      if (lawFirmResult.rows.length > 0) {
        const lawFirmId = lawFirmResult.rows[0].id;
        const docResult = await pool.query(`SELECT user_id FROM ${tableName} WHERE id = $1`, [id]);
        if (docResult.rows.length > 0) {
          const patientId = docResult.rows[0].user_id;
          const authResult = await documentAccessService.authorizeLawFirmDocumentAccess(lawFirmId, patientId, documentType, id);
          if (authResult.authorized) {
            doc = authResult.document;
            accessReason = `LAW_FIRM_ACCESS_${authResult.consentType}`;
          }
        }
      }
    } else if (userType === 'medical_provider') {
      const providerId = await getMedicalProviderId(req.user);
      if (providerId) {
        const docResult = await pool.query(`SELECT user_id FROM ${tableName} WHERE id = $1`, [id]);
        if (docResult.rows.length > 0) {
          const patientId = docResult.rows[0].user_id;
          const authResult = await documentAccessService.authorizeMedicalProviderDocumentAccess(providerId, patientId, documentType, id);
          if (authResult.authorized) {
            doc = authResult.document;
            accessReason = `MEDICAL_PROVIDER_ACCESS_${authResult.consentType}`;
          }
        }
      }
    }

    if (!doc) {
      console.error('[ViewMedical] Document not found or access denied - type:', type, 'docId:', id, 'userId:', userId, 'userType:', userType);
      return res.status(404).json({ error: 'Document not found or access denied' });
    }

    console.log('[ViewMedical] Found doc:', { id: doc.id, storage_type: doc.storage_type, s3_key: doc.s3_key ? 'present' : 'null', document_url: doc.document_url ? 'present' : 'null' });

    await auditLogger.log({
      actorId: userId,
      actorType: userType || 'client',
      action: 'VIEW_MEDICAL_DOCUMENT',
      entityType: tableName,
      entityId: id,
      metadata: { fileName: doc.file_name, documentType: type, accessReason },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    if (doc.storage_type === 's3' && doc.s3_key) {
      try {
        const s3Service = require('../services/s3Service');
        const presigned = await s3Service.generatePresignedDownloadUrl(doc.s3_key, 300, doc.file_name);
        return res.json({ success: true, url: presigned.url, expiresIn: presigned.expiresIn, fileName: doc.file_name, mimeType: doc.mime_type });
      } catch (s3Error) {
        console.error('[ViewMedical] S3 presigned URL error:', s3Error.message);
        if (doc.document_url) {
          console.log('[ViewMedical] Falling back to document_url');
          return res.json({ success: true, url: doc.document_url, fileName: doc.file_name, mimeType: doc.mime_type });
        }
        return res.status(500).json({ error: 'Failed to generate secure document link' });
      }
    } else if (doc.storage_type === 'local' && doc.s3_key) {
      const streamUrl = `/api/uploads/stream/${doc.s3_key}`;
      return res.json({ success: true, url: streamUrl, fileName: doc.file_name, mimeType: doc.mime_type });
    } else if (doc.document_url) {
      return res.json({ success: true, url: doc.document_url, fileName: doc.file_name, mimeType: doc.mime_type });
    }

    return res.status(404).json({ error: 'Document file not available' });
  } catch (error) {
    console.error('Error viewing medical document:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to retrieve document' });
  }
};

const viewEvidenceDocument = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.userType;
    const { id } = req.params;

    let doc = null;
    let accessReason = 'OWNER_ACCESS';

    const ownerCheck = await pool.query(
      `SELECT id, file_name, mime_type, s3_key, storage_type, document_url FROM evidence WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (ownerCheck.rows.length > 0) {
      doc = ownerCheck.rows[0];
    } else if (userType === 'lawfirm' || userType === 'law_firm') {
      const lawFirmResult = await pool.query('SELECT id FROM law_firms WHERE email = $1', [req.user.email]);
      if (lawFirmResult.rows.length > 0) {
        const lawFirmId = lawFirmResult.rows[0].id;
        const docResult = await pool.query('SELECT user_id FROM evidence WHERE id = $1', [id]);
        if (docResult.rows.length > 0) {
          const patientId = docResult.rows[0].user_id;
          const authResult = await documentAccessService.authorizeLawFirmDocumentAccess(lawFirmId, patientId, 'evidence', id);
          if (authResult.authorized) {
            doc = authResult.document;
            accessReason = `LAW_FIRM_ACCESS_${authResult.consentType}`;
          }
        }
      }
    } else if (userType === 'medical_provider') {
      const providerId = await getMedicalProviderId(req.user);
      if (providerId) {
        const docResult = await pool.query(
          `SELECT id, file_name, mime_type, s3_key, storage_type, document_url, user_id, evidence_type, accessible_by_medical_provider 
           FROM evidence WHERE id = $1`,
          [id]
        );
        if (docResult.rows.length > 0) {
          const patientId = docResult.rows[0].user_id;
          const isPatient = await documentAccessService.verifyMedicalProviderPatientRelationship(providerId, patientId);
          if (isPatient) {
            const AUTO_APPROVED_EV = ['pre-1', 'pre-2', 'pre-3', 'pre-4', 'pre-5'];
            const evType = (docResult.rows[0].evidence_type || '').toLowerCase();
            const isApproved = docResult.rows[0].accessible_by_medical_provider ||
              AUTO_APPROVED_EV.includes(docResult.rows[0].evidence_type) ||
              evType.includes('police') || evType.includes('body cam') ||
              evType.includes('dash cam') || evType.includes('picture') ||
              evType.includes('photo') || evType.includes('health insurance') ||
              evType.includes('insurance card');
            if (isApproved) {
              doc = docResult.rows[0];
              accessReason = 'MEDICAL_PROVIDER_APPROVED_EVIDENCE';
            }
          }
        }
      }
    }

    if (!doc) {
      console.error('[ViewEvidence] Document not found or access denied - evidenceId:', id, 'userId:', userId, 'userType:', userType);
      return res.status(404).json({ error: 'Document not found or access denied' });
    }

    console.log('[ViewEvidence] Found doc:', { id: doc.id, storage_type: doc.storage_type, s3_key: doc.s3_key ? 'present' : 'null', document_url: doc.document_url ? 'present' : 'null' });

    await auditLogger.log({
      actorId: userId,
      actorType: userType || 'client',
      action: 'VIEW_EVIDENCE_DOCUMENT',
      entityType: 'evidence',
      entityId: id,
      metadata: { fileName: doc.file_name, accessReason },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    if (doc.storage_type === 's3' && doc.s3_key) {
      try {
        const s3Service = require('../services/s3Service');
        const presigned = await s3Service.generatePresignedDownloadUrl(doc.s3_key, 300, doc.file_name);
        return res.json({ success: true, url: presigned.url, expiresIn: presigned.expiresIn, fileName: doc.file_name, mimeType: doc.mime_type });
      } catch (s3Error) {
        console.error('[ViewEvidence] S3 presigned URL error:', s3Error.message);
        if (doc.document_url) {
          console.log('[ViewEvidence] Falling back to document_url');
          return res.json({ success: true, url: doc.document_url, fileName: doc.file_name, mimeType: doc.mime_type });
        }
        return res.status(500).json({ error: 'Failed to generate secure document link' });
      }
    } else if (doc.storage_type === 'local' && doc.s3_key) {
      const streamUrl = `/api/uploads/stream/${doc.s3_key}`;
      return res.json({ success: true, url: streamUrl, fileName: doc.file_name, mimeType: doc.mime_type });
    } else if (doc.document_url) {
      return res.json({ success: true, url: doc.document_url, fileName: doc.file_name, mimeType: doc.mime_type });
    }

    return res.status(404).json({ error: 'Document file not available' });
  } catch (error) {
    console.error('Error viewing evidence document:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to retrieve document' });
  }
};

const uploadMedicalRecordOnBehalf = async (req, res) => {
  try {
    const uploaderUserId = req.user.id;
    const uploaderType = req.user.userType;
    const { clientId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    let isAuthorized = false;
    let uploaderEntityId = null;

    if (uploaderType === 'lawfirm' || uploaderType === 'law_firm') {
      const lfResult = await pool.query('SELECT id FROM law_firms WHERE email = $1', [req.user.email]);
      if (lfResult.rows.length > 0) {
        uploaderEntityId = lfResult.rows[0].id;
        isAuthorized = await documentAccessService.verifyLawFirmClientRelationship(uploaderEntityId, clientId);
      }
    } else if (uploaderType === 'medical_provider') {
      uploaderEntityId = await getMedicalProviderId(req.user);
      if (uploaderEntityId) {
        isAuthorized = await documentAccessService.verifyMedicalProviderPatientRelationship(uploaderEntityId, clientId);
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Access denied. Not authorized to upload for this user.' });
    }

    const validation = await validateFileContent(file.buffer, file.mimetype, file.originalname);
    if (!validation.valid) {
      await auditLogger.log({
        actorId: uploaderUserId,
        actorType: uploaderType,
        action: 'UPLOAD_REJECTED_ON_BEHALF',
        entityType: 'medical_record',
        status: 'FAILURE',
        metadata: { fileName: file.originalname, clientId, rejectionReasons: validation.errors },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
      return res.status(400).json({ error: 'File validation failed', details: validation.errors });
    }

    const { recordType, facilityName, providerName, dateOfService, description } = req.body;

    const uploadResult = await storageService.uploadFile(file.buffer, clientId, 'medical-records', file.originalname, file.mimetype);

    const result = await pool.query(
      `INSERT INTO medical_records 
       (user_id, record_type, facility_name, provider_name, date_of_service, description, 
        document_url, file_name, file_size, mime_type, s3_bucket, s3_key, s3_region, s3_etag, storage_type, uploaded_by, uploaded_by_type) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) 
       RETURNING *`,
      [
        clientId,
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
        uploadResult.storageType,
        uploaderUserId,
        uploaderType
      ]
    );

    await auditLogger.log({
      actorId: uploaderUserId,
      actorType: uploaderType,
      action: 'UPLOAD_MEDICAL_RECORD_ON_BEHALF',
      entityType: 'medical_record',
      entityId: result.rows[0].id,
      metadata: { fileName: file.originalname, clientId, uploaderType, storageType: uploadResult.storageType },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      success: true,
      message: `Medical record uploaded on behalf of client (${uploadResult.storageType})`,
      document: result.rows[0],
      storageType: uploadResult.storageType
    });
  } catch (error) {
    console.error('Error uploading medical record on behalf:', error);
    res.status(500).json({ error: 'Failed to upload medical record' });
  }
};

const uploadMedicalBillOnBehalf = async (req, res) => {
  try {
    const uploaderUserId = req.user.id;
    const uploaderType = req.user.userType;
    const { clientId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    let isAuthorized = false;
    let uploaderEntityId = null;

    if (uploaderType === 'lawfirm' || uploaderType === 'law_firm') {
      const lfResult = await pool.query('SELECT id FROM law_firms WHERE email = $1', [req.user.email]);
      if (lfResult.rows.length > 0) {
        uploaderEntityId = lfResult.rows[0].id;
        isAuthorized = await documentAccessService.verifyLawFirmClientRelationship(uploaderEntityId, clientId);
      }
    } else if (uploaderType === 'medical_provider') {
      uploaderEntityId = await getMedicalProviderId(req.user);
      if (uploaderEntityId) {
        isAuthorized = await documentAccessService.verifyMedicalProviderPatientRelationship(uploaderEntityId, clientId);
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Access denied. Not authorized to upload for this user.' });
    }

    const validation = await validateFileContent(file.buffer, file.mimetype, file.originalname);
    if (!validation.valid) {
      return res.status(400).json({ error: 'File validation failed', details: validation.errors });
    }

    const { billingType, facilityName, billNumber, dateOfService, billDate, totalAmount, description } = req.body;

    const uploadResult = await storageService.uploadFile(file.buffer, clientId, 'medical-bills', file.originalname, file.mimetype);

    const result = await pool.query(
      `INSERT INTO medical_billing 
       (user_id, billing_type, facility_name, bill_number, date_of_service, bill_date,
        total_amount, amount_due, description, document_url, file_name, file_size, mime_type, 
        s3_bucket, s3_key, s3_region, s3_etag, storage_type, uploaded_by, uploaded_by_type) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20) 
       RETURNING *`,
      [
        clientId,
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
        uploadResult.storageType,
        uploaderUserId,
        uploaderType
      ]
    );

    await auditLogger.log({
      actorId: uploaderUserId,
      actorType: uploaderType,
      action: 'UPLOAD_MEDICAL_BILL_ON_BEHALF',
      entityType: 'medical_billing',
      entityId: result.rows[0].id,
      metadata: { fileName: file.originalname, clientId, uploaderType, storageType: uploadResult.storageType },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      success: true,
      message: `Medical bill uploaded on behalf of client (${uploadResult.storageType})`,
      document: result.rows[0],
      storageType: uploadResult.storageType
    });
  } catch (error) {
    console.error('Error uploading medical bill on behalf:', error);
    res.status(500).json({ error: 'Failed to upload medical bill' });
  }
};

const getClientMedicalRecords = async (req, res) => {
  try {
    const userType = req.user.userType;
    const { clientId } = req.params;

    let hasConsent = false;
    let accessibleFilter = '';

    if (userType === 'lawfirm' || userType === 'law_firm') {
      const lfResult = await pool.query('SELECT id FROM law_firms WHERE email = $1', [req.user.email]);
      if (lfResult.rows.length > 0) {
        const lawFirmId = lfResult.rows[0].id;
        const isClient = await documentAccessService.verifyLawFirmClientRelationship(lawFirmId, clientId);
        if (!isClient) return res.status(403).json({ error: 'Access denied' });
        const consent = await documentAccessService.verifyLawFirmConsent(lawFirmId, clientId, 'medical_records');
        if (!consent) return res.status(403).json({ error: 'No active consent for medical records' });
        hasConsent = true;
        accessibleFilter = 'AND mr.accessible_by_law_firm = TRUE';
        await auditLogger.log({
          actorId: req.user.id,
          actorType: 'lawfirm',
          action: 'LIST_CLIENT_MEDICAL_RECORDS',
          entityType: 'MedicalRecord',
          targetUserId: parseInt(clientId),
          status: 'SUCCESS',
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          metadata: { lawFirmId, consentType: consent.consent_type }
        });
      }
    } else if (userType === 'medical_provider') {
      const providerId = await getMedicalProviderId(req.user);
      if (!providerId) return res.status(403).json({ error: 'Medical provider not found' });
      const isPatient = await documentAccessService.verifyMedicalProviderPatientRelationship(providerId, clientId);
      if (!isPatient) return res.status(403).json({ error: 'Access denied' });
      const consent = await documentAccessService.verifyMedicalProviderConsent(providerId, clientId, 'medical_records');
      if (!consent) return res.status(403).json({ error: 'No active consent for medical records' });
      hasConsent = true;
      accessibleFilter = `AND (mr.uploaded_by_type IS NULL OR mr.uploaded_by_type NOT IN ('lawfirm', 'law_firm') OR LOWER(mr.record_type) LIKE '%hipaa%release%' OR LOWER(mr.record_type) LIKE '%police report%' OR LOWER(mr.record_type) LIKE '%picture%' OR LOWER(mr.record_type) LIKE '%photo%' OR LOWER(mr.record_type) LIKE '%health insurance%' OR LOWER(mr.record_type) LIKE '%insurance card%')`;
      await auditLogger.log({
        actorId: req.user.id,
        actorType: 'medical_provider',
        action: 'LIST_PATIENT_MEDICAL_RECORDS',
        entityType: 'MedicalRecord',
        targetUserId: parseInt(clientId),
        status: 'SUCCESS',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: { providerId, consentType: consent.consent_type }
      });
    }

    if (!hasConsent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      `SELECT mr.id, mr.record_type, mr.facility_name, mr.provider_name, mr.date_of_service, mr.description,
              mr.file_name, mr.file_size, mr.mime_type, mr.uploaded_at, mr.storage_type, mr.s3_key,
              mr.uploaded_by, mr.uploaded_by_type,
              CASE 
                WHEN mr.uploaded_by_type = 'medical_provider' THEN 
                  (SELECT mp.provider_name FROM medical_providers mp JOIN users u ON u.email = mp.email WHERE u.id = mr.uploaded_by LIMIT 1)
                WHEN mr.uploaded_by_type = 'lawfirm' OR mr.uploaded_by_type = 'law_firm' THEN 
                  (SELECT lf.firm_name FROM law_firms lf JOIN users u ON u.email = lf.email WHERE u.id = mr.uploaded_by LIMIT 1)
                WHEN mr.uploaded_by_type = 'individual' THEN 
                  (SELECT CONCAT(u.first_name, ' ', u.last_name) FROM users u WHERE u.id = mr.uploaded_by LIMIT 1)
                ELSE NULL
              END as uploaded_by_name
       FROM medical_records mr
       WHERE mr.user_id = $1 ${accessibleFilter}
       ORDER BY mr.uploaded_at DESC`,
      [clientId]
    );
    res.json({ records: result.rows });
  } catch (error) {
    console.error('Error fetching client medical records:', error);
    res.status(500).json({ error: 'Failed to fetch medical records' });
  }
};

const getClientMedicalBills = async (req, res) => {
  try {
    const userType = req.user.userType;
    const { clientId } = req.params;

    let hasConsent = false;
    let accessibleFilter = '';

    if (userType === 'lawfirm' || userType === 'law_firm') {
      const lfResult = await pool.query('SELECT id FROM law_firms WHERE email = $1', [req.user.email]);
      if (lfResult.rows.length > 0) {
        const lawFirmId = lfResult.rows[0].id;
        const isClient = await documentAccessService.verifyLawFirmClientRelationship(lawFirmId, clientId);
        if (!isClient) return res.status(403).json({ error: 'Access denied' });
        const consent = await documentAccessService.verifyLawFirmConsent(lawFirmId, clientId, 'medical_billing');
        if (!consent) return res.status(403).json({ error: 'No active consent for medical billing' });
        hasConsent = true;
        accessibleFilter = 'AND mb.accessible_by_law_firm = TRUE';
        await auditLogger.log({
          actorId: req.user.id,
          actorType: 'lawfirm',
          action: 'LIST_CLIENT_MEDICAL_BILLS',
          entityType: 'MedicalBilling',
          targetUserId: parseInt(clientId),
          status: 'SUCCESS',
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          metadata: { lawFirmId, consentType: consent.consent_type }
        });
      }
    } else if (userType === 'medical_provider') {
      const providerId = await getMedicalProviderId(req.user);
      if (!providerId) return res.status(403).json({ error: 'Medical provider not found' });
      const isPatient = await documentAccessService.verifyMedicalProviderPatientRelationship(providerId, clientId);
      if (!isPatient) return res.status(403).json({ error: 'Access denied' });
      const consent = await documentAccessService.verifyMedicalProviderConsent(providerId, clientId, 'medical_billing');
      if (!consent) return res.status(403).json({ error: 'No active consent for medical billing' });
      hasConsent = true;
      accessibleFilter = `AND (mb.uploaded_by_type IS NULL OR mb.uploaded_by_type NOT IN ('lawfirm', 'law_firm'))`;
      await auditLogger.log({
        actorId: req.user.id,
        actorType: 'medical_provider',
        action: 'LIST_PATIENT_MEDICAL_BILLS',
        entityType: 'MedicalBilling',
        targetUserId: parseInt(clientId),
        status: 'SUCCESS',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        metadata: { providerId, consentType: consent.consent_type }
      });
    }

    if (!hasConsent) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      `SELECT mb.id, mb.billing_type, mb.facility_name, mb.bill_number, mb.date_of_service, mb.bill_date, 
              mb.due_date, mb.total_amount, mb.amount_paid, mb.amount_due, mb.description,
              mb.file_name, mb.file_size, mb.mime_type, mb.uploaded_at, mb.storage_type, mb.s3_key,
              mb.uploaded_by, mb.uploaded_by_type,
              CASE 
                WHEN mb.uploaded_by_type = 'medical_provider' THEN 
                  (SELECT mp.provider_name FROM medical_providers mp JOIN users u ON u.email = mp.email WHERE u.id = mb.uploaded_by LIMIT 1)
                WHEN mb.uploaded_by_type = 'lawfirm' OR mb.uploaded_by_type = 'law_firm' THEN 
                  (SELECT lf.firm_name FROM law_firms lf JOIN users u ON u.email = lf.email WHERE u.id = mb.uploaded_by LIMIT 1)
                WHEN mb.uploaded_by_type = 'individual' THEN 
                  (SELECT CONCAT(u.first_name, ' ', u.last_name) FROM users u WHERE u.id = mb.uploaded_by LIMIT 1)
                ELSE NULL
              END as uploaded_by_name
       FROM medical_billing mb
       WHERE mb.user_id = $1 ${accessibleFilter}
       ORDER BY mb.uploaded_at DESC`,
      [clientId]
    );
    res.json({ bills: result.rows });
  } catch (error) {
    console.error('Error fetching client medical bills:', error);
    res.status(500).json({ error: 'Failed to fetch medical bills' });
  }
};

const uploadEvidenceOnBehalf = async (req, res) => {
  try {
    const uploaderUserId = req.user.id;
    const uploaderType = req.user.userType;
    const { clientId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    let isAuthorized = false;
    let uploaderEntityId = null;

    if (uploaderType === 'lawfirm' || uploaderType === 'law_firm') {
      const lfResult = await pool.query('SELECT id FROM law_firms WHERE email = $1', [req.user.email]);
      if (lfResult.rows.length > 0) {
        uploaderEntityId = lfResult.rows[0].id;
        isAuthorized = await documentAccessService.verifyLawFirmClientRelationship(uploaderEntityId, clientId);
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Access denied. Not authorized to upload evidence for this client.' });
    }

    const validation = await validateFileContent(file.buffer, file.mimetype, file.originalname);
    if (!validation.valid) {
      await auditLogger.log({
        actorId: uploaderUserId,
        actorType: uploaderType,
        action: 'UPLOAD_REJECTED_ON_BEHALF',
        entityType: 'evidence',
        status: 'FAILURE',
        metadata: { fileName: file.originalname, clientId, rejectionReasons: validation.errors },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });
      return res.status(400).json({ error: 'File validation failed', details: validation.errors });
    }

    const { evidenceType, title, description, dateOfIncident, location } = req.body;

    const uploadResult = await storageService.uploadFile(file.buffer, clientId, 'evidence', file.originalname, file.mimetype);

    const titleValue = title || file.originalname;
    const titleEncrypted = encryptionService.encrypt(titleValue);
    const descriptionEncrypted = description ? encryptionService.encrypt(description) : null;
    const locationEncrypted = location ? encryptionService.encrypt(location) : null;

    const AUTO_APPROVED_EVIDENCE_TYPES_OB = ['pre-1', 'pre-2', 'pre-3', 'pre-4', 'pre-5'];
    const evTypeNormalizedOB = (evidenceType || '').trim();
    const evTypeLower = evTypeNormalizedOB.toLowerCase();
    const isAutoApprovedOB = AUTO_APPROVED_EVIDENCE_TYPES_OB.includes(evTypeNormalizedOB) ||
      evTypeLower.includes('police') || evTypeLower.includes('body cam') ||
      evTypeLower.includes('dash cam') || evTypeLower.includes('picture') ||
      evTypeLower.includes('photo') || evTypeLower.includes('health insurance') ||
      evTypeLower.includes('insurance card');

    const result = await pool.query(
      `INSERT INTO evidence 
       (user_id, evidence_type, title, description, date_of_incident, location,
        title_encrypted, description_encrypted, location_encrypted,
        document_url, file_name, file_size, mime_type, s3_bucket, s3_key, s3_region, s3_etag, storage_type,
        uploaded_by, uploaded_by_type, accessible_by_medical_provider) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21) 
       RETURNING *`,
      [
        clientId,
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
        uploadResult.storageType,
        uploaderEntityId,
        uploaderType === 'lawfirm' || uploaderType === 'law_firm' ? 'law_firm' : uploaderType,
        isAutoApprovedOB
      ]
    );

    await auditLogger.log({
      actorId: uploaderUserId,
      actorType: uploaderType,
      action: 'UPLOAD_EVIDENCE_ON_BEHALF',
      entityType: 'evidence',
      entityId: result.rows[0].id,
      metadata: { fileName: file.originalname, clientId, uploaderType, evidenceType: evidenceType || 'Document', storageType: uploadResult.storageType },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      success: true,
      message: `Evidence uploaded on behalf of client (${uploadResult.storageType})`,
      document: result.rows[0],
      storageType: uploadResult.storageType
    });
  } catch (error) {
    console.error('Error uploading evidence on behalf:', error);
    res.status(500).json({ error: 'Failed to upload evidence' });
  }
};

const getClientEvidence = async (req, res) => {
  try {
    const { clientId } = req.params;
    const userType = req.user.userType;

    let isAuthorized = false;

    if (userType === 'lawfirm' || userType === 'law_firm') {
      const lfResult = await pool.query('SELECT id FROM law_firms WHERE email = $1', [req.user.email]);
      if (lfResult.rows.length > 0) {
        isAuthorized = await documentAccessService.verifyLawFirmClientRelationship(lfResult.rows[0].id, clientId);
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      `SELECT e.id, e.evidence_type, e.title, e.description, e.file_name, e.mime_type, e.uploaded_at, 
              e.date_of_incident, e.location, e.uploaded_by, e.uploaded_by_type,
              CASE 
                WHEN e.uploaded_by_type = 'law_firm' OR e.uploaded_by_type = 'lawfirm' THEN 
                  (SELECT lf.firm_name FROM law_firms lf JOIN users u ON u.email = lf.email WHERE u.id = e.uploaded_by LIMIT 1)
                WHEN e.uploaded_by_type = 'medical_provider' THEN 
                  (SELECT mp.provider_name FROM medical_providers mp JOIN users u ON u.email = mp.email WHERE u.id = e.uploaded_by LIMIT 1)
                WHEN e.uploaded_by_type = 'individual' THEN 
                  (SELECT CONCAT(u.first_name, ' ', u.last_name) FROM users u WHERE u.id = e.uploaded_by LIMIT 1)
                ELSE NULL
              END as uploaded_by_name
       FROM evidence e
       WHERE e.user_id = $1 
       ORDER BY e.uploaded_at DESC`,
      [clientId]
    );

    res.json({ evidence: result.rows });
  } catch (error) {
    console.error('Error fetching client evidence:', error);
    res.status(500).json({ error: 'Failed to fetch evidence' });
  }
};

module.exports = {
  uploadMedicalRecord,
  uploadMedicalBill,
  uploadEvidence,
  downloadFile,
  getMyMedicalRecords,
  getMyMedicalBills,
  deleteMedicalDocument,
  deleteMedicalDocumentForPatient,
  viewMedicalDocument,
  viewEvidenceDocument,
  uploadMedicalRecordOnBehalf,
  uploadMedicalBillOnBehalf,
  uploadEvidenceOnBehalf,
  getClientMedicalRecords,
  getClientMedicalBills,
  getClientEvidence
};
