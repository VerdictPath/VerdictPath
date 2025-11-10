const express = require('express');
const router = express.Router();
const db = require('../config/db');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { authenticateToken, isLawFirm } = require('../middleware/auth');

// Platform fee per disbursement transaction
const PLATFORM_FEE = 200; // $200

/**
 * GET /api/disbursements/history
 * Get disbursement history for law firm
 */
router.get('/history', authenticateToken, isLawFirm, async (req, res) => {
  try {
    const lawFirmId = req.user.id;

    const result = await db.query(`
      SELECT 
        d.id,
        d.client_id,
        d.client_amount,
        d.medical_total,
        d.platform_fee,
        d.total_amount,
        d.stripe_transfer_id,
        d.status,
        d.created_at,
        u.first_name || ' ' || u.last_name as client_name,
        u.email as client_email
      FROM disbursements d
      JOIN users u ON d.client_id = u.id
      WHERE d.law_firm_id = $1
      ORDER BY d.created_at DESC
    `, [lawFirmId]);

    res.json({
      disbursements: result.rows.map(row => ({
        id: row.id,
        clientName: row.client_name,
        clientEmail: row.client_email,
        clientAmount: parseFloat(row.client_amount),
        medicalTotal: parseFloat(row.medical_total),
        platformFee: parseFloat(row.platform_fee),
        totalAmount: parseFloat(row.total_amount),
        stripeTransferId: row.stripe_transfer_id,
        status: row.status,
        createdAt: row.created_at
      }))
    });
  } catch (error) {
    console.error('Error fetching disbursement history:', error);
    res.status(500).json({ error: 'Failed to fetch disbursement history' });
  }
});

/**
 * GET /api/disbursements/client-providers
 * Get medical providers connected to a specific client
 */
router.get('/client-providers', authenticateToken, isLawFirm, async (req, res) => {
  try {
    const { clientId } = req.query;
    const lawFirmId = req.user.id;

    if (!clientId) {
      return res.status(400).json({ error: 'Client ID is required' });
    }

    // Verify client belongs to this law firm
    const clientCheck = await db.query(`
      SELECT 1 FROM law_firm_clients 
      WHERE law_firm_id = $1 AND client_id = $2
    `, [lawFirmId, clientId]);

    if (clientCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied to this client' });
    }

    // Get medical providers connected to this client
    const result = await db.query(`
      SELECT DISTINCT
        mp.id,
        mp.provider_name as "providerName",
        mp.email,
        mp.stripe_account_id
      FROM medical_providers mp
      JOIN medical_provider_patients mpp ON mp.id = mpp.medical_provider_id
      WHERE mpp.patient_id = $1
      ORDER BY mp.provider_name
    `, [clientId]);

    res.json({
      providers: result.rows.map(row => ({
        id: row.id,
        providerName: row.providerName,
        email: row.email,
        hasStripeAccount: !!row.stripe_account_id
      }))
    });
  } catch (error) {
    console.error('Error fetching client providers:', error);
    res.status(500).json({ error: 'Failed to fetch medical providers' });
  }
});

/**
 * POST /api/disbursements/process
 * Process settlement disbursement to client and medical providers
 * 
 * PRODUCTION IMPLEMENTATION:
 * This route will process actual Stripe payments when all Stripe Connect accounts are configured:
 * 1. Law firm must have a Stripe Customer ID with valid payment method
 * 2. Client must have a Stripe Connect account (for receiving transfers)
 * 3. Medical providers must have Stripe Connect accounts (for receiving transfers)
 * 
 * CURRENT STATE (Prototype):
 * Records disbursement data in database without processing actual payments.
 * Status remains 'pending' until Stripe integration is fully set up.
 */
