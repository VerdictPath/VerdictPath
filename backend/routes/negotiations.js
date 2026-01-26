const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const { 
  syncNegotiationToFirebase, 
  syncNegotiationUpdateToFirebase 
} = require('../services/firebaseSync');

// Helper function to get user type from token
const getUserType = (user) => {
  if (user.userType === 'lawfirm') return 'law_firm';
  if (user.userType === 'medical_provider') return 'medical_provider';
  return null;
};

// GET /api/negotiations - List all negotiations for current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userType = getUserType(req.user);
    
    if (!userType) {
      return res.status(403).json({ 
        success: false, 
        message: 'Only law firms and medical providers can access negotiations' 
      });
    }

    let query;
    let params;

    if (userType === 'law_firm') {
      query = `
        SELECT * FROM negotiations_with_details 
        WHERE law_firm_id = $1 
        ORDER BY updated_at DESC
      `;
      params = [req.user.id];
    } else {
      query = `
        SELECT * FROM negotiations_with_details 
        WHERE medical_provider_id = $1 
        ORDER BY updated_at DESC
      `;
      params = [req.user.id];
    }

    const result = await db.query(query, params);

    res.json({
      success: true,
      negotiations: result.rows
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch negotiations' 
    });
  }
});

// POST /api/negotiations/initiate - Start a new negotiation
router.post('/initiate', authenticateToken, async (req, res) => {
  try {
    const userType = getUserType(req.user);
    
    if (!userType) {
      return res.status(403).json({ 
        success: false, 
        message: 'Only law firms and medical providers can initiate negotiations' 
      });
    }

    const {
      clientId,
      medicalProviderId,
      billDescription,
      billAmount,
      initialOffer,
      notes
    } = req.body;

    // Debug logging
      clientId,
      medicalProviderId,
      billDescription,
      billAmount,
      initialOffer,
      notes,
      userType
    });

    // Validation
    if (!clientId || !billDescription || !billAmount || initialOffer === undefined) {
        hasClientId: !!clientId,
        hasBillDescription: !!billDescription,
        hasBillAmount: !!billAmount,
        hasInitialOffer: initialOffer !== undefined,
        actualValues: { clientId, billDescription, billAmount, initialOffer }
      });
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    if (parseFloat(initialOffer) > parseFloat(billAmount)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Initial offer must be less than or equal to bill amount' 
      });
    }

    // Determine the parties based on who is initiating
    let lawFirmId, finalMedicalProviderId;
    
    if (userType === 'law_firm') {
      lawFirmId = req.user.id;
      finalMedicalProviderId = medicalProviderId;
      
      // Verify client belongs to this law firm
      const clientCheck = await db.query(
        'SELECT 1 FROM law_firm_clients WHERE law_firm_id = $1 AND client_id = $2',
        [lawFirmId, clientId]
      );
      
      if (clientCheck.rows.length === 0) {
        return res.status(403).json({ 
          success: false, 
          message: 'Client does not belong to this law firm' 
        });
      }
    } else {
      // Medical provider initiating
      finalMedicalProviderId = req.user.id;
      
      // Find law firm from client relationship
      const lawFirmQuery = await db.query(
        'SELECT law_firm_id FROM law_firm_clients WHERE client_id = $1 LIMIT 1',
        [clientId]
      );
      
      if (lawFirmQuery.rows.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'No law firm found for this client' 
        });
      }
      
      lawFirmId = lawFirmQuery.rows[0].law_firm_id;
      
      // Verify patient belongs to this medical provider
      const patientCheck = await db.query(
        'SELECT 1 FROM medical_provider_patients WHERE medical_provider_id = $1 AND patient_id = $2',
        [finalMedicalProviderId, clientId]
      );
      
      if (patientCheck.rows.length === 0) {
        return res.status(403).json({ 
          success: false, 
          message: 'Patient does not belong to this medical provider' 
        });
      }
    }

    if (!lawFirmId || !finalMedicalProviderId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot determine all parties for negotiation' 
      });
    }

    // Create negotiation
    const insertQuery = `
      INSERT INTO negotiations (
        client_id, 
        law_firm_id, 
        medical_provider_id,
        bill_description,
        bill_amount,
        current_offer,
        initiated_by,
        last_responded_by,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;

    const negotiationResult = await db.query(insertQuery, [
      clientId,
      lawFirmId,
      finalMedicalProviderId,
      billDescription,
      billAmount,
      initialOffer,
      userType,
      userType,
      'pending'
    ]);

    const negotiation = negotiationResult.rows[0];

    // Add to history
    await db.query(
      `INSERT INTO negotiation_history (
        negotiation_id, action_type, action_by, amount, notes
      ) VALUES ($1, $2, $3, $4, $5)`,
      [negotiation.id, 'initiated', userType, initialOffer, notes || null]
    );

    // Get full negotiation details for Firebase sync
    const fullNegotiationQuery = await db.query(
      'SELECT * FROM negotiations_with_details WHERE id = $1',
      [negotiation.id]
    );
    
    // Sync to Firebase for real-time updates
    if (fullNegotiationQuery.rows.length > 0) {
      syncNegotiationToFirebase(fullNegotiationQuery.rows[0]).catch(err => {
      });
    }

    // Send push notification to the other party (notifications disabled for now)
    // const otherPartyId = userType === 'law_firm' ? finalMedicalProviderId : lawFirmId;
    // const otherPartyType = userType === 'law_firm' ? 'medical_provider' : 'lawfirm';

    res.status(201).json({
      success: true,
      message: 'Negotiation initiated successfully',
      negotiation
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to initiate negotiation',
      error: error.message
    });
  }
});

// POST /api/negotiations/counter-offer - Send a counter offer
router.post('/counter-offer', authenticateToken, async (req, res) => {
  try {
    const userType = getUserType(req.user);
    
    if (!userType) {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized' 
      });
    }

    const { negotiationId, counterOffer, notes } = req.body;

    if (!negotiationId || counterOffer === undefined) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    // Get negotiation details
    const negotiationQuery = await db.query(
      'SELECT * FROM negotiations WHERE id = $1',
      [negotiationId]
    );

    if (negotiationQuery.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Negotiation not found' 
      });
    }

    const negotiation = negotiationQuery.rows[0];

    // Verify user is part of this negotiation
    const isAuthorized = (
      (userType === 'law_firm' && negotiation.law_firm_id === req.user.id) ||
      (userType === 'medical_provider' && negotiation.medical_provider_id === req.user.id)
    );

    if (!isAuthorized) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized for this negotiation' 
      });
    }

    // Validate counter offer
    if (parseFloat(counterOffer) > parseFloat(negotiation.bill_amount) || parseFloat(counterOffer) < 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid counter offer amount' 
      });
    }

    // Update negotiation
    await db.query(
      `UPDATE negotiations 
       SET current_offer = $1, 
           status = 'counter_offered',
           last_responded_by = $2
       WHERE id = $3`,
      [counterOffer, userType, negotiationId]
    );

    // Add to history
    await db.query(
      `INSERT INTO negotiation_history (
        negotiation_id, action_type, action_by, amount, notes
      ) VALUES ($1, $2, $3, $4, $5)`,
      [negotiationId, 'counter_offer', userType, counterOffer, notes || null]
    );

    // Sync update to Firebase for real-time updates
    const updatedNegotiationQuery = await db.query(
      'SELECT * FROM negotiations_with_details WHERE id = $1',
      [negotiationId]
    );
    
    if (updatedNegotiationQuery.rows.length > 0) {
      syncNegotiationToFirebase(updatedNegotiationQuery.rows[0]).catch(err => {
      });
    }

    // Send push notification to the other party (notifications disabled for now)
    // const otherPartyId = userType === 'law_firm' 
    //   ? negotiation.medical_provider_id 
    //   : negotiation.law_firm_id;
    // const otherPartyType = userType === 'law_firm' ? 'medical_provider' : 'lawfirm';

    res.json({
      success: true,
      message: 'Counter offer sent successfully'
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send counter offer' 
    });
  }
});

// POST /api/negotiations/accept - Accept the current offer
router.post('/accept', authenticateToken, async (req, res) => {
  try {
    const userType = getUserType(req.user);
    
    if (!userType) {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized' 
      });
    }

    const { negotiationId } = req.body;

    if (!negotiationId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing negotiation ID' 
      });
    }

    // Get negotiation details
    const negotiationQuery = await db.query(
      'SELECT * FROM negotiations_with_details WHERE id = $1',
      [negotiationId]
    );

    if (negotiationQuery.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Negotiation not found' 
      });
    }

    const negotiation = negotiationQuery.rows[0];

    // Verify user is part of this negotiation
    const isAuthorized = (
      (userType === 'law_firm' && negotiation.law_firm_id === req.user.id) ||
      (userType === 'medical_provider' && negotiation.medical_provider_id === req.user.id)
    );

    if (!isAuthorized) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized for this negotiation' 
      });
    }

    // Check if negotiation is already accepted
    if (negotiation.status === 'accepted') {
      return res.status(400).json({ 
        success: false, 
        message: 'This negotiation has already been accepted' 
      });
    }

    // Verify user can accept - you can only accept offers made by the OTHER party
    // If you made the last offer (last_responded_by = your type), you cannot accept your own offer
    const lastRespondedBy = negotiation.last_responded_by;
    
    if (lastRespondedBy === userType) {
      return res.status(400).json({ 
        success: false, 
        message: 'You cannot accept your own offer. Wait for the other party to respond.' 
      });
    }

    // Update negotiation to accepted
    await db.query(
      `UPDATE negotiations 
       SET status = 'accepted',
           accepted_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [negotiationId]
    );

    // Add to history
    await db.query(
      `INSERT INTO negotiation_history (
        negotiation_id, action_type, action_by, amount
      ) VALUES ($1, $2, $3, $4)`,
      [negotiationId, 'accepted', userType, negotiation.current_offer]
    );

    // Sync update to Firebase for real-time updates
    const acceptedNegotiationQuery = await db.query(
      'SELECT * FROM negotiations_with_details WHERE id = $1',
      [negotiationId]
    );
    
    if (acceptedNegotiationQuery.rows.length > 0) {
      syncNegotiationToFirebase(acceptedNegotiationQuery.rows[0]).catch(err => {
      });
    }

    // Send push notification to the other party (notifications disabled for now)
    // const otherPartyId = userType === 'law_firm' 
    //   ? negotiation.medical_provider_id 
    //   : negotiation.law_firm_id;
    // const otherPartyType = userType === 'law_firm' ? 'medical_provider' : 'lawfirm';

    res.json({
      success: true,
      message: 'Offer accepted successfully'
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to accept offer' 
    });
  }
});

