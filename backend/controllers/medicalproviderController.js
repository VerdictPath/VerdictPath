const db = require('../config/db');
const encryption = require('../services/encryption');

/**
 * Get Patients List (simplified for dropdowns/selection)
 * Returns basic list of patients who have granted consent to this provider
 */
exports.getPatients = async (req, res) => {
  try {
    const providerId = req.user.id;
    
    // Get patients who have granted consent to this provider
    const patientsResult = await db.query(
      `SELECT DISTINCT
        u.id,
        u.first_name,
        u.last_name,
        u.first_name_encrypted,
        u.last_name_encrypted,
        u.email
       FROM users u
       INNER JOIN consent_records cr ON u.id = cr.patient_id
       WHERE cr.granted_to_type = 'medical_provider'
         AND cr.granted_to_id = $1
         AND cr.status = 'active'
         AND u.user_type = 'client'
       ORDER BY u.last_name, u.first_name`,
      [providerId]
    );
    
    // Decrypt patient names
    const patients = patientsResult.rows.map((patient) => {
      const firstName = patient.first_name_encrypted ? encryption.decrypt(patient.first_name_encrypted) : patient.first_name;
      const lastName = patient.last_name_encrypted ? encryption.decrypt(patient.last_name_encrypted) : patient.last_name;
      
      return {
        id: patient.id,
        firstName: firstName,
        lastName: lastName,
        displayName: `${lastName}, ${firstName}`,
        email: patient.email
      };
    });
    
    res.json({ patients });
  } catch (error) {
    console.error('Error fetching patients list:', error);
    res.status(500).json({ message: 'Error fetching patients', error: error.message });
  }
};

/**
 * Get Medical Provider Dashboard
 * Shows list of patients who have granted consent to this provider
 */
