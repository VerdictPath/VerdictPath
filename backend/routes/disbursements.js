const express = require('express');
const router = express.Router();
const db = require('../config/db');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { authenticateToken, isLawFirm } = require('../middleware/auth');

// GET /api/disbursements/history
// Get disbursement history for law firm
router.get('/history', authenticateToken, isLawFirm, async (req, res) => {
  try {
    const lawFirmId = req.user.id;

    const result = await db.query(`
      SELECT 
        d.*,
        u.first_name || ' ' || u.last_name as client_name,
        u.email as client_email
      FROM disbursements d
      JOIN users u ON d.client_id = u.id
      WHERE d.law_firm_id = $1
      ORDER BY d.created_at DESC
    `, [lawFirmId]);

    res.json({ disbursements: result.rows });
  } catch (error) {
    console.error('Error fetching disbursement history:', error);
    res.status(500).json({ error: 'Failed to fetch disbursement history' });
  }
});

// GET /api/disbursements/client-providers
// Get medical providers connected to a client
router.get('/client-providers', authenticateToken, isLawFirm, async (req, res) => {
  try {
    const { clientId } = req.query;
    const lawFirmId = req.user.id;

    if (!clientId) {
      return res.status(400).json({ error: 'Client ID required' });
    }

    // Verify client belongs to this law firm
    const clientCheck = await db.query(`
      SELECT 1 FROM law_firm_clients 
      WHERE law_firm_id = $1 AND client_id = $2
    `, [lawFirmId, clientId]);

    if (clientCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Client not found or access denied' });
    }

    // Get medical providers connected to this client
    const result = await db.query(`
      SELECT DISTINCT
        mp.id,
        mp.provider_name as "providerName",
        mp.email,
        mp.provider_code
      FROM medical_providers mp
      JOIN medical_provider_patients mpp ON mp.id = mpp.medical_provider_id
      WHERE mpp.patient_id = $1
      ORDER BY mp.provider_name
    `, [clientId]);

    res.json({ providers: result.rows });
  } catch (error) {
    console.error('Error fetching client providers:', error);
    res.status(500).json({ error: 'Failed to fetch medical providers' });
  }
});

// POST /api/disbursements/process
// Process a disbursement (pay client + medical providers)
// NOTE: This is a PROTOTYPE implementation. In production, you would need to:
// 1. Set up Stripe Connect accounts for clients and medical providers
// 2. Use stripe.transfers.create() to actually transfer funds to connected accounts
// 3. Implement webhook handlers for payment confirmation
// 4. Handle failed payments and retries
// For now, this creates a record but does NOT actually transfer money.
router.post('/process', authenticateToken, isLawFirm, async (req, res) => {
  const client = await db.pool.connect();
  
  try {
    const { clientId, clientAmount, medicalPayments = [], platformFee = 200 } = req.body;
    const lawFirmId = req.user.id;

    // Validation
    if (!clientId || !clientAmount || clientAmount <= 0) {
      return res.status(400).json({ error: 'Invalid disbursement data' });
    }

    // Verify client belongs to this law firm
    const clientCheck = await client.query(`
      SELECT u.email, u.first_name, u.last_name, u.disbursement_completed
      FROM users u
      JOIN law_firm_clients lfc ON u.id = lfc.client_id
      WHERE lfc.law_firm_id = $1 AND lfc.client_id = $2
    `, [lawFirmId, clientId]);

    if (clientCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Client not found' });
    }

    const clientData = clientCheck.rows[0];

    if (clientData.disbursement_completed) {
      return res.status(400).json({ error: 'Client has already received final disbursement' });
    }

    await client.query('BEGIN');

    // Calculate totals
    const medicalTotal = medicalPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const totalAmount = parseFloat(clientAmount) + medicalTotal + parseFloat(platformFee);

    // PROTOTYPE: Create Stripe PaymentIntent to charge the law firm
    // In production, you would:
    // 1. Charge the law firm's payment method
    // 2. Create transfers to connected client/provider accounts
    // 3. Wait for webhook confirmation before marking as completed
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // Convert to cents
      currency: 'usd',
      description: `Settlement disbursement for ${clientData.first_name} ${clientData.last_name}`,
      metadata: {
        law_firm_id: lawFirmId.toString(),
        client_id: clientId.toString(),
        client_amount: clientAmount.toString(),
        medical_total: medicalTotal.toString(),
        platform_fee: platformFee.toString()
      }
      // NOTE: Actual payment confirmation would happen via webhook or manual confirmation
    });

    // Insert disbursement record
    const disbursementResult = await client.query(`
      INSERT INTO disbursements (
        law_firm_id, client_id, client_amount, medical_total, 
        platform_fee, total_amount, stripe_payment_intent_id, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
      RETURNING *
    `, [lawFirmId, clientId, clientAmount, medicalTotal, platformFee, totalAmount, paymentIntent.id]);

    const disbursement = disbursementResult.rows[0];

    // Insert client recipient record
    await client.query(`
      INSERT INTO disbursement_recipients (
        disbursement_id, recipient_type, recipient_id, recipient_name, 
        recipient_email, amount, status
      )
      VALUES ($1, 'client', $2, $3, $4, $5, 'pending')
    `, [
      disbursement.id,
      clientId,
      `${clientData.first_name} ${clientData.last_name}`,
      clientData.email,
      clientAmount
    ]);

    // Insert medical provider recipient records
    for (const payment of medicalPayments) {
      await client.query(`
        INSERT INTO disbursement_recipients (
          disbursement_id, recipient_type, recipient_id, recipient_name,
          recipient_email, amount, status
        )
        VALUES ($1, 'medical_provider', $2, $3, $4, $5, 'pending')
      `, [
        disbursement.id,
        payment.providerId,
        payment.providerName,
        payment.email,
        payment.amount
      ]);
    }

    // PROTOTYPE: Mark as completed immediately
    // In production, this would only happen after webhook confirmation
    await client.query(`
      UPDATE disbursements 
      SET status = 'completed', completed_at = CURRENT_TIMESTAMP 
      WHERE id = $1
    `, [disbursement.id]);

    await client.query(`
      UPDATE disbursement_recipients 
      SET status = 'completed', completed_at = CURRENT_TIMESTAMP 
      WHERE disbursement_id = $1
    `, [disbursement.id]);

    // Mark client as having received final disbursement
    await client.query(`
      UPDATE users 
      SET disbursement_completed = TRUE 
      WHERE id = $1
    `, [clientId]);

    await client.query('COMMIT');

    res.json({
      success: true,
      disbursement,
      clientAmount: parseFloat(clientAmount),
      medicalTotal,
      totalAmount,
      transactionId: disbursement.id,
      stripeTransferId: paymentIntent.id,
      warning: 'PROTOTYPE: Actual fund transfers not implemented. Stripe Connect setup required for production.'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Disbursement processing error:', error);
    res.status(500).json({ 
      error: 'Failed to process disbursement',
      message: error.message 
    });
  } finally {
    client.release();
  }
});

module.exports = router;
