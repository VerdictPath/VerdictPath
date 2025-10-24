const db = require('../config/db');
const auditLogger = require('../services/auditLogger');
const encryption = require('../services/encryption');
const formsService = require('../services/formsService');

exports.getDashboard = async (req, res) => {
  try {
    const lawFirmId = req.user.id;
    
    const lawFirmResult = await db.query(
      'SELECT id, firm_name, firm_code FROM law_firms WHERE id = $1',
      [lawFirmId]
    );
    
    if (lawFirmResult.rows.length === 0) {
      return res.status(404).json({ message: 'Law firm not found' });
    }
    
    const lawFirm = lawFirmResult.rows[0];
    
    const clientsResult = await db.query(
      `SELECT u.id, u.first_name, u.last_name, u.first_name_encrypted, u.last_name_encrypted, 
              u.email, lfc.registered_date
       FROM users u
       JOIN law_firm_clients lfc ON u.id = lfc.client_id
       WHERE lfc.law_firm_id = $1
       ORDER BY u.last_name ASC, u.first_name ASC`,
      [lawFirmId]
    );
    
    const clients = clientsResult.rows.map(client => {
      // HIPAA: Use encrypted fields if available, fall back to plaintext during migration
      const firstName = client.first_name_encrypted ? 
        encryption.decrypt(client.first_name_encrypted) : client.first_name;
      const lastName = client.last_name_encrypted ? 
        encryption.decrypt(client.last_name_encrypted) : client.last_name;
      
      return {
        id: client.id,
        displayName: `${lastName}, ${firstName}`,
        firstName: firstName,
        lastName: lastName,
        email: client.email,
        registeredDate: client.registered_date
      };
    });
    
    // Calculate litigation stage analytics by phase
    const phaseAnalytics = await db.query(
      `SELECT 
         COUNT(*) FILTER (WHERE current_phase = 'pre_litigation') AS pre_litigation_count,
         COUNT(*) FILTER (WHERE current_phase = 'litigation') AS litigation_count,
         COUNT(*) FILTER (WHERE current_phase = 'trial') AS trial_count
       FROM users u
       JOIN law_firm_clients lfc ON u.id = lfc.client_id
       WHERE lfc.law_firm_id = $1`,
      [lawFirmId]
    );
    
    const analytics = {
      totalClients: clients.length,
      preLitigationCount: parseInt(phaseAnalytics.rows[0]?.pre_litigation_count || 0),
      litigationCount: parseInt(phaseAnalytics.rows[0]?.litigation_count || 0),
      trialCount: parseInt(phaseAnalytics.rows[0]?.trial_count || 0)
    };
    
    // HIPAA: Log law firm accessing client list
    await auditLogger.log({
      actorId: lawFirmId,
      actorType: 'lawfirm',
      action: 'VIEW_CLIENT_LIST',
      entityType: 'LawFirm',
      entityId: lawFirmId,
      status: 'SUCCESS',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      metadata: { clientCount: clients.length }
    });
    
    res.json({
      firmName: lawFirm.firm_name,
      firmCode: lawFirm.firm_code,
      totalClients: clients.length,
      clients: clients,
      analytics: analytics
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching dashboard', error: error.message });
  }
};

exports.getClientDetails = async (req, res) => {
  try {
    const { clientId } = req.params;
    const lawFirmId = req.user.id;
    
    const clientCheckResult = await db.query(
      'SELECT * FROM law_firm_clients WHERE law_firm_id = $1 AND client_id = $2',
      [lawFirmId, clientId]
    );
    
    if (clientCheckResult.rows.length === 0) {
      return res.status(403).json({ message: 'Access denied. Client not registered with your firm.' });
    }
    
    const clientResult = await db.query(
      'SELECT id, first_name, last_name, first_name_encrypted, last_name_encrypted, email FROM users WHERE id = $1',
      [clientId]
    );
    
    if (clientResult.rows.length === 0) {
      return res.status(404).json({ message: 'Client not found' });
    }
    
    const clientRow = clientResult.rows[0];
    
    // HIPAA: Decrypt PHI fields
    const firstName = clientRow.first_name_encrypted ? 
      encryption.decrypt(clientRow.first_name_encrypted) : clientRow.first_name;
    const lastName = clientRow.last_name_encrypted ? 
      encryption.decrypt(clientRow.last_name_encrypted) : clientRow.last_name;
    
    const client = {
      id: clientRow.id,
      first_name: firstName,
      last_name: lastName,
      email: clientRow.email
    };
    
    const medicalRecordsResult = await db.query(
      `SELECT * FROM medical_records 
       WHERE user_id = $1 AND accessible_by_law_firm = true 
       ORDER BY date_of_service DESC NULLS LAST, uploaded_at DESC`,
      [clientId]
    );
    
    // HIPAA: Decrypt medical record PHI fields
    const decryptedMedicalRecords = medicalRecordsResult.rows.map(record => ({
      ...record,
      description: record.description_encrypted ? 
        encryption.decrypt(record.description_encrypted) : record.description,
      facility_name: record.facility_name_encrypted ? 
        encryption.decrypt(record.facility_name_encrypted) : record.facility_name,
      provider_name: record.provider_name_encrypted ? 
        encryption.decrypt(record.provider_name_encrypted) : record.provider_name,
      diagnosis: record.diagnosis_encrypted ? 
        encryption.decrypt(record.diagnosis_encrypted) : record.diagnosis
    }));
    
    const medicalBillingResult = await db.query(
      `SELECT * FROM medical_billing 
       WHERE user_id = $1 AND accessible_by_law_firm = true 
       ORDER BY bill_date DESC NULLS LAST, uploaded_at DESC`,
      [clientId]
    );
    
    // HIPAA: Decrypt billing PHI fields
    const decryptedBillingRecords = medicalBillingResult.rows.map(bill => ({
      ...bill,
      description: bill.description_encrypted ? 
        encryption.decrypt(bill.description_encrypted) : bill.description,
      provider_name: bill.provider_name_encrypted ? 
        encryption.decrypt(bill.provider_name_encrypted) : bill.provider_name,
      insurance_info: bill.insurance_info_encrypted ? 
        encryption.decrypt(bill.insurance_info_encrypted) : bill.insurance_info
    }));
    
    const evidenceResult = await db.query(
      `SELECT * FROM evidence 
       WHERE user_id = $1 AND accessible_by_law_firm = true 
       ORDER BY date_of_incident DESC NULLS LAST, uploaded_at DESC`,
      [clientId]
    );
    
    const litigationStageResult = await db.query(
      'SELECT * FROM litigation_stages WHERE user_id = $1 AND law_firm_id = $2',
      [clientId, lawFirmId]
    );
    
    const totalBilled = medicalBillingResult.rows.reduce((sum, bill) => 
      sum + parseFloat(bill.total_amount || 0), 0);
    const totalDue = medicalBillingResult.rows.reduce((sum, bill) => 
      sum + parseFloat(bill.amount_due || 0), 0);
    
    // HIPAA: Log law firm accessing client PHI
    await auditLogger.logPhiAccess({
      userId: lawFirmId,
      userType: 'lawfirm',
      action: 'VIEW_CLIENT_DETAILS',
      patientId: clientId,
      recordType: 'ClientDetails',
      recordId: clientId,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      success: true
    });
    
    // Log access to medical records
    if (medicalRecordsResult.rows.length > 0) {
      await auditLogger.log({
        actorId: lawFirmId,
        actorType: 'lawfirm',
        action: 'VIEW_MEDICAL_RECORD',
        entityType: 'MedicalRecord',
        entityId: null,
        targetUserId: parseInt(clientId),
        status: 'SUCCESS',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        metadata: { recordCount: medicalRecordsResult.rows.length }
      });
    }
    
    // Log access to billing records
    if (medicalBillingResult.rows.length > 0) {
      await auditLogger.log({
        actorId: lawFirmId,
        actorType: 'lawfirm',
        action: 'VIEW_BILLING',
        entityType: 'MedicalBilling',
        entityId: null,
        targetUserId: parseInt(clientId),
        status: 'SUCCESS',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        metadata: { billingCount: medicalBillingResult.rows.length, totalBilled, totalDue }
      });
    }
    
    res.json({
      client: {
        id: client.id,
        firstName: client.first_name,
        lastName: client.last_name,
        displayName: `${client.last_name}, ${client.first_name}`,
        email: client.email
      },
      medicalRecords: {
        total: decryptedMedicalRecords.length,
        records: decryptedMedicalRecords
      },
      medicalBilling: {
        total: decryptedBillingRecords.length,
        totalAmountBilled: totalBilled,
        totalAmountDue: totalDue,
        bills: decryptedBillingRecords
      },
      evidenceDocuments: {
        total: evidenceResult.rows.length,
        documents: evidenceResult.rows
      },
      litigationStage: litigationStageResult.rows[0] || null
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching client details', error: error.message });
  }
};

exports.updateLitigationStage = async (req, res) => {
  try {
    const { clientId } = req.params;
    const lawFirmId = req.user.id;
    const { newStage, notes, nextStepDueDate, nextStepDescription, caseValue, settlementAmount, caseNumber, status } = req.body;
    
    const clientCheckResult = await db.query(
      'SELECT * FROM law_firm_clients WHERE law_firm_id = $1 AND client_id = $2',
      [lawFirmId, clientId]
    );
    
    if (clientCheckResult.rows.length === 0) {
      return res.status(403).json({ message: 'Access denied. Client not registered with your firm.' });
    }
    
    const existingResult = await db.query(
      'SELECT * FROM litigation_stages WHERE user_id = $1 AND law_firm_id = $2',
      [clientId, lawFirmId]
    );
    
    let litigationStage;
    
    if (existingResult.rows.length === 0) {
      const insertResult = await db.query(
        `INSERT INTO litigation_stages (user_id, law_firm_id, current_stage, case_number, 
         next_step_due_date, next_step_description, case_value, settlement_amount, status, notes) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [clientId, lawFirmId, newStage || 'initial_consultation', caseNumber || null,
         nextStepDueDate || null, nextStepDescription || null, caseValue || null,
         settlementAmount || null, status || 'active', notes || null]
      );
      litigationStage = insertResult.rows[0];
      
      if (newStage) {
        await db.query(
          `INSERT INTO litigation_stage_history (litigation_stage_id, stage, completed_by, notes) 
           VALUES ($1, $2, $3, $4)`,
          [litigationStage.id, newStage, lawFirmId, notes || null]
        );
      }
    } else {
      const currentStage = existingResult.rows[0];
      
      if (newStage && newStage !== currentStage.current_stage) {
        await db.query(
          `INSERT INTO litigation_stage_history (litigation_stage_id, stage, completed_by, notes) 
           VALUES ($1, $2, $3, $4)`,
          [currentStage.id, newStage, lawFirmId, notes || null]
        );
      }
      
      const updateResult = await db.query(
        `UPDATE litigation_stages 
         SET current_stage = COALESCE($1, current_stage),
             case_number = COALESCE($2, case_number),
             next_step_due_date = $3,
             next_step_description = $4,
             case_value = $5,
             settlement_amount = $6,
             status = COALESCE($7, status),
             notes = $8,
             last_updated = CURRENT_TIMESTAMP
         WHERE id = $9 RETURNING *`,
        [newStage, caseNumber, nextStepDueDate, nextStepDescription, caseValue, 
         settlementAmount, status, notes, currentStage.id]
      );
      litigationStage = updateResult.rows[0];
    }
    
    res.json({
      message: 'Litigation stage updated successfully',
      litigationStage
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating litigation stage', error: error.message });
  }
};

exports.getLitigationHistory = async (req, res) => {
  try {
    const { clientId } = req.params;
    const lawFirmId = req.user.id;
    
    const clientCheckResult = await db.query(
      'SELECT * FROM law_firm_clients WHERE law_firm_id = $1 AND client_id = $2',
      [lawFirmId, clientId]
    );
    
    if (clientCheckResult.rows.length === 0) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    
    const litigationStageResult = await db.query(
      'SELECT id FROM litigation_stages WHERE user_id = $1 AND law_firm_id = $2',
      [clientId, lawFirmId]
    );
    
    if (litigationStageResult.rows.length === 0) {
      return res.json({ history: [] });
    }
    
    const historyResult = await db.query(
      `SELECT lsh.*, lf.firm_name 
       FROM litigation_stage_history lsh
       LEFT JOIN law_firms lf ON lsh.completed_by = lf.id
       WHERE lsh.litigation_stage_id = $1 
       ORDER BY lsh.completed_date DESC`,
      [litigationStageResult.rows[0].id]
    );
    
    res.json({ history: historyResult.rows });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching litigation history', error: error.message });
  }
};

exports.getClientDocuments = async (req, res) => {
  try {
    const { clientId } = req.params;
    const lawFirmId = req.user.id;
    const documentAccessService = require('../services/documentAccessService');
    
    const result = await documentAccessService.listClientDocuments(lawFirmId, clientId);
    
    // HIPAA: Log law firm accessing client documents
    await auditLogger.log({
      actorId: lawFirmId,
      actorType: 'lawfirm',
      action: 'VIEW_CLIENT_DOCUMENTS',
      entityType: 'User',
      entityId: clientId,
      targetUserId: clientId,
      status: 'SUCCESS',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      metadata: {
        documentCounts: {
          medical_records: result.documents.medical_records.length,
          medical_billing: result.documents.medical_billing.length,
          evidence: result.documents.evidence.length
        }
      }
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching client documents', error: error.message });
  }
};

exports.getDocumentNotifications = async (req, res) => {
  try {
    const lawFirmId = req.user.id;
    const { status } = req.query; // optional filter: 'unread' or 'read'
    const documentAccessService = require('../services/documentAccessService');
    
    const notifications = await documentAccessService.getLawFirmNotifications(lawFirmId, status);
    
    res.json({ notifications });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notifications', error: error.message });
  }
};

exports.markNotificationAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const lawFirmId = req.user.id;
    const documentAccessService = require('../services/documentAccessService');
    
    const notification = await documentAccessService.markNotificationAsRead(notificationId, lawFirmId);
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    res.json({ message: 'Notification marked as read', notification });
  } catch (error) {
    res.status(500).json({ message: 'Error marking notification as read', error: error.message });
  }
};

exports.getUnreadNotificationCount = async (req, res) => {
  try {
    const lawFirmId = req.user.id;
    const documentAccessService = require('../services/documentAccessService');
    
    const count = await documentAccessService.getUnreadNotificationCount(lawFirmId);
    
    res.json({ unreadCount: count });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notification count', error: error.message });
  }
};

exports.getClientForms = async (req, res) => {
  try {
    const lawFirmId = req.user.id;
    const { clientId } = req.params;
    
    const clientCheckResult = await db.query(
      'SELECT * FROM law_firm_clients WHERE law_firm_id = $1 AND client_id = $2',
      [lawFirmId, clientId]
    );
    
    if (clientCheckResult.rows.length === 0) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    
    const forms = await formsService.getLawFirmForms(lawFirmId);
    const clientForms = forms.filter(form => form.patient_id === parseInt(clientId));
    
    res.json({ forms: clientForms });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching client forms', error: error.message });
  }
};

exports.createClientForm = async (req, res) => {
  try {
    const lawFirmId = req.user.id;
    const { clientId } = req.params;
    const { templateId, formData, medicalProviderId } = req.body;
    
    const clientCheckResult = await db.query(
      'SELECT * FROM law_firm_clients WHERE law_firm_id = $1 AND client_id = $2',
      [lawFirmId, clientId]
    );
    
    if (clientCheckResult.rows.length === 0) {
      return res.status(403).json({ message: 'Access denied.' });
    }
    
    const submission = await formsService.createFormSubmission({
      templateId,
      patientId: clientId,
      lawFirmId,
      medicalProviderId: medicalProviderId || null,
      formData,
      submittedBy: lawFirmId,
      submittedByType: 'lawfirm'
    });
    
    res.status(201).json({ message: 'Form created successfully', submission });
  } catch (error) {
    res.status(500).json({ message: 'Error creating form', error: error.message });
  }
};

exports.getAllLawFirmForms = async (req, res) => {
  try {
    const lawFirmId = req.user.id;
    const forms = await formsService.getLawFirmForms(lawFirmId);
    res.json({ forms });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching forms', error: error.message });
  }
};