// POST /api/negotiations/request-call - Request a phone call
router.post('/request-call', authenticateToken, async (req, res) => {
  try {
    const userType = getUserType(req.user);
    
    if (!userType) {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized' 
      });
    }

    const { negotiationId, phoneNumber, notes } = req.body;

    if (!negotiationId || !phoneNumber) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    // Get negotiation details
    const negotiationQuery = await db.query(
      'SELECT * FROM negotiations WHERE id = $1',
      [negotiationId]
    );

    if (negotiationQuery.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Negotiation not found' 
      });
    }

    const negotiation = negotiationQuery.rows[0];

    // Verify user is part of this negotiation
    const isAuthorized = (
      (userType === 'law_firm' && negotiation.law_firm_id === req.user.id) ||
      (userType === 'medical_provider' && negotiation.medical_provider_id === req.user.id)
    );

    if (!isAuthorized) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized for this negotiation' 
      });
    }

    // Update negotiation status to stalled and last_responded_by
    // This allows the other party to accept the current offer after the call
    await db.query(
      `UPDATE negotiations 
       SET status = 'stalled',
           last_responded_by = $2
       WHERE id = $1`,
      [negotiationId, userType]
    );

    // Add to history
    await db.query(
      `INSERT INTO negotiation_history (
        negotiation_id, action_type, action_by, phone_number, notes
      ) VALUES ($1, $2, $3, $4, $5)`,
      [negotiationId, 'call_requested', userType, phoneNumber, notes || null]
    );

    // Sync update to Firebase for real-time updates
    const stalledNegotiationQuery = await db.query(
      'SELECT * FROM negotiations_with_details WHERE id = $1',
      [negotiationId]
    );
    
    if (stalledNegotiationQuery.rows.length > 0) {
      syncNegotiationToFirebase(stalledNegotiationQuery.rows[0]).catch(err => {
      });
    }

    // Send push notification with phone number to the other party (notifications disabled for now)
    // const otherPartyId = userType === 'law_firm' 
    //   ? negotiation.medical_provider_id 
    //   : negotiation.law_firm_id;
    // const otherPartyType = userType === 'law_firm' ? 'medical_provider' : 'lawfirm';

    res.json({
      success: true,
      message: 'Call request sent successfully'
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send call request' 
    });
  }
});