exports.getDashboard = async (req, res) => {
  try {
    const providerId = req.user.id;
    
    // Get provider info
    const providerResult = await db.query(
      'SELECT id, provider_name, provider_code, email FROM medical_providers WHERE id = $1',
      [providerId]
    );
    
    if (providerResult.rows.length === 0) {
      return res.status(404).json({ message: 'Provider not found' });
    }
    
    const provider = providerResult.rows[0];
    
    // Get patients who have granted consent to this provider (HIPAA-compliant approach)
    const patientsResult = await db.query(
      `SELECT DISTINCT
        u.id,
        u.first_name,
        u.last_name,
        u.first_name_encrypted,
        u.last_name_encrypted,
        u.email,
        cr.consent_type,
        cr.status as consent_status,
        cr.granted_at as registered_date,
        (SELECT COUNT(*) FROM medical_records WHERE user_id = u.id) as record_count,
        (SELECT COALESCE(SUM(total_amount), 0) FROM medical_billing WHERE user_id = u.id) as total_billed
       FROM users u
       INNER JOIN consent_records cr ON u.id = cr.patient_id
       WHERE cr.granted_to_type = 'medical_provider'
         AND cr.granted_to_id = $1
         AND cr.status = 'active'
         AND u.user_type = 'client'
       ORDER BY cr.granted_at DESC`,
      [providerId]
    );
    
    // Decrypt patient names and format data
    const patients = await Promise.all(patientsResult.rows.map(async (patient) => {
      // Use encrypted names if available, otherwise fall back to regular names
      const firstName = patient.first_name_encrypted ? encryption.decrypt(patient.first_name_encrypted) : patient.first_name;
      const lastName = patient.last_name_encrypted ? encryption.decrypt(patient.last_name_encrypted) : patient.last_name;
      const recordCount = parseInt(patient.record_count) || 0;
      
      // Get litigation progress for this patient
      const litigationProgressResult = await db.query(
        `SELECT current_stage_id, current_stage_name, progress_percentage, total_coins_earned, total_substages_completed
         FROM user_litigation_progress
         WHERE user_id = $1`,
        [patient.id]
      );
      
      const litigationProgress = litigationProgressResult.rows[0] || {
        current_stage_id: 1,
        current_stage_name: 'Pre-Litigation',
        progress_percentage: 0,
        total_coins_earned: 0,
        total_substages_completed: 0
      };
      
      return {
        id: patient.id,
        firstName: firstName,
        lastName: lastName,
        displayName: `${lastName}, ${firstName}`,
        email: patient.email,
        recordCount: recordCount,
        totalBilled: parseFloat(patient.total_billed) || 0,
        registeredDate: patient.registered_date,
        hasConsent: patient.consent_status === 'active',
        medicalRecordCount: recordCount,
        // Litigation progress
        litigationStage: litigationProgress.current_stage_name,
        litigationStageId: litigationProgress.current_stage_id,
        litigationProgress: Math.round(litigationProgress.progress_percentage || 0),
        // Analytics flags expected by dashboard
        hasRecords: recordCount > 0,
        recentUpload: false, // TODO: Calculate based on uploaded_date
        needsReview: false // TODO: Calculate based on review status
      };
    }));
    
    // Get all medical records for consented patients
    const medicalRecordsResult = await db.query(
      `SELECT mr.id, mr.file_name, mr.mime_type, mr.uploaded_at, mr.record_type, mr.user_id,
              u.first_name, u.last_name, u.first_name_encrypted, u.last_name_encrypted
       FROM medical_records mr
       INNER JOIN users u ON mr.user_id = u.id
       INNER JOIN consent_records cr ON u.id = cr.patient_id
       WHERE cr.granted_to_type = 'medical_provider'
         AND cr.granted_to_id = $1
         AND cr.status = 'active'
       ORDER BY mr.uploaded_at DESC
       LIMIT 50`,
      [providerId]
    );
    
    const medicalRecords = medicalRecordsResult.rows.map(record => {
      const firstName = record.first_name_encrypted ? encryption.decrypt(record.first_name_encrypted) : record.first_name;
      const lastName = record.last_name_encrypted ? encryption.decrypt(record.last_name_encrypted) : record.last_name;
      
      return {
        type: record.record_type || record.file_name,
        status: 'Available',
        clientName: `${lastName}, ${firstName}`,
        patientName: `${lastName}, ${firstName}`,
        uploadedDate: record.uploaded_at
      };
    });
    
    // Get evidence documents (using medical records as evidence for now)
    const evidence = medicalRecordsResult.rows.slice(0, 10).map(record => {
      const firstName = record.first_name_encrypted ? encryption.decrypt(record.first_name_encrypted) : record.first_name;
      const lastName = record.last_name_encrypted ? encryption.decrypt(record.last_name_encrypted) : record.last_name;
      
      return {
        title: record.file_name,
        type: record.record_type || 'Medical Document',
        patientName: `${lastName}, ${firstName}`,
        addedDate: record.uploaded_at
      };
    });
    
    // Calculate litigation stage analytics by phase
    const phaseAnalytics = await db.query(
      `SELECT 
         COUNT(*) FILTER (WHERE u.current_phase = 'pre_litigation') AS pre_litigation_count,
         COUNT(*) FILTER (WHERE u.current_phase = 'litigation') AS litigation_count,
         COUNT(*) FILTER (WHERE u.current_phase = 'trial') AS trial_count
       FROM users u
       INNER JOIN consent_records cr ON u.id = cr.patient_id
       WHERE cr.granted_to_type = 'medical_provider'
         AND cr.granted_to_id = $1
         AND cr.status = 'active'
         AND u.user_type = 'client'`,
      [providerId]
    );
    
    const analytics = {
      totalPatients: patients.length,
      preLitigationCount: parseInt(phaseAnalytics.rows[0]?.pre_litigation_count || 0),
      litigationCount: parseInt(phaseAnalytics.rows[0]?.litigation_count || 0),
      trialCount: parseInt(phaseAnalytics.rows[0]?.trial_count || 0)
    };
    
    res.json({
      providerName: provider.provider_name,
      providerCode: provider.provider_code,
      email: provider.email,
      patients: patients,
      medicalRecords: medicalRecords,
      evidence: evidence,
      analytics: analytics
    });
  } catch (error) {
    console.error('Error fetching provider dashboard:', error);
    res.status(500).json({ message: 'Error fetching dashboard', error: error.message });
  }
};

/**
 * Get Patient Details
 * Requires patient consent for PHI access (enforced by requireConsent middleware)
 * HIPAA: Verifies active consent before returning PHI
 */
