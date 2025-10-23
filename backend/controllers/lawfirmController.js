const db = require('../config/db');

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
      `SELECT u.id, u.first_name, u.last_name, u.email, lfc.registered_date
       FROM users u
       JOIN law_firm_clients lfc ON u.id = lfc.client_id
       WHERE lfc.law_firm_id = $1
       ORDER BY u.last_name ASC, u.first_name ASC`,
      [lawFirmId]
    );
    
    const clients = clientsResult.rows.map(client => ({
      id: client.id,
      displayName: `${client.last_name}, ${client.first_name}`,
      firstName: client.first_name,
      lastName: client.last_name,
      email: client.email,
      registeredDate: client.registered_date
    }));
    
    res.json({
      firmName: lawFirm.firm_name,
      firmCode: lawFirm.firm_code,
      totalClients: clients.length,
      clients: clients
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
      'SELECT id, first_name, last_name, email FROM users WHERE id = $1',
      [clientId]
    );
    
    if (clientResult.rows.length === 0) {
      return res.status(404).json({ message: 'Client not found' });
    }
    
    const client = clientResult.rows[0];
    
    const medicalRecordsResult = await db.query(
      `SELECT * FROM medical_records 
       WHERE user_id = $1 AND accessible_by_law_firm = true 
       ORDER BY date_of_service DESC NULLS LAST, uploaded_at DESC`,
      [clientId]
    );
    
    const medicalBillingResult = await db.query(
      `SELECT * FROM medical_billing 
       WHERE user_id = $1 AND accessible_by_law_firm = true 
       ORDER BY bill_date DESC NULLS LAST, uploaded_at DESC`,
      [clientId]
    );
    
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
    
    res.json({
      client: {
        id: client.id,
        firstName: client.first_name,
        lastName: client.last_name,
        displayName: `${client.last_name}, ${client.first_name}`,
        email: client.email
      },
      medicalRecords: {
        total: medicalRecordsResult.rows.length,
        records: medicalRecordsResult.rows
      },
      medicalBilling: {
        total: medicalBillingResult.rows.length,
        totalAmountBilled: totalBilled,
        totalAmountDue: totalDue,
        bills: medicalBillingResult.rows
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