// GET /api/negotiations/:id/log - Get negotiation log
router.get('/:id/log', authenticateToken, async (req, res) => {
  try {
    const userType = getUserType(req.user);
    const negotiationId = req.params.id;

    // Get negotiation with full details
    const negotiationQuery = await db.query(
      'SELECT * FROM negotiations_with_details WHERE id = $1',
      [negotiationId]
    );

    if (negotiationQuery.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Negotiation not found' 
      });
    }

    const negotiation = negotiationQuery.rows[0];

    // Verify user is part of this negotiation
    const isAuthorized = (
      (userType === 'law_firm' && negotiation.law_firm_id === req.user.id) ||
      (userType === 'medical_provider' && negotiation.medical_provider_id === req.user.id)
    );

    if (!isAuthorized) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to view this negotiation' 
      });
    }

    // Only allow log download if negotiation is accepted
    if (negotiation.status !== 'accepted') {
      return res.status(400).json({ 
        success: false, 
        message: 'Negotiation log only available after acceptance' 
      });
    }

    const savingsAmount = parseFloat(negotiation.bill_amount) - parseFloat(negotiation.current_offer);
    const savingsPercentage = (savingsAmount / parseFloat(negotiation.bill_amount) * 100).toFixed(2);

    res.json({
      success: true,
      log: {
        negotiationId: negotiation.id,
        clientName: negotiation.client_name,
        lawFirm: negotiation.firm_name,
        medicalProvider: negotiation.provider_name,
        billDescription: negotiation.bill_description,
        originalAmount: parseFloat(negotiation.bill_amount),
        finalAmount: parseFloat(negotiation.current_offer),
        savingsAmount: savingsAmount,
        savingsPercentage: savingsPercentage,
        initiatedAt: negotiation.created_at,
        acceptedAt: negotiation.accepted_at,
        history: negotiation.history
      }
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch negotiation log' 
    });
  }
});

module.exports = router;
