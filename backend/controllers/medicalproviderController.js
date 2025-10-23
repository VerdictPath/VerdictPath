const db = require('../config/db');
const encryption = require('../services/encryption');

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
        u.first_name_encrypted,
        u.last_name_encrypted,
        u.email,
        cr.consent_type,
        cr.status as consent_status,
        cr.granted_at as registered_date,
        (SELECT COUNT(*) FROM medical_records WHERE user_id = u.id) as record_count,
        (SELECT COALESCE(SUM(amount_billed), 0) FROM medical_billing WHERE user_id = u.id) as total_billed
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
      const firstName = encryption.decrypt(patient.first_name_encrypted);
      const lastName = encryption.decrypt(patient.last_name_encrypted);
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
      `SELECT mr.id, mr.file_name, mr.file_type, mr.uploaded_date, mr.category, mr.user_id,
              u.first_name_encrypted, u.last_name_encrypted
       FROM medical_records mr
       INNER JOIN users u ON mr.user_id = u.id
       INNER JOIN consent_records cr ON u.id = cr.patient_id
       WHERE cr.granted_to_type = 'medical_provider'
         AND cr.granted_to_id = $1
         AND cr.status = 'active'
       ORDER BY mr.uploaded_date DESC
       LIMIT 50`,
      [providerId]
    );
    
    const medicalRecords = medicalRecordsResult.rows.map(record => {
      const firstName = encryption.decrypt(record.first_name_encrypted);
      const lastName = encryption.decrypt(record.last_name_encrypted);
      
      return {
        type: record.category || record.file_name,
        status: 'Available',
        clientName: `${lastName}, ${firstName}`,
        patientName: `${lastName}, ${firstName}`,
        uploadedDate: record.uploaded_date
      };
    });
    
    // Get evidence documents (using medical records as evidence for now)
    const evidence = medicalRecordsResult.rows.slice(0, 10).map(record => {
      const firstName = encryption.decrypt(record.first_name_encrypted);
      const lastName = encryption.decrypt(record.last_name_encrypted);
      
      return {
        title: record.file_name,
        type: record.category || 'Medical Document',
        patientName: `${lastName}, ${firstName}`,
        addedDate: record.uploaded_date
      };
    });
    
    // Calculate litigation stage analytics
    // TODO: When litigation tracking is implemented, calculate from actual stage data
    // For now, return placeholder values
    const analytics = {
      totalPatients: patients.length,
      preLitigationCount: 0,  // Patients in Pre-Litigation stage
      litigationCount: 0,      // Patients in Litigation stages
      trialCount: 0            // Patients in Trial stage
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
      `SELECT id, file_name, file_type, file_size, uploaded_date, category
       FROM medical_records
       WHERE user_id = $1
       ORDER BY uploaded_date DESC`,
      [patientId]
    );
    
    // Get medical billing
    const billingResult = await db.query(
      `SELECT id, amount_billed, amount_due, bill_date, provider_name, service_description
       FROM medical_billing
       WHERE user_id = $1
       ORDER BY bill_date DESC`,
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
      medicalRecords: {
        total: medicalRecordsResult.rows.length,
        records: medicalRecordsResult.rows
      },
      medicalBilling: {
        total: billingResult.rows.length,
        totalAmountBilled: billingResult.rows.reduce((sum, bill) => sum + parseFloat(bill.amount_billed || 0), 0),
        totalAmountDue: billingResult.rows.reduce((sum, bill) => sum + parseFloat(bill.amount_due || 0), 0),
        bills: billingResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching patient details:', error);
    res.status(500).json({ message: 'Error fetching patient details', error: error.message });
  }
};

module.exports = exports;