router.post('/process', authenticateToken, isLawFirm, async (req, res) => {
  const client = await db.pool.connect();
  
  try {
    const { clientId, clientAmount, medicalPayments = [], platformFee = PLATFORM_FEE } = req.body;
    const lawFirmId = req.user.id;

    // Validation
    if (!clientId || !clientAmount || clientAmount <= 0) {
      return res.status(400).json({ error: 'Invalid disbursement data' });
    }

    if (platformFee !== PLATFORM_FEE) {
      return res.status(400).json({ error: 'Invalid platform fee' });
    }

    await client.query('BEGIN');

    // Verify client belongs to this law firm and get client data
    const clientResult = await client.query(`
      SELECT u.id, u.email, u.first_name, u.last_name, u.stripe_account_id, u.disbursement_completed
      FROM users u
      JOIN law_firm_clients lfc ON u.id = lfc.client_id
      WHERE lfc.law_firm_id = $1 AND lfc.client_id = $2
    `, [lawFirmId, clientId]);

    if (clientResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Access denied to this client' });
    }

    const clientData = clientResult.rows[0];

    // Check if client already received final disbursement
    if (clientData.disbursement_completed) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'Client has already received final settlement disbursement' 
      });
    }

    // Get law firm's Stripe customer ID (for charging)
    const lawFirmResult = await client.query(
      'SELECT stripe_account_id FROM law_firms WHERE id = $1',
      [lawFirmId]
    );

    const lawFirmStripeCustomer = lawFirmResult.rows[0]?.stripe_account_id;

    // Calculate totals
    const medicalTotal = medicalPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const totalAmount = parseFloat(clientAmount) + medicalTotal + parseFloat(platformFee);

    // PROTOTYPE MODE: Record disbursement without processing actual payments
    // In production, Stripe Connect integration would handle actual fund transfers here
    const disbursementStatus = 'pending'; // Will be 'completed' when Stripe processing is implemented
    const paymentIntentId = null; // Will contain Stripe PaymentIntent ID in production
    const clientTransferId = null; // Will contain Stripe Transfer ID in production

    // Record disbursement in database
    const disbursementResult = await client.query(`
      INSERT INTO disbursements (
        law_firm_id,
        client_id,
        client_amount,
        medical_total,
        platform_fee,
        total_amount,
        stripe_payment_intent_id,
        stripe_transfer_id,
        status,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING id
    `, [
      lawFirmId,
      clientId,
      clientAmount,
      medicalTotal,
      platformFee,
      totalAmount,
      paymentIntentId,
      clientTransferId,
      disbursementStatus
    ]);

    const disbursementId = disbursementResult.rows[0].id;

    // Record medical provider payments (without Stripe transfer IDs in prototype mode)
    for (const payment of medicalPayments) {
      await client.query(`
        INSERT INTO disbursement_medical_payments (
          disbursement_id,
          medical_provider_id,
          amount,
          stripe_transfer_id,
          created_at
        ) VALUES ($1, $2, $3, $4, NOW())
      `, [disbursementId, payment.providerId, payment.amount, null]);
    }

    // DO NOT mark client as disbursement_completed in prototype mode
    // This will only be set when actual funds are transferred

    await client.query('COMMIT');

    // Build response message
    const missingAccounts = [];
    if (!lawFirmStripeCustomer) missingAccounts.push('law firm Stripe customer');
    if (!clientData.stripe_account_id) missingAccounts.push('client Stripe Connect account');
    
    // Check medical providers
    for (const payment of medicalPayments) {
      const providerResult = await db.query(
        'SELECT stripe_account_id, provider_name FROM medical_providers WHERE id = $1',
        [payment.providerId]
      );
      if (!providerResult.rows[0]?.stripe_account_id) {
        missingAccounts.push(`${providerResult.rows[0]?.provider_name || 'medical provider'} Stripe account`);
      }
    }

    let message = 'Disbursement recorded successfully (prototype mode).';
    if (missingAccounts.length > 0) {
      message += ` To process actual payments, set up: ${missingAccounts.join(', ')}.`;
    } else {
      message += ' All Stripe accounts configured. Ready for production payment processing.';
    }

    res.json({
      success: true,
      disbursementId,
      clientAmount: parseFloat(clientAmount),
      medicalTotal,
      platformFee: parseFloat(platformFee),
      totalAmount,
      status: disbursementStatus,
      prototypeMode: true,
      message,
      nextSteps: missingAccounts.length > 0 ? missingAccounts : ['Implement Stripe payment processing in production']
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Disbursement processing error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to process disbursement' 
    });
  } finally {
    client.release();
  }
});

