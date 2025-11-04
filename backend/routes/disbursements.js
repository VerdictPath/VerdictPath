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
 * NOTE: This requires Stripe Connect accounts for law firm, clients, and medical providers
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

    // Get law firm's Stripe account
    const lawFirmResult = await client.query(
      'SELECT stripe_account_id FROM law_firms WHERE id = $1',
      [lawFirmId]
    );

    const lawFirmStripeAccount = lawFirmResult.rows[0]?.stripe_account_id;

    // Calculate totals
    const medicalTotal = medicalPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const totalAmount = parseFloat(clientAmount) + medicalTotal + parseFloat(platformFee);

    // Convert to cents for Stripe
    const totalCents = Math.round(totalAmount * 100);
    const clientCents = Math.round(parseFloat(clientAmount) * 100);
    const platformFeeCents = Math.round(parseFloat(platformFee) * 100);

    // STRIPE CONNECT IMPLEMENTATION
    // If Stripe accounts are set up, process actual transfers
    // Otherwise, create records only (prototype mode)
    let paymentIntent;
    let clientTransferId = null;
    let medicalTransferIds = [];
    let actualTransfersProcessed = false;

    if (lawFirmStripeAccount) {
      try {
        // Create Stripe Payment Intent to charge the law firm
        paymentIntent = await stripe.paymentIntents.create({
          amount: totalCents,
          currency: 'usd',
          customer: lawFirmStripeAccount,
          description: `Settlement disbursement for ${clientData.first_name} ${clientData.last_name}`,
          metadata: {
            law_firm_id: lawFirmId.toString(),
            client_id: clientId.toString(),
            client_amount: clientAmount.toString(),
            medical_total: medicalTotal.toString(),
            platform_fee: platformFee.toString()
          },
          // Platform fee goes to platform account
          application_fee_amount: platformFeeCents,
          confirm: true,
          automatic_payment_methods: {
            enabled: true,
            allow_redirects: 'never'
          }
        });

        // If payment successful, create transfers
        if (paymentIntent.status === 'succeeded') {
          actualTransfersProcessed = true;

          // Transfer to client
          if (clientData.stripe_account_id) {
            const clientTransfer = await stripe.transfers.create({
              amount: clientCents,
              currency: 'usd',
              destination: clientData.stripe_account_id,
              description: `Settlement proceeds from case`,
              metadata: {
                client_id: clientId.toString(),
                disbursement_type: 'client_settlement'
              }
            });
            clientTransferId = clientTransfer.id;
          }

          // Transfer to medical providers
          for (const payment of medicalPayments) {
            const providerResult = await client.query(
              'SELECT stripe_account_id FROM medical_providers WHERE id = $1',
              [payment.providerId]
            );

            const providerStripeAccount = providerResult.rows[0]?.stripe_account_id;

            if (providerStripeAccount) {
              const providerTransfer = await stripe.transfers.create({
                amount: Math.round(parseFloat(payment.amount) * 100),
                currency: 'usd',
                destination: providerStripeAccount,
                description: `Medical bill payment for patient ${clientData.first_name} ${clientData.last_name}`,
                metadata: {
                  provider_id: payment.providerId.toString(),
                  client_id: clientId.toString(),
                  disbursement_type: 'medical_payment'
                }
              });
              medicalTransferIds.push({
                providerId: payment.providerId,
                transferId: providerTransfer.id,
                amount: payment.amount
              });
            }
          }
        }
      } catch (stripeError) {
        await client.query('ROLLBACK');
        console.error('Stripe processing error:', stripeError);
        
        if (stripeError.type === 'StripeCardError') {
          return res.status(400).json({ 
            error: 'Payment failed: ' + stripeError.message 
          });
        }
        
        return res.status(500).json({ 
          error: 'Failed to process payment: ' + stripeError.message 
        });
      }
    } else {
      // Prototype mode: create PaymentIntent without charging
      paymentIntent = await stripe.paymentIntents.create({
        amount: totalCents,
        currency: 'usd',
        description: `Settlement disbursement for ${clientData.first_name} ${clientData.last_name}`,
        metadata: {
          law_firm_id: lawFirmId.toString(),
          client_id: clientId.toString(),
          prototype_mode: 'true'
        }
      });
    }

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
      paymentIntent.id,
      clientTransferId,
      actualTransfersProcessed ? 'completed' : 'pending'
    ]);

    const disbursementId = disbursementResult.rows[0].id;

    // Record medical provider payments
    for (const payment of medicalPayments) {
      const transferId = medicalTransferIds.find(t => t.providerId === payment.providerId)?.transferId;
      
      await client.query(`
        INSERT INTO disbursement_medical_payments (
          disbursement_id,
          medical_provider_id,
          amount,
          stripe_transfer_id,
          created_at
        ) VALUES ($1, $2, $3, $4, NOW())
      `, [disbursementId, payment.providerId, payment.amount, transferId]);
    }

    // Mark client as having received disbursement (only if actually processed)
    if (actualTransfersProcessed) {
      await client.query(
        'UPDATE users SET disbursement_completed = true WHERE id = $1',
        [clientId]
      );
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      disbursementId,
      transactionId: paymentIntent.id,
      clientAmount: parseFloat(clientAmount),
      medicalTotal,
      platformFee: parseFloat(platformFee),
      totalAmount,
      actualTransfersProcessed,
      message: actualTransfersProcessed 
        ? 'Disbursement processed successfully' 
        : 'Disbursement recorded. Stripe Connect setup required for actual fund transfers.'
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
