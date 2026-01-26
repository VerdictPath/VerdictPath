const db = require('../config/db');
const crypto = require('crypto');
const auditLogger = require('./auditLogger');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-gcm';

function encrypt(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
  if (!text) return null;
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encryptedText = parts[2];
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

class FormsService {
  async getFormTemplates(filter = {}) {
    let query = 'SELECT * FROM form_templates WHERE is_active = true';
    const params = [];
    
    if (filter.template_type) {
      params.push(filter.template_type);
      query += ` AND template_type = $${params.length}`;
    }
    
    query += ' ORDER BY template_name';
    
    const result = await db.query(query, params);
    return result.rows;
  }

  async getFormTemplate(templateId) {
    const result = await db.query(
      'SELECT * FROM form_templates WHERE id = $1 AND is_active = true',
      [templateId]
    );
    return result.rows[0] || null;
  }

  async createFormSubmission(data) {
    const { templateId, patientId, lawFirmId, medicalProviderId, formData, submittedBy, submittedByType } = data;
    
    if (submittedByType === 'lawfirm') {
      const relationshipCheck = await db.query(
        'SELECT * FROM law_firm_clients WHERE law_firm_id = $1 AND client_id = $2',
        [submittedBy, patientId]
      );
      
      if (relationshipCheck.rows.length === 0) {
        throw new Error('Access denied: No relationship with this patient');
      }
    } else if (submittedByType === 'medical_provider') {
      const relationshipCheck = await db.query(
        'SELECT * FROM medical_provider_patients WHERE medical_provider_id = $1 AND patient_id = $2',
        [submittedBy, patientId]
      );
      
      if (relationshipCheck.rows.length === 0) {
        throw new Error('Access denied: No relationship with this patient');
      }
    } else if (submittedByType === 'user') {
      if (submittedBy !== patientId) {
        throw new Error('Access denied: Patients can only create forms for themselves');
      }
    }
    
    const formDataEncrypted = encrypt(JSON.stringify(formData));
    
    const result = await db.query(
      `INSERT INTO form_submissions 
       (template_id, patient_id, law_firm_id, medical_provider_id, form_data_encrypted, status, submitted_by, submitted_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP) 
       RETURNING *`,
      [templateId, patientId, lawFirmId, medicalProviderId, formDataEncrypted, 'pending_signature', submittedBy]
    );
    
    await auditLogger.log({
      actorId: submittedBy,
      actorType: submittedByType,
      action: 'CREATE_HIPAA_FORM',
      entityType: 'FormSubmission',
      entityId: result.rows[0].id,
      targetUserId: patientId,
      status: 'SUCCESS',
      metadata: {
        templateId,
        formType: 'hipaa_form'
      }
    });
    
    return result.rows[0];
  }

  async updateFormSubmission(submissionId, formData, updatedBy, updatedByType) {
    const submission = await db.query(
      'SELECT * FROM form_submissions WHERE id = $1',
      [submissionId]
    );
    
    if (!submission.rows[0]) {
      throw new Error('Form submission not found');
    }
    
    const hasAccess = await this.checkFormAccess(submission.rows[0], updatedBy, updatedByType);
    
    if (!hasAccess) {
      throw new Error('Access denied to update this form');
    }
    
    if (submission.rows[0].status === 'signed') {
      throw new Error('Cannot update a signed form');
    }
    
    const formDataEncrypted = encrypt(JSON.stringify(formData));
    
    const result = await db.query(
      `UPDATE form_submissions 
       SET form_data_encrypted = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING *`,
      [formDataEncrypted, submissionId]
    );
    
    await auditLogger.log({
      actorId: updatedBy,
      actorType: updatedByType,
      action: 'UPDATE_HIPAA_FORM',
      entityType: 'FormSubmission',
      entityId: submissionId,
      targetUserId: submission.rows[0].patient_id,
      status: 'SUCCESS',
      metadata: {
        formType: 'hipaa_form'
      }
    });
    
    return result.rows[0] || null;
  }

  async signForm(submissionId, signerId, signatureData, ipAddress, userAgent) {
    const submission = await db.query(
      'SELECT * FROM form_submissions WHERE id = $1',
      [submissionId]
    );
    
    if (!submission.rows[0]) {
      throw new Error('Form submission not found');
    }
    
    if (submission.rows[0].patient_id !== signerId) {
      throw new Error('Only the patient can sign this form');
    }
    
    const signerType = 'patient';
    const consentText = 'I hereby acknowledge that I have read and understood the contents of this form and agree to its terms.';
    
    await db.query('BEGIN');
    
    try {
      const signatureResult = await db.query(
        `INSERT INTO form_signatures 
         (form_submission_id, signer_id, signer_type, signature_data, ip_address, user_agent, consent_text, consent_acknowledged) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, true) 
         RETURNING *`,
        [submissionId, signerId, signerType, signatureData, ipAddress, userAgent, consentText]
      );
      
      await db.query(
        `UPDATE form_submissions 
         SET status = 'signed', signed_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [submissionId]
      );
      
      await auditLogger.log({
        actorId: signerId,
        actorType: 'user',
        action: 'SIGN_HIPAA_FORM',
        entityType: 'FormSubmission',
        entityId: submissionId,
        targetUserId: submission.rows[0].patient_id,
        status: 'SUCCESS',
        ipAddress,
        userAgent,
        metadata: {
          signatureId: signatureResult.rows[0].id,
          formType: 'hipaa_form'
        }
      });
      
      await db.query('COMMIT');
      
      return signatureResult.rows[0];
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  }

  async getFormSubmission(submissionId, requestorId, requestorType) {
    const result = await db.query(
      'SELECT fs.*, ft.template_name, ft.template_type FROM form_submissions fs LEFT JOIN form_templates ft ON fs.template_id = ft.id WHERE fs.id = $1',
      [submissionId]
    );
    
    if (!result.rows[0]) {
      return null;
    }
    
    const submission = result.rows[0];
    
    const hasAccess = await this.checkFormAccess(submission, requestorId, requestorType);
    
    if (!hasAccess) {
      throw new Error('Access denied to this form');
    }
    
    if (submission.form_data_encrypted) {
      try {
        submission.form_data = JSON.parse(decrypt(submission.form_data_encrypted));
      } catch (error) {
        console.error('Error decrypting form data:', error);
      }
    }
    
    const signaturesResult = await db.query(
      `SELECT fs.*, u.email, u.first_name, u.last_name 
       FROM form_signatures fs 
       LEFT JOIN users u ON fs.signer_id = u.id 
       WHERE fs.form_submission_id = $1 
       ORDER BY fs.signed_at DESC`,
      [submissionId]
    );
    
    submission.signatures = signaturesResult.rows;
    
    await auditLogger.log({
      actorId: requestorId,
      actorType: requestorType,
      action: 'VIEW_HIPAA_FORM',
      entityType: 'FormSubmission',
      entityId: submissionId,
      targetUserId: submission.patient_id,
      status: 'SUCCESS',
      metadata: {
        formType: submission.template_type
      }
    });
    
    return submission;
  }

  async checkFormAccess(submission, requestorId, requestorType) {
    if (requestorType === 'user' && submission.patient_id === requestorId) {
      return true;
    }
    
    if (requestorType === 'lawfirm' && submission.law_firm_id === requestorId) {
      return true;
    }
    
    if (requestorType === 'medical_provider' && submission.medical_provider_id === requestorId) {
      return true;
    }
    
    return false;
  }

  async getPatientForms(patientId) {
    const result = await db.query(
      `SELECT fs.*, ft.template_name, ft.template_type, 
              lf.firm_name as law_firm_name, 
              mp.provider_name as medical_provider_name,
              (SELECT COUNT(*) FROM form_signatures WHERE form_submission_id = fs.id) as signature_count
       FROM form_submissions fs 
       LEFT JOIN form_templates ft ON fs.template_id = ft.id 
       LEFT JOIN law_firms lf ON fs.law_firm_id = lf.id 
       LEFT JOIN medical_providers mp ON fs.medical_provider_id = mp.id 
       WHERE fs.patient_id = $1 
       ORDER BY fs.created_at DESC`,
      [patientId]
    );
    
    return result.rows;
  }

  async getLawFirmForms(lawFirmId) {
    const result = await db.query(
      `SELECT fs.*, ft.template_name, ft.template_type, 
              u.email, u.first_name, u.last_name,
              (SELECT COUNT(*) FROM form_signatures WHERE form_submission_id = fs.id) as signature_count
       FROM form_submissions fs 
       LEFT JOIN form_templates ft ON fs.template_id = ft.id 
       LEFT JOIN users u ON fs.patient_id = u.id 
       WHERE fs.law_firm_id = $1 
       ORDER BY fs.created_at DESC`,
      [lawFirmId]
    );
    
    return result.rows;
  }

  async getMedicalProviderForms(medicalProviderId) {
    const result = await db.query(
      `SELECT fs.*, ft.template_name, ft.template_type, 
              u.email, u.first_name, u.last_name,
              lf.firm_name as law_firm_name,
              (SELECT COUNT(*) FROM form_signatures WHERE form_submission_id = fs.id) as signature_count
       FROM form_submissions fs 
       LEFT JOIN form_templates ft ON fs.template_id = ft.id 
       LEFT JOIN users u ON fs.patient_id = u.id 
       LEFT JOIN law_firms lf ON fs.law_firm_id = lf.id 
       WHERE fs.medical_provider_id = $1 
       ORDER BY fs.created_at DESC`,
      [medicalProviderId]
    );
    
    return result.rows;
  }

  async deleteFormSubmission(submissionId, requestorId, requestorType) {
    const submission = await db.query(
      'SELECT * FROM form_submissions WHERE id = $1',
      [submissionId]
    );
    
    if (!submission.rows[0]) {
      throw new Error('Form submission not found');
    }
    
    if (submission.rows[0].status === 'signed') {
      throw new Error('Cannot delete a signed form');
    }
    
    const hasAccess = await this.checkFormAccess(submission.rows[0], requestorId, requestorType);
    
    if (!hasAccess) {
      throw new Error('Access denied');
    }
    
    await db.query('DELETE FROM form_submissions WHERE id = $1', [submissionId]);
    
    await auditLogger.log({
      actorId: requestorId,
      actorType: requestorType,
      action: 'DELETE_HIPAA_FORM',
      entityType: 'FormSubmission',
      entityId: submissionId,
      targetUserId: submission.rows[0].patient_id,
      status: 'SUCCESS',
      metadata: {
        reason: 'form_deletion'
      }
    });
    
    return true;
  }
}

module.exports = new FormsService();