/**
 * GET /api/disbursements/received
 * Get received disbursements for medical providers and individual clients
 * IMPORTANT: Must be defined BEFORE /:id route to avoid being caught by dynamic parameter
 */
router.get('/received', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.userType;

    let result;

    if (userType === 'individual' || userType === 'client') {
      result = await db.query(`
        SELECT 
          d.id,
          d.client_amount as amount,
          d.total_amount,
          d.platform_fee,
          d.stripe_transfer_id,
          d.status,
          d.created_at,
          lf.firm_name as law_firm_name
        FROM disbursements d
        JOIN law_firms lf ON d.law_firm_id = lf.id
        WHERE d.client_id = $1
        ORDER BY d.created_at DESC
      `, [userId]);
    } else if (userType === 'medical_provider') {
      result = await db.query(`
        SELECT 
          dmp.id,
          dmp.amount,
          dmp.status,
          dmp.created_at,
          d.total_amount as disbursement_total,
          d.stripe_transfer_id,
          lf.firm_name as law_firm_name,
          u.first_name || ' ' || u.last_name as client_name
        FROM disbursement_medical_payments dmp
        JOIN disbursements d ON dmp.disbursement_id = d.id
        JOIN law_firms lf ON d.law_firm_id = lf.id
        JOIN users u ON d.client_id = u.id
        WHERE dmp.medical_provider_id = $1
        ORDER BY dmp.created_at DESC
      `, [userId]);
    } else {
      return res.status(400).json({ error: 'Invalid user type' });
    }

    res.json({
      disbursements: result.rows.map(row => ({
        id: row.id,
        amount: parseFloat(row.amount),
        status: row.status,
        createdAt: row.created_at,
        lawFirmName: row.law_firm_name,
        clientName: row.client_name || null,
        stripeTransferId: row.stripe_transfer_id || null
      }))
    });
  } catch (error) {
    console.error('Error fetching received disbursements:', error);
    res.status(500).json({ error: 'Failed to fetch received disbursements' });
  }
});

/**
 * GET /api/disbursements/:id
 * Get detailed information about a specific disbursement
 */
router.get('/:id', authenticateToken, isLawFirm, async (req, res) => {
  try {
    const { id } = req.params;
    const lawFirmId = req.user.id;

    const result = await db.query(`
      SELECT 
        d.*,
        u.first_name || ' ' || u.last_name as client_name,
        u.email as client_email
      FROM disbursements d
      JOIN users u ON d.client_id = u.id
      WHERE d.id = $1 AND d.law_firm_id = $2
    `, [id, lawFirmId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Disbursement not found' });
    }

    const disbursement = result.rows[0];

    // Get medical payments for this disbursement
    const medicalPayments = await db.query(`
      SELECT 
        dmp.*,
        mp.provider_name,
        mp.email
      FROM disbursement_medical_payments dmp
      JOIN medical_providers mp ON dmp.medical_provider_id = mp.id
      WHERE dmp.disbursement_id = $1
    `, [id]);

    res.json({
      disbursement: {
        id: disbursement.id,
        clientName: disbursement.client_name,
        clientEmail: disbursement.client_email,
        clientAmount: parseFloat(disbursement.client_amount),
        medicalTotal: parseFloat(disbursement.medical_total),
        platformFee: parseFloat(disbursement.platform_fee),
        totalAmount: parseFloat(disbursement.total_amount),
        status: disbursement.status,
        createdAt: disbursement.created_at,
        stripePaymentIntentId: disbursement.stripe_payment_intent_id,
        stripeTransferId: disbursement.stripe_transfer_id,
        medicalPayments: medicalPayments.rows.map(mp => ({
          id: mp.id,
          providerName: mp.provider_name,
          providerEmail: mp.email,
          amount: parseFloat(mp.amount),
          stripeTransferId: mp.stripe_transfer_id,
          createdAt: mp.created_at
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching disbursement details:', error);
    res.status(500).json({ error: 'Failed to fetch disbursement details' });
  }
});

module.exports = router;
