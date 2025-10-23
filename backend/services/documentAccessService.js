const pool = require('../config/db');

async function verifyLawFirmClientRelationship(lawFirmId, clientId) {
  const result = await pool.query(
    `SELECT 1 FROM law_firm_clients 
     WHERE law_firm_id = $1 AND client_id = $2`,
    [lawFirmId, clientId]
  );
  return result.rows.length > 0;
}

async function verifyLawFirmConsent(lawFirmId, patientId, documentType) {
  const result = await pool.query(
    `SELECT cr.id, cr.consent_type
     FROM consent_records cr
     LEFT JOIN consent_scope cs ON cr.id = cs.consent_id
     WHERE cr.patient_id = $1
       AND cr.granted_to_type = 'lawfirm'
       AND cr.granted_to_id = $2
       AND cr.status = 'active'
       AND (cr.expires_at IS NULL OR cr.expires_at > NOW())
       AND (
         cr.consent_type = 'FULL_ACCESS' OR
         (cr.consent_type = 'MEDICAL_RECORDS_ONLY' AND $3 = 'medical_records') OR
         (cr.consent_type = 'BILLING_ONLY' AND $3 = 'medical_billing') OR
         (cr.consent_type = 'CUSTOM' AND cs.data_type = $3 AND cs.can_view = TRUE)
       )
     LIMIT 1`,
    [patientId, lawFirmId, documentType]
  );
  
  return result.rows.length > 0 ? result.rows[0] : null;
}

async function authorizeLawFirmDocumentAccess(lawFirmId, patientId, documentType, documentId) {
  const isClient = await verifyLawFirmClientRelationship(lawFirmId, patientId);
  
  if (!isClient) {
    return {
      authorized: false,
      reason: 'Patient is not a client of this law firm'
    };
  }

  const consent = await verifyLawFirmConsent(lawFirmId, patientId, documentType);
  
  if (!consent) {
    return {
      authorized: false,
      reason: 'No active HIPAA consent on file for this document type'
    };
  }

  let tableName;
  switch(documentType) {
    case 'medical_records':
      tableName = 'medical_records';
      break;
    case 'medical_billing':
      tableName = 'medical_billing';
      break;
    case 'evidence':
      tableName = 'evidence';
      break;
    default:
      return {
        authorized: false,
        reason: 'Invalid document type'
      };
  }

  const docResult = await pool.query(
    `SELECT * FROM ${tableName} 
     WHERE id = $1 AND user_id = $2 AND accessible_by_law_firm = TRUE`,
    [documentId, patientId]
  );

  if (docResult.rows.length === 0) {
    return {
      authorized: false,
      reason: 'Document not found or not accessible'
    };
  }

  return {
    authorized: true,
    document: docResult.rows[0],
    consentType: consent.consent_type
  };
}

async function listClientDocuments(lawFirmId, clientId) {
  const isClient = await verifyLawFirmClientRelationship(lawFirmId, clientId);
  
  if (!isClient) {
    throw new Error('Patient is not a client of this law firm');
  }

  const medicalRecordsConsent = await verifyLawFirmConsent(lawFirmId, clientId, 'medical_records');
  const billingConsent = await verifyLawFirmConsent(lawFirmId, clientId, 'medical_billing');
  const evidenceConsent = await verifyLawFirmConsent(lawFirmId, clientId, 'evidence');

  const documents = {
    medical_records: [],
    medical_billing: [],
    evidence: []
  };

  if (medicalRecordsConsent) {
    const result = await pool.query(
      `SELECT id, record_type, file_name, file_size, uploaded_at, facility_name, provider_name, date_of_service
       FROM medical_records 
       WHERE user_id = $1 AND accessible_by_law_firm = TRUE
       ORDER BY uploaded_at DESC`,
      [clientId]
    );
    documents.medical_records = result.rows;
  }

  if (billingConsent) {
    const result = await pool.query(
      `SELECT id, billing_type, file_name, file_size, uploaded_at, facility_name, total_amount, amount_due, bill_date
       FROM medical_billing 
       WHERE user_id = $1 AND accessible_by_law_firm = TRUE
       ORDER BY uploaded_at DESC`,
      [clientId]
    );
    documents.medical_billing = result.rows;
  }

  if (evidenceConsent) {
    const result = await pool.query(
      `SELECT id, evidence_type, title, file_name, file_size, uploaded_at, description, date_of_incident
       FROM evidence 
       WHERE user_id = $1 AND accessible_by_law_firm = TRUE
       ORDER BY uploaded_at DESC`,
      [clientId]
    );
    documents.evidence = result.rows;
  }

  return {
    documents,
    consents: {
      medical_records: medicalRecordsConsent !== null,
      medical_billing: billingConsent !== null,
      evidence: evidenceConsent !== null
    }
  };
}

async function createDocumentNotification(patientId, lawFirmId, documentType, documentId, uploadedBy, uploadedByRole) {
  const result = await pool.query(
    `INSERT INTO document_notifications 
     (patient_id, law_firm_id, document_type, document_id, uploaded_by, uploaded_by_role, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'unread')
     RETURNING *`,
    [patientId, lawFirmId, documentType, documentId, uploadedBy, uploadedByRole]
  );
  
  return result.rows[0];
}

async function getLawFirmNotifications(lawFirmId, status = null) {
  let query = `
    SELECT 
      dn.*,
      u.first_name || ' ' || u.last_name as patient_name,
      u.email as patient_email,
      uploader.first_name || ' ' || uploader.last_name as uploaded_by_name
    FROM document_notifications dn
    JOIN users u ON dn.patient_id = u.id
    JOIN users uploader ON dn.uploaded_by = uploader.id
    WHERE dn.law_firm_id = $1
  `;
  
  const params = [lawFirmId];
  
  if (status) {
    query += ` AND dn.status = $2`;
    params.push(status);
  }
  
  query += ` ORDER BY dn.created_at DESC LIMIT 100`;
  
  const result = await pool.query(query, params);
  return result.rows;
}

async function markNotificationAsRead(notificationId, lawFirmId) {
  const result = await pool.query(
    `UPDATE document_notifications 
     SET status = 'read', read_at = NOW()
     WHERE id = $1 AND law_firm_id = $2
     RETURNING *`,
    [notificationId, lawFirmId]
  );
  
  return result.rows[0];
}

async function getUnreadNotificationCount(lawFirmId) {
  const result = await pool.query(
    `SELECT COUNT(*) as count 
     FROM document_notifications 
     WHERE law_firm_id = $1 AND status = 'unread'`,
    [lawFirmId]
  );
  
  return parseInt(result.rows[0].count);
}

module.exports = {
  authorizeLawFirmDocumentAccess,
  listClientDocuments,
  createDocumentNotification,
  getLawFirmNotifications,
  markNotificationAsRead,
  getUnreadNotificationCount,
  verifyLawFirmClientRelationship,
  verifyLawFirmConsent
};
