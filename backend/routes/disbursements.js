const express = require('express');
const router = express.Router();
const db = require('../config/db');
const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;
const { authenticateToken, isLawFirm } = require('../middleware/auth');
const { requirePremiumLawFirm } = require('../middleware/premiumAccess');
const { sendDisbursementProcessedEmail, sendLienPaymentEmail } = require('../services/emailService');

// Platform fee per disbursement transaction
const PLATFORM_FEE = 200; // $200

/**
 * GET /api/disbursements/history
 * Get disbursement history for law firm
 */
router.get('/history', authenticateToken, isLawFirm, requirePremiumLawFirm, async (req, res) => {
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
        d.withhold_amount,
        d.withhold_reason,
        d.disbursement_method,
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
        createdAt: row.created_at,
        withholdAmount: parseFloat(row.withhold_amount || 0),
        withholdReason: row.withhold_reason,
        disbursementMethod: row.disbursement_method
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
router.get('/client-providers', authenticateToken, isLawFirm, requirePremiumLawFirm, async (req, res) => {
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
 * This route processes actual Stripe payments when all Stripe Connect accounts are configured:
 * 1. Law firm must have a Stripe Customer ID with valid payment method
 * 2. Client must have a Stripe Connect account (for receiving transfers via app)
 * 3. Medical providers must have Stripe Connect accounts (for receiving transfers via app)
 * 
 * DISBURSEMENT METHODS:
 * - app_transfer: Uses Stripe Connect (charge law firm, then transfer), platform fee applies ($200)
 * - check_mailed: Law firm mails a check, no platform fee
 * - wire_transfer: Law firm wires funds, no platform fee
 * - client_pickup: Client picks up check in person, no platform fee
 * 
 * WORKFLOW:
 * 1. Settlement ID is REQUIRED - verify settlement exists and belongs to this law firm
 * 2. Verify client matches settlement's client_id
 * 3. Verify IOLTA deposit has been recorded
 * 4. Verify all medical liens are paid or waived
 * 5. For app_transfer: Create PaymentIntent to charge law firm, then process transfers
 * 6. Process medical provider payments first
 * 7. Process client disbursement
 * 8. Record all transactions and update settlement status
 */
router.post('/process', authenticateToken, isLawFirm, requirePremiumLawFirm, async (req, res) => {
  const client = await db.pool.connect();
  
  try {
    const { 
      clientId, 
      clientAmount, 
      medicalPayments = [], 
      settlementId,
      disbursementMethod = 'app_transfer',
      checkNumber,
      wireReference,
      notes,
      withholdAmount = 0,
      withholdReason
    } = req.body;
    const lawFirmId = req.user.id;

    // Validate required fields - settlementId is NOW MANDATORY
    if (!settlementId) {
      return res.status(400).json({ 
        error: 'Settlement ID is required. All disbursements must be linked to a settlement.',
        hint: 'Use /api/settlements to create a settlement first, then use that settlementId here.'
      });
    }

    if (!clientId || !clientAmount || clientAmount <= 0) {
      return res.status(400).json({ error: 'Invalid disbursement data. Client ID and valid amount required.' });
    }

    // Validate withhold fields
    const parsedWithholdValidation = parseFloat(withholdAmount) || 0;
    if (parsedWithholdValidation > 0) {
      if (parsedWithholdValidation >= parseFloat(clientAmount)) {
        return res.status(400).json({ error: 'Withheld amount cannot equal or exceed the client payment amount' });
      }
      if (!withholdReason || !withholdReason.trim()) {
        return res.status(400).json({ error: 'A reason is required when withholding funds from the client' });
      }
    }

    // Validate disbursement method
    const validMethods = ['app_transfer', 'check_mailed', 'wire_transfer', 'client_pickup'];
    if (!validMethods.includes(disbursementMethod)) {
      return res.status(400).json({ 
        error: `Invalid disbursement method. Must be one of: ${validMethods.join(', ')}` 
      });
    }

    // Determine if fee applies (only for app_transfer)
    const feeExempt = disbursementMethod !== 'app_transfer';
    const platformFee = feeExempt ? 0 : PLATFORM_FEE;

    await client.query('BEGIN');

    // MANDATORY: Verify settlement exists, belongs to law firm, and get settlement data
    const settlementResult = await client.query(`
      SELECT s.*, 
        u.stripe_account_id as client_stripe_account,
        u.first_name as client_first_name,
        u.last_name as client_last_name,
        u.email as client_email,
        u.disbursement_completed as client_disbursement_completed,
        (SELECT COUNT(*) FROM medical_liens ml WHERE ml.settlement_id = s.id AND ml.status != 'paid' AND ml.status != 'waived') as unpaid_liens
      FROM settlements s
      JOIN users u ON s.client_id = u.id
      WHERE s.id = $1 AND s.law_firm_id = $2
    `, [settlementId, lawFirmId]);

    if (settlementResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Settlement not found or access denied' });
    }

    const settlement = settlementResult.rows[0];

    // SECURITY: Verify clientId matches settlement's client_id (prevent cross-case payouts)
    if (settlement.client_id !== clientId) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'Client ID does not match the settlement. Cannot disburse funds to a different client.',
        expectedClientId: settlement.client_id,
        providedClientId: clientId
      });
    }

    // Check if client already received final disbursement
    if (settlement.client_disbursement_completed) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'Client has already received final settlement disbursement for this case'
      });
    }

    // Verify settlement status progression
    const validStatuses = ['settled', 'iolta_deposited', 'liens_paid'];
    if (!validStatuses.includes(settlement.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: `Settlement is not ready for disbursement. Current status: ${settlement.status}`,
        requiredStatuses: validStatuses,
        hint: settlement.status === 'pending' 
          ? 'Mark the case as settled first using /api/settlements/:id/mark-settled'
          : 'Complete all required steps before disbursement'
      });
    }

    // Verify IOLTA deposit has been recorded
    if (!settlement.iolta_deposit_amount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'IOLTA deposit must be recorded before disbursement',
        currentStatus: settlement.status,
        hint: 'Record the IOLTA deposit using /api/settlements/:id/record-iolta-deposit'
      });
    }

    // Check for unpaid liens
    if (parseInt(settlement.unpaid_liens) > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'All medical liens must be paid or waived before disbursing to client',
        unpaidLiens: parseInt(settlement.unpaid_liens),
        hint: 'Pay all liens using /api/settlements/:settlementId/liens/:lienId/pay or waive them'
      });
    }

    // Verify disbursement amount doesn't exceed available funds
    const availableForClient = parseFloat(settlement.gross_settlement_amount) 
      - parseFloat(settlement.attorney_fees || 0) 
      - parseFloat(settlement.attorney_costs || 0)
      - parseFloat(settlement.total_medical_liens || 0);
    
    if (parseFloat(clientAmount) > availableForClient) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'Disbursement amount exceeds available funds',
        requestedAmount: parseFloat(clientAmount),
        availableAmount: availableForClient,
        breakdown: {
          grossSettlement: parseFloat(settlement.gross_settlement_amount),
          attorneyFees: parseFloat(settlement.attorney_fees || 0),
          attorneyCosts: parseFloat(settlement.attorney_costs || 0),
          medicalLiens: parseFloat(settlement.total_medical_liens || 0)
        }
      });
    }

    // Get law firm's Stripe customer ID
    const lawFirmResult = await client.query(
      'SELECT stripe_customer_id, firm_name FROM law_firms WHERE id = $1',
      [lawFirmId]
    );

    const lawFirmStripeCustomer = lawFirmResult.rows[0]?.stripe_customer_id;
    const lawFirmName = lawFirmResult.rows[0]?.firm_name;

    // Calculate totals
    const medicalTotal = medicalPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const totalAmount = parseFloat(clientAmount) + medicalTotal + platformFee;

    // Track Stripe IDs
    let paymentIntentId = null;
    let clientTransferId = null;
    const medicalTransferResults = [];
    let allTransfersSuccessful = true;

    // Process Stripe payments if using app_transfer method
    if (disbursementMethod === 'app_transfer') {
      // Verify law firm has payment method for app transfers
      if (!lawFirmStripeCustomer) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: 'Law firm must set up a payment method to use in-app disbursements',
          requiresStripeSetup: true,
          hint: 'Use /api/stripe-connect/create-setup-intent to add a payment method'
        });
      }

      // Verify client has Stripe account
      if (!settlement.client_stripe_account) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: 'Client does not have a Stripe account set up for receiving payments',
          requiresStripeSetup: true,
          clientId: clientId,
          hint: 'Client must set up their Stripe account via /api/stripe-connect/create-account'
        });
      }

      // Step 1: Get law firm's default payment method
      const paymentMethods = await stripe.paymentMethods.list({
        customer: lawFirmStripeCustomer,
        type: 'card'
      });

      if (paymentMethods.data.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ 
          error: 'Law firm has no payment method on file',
          requiresStripeSetup: true,
          hint: 'Add a payment method using /api/stripe-connect/create-setup-intent'
        });
      }

      const defaultPaymentMethod = paymentMethods.data[0].id;

      // Step 2: Create PaymentIntent to charge the law firm for the total disbursement
      // This funds the platform account so transfers can be made
      let chargeId = null; // The charge ID is needed for transfer source_transaction
      
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(totalAmount * 100), // Total including platform fee
          currency: 'usd',
          customer: lawFirmStripeCustomer,
          payment_method: defaultPaymentMethod,
          confirm: true, // Immediately confirm and charge
          off_session: true, // Law firm authorized this in advance
          description: `Settlement disbursement - ${settlement.case_name || 'Case'} - ${lawFirmName}`,
          metadata: {
            settlement_id: settlementId.toString(),
            law_firm_id: lawFirmId.toString(),
            client_id: clientId.toString(),
            client_amount: clientAmount.toString(),
            medical_total: medicalTotal.toString(),
            platform_fee: platformFee.toString(),
            type: 'settlement_disbursement'
          }
        });

        paymentIntentId = paymentIntent.id;
        
        // Get the charge ID from the PaymentIntent - this is required for transfers
        // The latest_charge contains the charge ID after confirmation
        chargeId = paymentIntent.latest_charge;
        
        if (!chargeId) {
          // If latest_charge is not directly available, retrieve the PaymentIntent to get it
          const retrievedIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
            expand: ['latest_charge']
          });
          chargeId = typeof retrievedIntent.latest_charge === 'string' 
            ? retrievedIntent.latest_charge 
            : retrievedIntent.latest_charge?.id;
        }

      } catch (stripeError) {
        console.error('PaymentIntent creation failed:', stripeError);
        await client.query('ROLLBACK');
        return res.status(500).json({ 
          error: 'Failed to charge law firm for disbursement',
          details: stripeError.message,
          hint: 'Ensure law firm has a valid payment method on file'
        });
      }

      // Step 3: Process medical provider transfers (using charge ID as source_transaction)
      for (const payment of medicalPayments) {
        const providerResult = await client.query(
          'SELECT id, stripe_account_id, provider_name FROM medical_providers WHERE id = $1',
          [payment.providerId]
        );

        if (providerResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: `Medical provider ${payment.providerId} not found` });
        }

        const provider = providerResult.rows[0];

        if (!provider.stripe_account_id) {
          // Skip Stripe transfer for providers without accounts
          medicalTransferResults.push({
            providerId: payment.providerId,
            providerName: provider.provider_name,
            amount: payment.amount,
            success: false,
            reason: 'No Stripe account',
            requiresManualPayment: true
          });
          continue;
        }

        try {
          const transfer = await stripe.transfers.create({
            amount: Math.round(parseFloat(payment.amount) * 100),
            currency: 'usd',
            destination: provider.stripe_account_id,
            description: `Medical lien payment - ${provider.provider_name}`,
            source_transaction: chargeId, // Link to the charge (not PaymentIntent)
            metadata: {
              settlement_id: settlementId.toString(),
              law_firm_id: lawFirmId.toString(),
              client_id: clientId.toString(),
              medical_provider_id: payment.providerId.toString(),
              type: 'medical_lien_payment'
            }
          });

          medicalTransferResults.push({
            providerId: payment.providerId,
            providerName: provider.provider_name,
            amount: payment.amount,
            success: true,
            stripeTransferId: transfer.id
          });
        } catch (stripeError) {
          console.error(`Stripe transfer failed for provider ${provider.provider_name}:`, stripeError);
          medicalTransferResults.push({
            providerId: payment.providerId,
            providerName: provider.provider_name,
            amount: payment.amount,
            success: false,
            reason: stripeError.message,
            requiresManualPayment: true
          });
          allTransfersSuccessful = false;
        }
      }

      // Step 4: Process client transfer
      try {
        const transfer = await stripe.transfers.create({
          amount: Math.round(parseFloat(clientAmount) * 100),
          currency: 'usd',
          destination: settlement.client_stripe_account,
          description: `Settlement disbursement - ${settlement.case_name || 'Case'}`,
          source_transaction: chargeId, // Link to the charge (not PaymentIntent)
          metadata: {
            settlement_id: settlementId.toString(),
            law_firm_id: lawFirmId.toString(),
            client_id: clientId.toString(),
            type: 'client_disbursement'
          }
        });
        clientTransferId = transfer.id;
      } catch (stripeError) {
        console.error('Stripe transfer to client failed:', stripeError);
        await client.query('ROLLBACK');
        return res.status(500).json({ 
          error: 'Failed to transfer funds to client',
          details: stripeError.message
        });
      }

      // Log platform fee collection
      if (platformFee > 0) {
      }
    }

    // Determine final status
    const disbursementStatus = disbursementMethod === 'app_transfer' && clientTransferId 
      ? 'completed' 
      : 'pending';

    // Record disbursement in database with all new fields
    const createdBy = req.user.lawFirmUserId || null;
    const parsedWithhold = parseFloat(withholdAmount) || 0;
    
    const disbursementResult = await client.query(`
      INSERT INTO disbursements (
        law_firm_id,
        client_id,
        settlement_id,
        client_amount,
        medical_total,
        platform_fee,
        total_amount,
        stripe_payment_intent_id,
        stripe_transfer_id,
        disbursement_method,
        fee_exempt,
        fee_exemption_reason,
        check_number,
        wire_reference,
        notes,
        status,
        created_by,
        withhold_amount,
        withhold_reason,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW())
      RETURNING id
    `, [
      lawFirmId,
      clientId,
      settlementId,
      clientAmount,
      medicalTotal,
      platformFee,
      totalAmount,
      paymentIntentId,
      clientTransferId,
      disbursementMethod,
      feeExempt,
      feeExempt ? `Non-app disbursement method: ${disbursementMethod}` : null,
      checkNumber || null,
      wireReference || null,
      notes || null,
      disbursementStatus,
      createdBy,
      parsedWithhold,
      withholdReason || null
    ]);

    const disbursementId = disbursementResult.rows[0].id;

    // Record medical provider payments
    for (let i = 0; i < medicalPayments.length; i++) {
      const payment = medicalPayments[i];
      const transferResult = medicalTransferResults[i];
      
      await client.query(`
        INSERT INTO disbursement_medical_payments (
          disbursement_id,
          medical_provider_id,
          amount,
          stripe_transfer_id,
          status,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
      `, [
        disbursementId, 
        payment.providerId, 
        payment.amount, 
        transferResult?.stripeTransferId || null,
        transferResult?.success ? 'completed' : 'pending'
      ]);
    }

    // Update user and settlement status
    // For app_transfer: Mark as completed immediately
    // For manual methods: Settlement status is 'disbursed' but disbursement is 'pending' until confirmed
    if (disbursementStatus === 'completed') {
      // In-app transfer completed - mark user as fully disbursed
      await client.query(
        'UPDATE users SET disbursement_completed = true WHERE id = $1',
        [clientId]
      );
    }

    // Update settlement status for ALL disbursement methods
    // The settlement is "disbursed" once the disbursement is recorded, regardless of method
    // For manual methods, the disbursement record has status 'pending' until confirmed
    await client.query(`
      UPDATE settlements 
      SET status = 'disbursed', 
          net_to_client = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [settlementId, clientAmount]);

    await client.query('COMMIT');

    // Build response
    const response = {
      success: true,
      disbursementId,
      settlementId,
      caseName: settlement.case_name,
      clientName: `${settlement.client_first_name} ${settlement.client_last_name}`,
      clientAmount: parseFloat(clientAmount),
      medicalTotal,
      platformFee,
      totalAmount,
      disbursementMethod,
      feeExempt,
      status: disbursementStatus,
      stripePaymentIntentId: paymentIntentId,
      clientTransferId,
      medicalPaymentResults: medicalTransferResults,
      allTransfersSuccessful,
      withholdAmount: parsedWithhold,
      withholdReason: withholdReason || null
    };

    if (feeExempt) {
      response.feeNote = `No platform fee charged for ${disbursementMethod} disbursement method`;
    } else {
      response.feeNote = `Platform fee of $${platformFee} collected for in-app disbursement`;
    }

    if (disbursementMethod !== 'app_transfer') {
      response.manualProcessingRequired = true;
      response.manualProcessingNote = `Please ${
        disbursementMethod === 'check_mailed' ? 'mail the check' :
        disbursementMethod === 'wire_transfer' ? 'process the wire transfer' :
        'arrange for client pickup'
      } to complete this disbursement.`;
    }

    // Send email notifications (non-blocking)
    try {
      const clientName = `${settlement.client_first_name} ${settlement.client_last_name}`;
      
      // Email to client about their disbursement
      if (settlement.client_email) {
        sendDisbursementProcessedEmail(
          settlement.client_email,
          clientName,
          {
            amount: clientAmount,
            method: disbursementMethod,
            referenceId: disbursementId,
            caseName: settlement.case_name
          },
          'client'
        ).catch(err => console.error('Error sending client disbursement email:', err));
      }

      // Email to medical providers about their lien payments
      for (const transferResult of medicalTransferResults) {
        if (transferResult.success) {
          // Get provider email
          const providerResult = await db.query(
            'SELECT email, provider_name FROM medical_providers WHERE id = $1',
            [transferResult.providerId]
          );
          
          if (providerResult.rows[0]?.email) {
            sendLienPaymentEmail(
              providerResult.rows[0].email,
              providerResult.rows[0].provider_name,
              {
                amount: transferResult.amount,
                patientName: clientName,
                lawFirmName: lawFirmName
              }
            ).catch(err => console.error('Error sending provider lien payment email:', err));
          }
        }
      }
    } catch (emailError) {
      console.error('Error sending disbursement emails:', emailError);
    }

    res.json(response);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Disbursement processing error:', error);
    res.status(500).json({ 
      error: 'Failed to process disbursement' 
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

/**
 * PUT /api/disbursements/:id/confirm-manual
 * Confirm a manual disbursement (check mailed, wire sent, or client picked up)
 * This marks the disbursement as completed and the client as fully disbursed
 */
router.put('/:id/confirm-manual', authenticateToken, isLawFirm, requirePremiumLawFirm, async (req, res) => {
  const client = await db.pool.connect();
  
  try {
    const { id } = req.params;
    const lawFirmId = req.user.id;
    const { confirmationType, confirmationNotes } = req.body;

    await client.query('BEGIN');

    // Get the disbursement
    const disbResult = await client.query(`
      SELECT d.*, s.status as settlement_status
      FROM disbursements d
      LEFT JOIN settlements s ON d.settlement_id = s.id
      WHERE d.id = $1 AND d.law_firm_id = $2
    `, [id, lawFirmId]);

    if (disbResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Disbursement not found' });
    }

    const disbursement = disbResult.rows[0];

    if (disbursement.status === 'completed') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Disbursement is already completed' });
    }

    if (disbursement.disbursement_method === 'app_transfer') {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: 'Cannot manually confirm an app transfer disbursement',
        hint: 'App transfers are confirmed automatically via Stripe'
      });
    }

    // Update disbursement to completed
    await client.query(`
      UPDATE disbursements 
      SET status = 'completed',
          completed_at = CURRENT_TIMESTAMP,
          notes = COALESCE(notes || E'\n', '') || $3
      WHERE id = $1 AND law_firm_id = $2
    `, [id, lawFirmId, `Manual confirmation (${confirmationType || disbursement.disbursement_method}): ${confirmationNotes || 'Confirmed'}`]);

    // Mark client as disbursement_completed
    await client.query(
      'UPDATE users SET disbursement_completed = true WHERE id = $1',
      [disbursement.client_id]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Disbursement confirmed successfully',
      disbursementId: id,
      method: disbursement.disbursement_method,
      status: 'completed',
      confirmedAt: new Date().toISOString()
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error confirming manual disbursement:', error);
    res.status(500).json({ error: 'Failed to confirm disbursement' });
  } finally {
    client.release();
  }
});

module.exports = router;
