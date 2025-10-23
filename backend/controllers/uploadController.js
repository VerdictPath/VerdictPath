const pool = require('../config/db');
const auditLogger = require('../services/auditLogger');
const path = require('path');
const fs = require('fs');

// Upload medical records
const uploadMedicalRecord = async (req, res) => {
  try {
    const userId = req.user.id;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { recordType, facilityName, providerName, dateOfService, description } = req.body;

    // Insert into medical_records table
    const result = await pool.query(
      `INSERT INTO medical_records 
       (user_id, record_type, facility_name, provider_name, date_of_service, description, 
        document_url, file_name, file_size, mime_type) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
       RETURNING *`,
      [
        userId,
        recordType || 'Medical Record',
        facilityName || null,
        providerName || null,
        dateOfService || null,
        description || null,
        file.filename, // Store just the filename, not the full path
        file.originalname,
        file.size,
        file.mimetype
      ]
    );

    // HIPAA audit log
    await auditLogger.log({
      userId,
      action: 'UPLOAD_MEDICAL_RECORD',
      resourceType: 'medical_record',
      resourceId: result.rows[0].id,
      details: {
        fileName: file.originalname,
        fileSize: file.size,
        recordType: recordType || 'Medical Record'
      },
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Medical record uploaded successfully',
      document: result.rows[0]
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

    const { 
      billingType, 
      facilityName, 
      billNumber, 
      dateOfService, 
      billDate,
      totalAmount,
      description 
    } = req.body;

    // Insert into medical_billing table
    const result = await pool.query(
      `INSERT INTO medical_billing 
       (user_id, billing_type, facility_name, bill_number, date_of_service, bill_date,
        total_amount, amount_due, description, document_url, file_name, file_size, mime_type) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) 
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
        file.filename, // Store just the filename, not the full path
        file.originalname,
        file.size,
        file.mimetype
      ]
    );

    // HIPAA audit log
    await auditLogger.log({
      userId,
      action: 'UPLOAD_MEDICAL_BILL',
      resourceType: 'medical_billing',
      resourceId: result.rows[0].id,
      details: {
        fileName: file.originalname,
        fileSize: file.size,
        billingType: billingType || 'Medical Bill'
      },
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Medical bill uploaded successfully',
      document: result.rows[0]
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

    const { 
      evidenceType, 
      title, 
      description, 
      dateOfIncident, 
      location 
    } = req.body;

    // Insert into evidence table
    const result = await pool.query(
      `INSERT INTO evidence 
       (user_id, evidence_type, title, description, date_of_incident, location,
        document_url, file_name, file_size, mime_type) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
       RETURNING *`,
      [
        userId,
        evidenceType || 'Document',
        title || file.originalname,
        description || null,
        dateOfIncident || null,
        location || null,
        file.filename, // Store just the filename, not the full path
        file.originalname,
        file.size,
        file.mimetype
      ]
    );

    // HIPAA audit log
    await auditLogger.log({
      userId,
      action: 'UPLOAD_EVIDENCE',
      resourceType: 'evidence',
      resourceId: result.rows[0].id,
      details: {
        fileName: file.originalname,
        fileSize: file.size,
        evidenceType: evidenceType || 'Document'
      },
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'Evidence uploaded successfully',
      document: result.rows[0]
    });
  } catch (error) {
    console.error('Error uploading evidence:', error);
    res.status(500).json({ error: 'Failed to upload evidence' });
  }
};

// Download file with authentication and authorization
const downloadFile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { fileId, type } = req.params; // type: medical-record, medical-bill, or evidence

    let query;
    let tableName;
    
    // Determine which table to query based on type
    switch(type) {
      case 'medical-record':
        tableName = 'medical_records';
        break;
      case 'medical-bill':
        tableName = 'medical_billing';
        break;
      case 'evidence':
        tableName = 'evidence';
        break;
      default:
        return res.status(400).json({ error: 'Invalid file type' });
    }

    // Check if user owns this file
    const result = await pool.query(
      `SELECT * FROM ${tableName} WHERE id = $1 AND user_id = $2`,
      [fileId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found or access denied' });
    }

    const document = result.rows[0];
    // Build correct file path using path.resolve to avoid issues with leading slashes
    const filePath = path.resolve(__dirname, '..', 'uploads', document.document_url);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on server' });
    }

    // HIPAA audit log
    await auditLogger.log({
      userId,
      action: 'DOWNLOAD_FILE',
      resourceType: tableName,
      resourceId: fileId,
      details: {
        fileName: document.file_name,
        fileType: type
      },
      ipAddress: req.ip
    });

    // Set appropriate headers and send file
    res.setHeader('Content-Type', document.mime_type);
    res.setHeader('Content-Disposition', `inline; filename="${document.file_name}"`);
    res.sendFile(filePath);
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
