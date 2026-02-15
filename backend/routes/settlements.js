const express = require('express');
const router = express.Router();
const db = require('../config/db');
const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;
const { authenticateToken, isLawFirm } = require('../middleware/auth');
const { requirePremiumLawFirm } = require('../middleware/premiumAccess');
const { sendSettlementCreatedEmail, sendLienPaymentEmail, sendIOLTADepositConfirmationEmail, sendSettlementStatementEmail } = require('../services/emailService');

const PLATFORM_FEE = 200;

/**
 * GET /api/settlements
 * Get all settlements for a law firm
 */
router.get('/', authenticateToken, isLawFirm, requirePremiumLawFirm, async (req, res) => {
  try {
    const lawFirmId = req.user.id;
    const { status, clientId } = req.query;

    let query = `
      SELECT 
        s.*,
        u.first_name || ' ' || u.last_name as client_name,
        u.email as client_email,
        (SELECT COUNT(*) FROM medical_liens ml WHERE ml.settlement_id = s.id) as lien_count,
        (SELECT COALESCE(SUM(ml.lien_amount), 0) FROM medical_liens ml WHERE ml.settlement_id = s.id) as total_liens
      FROM settlements s
      JOIN users u ON s.client_id = u.id
      WHERE s.law_firm_id = $1
    `;
    
    const params = [lawFirmId];
    let paramIndex = 2;

    if (status) {
      query += ` AND s.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (clientId) {
      query += ` AND s.client_id = $${paramIndex}`;
      params.push(clientId);
      paramIndex++;
    }

    query += ` ORDER BY s.created_at DESC`;

    const result = await db.query(query, params);

    res.json({
      success: true,
      settlements: result.rows.map(row => ({
        id: row.id,
        clientId: row.client_id,
        clientName: row.client_name,
        clientEmail: row.client_email,
        caseName: row.case_name,
        caseNumber: row.case_number,
        insuranceCompanyName: row.insurance_company_name,
        insuranceClaimNumber: row.insurance_claim_number,
        grossSettlementAmount: parseFloat(row.gross_settlement_amount),
        attorneyFees: parseFloat(row.attorney_fees || 0),
        attorneyCosts: parseFloat(row.attorney_costs || 0),
        totalMedicalLiens: parseFloat(row.total_medical_liens || 0),
        netToClient: parseFloat(row.net_to_client || 0),
        ioltaDepositDate: row.iolta_deposit_date,
        ioltaDepositAmount: row.iolta_deposit_amount ? parseFloat(row.iolta_deposit_amount) : null,
        ioltaReferenceNumber: row.iolta_reference_number,
        settlementDate: row.settlement_date,
        status: row.status,
        lienCount: parseInt(row.lien_count),
        totalLiens: parseFloat(row.total_liens),
        createdAt: row.created_at
      }))
    });
  } catch (error) {
    console.error('Error fetching settlements:', error);
    res.status(500).json({ error: 'Failed to fetch settlements' });
  }
});

/**
 * GET /api/settlements/client/:clientId/available-negotiations
 * Get accepted negotiations for a client that can be auto-imported as liens
 */
router.get('/client/:clientId/available-negotiations', authenticateToken, isLawFirm, requirePremiumLawFirm, async (req, res) => {
  try {
    const lawFirmId = req.user.id;
    const { clientId } = req.params;

    const clientCheck = await db.query(
      'SELECT 1 FROM law_firm_clients WHERE law_firm_id = $1 AND client_id = $2',
      [lawFirmId, clientId]
    );
    if (clientCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied to this client' });
    }

    const negotiations = await db.query(`
      SELECT n.id, n.bill_description, n.bill_amount, n.current_offer,
             n.accepted_at, n.status,
             mp.id as medical_provider_id, mp.provider_name
      FROM negotiations n
      JOIN medical_providers mp ON n.medical_provider_id = mp.id
      WHERE n.law_firm_id = $1 
        AND n.client_id = $2 
        AND n.status = 'accepted'
      ORDER BY n.accepted_at DESC
    `, [lawFirmId, clientId]);

    res.json({
      success: true,
      negotiations: negotiations.rows.map(n => ({
        id: n.id,
        billDescription: n.bill_description,
        billAmount: parseFloat(n.bill_amount),
        negotiatedAmount: parseFloat(n.current_offer),
        acceptedAt: n.accepted_at,
        medicalProviderId: n.medical_provider_id,
        providerName: n.provider_name
      }))
    });
  } catch (error) {
    console.error('Error fetching available negotiations:', error);
    res.status(500).json({ error: 'Failed to fetch available negotiations' });
  }
});

/**
 * POST /api/settlements
 * Create a new settlement record
 * Auto-imports accepted negotiations from connected medical providers as liens
 */
router.post('/', authenticateToken, isLawFirm, requirePremiumLawFirm, async (req, res) => {
  const client = await db.getClient();
  try {
    const lawFirmId = req.user.id;
    const {
      clientId,
      caseName,
      caseNumber,
      insuranceCompanyName,
      insuranceClaimNumber,
      insuranceAdjusterName,
      insuranceAdjusterEmail,
      insuranceAdjusterPhone,
      grossSettlementAmount,
      attorneyFees,
      attorneyCosts,
      settlementDate,
      notes,
      skipAutoImport
    } = req.body;

    if (!clientId || !insuranceCompanyName || !grossSettlementAmount) {
      return res.status(400).json({ 
        error: 'Client ID, insurance company name, and gross settlement amount are required' 
      });
    }

    const clientCheck = await client.query(
      'SELECT 1 FROM law_firm_clients WHERE law_firm_id = $1 AND client_id = $2',
      [lawFirmId, clientId]
    );

    if (clientCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied to this client' });
    }

    await client.query('BEGIN');

    const createdBy = req.user.lawFirmUserId || null;

    const result = await client.query(`
      INSERT INTO settlements (
        law_firm_id, client_id, case_name, case_number,
        insurance_company_name, insurance_claim_number,
        insurance_adjuster_name, insurance_adjuster_email, insurance_adjuster_phone,
        gross_settlement_amount, attorney_fees, attorney_costs,
        settlement_date, notes, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'pending', $15)
      RETURNING *
    `, [
      lawFirmId, clientId, caseName, caseNumber,
      insuranceCompanyName, insuranceClaimNumber,
      insuranceAdjusterName, insuranceAdjusterEmail, insuranceAdjusterPhone,
      grossSettlementAmount, attorneyFees || 0, attorneyCosts || 0,
      settlementDate, notes, createdBy
    ]);

    const settlement = result.rows[0];
    let autoImportedCount = 0;

    if (!skipAutoImport) {
      const acceptedNegotiations = await client.query(`
        SELECT n.id, n.bill_description, n.bill_amount, n.current_offer,
               n.medical_provider_id
        FROM negotiations n
        WHERE n.law_firm_id = $1 
          AND n.client_id = $2 
          AND n.status = 'accepted'
      `, [lawFirmId, clientId]);

      for (const neg of acceptedNegotiations.rows) {
        const insertResult = await client.query(`
          INSERT INTO medical_liens (
            settlement_id, law_firm_id, client_id, medical_provider_id,
            original_bill_amount, lien_amount, negotiation_id,
            notes, status, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9)
          ON CONFLICT (settlement_id, negotiation_id) WHERE negotiation_id IS NOT NULL DO NOTHING
        `, [
          settlement.id, lawFirmId, clientId, neg.medical_provider_id,
          neg.bill_amount, neg.current_offer, neg.id,
          `Auto-imported from negotiation: ${neg.bill_description || 'N/A'}`,
          createdBy
        ]);
        if (insertResult.rowCount > 0) {
          autoImportedCount++;
        }
      }
    }

    await client.query(`
      UPDATE settlements 
      SET total_medical_liens = (
        SELECT COALESCE(SUM(lien_amount), 0) 
        FROM medical_liens WHERE settlement_id = $1
      ),
      net_to_client = gross_settlement_amount - attorney_fees - attorney_costs - (
        SELECT COALESCE(SUM(COALESCE(negotiated_amount, lien_amount)), 0) 
        FROM medical_liens WHERE settlement_id = $1
      ),
      updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [settlement.id]);

    await client.query('COMMIT');

    try {
      const clientResult = await db.query(
        'SELECT first_name, last_name, email FROM users WHERE id = $1',
        [clientId]
      );
      const userData = clientResult.rows[0];
      
      if (userData && userData.email) {
        const clientName = userData.first_name && userData.last_name 
          ? `${userData.first_name} ${userData.last_name}` 
          : 'Client';
        
        sendSettlementCreatedEmail(userData.email, clientName, {
          caseName: caseName,
          insuranceCompanyName: insuranceCompanyName,
          grossSettlementAmount: grossSettlementAmount
        }).catch(err => console.error('Error sending settlement created email:', err));
      }
    } catch (emailError) {
      console.error('Error sending settlement email:', emailError);
    }

    res.status(201).json({
      success: true,
      message: autoImportedCount > 0 
        ? `Settlement created with ${autoImportedCount} medical lien${autoImportedCount > 1 ? 's' : ''} auto-imported from negotiations`
        : 'Settlement created successfully',
      autoImportedLiens: autoImportedCount,
      settlement: {
        id: settlement.id,
        clientId: settlement.client_id,
        caseName: settlement.case_name,
        caseNumber: settlement.case_number,
        insuranceCompanyName: settlement.insurance_company_name,
        grossSettlementAmount: parseFloat(settlement.gross_settlement_amount),
        status: settlement.status,
        createdAt: settlement.created_at
      }
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error creating settlement:', error);
    res.status(500).json({ error: 'Failed to create settlement' });
  } finally {
    client.release();
  }
});

/**
 * GET /api/settlements/disclaimer
 * Get the law firm's settlement disclaimer text
 */
router.get('/disclaimer', authenticateToken, isLawFirm, async (req, res) => {
  try {
    const lawFirmId = req.user.id;
    const result = await db.query(
      'SELECT settlement_disclaimer FROM law_firms WHERE id = $1',
      [lawFirmId]
    );
    res.json({
      success: true,
      disclaimer: result.rows[0]?.settlement_disclaimer || ''
    });
  } catch (error) {
    console.error('Error fetching disclaimer:', error);
    res.status(500).json({ error: 'Failed to fetch disclaimer' });
  }
});

/**
 * PUT /api/settlements/disclaimer
 * Save the law firm's settlement disclaimer text
 */
router.put('/disclaimer', authenticateToken, isLawFirm, async (req, res) => {
  try {
    const lawFirmId = req.user.id;
    const { disclaimer } = req.body;
    await db.query(
      'UPDATE law_firms SET settlement_disclaimer = $1, updated_at = NOW() WHERE id = $2',
      [disclaimer || null, lawFirmId]
    );
    res.json({ success: true, message: 'Disclaimer saved successfully' });
  } catch (error) {
    console.error('Error saving disclaimer:', error);
    res.status(500).json({ error: 'Failed to save disclaimer' });
  }
});

/**
 * GET /api/settlements/connected-providers
 * Get medical providers connected to this law firm
 */
router.get('/connected-providers', authenticateToken, isLawFirm, async (req, res) => {
  try {
    const lawFirmId = req.user.id;
    const result = await db.query(`
      SELECT mp.id, mp.provider_name, mp.email, mp.phone_number, mp.provider_code, mp.stripe_account_id
      FROM medical_provider_law_firms mplf
      JOIN medical_providers mp ON mplf.medical_provider_id = mp.id
      WHERE mplf.law_firm_id = $1 AND mplf.connection_status = 'active'
      ORDER BY mp.provider_name ASC
    `, [lawFirmId]);

    res.json({
      success: true,
      providers: result.rows.map(p => ({
        id: p.id,
        providerName: p.provider_name,
        email: p.email,
        phone: p.phone_number,
        providerCode: p.provider_code,
        hasStripeAccount: !!p.stripe_account_id
      }))
    });
  } catch (error) {
    console.error('Error fetching connected providers:', error);
    res.status(500).json({ error: 'Failed to fetch connected providers' });
  }
});

/**
 * GET /api/settlements/:id
 * Get settlement details including liens
 */
router.get('/:id', authenticateToken, isLawFirm, async (req, res) => {
  try {
    const { id } = req.params;
    const lawFirmId = req.user.id;

    const result = await db.query(`
      SELECT 
        s.*,
        u.first_name || ' ' || u.last_name as client_name,
        u.email as client_email,
        u.stripe_account_id as client_stripe_account,
        lf.settlement_disclaimer
      FROM settlements s
      JOIN users u ON s.client_id = u.id
      JOIN law_firms lf ON s.law_firm_id = lf.id
      WHERE s.id = $1 AND s.law_firm_id = $2
    `, [id, lawFirmId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Settlement not found' });
    }

    const settlement = result.rows[0];

    const liensResult = await db.query(`
      SELECT 
        ml.*,
        COALESCE(mp.provider_name, ml.manual_provider_name) as provider_name,
        COALESCE(mp.email, ml.manual_provider_email) as provider_email,
        COALESCE(mp.phone_number, ml.manual_provider_phone) as provider_phone,
        mp.stripe_account_id as provider_stripe_account
      FROM medical_liens ml
      LEFT JOIN medical_providers mp ON ml.medical_provider_id = mp.id
      WHERE ml.settlement_id = $1
      ORDER BY ml.created_at DESC
    `, [id]);

    const disbursementResult = await db.query(`
      SELECT * FROM disbursements 
      WHERE settlement_id = $1 
      ORDER BY created_at DESC
    `, [id]);

    res.json({
      success: true,
      settlement: {
        id: settlement.id,
        clientId: settlement.client_id,
        clientName: settlement.client_name,
        clientEmail: settlement.client_email,
        clientHasStripeAccount: !!settlement.client_stripe_account,
        caseName: settlement.case_name,
        caseNumber: settlement.case_number,
        insuranceCompanyName: settlement.insurance_company_name,
        insuranceClaimNumber: settlement.insurance_claim_number,
        insuranceAdjusterName: settlement.insurance_adjuster_name,
        insuranceAdjusterEmail: settlement.insurance_adjuster_email,
        insuranceAdjusterPhone: settlement.insurance_adjuster_phone,
        grossSettlementAmount: parseFloat(settlement.gross_settlement_amount),
        attorneyFees: parseFloat(settlement.attorney_fees || 0),
        attorneyCosts: parseFloat(settlement.attorney_costs || 0),
        totalMedicalLiens: parseFloat(settlement.total_medical_liens || 0),
        netToClient: parseFloat(settlement.net_to_client || 0),
        ioltaDepositDate: settlement.iolta_deposit_date,
        ioltaDepositAmount: settlement.iolta_deposit_amount ? parseFloat(settlement.iolta_deposit_amount) : null,
        ioltaReferenceNumber: settlement.iolta_reference_number,
        settlementDate: settlement.settlement_date,
        status: settlement.status,
        notes: settlement.notes,
        disclaimer: settlement.settlement_disclaimer || '',
        createdAt: settlement.created_at,
        updatedAt: settlement.updated_at
      },
      liens: liensResult.rows.map(lien => ({
        id: lien.id,
        medicalProviderId: lien.medical_provider_id,
        providerName: lien.provider_name,
        providerEmail: lien.provider_email,
        providerHasStripeAccount: !!lien.provider_stripe_account,
        originalBillAmount: parseFloat(lien.original_bill_amount),
        lienAmount: parseFloat(lien.lien_amount),
        negotiatedAmount: lien.negotiated_amount ? parseFloat(lien.negotiated_amount) : null,
        finalPaymentAmount: lien.final_payment_amount ? parseFloat(lien.final_payment_amount) : null,
        status: lien.status,
        paymentMethod: lien.payment_method,
        paymentDate: lien.payment_date,
        stripeTransferId: lien.stripe_transfer_id,
        checkNumber: lien.check_number,
        lienReceivedDate: lien.lien_received_date,
        notes: lien.notes
      })),
      disbursements: disbursementResult.rows.map(d => ({
        id: d.id,
        clientAmount: parseFloat(d.client_amount),
        medicalTotal: parseFloat(d.medical_total),
        platformFee: parseFloat(d.platform_fee),
        totalAmount: parseFloat(d.total_amount),
        disbursementMethod: d.disbursement_method,
        feeExempt: d.fee_exempt,
        status: d.status,
        createdAt: d.created_at
      }))
    });
  } catch (error) {
    console.error('Error fetching settlement details:', error);
    res.status(500).json({ error: 'Failed to fetch settlement details' });
  }
});

/**
 * PUT /api/settlements/:id
 * Update settlement fields (only allowed when status is 'pending' or 'settled')
 */
router.put('/:id', authenticateToken, isLawFirm, requirePremiumLawFirm, async (req, res) => {
  try {
    const { id } = req.params;
    const lawFirmId = req.user.id;

    const existing = await db.query(
      'SELECT * FROM settlements WHERE id = $1 AND law_firm_id = $2',
      [id, lawFirmId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Settlement not found' });
    }

    const settlement = existing.rows[0];
    if (!['pending', 'settled'].includes(settlement.status)) {
      return res.status(400).json({ error: 'Settlement can only be edited when in pending or settled status' });
    }

    const {
      caseName,
      caseNumber,
      insuranceCompanyName,
      insuranceClaimNumber,
      insuranceAdjusterName,
      insuranceAdjusterEmail,
      insuranceAdjusterPhone,
      grossSettlementAmount,
      attorneyFees,
      attorneyCosts,
      settlementDate,
      notes
    } = req.body;

    if (!insuranceCompanyName || !grossSettlementAmount) {
      return res.status(400).json({
        error: 'Insurance company name and gross settlement amount are required'
      });
    }

    const gross = parseFloat(grossSettlementAmount);
    const fees = parseFloat(attorneyFees || 0);
    const costs = parseFloat(attorneyCosts || 0);
    const liensResult = await db.query(
      'SELECT COALESCE(SUM(COALESCE(negotiated_amount, lien_amount)), 0) as total FROM medical_liens WHERE settlement_id = $1',
      [id]
    );
    const totalLiens = parseFloat(liensResult.rows[0].total);
    const netToClient = gross - fees - costs - totalLiens;

    const result = await db.query(`
      UPDATE settlements SET
        case_name = $1,
        case_number = $2,
        insurance_company_name = $3,
        insurance_claim_number = $4,
        insurance_adjuster_name = $5,
        insurance_adjuster_email = $6,
        insurance_adjuster_phone = $7,
        gross_settlement_amount = $8,
        attorney_fees = $9,
        attorney_costs = $10,
        total_medical_liens = $11,
        net_to_client = $12,
        settlement_date = $13,
        notes = $14,
        updated_at = NOW()
      WHERE id = $15 AND law_firm_id = $16
      RETURNING *
    `, [
      caseName || null,
      caseNumber || null,
      insuranceCompanyName,
      insuranceClaimNumber || null,
      insuranceAdjusterName || null,
      insuranceAdjusterEmail || null,
      insuranceAdjusterPhone || null,
      gross,
      fees,
      costs,
      totalLiens,
      netToClient,
      settlementDate || null,
      notes || null,
      id,
      lawFirmId
    ]);

    res.json({
      success: true,
      message: 'Settlement updated successfully',
      settlement: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating settlement:', error);
    res.status(500).json({ error: 'Failed to update settlement' });
  }
});

/**
 * PUT /api/settlements/:id/mark-settled
 * Mark a case as settled (before IOLTA deposit)
 */
router.put('/:id/mark-settled', authenticateToken, isLawFirm, requirePremiumLawFirm, async (req, res) => {
  try {
    const { id } = req.params;
    const lawFirmId = req.user.id;
    const { settlementDate, notes } = req.body;

    const result = await db.query(`
      UPDATE settlements 
      SET status = 'settled', 
          settlement_date = COALESCE($3, CURRENT_DATE),
          notes = COALESCE($4, notes),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND law_firm_id = $2
      RETURNING *
    `, [id, lawFirmId, settlementDate, notes]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Settlement not found' });
    }

    res.json({
      success: true,
      message: 'Case marked as settled',
      settlement: result.rows[0]
    });
  } catch (error) {
    console.error('Error marking case as settled:', error);
    res.status(500).json({ error: 'Failed to update settlement status' });
  }
});

/**
 * PUT /api/settlements/:id/record-iolta-deposit
 * Record IOLTA trust account deposit from insurance company
 */
router.put('/:id/record-iolta-deposit', authenticateToken, isLawFirm, requirePremiumLawFirm, async (req, res) => {
  try {
    const { id } = req.params;
    const lawFirmId = req.user.id;
    const { 
      ioltaDepositAmount, 
      ioltaReferenceNumber,
      ioltaDepositDate,
      notes 
    } = req.body;

    if (!ioltaDepositAmount) {
      return res.status(400).json({ error: 'IOLTA deposit amount is required' });
    }

    const result = await db.query(`
      UPDATE settlements 
      SET status = 'iolta_deposited', 
          iolta_deposit_amount = $3,
          iolta_reference_number = $4,
          iolta_deposit_date = COALESCE($5, CURRENT_TIMESTAMP),
          notes = COALESCE($6, notes),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND law_firm_id = $2
      RETURNING *
    `, [id, lawFirmId, ioltaDepositAmount, ioltaReferenceNumber, ioltaDepositDate, notes]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Settlement not found' });
    }

    res.json({
      success: true,
      message: 'IOLTA deposit recorded successfully',
      settlement: {
        id: result.rows[0].id,
        ioltaDepositAmount: parseFloat(result.rows[0].iolta_deposit_amount),
        ioltaReferenceNumber: result.rows[0].iolta_reference_number,
        ioltaDepositDate: result.rows[0].iolta_deposit_date,
        status: result.rows[0].status
      }
    });
  } catch (error) {
    console.error('Error recording IOLTA deposit:', error);
    res.status(500).json({ error: 'Failed to record IOLTA deposit' });
  }
});

/**
 * POST /api/settlements/:id/liens
 * Add a medical lien to a settlement
 */
router.post('/:id/liens', authenticateToken, isLawFirm, requirePremiumLawFirm, async (req, res) => {
  try {
    const { id } = req.params;
    const lawFirmId = req.user.id;
    const {
      medicalProviderId,
      manualProviderName,
      manualProviderEmail,
      manualProviderPhone,
      originalBillAmount,
      lienAmount,
      lienReceivedDate,
      lienDocumentUrl,
      notes
    } = req.body;

    const hasConnectedProvider = medicalProviderId && medicalProviderId !== '';
    const hasManualProvider = manualProviderName && manualProviderName.trim() !== '';

    if (!hasConnectedProvider && !hasManualProvider) {
      return res.status(400).json({ 
        error: 'Either a connected medical provider or manual provider name is required' 
      });
    }

    if (!originalBillAmount || !lienAmount) {
      return res.status(400).json({ 
        error: 'Original bill amount and lien amount are required' 
      });
    }

    const settlementCheck = await db.query(
      'SELECT client_id FROM settlements WHERE id = $1 AND law_firm_id = $2',
      [id, lawFirmId]
    );

    if (settlementCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Settlement not found' });
    }

    const clientId = settlementCheck.rows[0].client_id;
    const createdBy = req.user.lawFirmUserId || null;

    const result = await db.query(`
      INSERT INTO medical_liens (
        settlement_id, law_firm_id, client_id, medical_provider_id,
        manual_provider_name, manual_provider_email, manual_provider_phone,
        original_bill_amount, lien_amount, lien_received_date,
        lien_document_url, notes, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending', $13)
      RETURNING *
    `, [
      id, lawFirmId, clientId, hasConnectedProvider ? medicalProviderId : null,
      hasManualProvider ? manualProviderName.trim() : null,
      manualProviderEmail ? manualProviderEmail.trim() : null,
      manualProviderPhone ? manualProviderPhone.trim() : null,
      originalBillAmount, lienAmount, lienReceivedDate,
      lienDocumentUrl, notes, createdBy
    ]);

    await db.query(`
      UPDATE settlements 
      SET total_medical_liens = (
        SELECT COALESCE(SUM(lien_amount), 0) 
        FROM medical_liens 
        WHERE settlement_id = $1
      ),
      updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [id]);

    const lien = result.rows[0];

    res.status(201).json({
      success: true,
      message: 'Medical lien added successfully',
      lien: {
        id: lien.id,
        medicalProviderId: lien.medical_provider_id,
        originalBillAmount: parseFloat(lien.original_bill_amount),
        lienAmount: parseFloat(lien.lien_amount),
        status: lien.status,
        createdAt: lien.created_at
      }
    });
  } catch (error) {
    console.error('Error adding medical lien:', error);
    res.status(500).json({ error: 'Failed to add medical lien' });
  }
});

/**
 * PUT /api/settlements/:settlementId/liens/:lienId/negotiate
 * Update negotiated lien amount
 */
router.put('/:settlementId/liens/:lienId/negotiate', authenticateToken, isLawFirm, requirePremiumLawFirm, async (req, res) => {
  try {
    const { settlementId, lienId } = req.params;
    const lawFirmId = req.user.id;
    const { negotiatedAmount, notes } = req.body;

    if (!negotiatedAmount) {
      return res.status(400).json({ error: 'Negotiated amount is required' });
    }

    const result = await db.query(`
      UPDATE medical_liens 
      SET negotiated_amount = $3,
          status = 'negotiating',
          notes = COALESCE($4, notes),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND law_firm_id = $2 AND settlement_id = $5
      RETURNING *
    `, [lienId, lawFirmId, negotiatedAmount, notes, settlementId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lien not found' });
    }

    res.json({
      success: true,
      message: 'Lien negotiation updated',
      lien: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating lien negotiation:', error);
    res.status(500).json({ error: 'Failed to update lien' });
  }
});

/**
 * PUT /api/settlements/:settlementId/liens/:lienId/finalize
 * Finalize lien amount after negotiation
 */
router.put('/:settlementId/liens/:lienId/finalize', authenticateToken, isLawFirm, requirePremiumLawFirm, async (req, res) => {
  try {
    const { settlementId, lienId } = req.params;
    const lawFirmId = req.user.id;
    const { finalPaymentAmount, notes } = req.body;

    if (!finalPaymentAmount) {
      return res.status(400).json({ error: 'Final payment amount is required' });
    }

    const result = await db.query(`
      UPDATE medical_liens 
      SET final_payment_amount = $3,
          status = 'agreed',
          notes = COALESCE($4, notes),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND law_firm_id = $2 AND settlement_id = $5
      RETURNING *
    `, [lienId, lawFirmId, finalPaymentAmount, notes, settlementId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Lien not found' });
    }

    res.json({
      success: true,
      message: 'Lien finalized',
      lien: result.rows[0]
    });
  } catch (error) {
    console.error('Error finalizing lien:', error);
    res.status(500).json({ error: 'Failed to finalize lien' });
  }
});

/**
 * POST /api/settlements/:settlementId/liens/:lienId/pay
 * Pay a medical lien
 * Payment methods: app_transfer (Stripe, with platform fee), check_mailed, wire_transfer, or client_pickup (no fee)
 */
router.post('/:settlementId/liens/:lienId/pay', authenticateToken, isLawFirm, requirePremiumLawFirm, async (req, res) => {
  const client = await db.pool.connect();
  
  try {
    const { settlementId, lienId } = req.params;
    const lawFirmId = req.user.id;
    const { 
      paymentMethod, 
      checkNumber, 
      wireReference,
      notes 
    } = req.body;

    if (!paymentMethod) {
      return res.status(400).json({ error: 'Payment method is required' });
    }

    const validMethods = ['app_transfer', 'check_mailed', 'wire_transfer'];
    if (!validMethods.includes(paymentMethod)) {
      return res.status(400).json({ 
        error: `Invalid payment method. Must be one of: ${validMethods.join(', ')}` 
      });
    }

    await client.query('BEGIN');

    const lienResult = await client.query(`
      SELECT ml.*, mp.stripe_account_id, 
        COALESCE(mp.provider_name, ml.manual_provider_name) as provider_name, 
        COALESCE(mp.email, ml.manual_provider_email) as provider_email
      FROM medical_liens ml
      LEFT JOIN medical_providers mp ON ml.medical_provider_id = mp.id
      WHERE ml.id = $1 AND ml.law_firm_id = $2 AND ml.settlement_id = $3
    `, [lienId, lawFirmId, settlementId]);

    if (lienResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Lien not found' });
    }

    const lien = lienResult.rows[0];

    if (lien.status === 'paid') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Lien has already been paid' });
    }

    const paymentAmount = lien.final_payment_amount || lien.negotiated_amount || lien.lien_amount;
    let stripeTransferId = null;

    if (paymentMethod === 'app_transfer') {
      if (!lien.stripe_account_id) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: 'Medical provider does not have a Stripe account set up for receiving payments',
          requiresStripeSetup: true,
          providerId: lien.medical_provider_id,
          providerName: lien.provider_name
        });
      }

      const lawFirmResult = await client.query(
        'SELECT stripe_customer_id FROM law_firms WHERE id = $1',
        [lawFirmId]
      );

      if (!lawFirmResult.rows[0]?.stripe_customer_id) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: 'Law firm does not have a payment method set up',
          requiresStripeSetup: true
        });
      }

      try {
        const transfer = await stripe.transfers.create({
          amount: Math.round(paymentAmount * 100),
          currency: 'usd',
          destination: lien.stripe_account_id,
          description: `Lien payment for ${lien.provider_name}`,
          metadata: {
            lien_id: lienId,
            settlement_id: settlementId,
            law_firm_id: lawFirmId,
            type: 'medical_lien_payment'
          }
        });
        stripeTransferId = transfer.id;
      } catch (stripeError) {
        await client.query('ROLLBACK');
        console.error('Stripe transfer error:', stripeError);
        return res.status(500).json({ 
          error: 'Failed to process Stripe transfer',
          details: stripeError.message
        });
      }
    }

    await client.query(`
      UPDATE medical_liens 
      SET status = 'paid',
          payment_method = $3,
          payment_date = CURRENT_TIMESTAMP,
          stripe_transfer_id = $4,
          check_number = $5,
          wire_reference = $6,
          notes = COALESCE($7, notes),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND law_firm_id = $2
    `, [lienId, lawFirmId, paymentMethod, stripeTransferId, checkNumber, wireReference, notes]);

    const unpaidLiens = await client.query(`
      SELECT COUNT(*) as count 
      FROM medical_liens 
      WHERE settlement_id = $1 AND status != 'paid' AND status != 'waived'
    `, [settlementId]);

    if (parseInt(unpaidLiens.rows[0].count) === 0) {
      await client.query(`
        UPDATE settlements 
        SET status = 'liens_paid',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [settlementId]);
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Lien paid successfully via ${paymentMethod}`,
      payment: {
        lienId,
        paymentAmount,
        paymentMethod,
        stripeTransferId,
        checkNumber,
        wireReference,
        paidAt: new Date().toISOString()
      }
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error paying lien:', error);
    res.status(500).json({ error: 'Failed to process lien payment' });
  } finally {
    client.release();
  }
});

/**
 * POST /api/settlements/:id/disburse-to-client
 * Disburse settlement funds to client
 * If disbursement_method is 'app_transfer', platform fee applies
 * For check_mailed, wire_transfer, or client_pickup, no fee
 */
router.post('/:id/disburse-to-client', authenticateToken, isLawFirm, requirePremiumLawFirm, async (req, res) => {
  const client = await db.pool.connect();
  
  try {
    const { id } = req.params;
    const lawFirmId = req.user.id;
    const { 
      clientAmount,
      disbursementMethod,
      checkNumber,
      wireReference,
      notes
    } = req.body;

    if (!clientAmount || clientAmount <= 0) {
      return res.status(400).json({ error: 'Valid client amount is required' });
    }

    const validMethods = ['app_transfer', 'check_mailed', 'wire_transfer', 'client_pickup'];
    if (!validMethods.includes(disbursementMethod)) {
      return res.status(400).json({ 
        error: `Invalid disbursement method. Must be one of: ${validMethods.join(', ')}` 
      });
    }

    await client.query('BEGIN');

    const settlementResult = await client.query(`
      SELECT s.*, u.stripe_account_id as client_stripe_account, 
             u.first_name || ' ' || u.last_name as client_name,
             u.email as client_email
      FROM settlements s
      JOIN users u ON s.client_id = u.id
      WHERE s.id = $1 AND s.law_firm_id = $2
    `, [id, lawFirmId]);

    if (settlementResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Settlement not found' });
    }

    const settlement = settlementResult.rows[0];

    const unpaidLiens = await client.query(`
      SELECT COUNT(*) as count 
      FROM medical_liens 
      WHERE settlement_id = $1 AND status != 'paid' AND status != 'waived'
    `, [id]);

    if (parseInt(unpaidLiens.rows[0].count) > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'All medical liens must be paid before disbursing to client',
        unpaidLiens: parseInt(unpaidLiens.rows[0].count)
      });
    }

    const feeExempt = disbursementMethod !== 'app_transfer';
    const platformFee = feeExempt ? 0 : PLATFORM_FEE;
    const totalAmount = parseFloat(clientAmount) + platformFee;

    let stripeTransferId = null;

    if (disbursementMethod === 'app_transfer') {
      if (!settlement.client_stripe_account) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: 'Client does not have a Stripe account set up for receiving payments',
          requiresStripeSetup: true,
          clientId: settlement.client_id
        });
      }

      const lawFirmResult = await client.query(
        'SELECT stripe_customer_id FROM law_firms WHERE id = $1',
        [lawFirmId]
      );

      if (!lawFirmResult.rows[0]?.stripe_customer_id) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: 'Law firm does not have a payment method set up',
          requiresStripeSetup: true
        });
      }

      try {
        const transfer = await stripe.transfers.create({
          amount: Math.round(clientAmount * 100),
          currency: 'usd',
          destination: settlement.client_stripe_account,
          description: `Settlement disbursement for ${settlement.case_name || 'case'}`,
          metadata: {
            settlement_id: id,
            law_firm_id: lawFirmId,
            client_id: settlement.client_id,
            type: 'client_disbursement'
          }
        });
        stripeTransferId = transfer.id;

        if (platformFee > 0) {
        }

      } catch (stripeError) {
        await client.query('ROLLBACK');
        console.error('Stripe transfer error:', stripeError);
        return res.status(500).json({ 
          error: 'Failed to process Stripe transfer',
          details: stripeError.message
        });
      }
    }

    const paidLiensResult = await client.query(`
      SELECT COALESCE(SUM(COALESCE(final_payment_amount, negotiated_amount, lien_amount)), 0) as total
      FROM medical_liens 
      WHERE settlement_id = $1 AND status = 'paid'
    `, [id]);

    const medicalTotal = parseFloat(paidLiensResult.rows[0].total);
    const createdBy = req.user.lawFirmUserId || null;

    const disbursementResult = await client.query(`
      INSERT INTO disbursements (
        law_firm_id, client_id, settlement_id,
        client_amount, medical_total, platform_fee, total_amount,
        disbursement_method, fee_exempt, 
        stripe_transfer_id, check_number, wire_reference,
        notes, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id
    `, [
      lawFirmId, settlement.client_id, id,
      clientAmount, medicalTotal, platformFee, totalAmount,
      disbursementMethod, feeExempt,
      stripeTransferId, checkNumber, wireReference,
      notes, disbursementMethod === 'app_transfer' ? 'completed' : 'pending', createdBy
    ]);

    const disbursementId = disbursementResult.rows[0].id;

    await client.query(`
      UPDATE settlements 
      SET status = 'disbursed',
          net_to_client = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [id, clientAmount]);

    await client.query(`
      UPDATE users 
      SET disbursement_completed = true 
      WHERE id = $1
    `, [settlement.client_id]);

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Settlement disbursed to client via ${disbursementMethod}`,
      disbursement: {
        id: disbursementId,
        settlementId: id,
        clientName: settlement.client_name,
        clientAmount: parseFloat(clientAmount),
        medicalTotal,
        platformFee,
        totalAmount,
        disbursementMethod,
        feeExempt,
        stripeTransferId,
        checkNumber,
        wireReference,
        status: disbursementMethod === 'app_transfer' ? 'completed' : 'pending'
      },
      feeNote: feeExempt 
        ? 'No platform fee charged (non-app disbursement method)' 
        : `Platform fee of $${platformFee} applies for in-app disbursement`
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error disbursing to client:', error);
    res.status(500).json({ error: 'Failed to process disbursement' });
  } finally {
    client.release();
  }
});

/**
 * PUT /api/settlements/:id/close
 * Mark settlement as closed after all disbursements complete
 */
router.put('/:id/close', authenticateToken, isLawFirm, requirePremiumLawFirm, async (req, res) => {
  try {
    const { id } = req.params;
    const lawFirmId = req.user.id;
    const { notes } = req.body;

    const result = await db.query(`
      UPDATE settlements 
      SET status = 'closed',
          notes = COALESCE($3, notes),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND law_firm_id = $2
      RETURNING *
    `, [id, lawFirmId, notes]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Settlement not found' });
    }

    res.json({
      success: true,
      message: 'Settlement closed successfully',
      settlement: result.rows[0]
    });
  } catch (error) {
    console.error('Error closing settlement:', error);
    res.status(500).json({ error: 'Failed to close settlement' });
  }
});

/**
 * PUT /api/settlements/:id/calculate-distribution
 * Calculate and update net distribution amounts
 */
router.put('/:id/calculate-distribution', authenticateToken, isLawFirm, requirePremiumLawFirm, async (req, res) => {
  try {
    const { id } = req.params;
    const lawFirmId = req.user.id;
    const { attorneyFees, attorneyCosts } = req.body;

    const settlementResult = await db.query(
      'SELECT * FROM settlements WHERE id = $1 AND law_firm_id = $2',
      [id, lawFirmId]
    );

    if (settlementResult.rows.length === 0) {
      return res.status(404).json({ error: 'Settlement not found' });
    }

    const settlement = settlementResult.rows[0];

    const liensResult = await db.query(`
      SELECT COALESCE(SUM(COALESCE(final_payment_amount, negotiated_amount, lien_amount)), 0) as total
      FROM medical_liens 
      WHERE settlement_id = $1
    `, [id]);

    const totalLiens = parseFloat(liensResult.rows[0].total);
    const grossAmount = parseFloat(settlement.gross_settlement_amount);
    const fees = attorneyFees !== undefined ? parseFloat(attorneyFees) : parseFloat(settlement.attorney_fees);
    const costs = attorneyCosts !== undefined ? parseFloat(attorneyCosts) : parseFloat(settlement.attorney_costs);
    
    const netToClient = grossAmount - fees - costs - totalLiens;

    const result = await db.query(`
      UPDATE settlements 
      SET attorney_fees = $3,
          attorney_costs = $4,
          total_medical_liens = $5,
          net_to_client = $6,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND law_firm_id = $2
      RETURNING *
    `, [id, lawFirmId, fees, costs, totalLiens, netToClient]);

    res.json({
      success: true,
      message: 'Distribution calculated successfully',
      distribution: {
        grossSettlementAmount: grossAmount,
        attorneyFees: fees,
        attorneyCosts: costs,
        totalMedicalLiens: totalLiens,
        netToClient: netToClient
      }
    });
  } catch (error) {
    console.error('Error calculating distribution:', error);
    res.status(500).json({ error: 'Failed to calculate distribution' });
  }
});

router.post('/:id/send-statement', authenticateToken, isLawFirm, requirePremiumLawFirm, async (req, res) => {
  try {
    const { id } = req.params;
    const lawFirmId = req.user.id;
    const { recipients } = req.body;

    const result = await db.query(`
      SELECT s.*, 
        u.first_name || ' ' || u.last_name as client_name,
        u.email as client_email,
        lf.settlement_disclaimer
      FROM settlements s
      JOIN users u ON s.client_id = u.id
      JOIN law_firms lf ON s.law_firm_id = lf.id
      WHERE s.id = $1 AND s.law_firm_id = $2
    `, [id, lawFirmId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Settlement not found' });
    }

    const settlement = result.rows[0];

    const liensResult = await db.query(`
      SELECT 
        ml.*,
        COALESCE(mp.provider_name, ml.manual_provider_name) as provider_name,
        COALESCE(mp.email, ml.manual_provider_email) as provider_email
      FROM medical_liens ml
      LEFT JOIN medical_providers mp ON ml.medical_provider_id = mp.id
      WHERE ml.settlement_id = $1
      ORDER BY ml.created_at DESC
    `, [id]);

    const statementData = {
      caseName: settlement.case_name,
      caseNumber: settlement.case_number,
      clientName: settlement.client_name,
      insuranceCompanyName: settlement.insurance_company_name,
      insuranceClaimNumber: settlement.insurance_claim_number,
      settlementDate: settlement.settlement_date,
      status: settlement.status,
      grossSettlementAmount: parseFloat(settlement.gross_settlement_amount || 0),
      attorneyFees: parseFloat(settlement.attorney_fees || 0),
      attorneyCosts: parseFloat(settlement.attorney_costs || 0),
      totalMedicalLiens: parseFloat(settlement.total_medical_liens || 0),
      netToClient: parseFloat(settlement.net_to_client || 0),
      ioltaDepositAmount: settlement.iolta_deposit_amount ? parseFloat(settlement.iolta_deposit_amount) : null,
      ioltaReferenceNumber: settlement.iolta_reference_number,
      ioltaDepositDate: settlement.iolta_deposit_date,
      disclaimer: settlement.settlement_disclaimer || '',
      liens: liensResult.rows.map(l => ({
        providerName: l.provider_name,
        originalBillAmount: parseFloat(l.original_bill_amount),
        lienAmount: parseFloat(l.lien_amount),
        negotiatedAmount: l.negotiated_amount ? parseFloat(l.negotiated_amount) : null,
        status: l.status
      }))
    };

    const sentTo = [];
    const errors = [];

    const recipientList = recipients || ['client'];

    if (recipientList.includes('client') && settlement.client_email) {
      try {
        await sendSettlementStatementEmail(settlement.client_email, settlement.client_name, statementData);
        sentTo.push({ type: 'client', email: settlement.client_email, name: settlement.client_name });
      } catch (e) {
        errors.push({ type: 'client', email: settlement.client_email, error: e.message });
      }
    }

    if (recipientList.includes('providers')) {
      for (const lien of liensResult.rows) {
        const providerEmail = lien.provider_email;
        const providerName = lien.provider_name;
        if (providerEmail && !sentTo.find(s => s.email === providerEmail)) {
          try {
            await sendSettlementStatementEmail(providerEmail, providerName, statementData);
            sentTo.push({ type: 'provider', email: providerEmail, name: providerName });
          } catch (e) {
            errors.push({ type: 'provider', email: providerEmail, error: e.message });
          }
        }
      }
    }

    res.json({
      success: true,
      message: `Settlement statement sent to ${sentTo.length} recipient(s)`,
      sentTo,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error sending settlement statement:', error);
    res.status(500).json({ error: 'Failed to send settlement statement' });
  }
});

module.exports = router;
