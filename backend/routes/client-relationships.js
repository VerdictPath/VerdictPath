const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

const getUserType = (user) => {
  if (user.userType === 'lawfirm') return 'law_firm';
  if (user.userType === 'medical_provider') return 'medical_provider';
  return 'individual';
};

router.post('/link-medical-provider', authenticateToken, async (req, res) => {
  try {
    const { clientId, medicalProviderId, isPrimary, firstVisitDate, lastVisitDate } = req.body;
    
    if (!clientId || !medicalProviderId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Client ID and Medical Provider ID are required' 
      });
    }
    
    const userType = getUserType(req.user);
    
    if (userType !== 'law_firm') {
      return res.status(403).json({ 
        success: false, 
        message: 'Only law firms can create client-provider relationships' 
      });
    }
    
    const lawFirmClientCheck = await db.query(
      'SELECT 1 FROM law_firm_clients WHERE law_firm_id = $1 AND client_id = $2',
      [req.user.id, clientId]
    );
    
    if (lawFirmClientCheck.rows.length === 0) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to manage this client' 
      });
    }
    
    const clientExists = await db.query(
      'SELECT 1 FROM users WHERE id = $1 AND user_type = $2',
      [clientId, 'individual']
    );
    
    if (clientExists.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Client not found' 
      });
    }
    
    const providerExists = await db.query(
      'SELECT 1 FROM users WHERE id = $1 AND user_type = $2',
      [medicalProviderId, 'medical_provider']
    );
    
    if (providerExists.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Medical provider not found' 
      });
    }
    
    await db.query(
      `INSERT INTO client_medical_providers (
        client_id, 
        medical_provider_id, 
        first_visit_date, 
        last_visit_date
      )
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (client_id, medical_provider_id) 
       DO UPDATE SET 
         is_active = true, 
         updated_at = CURRENT_TIMESTAMP,
         first_visit_date = COALESCE($3, client_medical_providers.first_visit_date),
         last_visit_date = COALESCE($4, client_medical_providers.last_visit_date)`,
      [clientId, medicalProviderId, firstVisitDate || null, lastVisitDate || null]
    );
    
    if (isPrimary) {
      await db.query(
        'UPDATE users SET primary_medical_provider_id = $1 WHERE id = $2',
        [medicalProviderId, clientId]
      );
    }
    
    res.json({
      success: true,
      message: 'Client linked to medical provider successfully'
    });
    
  } catch (error) {
    console.error('Error linking client to medical provider:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to link client to medical provider' 
    });
  }
});

router.get('/clients/:clientId/medical-providers', authenticateToken, async (req, res) => {
  try {
    const { clientId } = req.params;
    
    const userType = getUserType(req.user);
    
    if (userType === 'law_firm') {
      const verifyQuery = await db.query(
        'SELECT 1 FROM law_firm_clients WHERE law_firm_id = $1 AND client_id = $2',
        [req.user.id, clientId]
      );
      
      if (verifyQuery.rows.length === 0) {
        return res.status(403).json({ 
          success: false, 
          message: 'Not authorized to view this client' 
        });
      }
    } else if (userType === 'individual' && req.user.id != clientId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Unauthorized' 
      });
    }
    
    const result = await db.query(
      `SELECT 
        mp.id,
        mp.email,
        mp.provider_name as name,
        cmp.relationship_type,
        cmp.first_visit_date,
        cmp.last_visit_date,
        cmp.is_active,
        (mp.id = u.primary_medical_provider_id) as is_primary
       FROM client_medical_providers cmp
       JOIN medical_providers mp ON cmp.medical_provider_id = mp.id
       JOIN users u ON cmp.client_id = u.id
       WHERE cmp.client_id = $1 AND cmp.is_active = true
       ORDER BY is_primary DESC NULLS LAST, mp.provider_name`,
      [clientId]
    );
    
    res.json({
      success: true,
      providers: result.rows
    });
    
  } catch (error) {
    console.error('Error fetching medical providers for client:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch medical providers' 
    });
  }
});

router.delete('/clients/:clientId/medical-providers/:providerId', authenticateToken, async (req, res) => {
  try {
    const { clientId, providerId } = req.params;
    
    const userType = getUserType(req.user);
    
    if (userType !== 'law_firm') {
      return res.status(403).json({ 
        success: false, 
        message: 'Only law firms can remove client-provider relationships' 
      });
    }
    
    const lawFirmClientCheck = await db.query(
      'SELECT 1 FROM law_firm_clients WHERE law_firm_id = $1 AND client_id = $2',
      [req.user.id, clientId]
    );
    
    if (lawFirmClientCheck.rows.length === 0) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to manage this client' 
      });
    }
    
    await db.query(
      `UPDATE client_medical_providers 
       SET is_active = false, updated_at = CURRENT_TIMESTAMP 
       WHERE client_id = $1 AND medical_provider_id = $2`,
      [clientId, providerId]
    );
    
    res.json({
      success: true,
      message: 'Medical provider relationship deactivated'
    });
    
  } catch (error) {
    console.error('Error removing medical provider:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to remove medical provider' 
    });
  }
});

module.exports = router;