exports.getPatientDetails = async (req, res) => {
  try {
    const providerId = req.user.id;
    const { patientId } = req.params;
    
    // CRITICAL SECURITY CHECK: Verify this provider has active consent from this patient
    const consentCheck = await db.query(
      `SELECT id FROM consent_records
       WHERE patient_id = $1
         AND granted_to_type = 'medical_provider'
         AND granted_to_id = $2
         AND status = 'active'
       LIMIT 1`,
      [patientId, providerId]
    );
    
    if (consentCheck.rows.length === 0) {
      return res.status(403).json({ 
        message: 'Access denied. Patient has not granted consent to this provider.' 
      });
    }
    
    // Get patient info
    const patientResult = await db.query(
      `SELECT id, first_name_encrypted, last_name_encrypted, email 
       FROM users 
       WHERE id = $1 AND user_type = 'client'`,
      [patientId]
    );
    
    if (patientResult.rows.length === 0) {
      return res.status(404).json({ message: 'Patient not found' });
    }
    
    const patient = patientResult.rows[0];
    
    // HIPAA: Decrypt PHI
    const firstName = encryption.decrypt(patient.first_name_encrypted);
    const lastName = encryption.decrypt(patient.last_name_encrypted);
    
    // Get medical records
    const medicalRecordsResult = await db.query(
      `SELECT id, file_name, mime_type, file_size, uploaded_at, record_type
       FROM medical_records
       WHERE user_id = $1
       ORDER BY uploaded_at DESC`,
      [patientId]
    );
    
    // Get medical billing
    const billingResult = await db.query(
      `SELECT id, total_amount, amount_due, bill_date, facility_name, description
       FROM medical_billing
       WHERE user_id = $1
       ORDER BY bill_date DESC`,
      [patientId]
    );
    
    // Get evidence documents
    const evidenceResult = await db.query(
      `SELECT id, file_name, mime_type, file_size, uploaded_at, evidence_type,
              title, title_encrypted, description, description_encrypted, 
              location, location_encrypted, date_of_incident
       FROM evidence
       WHERE user_id = $1
       ORDER BY uploaded_at DESC`,
      [patientId]
    );
    
    // HIPAA: Decrypt evidence PHI fields and sanitize response
    const decryptedEvidence = evidenceResult.rows.map(evidence => ({
      ...evidence,
      title: evidence.title_encrypted ? 
        encryption.decrypt(evidence.title_encrypted) : evidence.title,
      description: evidence.description_encrypted ? 
        encryption.decrypt(evidence.description_encrypted) : evidence.description,
      location: evidence.location_encrypted ? 
        encryption.decrypt(evidence.location_encrypted) : evidence.location,
      // Remove encrypted fields from output for security
      title_encrypted: undefined,
      description_encrypted: undefined,
      location_encrypted: undefined
    }));
    
    // Get litigation progress
    const litigationProgressResult = await db.query(
      `SELECT id, user_id, current_stage_id, current_stage_name, total_coins_earned,
              total_substages_completed, progress_percentage, started_at, last_activity_at
       FROM user_litigation_progress
       WHERE user_id = $1`,
      [patientId]
    );
    
    // Get completed substages
    const completedSubstagesResult = await db.query(
      `SELECT id, user_id, stage_id, stage_name, substage_id, substage_name,
              substage_type, coins_earned, completed_at, data_value, file_ids, notes
       FROM litigation_substage_completions
       WHERE user_id = $1
       ORDER BY completed_at DESC`,
      [patientId]
    );
    
    res.json({
      patient: {
        id: patient.id,
        firstName,
        lastName,
        displayName: `${lastName}, ${firstName}`,
        email: patient.email
      },
      medicalRecords: medicalRecordsResult.rows || [],
      medicalBilling: billingResult.rows || [],
      evidence: decryptedEvidence || [],
      litigationProgress: {
        progress: litigationProgressResult.rows[0] || null,
        completedSubstages: completedSubstagesResult.rows || []
      }
    });
  } catch (error) {
    console.error('Error fetching patient details:', error);
    res.status(500).json({ message: 'Error fetching patient details', error: error.message });
  }
};

module.exports = exports;
