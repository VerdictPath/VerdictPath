const db = require('../config/db');
const { checkLawFirmLimit, checkMedicalProviderLimit } = require('../utils/subscriptionLimits');
const { sendConnectionRequestEmail, sendConnectionAcceptedEmail } = require('../services/emailService');

async function createConsentRecords(patientId, grantedToType, grantedToId, ipAddress) {
  try {
    const existing = await db.query(
      `SELECT id FROM consent_records 
       WHERE patient_id = $1 AND granted_to_type = $2 AND granted_to_id = $3 AND status = 'active'`,
      [patientId, grantedToType, grantedToId]
    );
    if (existing.rows.length > 0) return;

    await db.query(
      `INSERT INTO consent_records (patient_id, granted_to_type, granted_to_id, consent_type, status, consent_method, ip_address)
       VALUES ($1, $2, $3, 'FULL_ACCESS', 'active', 'connection_grant', $4)`,
      [patientId, grantedToType, grantedToId, ipAddress || null]
    );
  } catch (error) {
    console.error('Error creating consent records:', error.message);
  }
}

async function revokeConsentRecords(patientId, grantedToType, grantedToId) {
  try {
    await db.query(
      `UPDATE consent_records 
       SET status = 'revoked', revoked_at = NOW(), revoked_reason = 'Connection disconnected'
       WHERE patient_id = $1 AND granted_to_type = $2 AND granted_to_id = $3 AND status = 'active'`,
      [patientId, grantedToType, grantedToId]
    );
  } catch (error) {
    console.error('Error revoking consent records:', error.message);
  }
}

const getMyConnections = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await db.query(
      `SELECT law_firm_code
      FROM users
      WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    const connections = {
      lawFirmCode: user.law_firm_code,
      lawFirm: null,
      medicalProviders: []
    };

    if (user.law_firm_code) {
      const lawFirmResult = await db.query(
        `SELECT id, email, firm_name
        FROM law_firms
        WHERE firm_code = $1`,
        [user.law_firm_code]
      );
      if (lawFirmResult.rows.length > 0) {
        connections.lawFirm = lawFirmResult.rows[0];
      }
    }

    const providersResult = await db.query(
      `SELECT mp.id, mp.email, mp.provider_name, mp.provider_code
      FROM medical_providers mp
      INNER JOIN medical_provider_patients mpp ON mp.id = mpp.medical_provider_id
      WHERE mpp.patient_id = $1
      ORDER BY mpp.registered_date DESC`,
      [userId]
    );

    connections.medicalProviders = providersResult.rows;

    res.json(connections);
  } catch (error) {
    console.error('Error fetching connections:', error);
    res.status(500).json({ error: 'Failed to fetch connections' });
  }
};

const updateLawFirm = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.userType;
    const { lawFirmCode } = req.body;

    if (!lawFirmCode || typeof lawFirmCode !== 'string') {
      return res.status(400).json({ error: 'Valid law firm code is required' });
    }

    if (userType !== 'individual' && userType !== 'client') {
      return res.status(403).json({ 
        error: 'Avast! Only individual users can connect with law firms. This feature is for clients to connect with their legal representation.' 
      });
    }

    const trimmedCode = lawFirmCode.trim().toUpperCase();

    const lawFirmResult = await db.query(
      `SELECT id, email, firm_name, subscription_tier, firm_size
      FROM law_firms
      WHERE firm_code = $1`,
      [trimmedCode]
    );

    if (lawFirmResult.rows.length === 0) {
      return res.status(404).json({ error: 'Law firm not found with this code' });
    }

    const lawFirm = lawFirmResult.rows[0];

    const userResult = await db.query(
      'SELECT law_firm_code FROM users WHERE id = $1',
      [userId]
    );
    const currentLawFirmCode = userResult.rows[0]?.law_firm_code;

    if (currentLawFirmCode && currentLawFirmCode === trimmedCode) {
      return res.json({
        success: true,
        message: 'Already connected to this law firm',
        lawFirm: {
          id: lawFirm.id,
          email: lawFirm.email,
          firm_name: lawFirm.firm_name
        }
      });
    }
    
    const clientCountResult = await db.query(
      'SELECT COUNT(*) as count FROM law_firm_clients WHERE law_firm_id = $1',
      [lawFirm.id]
    );
    
    const clientCount = parseInt(clientCountResult.rows[0].count);
    const limitCheck = checkLawFirmLimit(clientCount, lawFirm.subscription_tier, lawFirm.firm_size);
    
    if (!limitCheck.withinLimit) {
      let errorMessage;
      if (lawFirm.subscription_tier === 'free') {
        errorMessage = 'Blimey! This law firm\'s ship be full to the brim! They\'ve reached the maximum crew of 10 clients on their free trial voyage. Tell \'em to upgrade their vessel to bring more mateys aboard!';
      } else {
        const firmSizeName = lawFirm.firm_size ? lawFirm.firm_size.charAt(0).toUpperCase() + lawFirm.firm_size.slice(1) : 'current';
        errorMessage = `Avast! This law firm has reached their ${firmSizeName} tier limit of ${limitCheck.limit} clients. Time to upgrade the ship to a larger vessel!`;
      }
      return res.status(403).json({ error: errorMessage });
    }

    if (currentLawFirmCode) {
      const oldLawFirmResult = await db.query(
        'SELECT id FROM law_firms WHERE firm_code = $1',
        [currentLawFirmCode]
      );
      
      if (oldLawFirmResult.rows.length > 0) {
        const oldLawFirmId = oldLawFirmResult.rows[0].id;
        await db.query(
          'DELETE FROM law_firm_clients WHERE law_firm_id = $1 AND client_id = $2',
          [oldLawFirmId, userId]
        );
        await revokeConsentRecords(userId, 'lawfirm', oldLawFirmId);
      }
    }

    await db.query(
      `UPDATE users
      SET law_firm_code = $1
      WHERE id = $2`,
      [trimmedCode, userId]
    );

    const clientResult = await db.query(
      `SELECT id FROM law_firm_clients
      WHERE law_firm_id = $1 AND client_id = $2`,
      [lawFirm.id, userId]
    );

    if (clientResult.rows.length === 0) {
      await db.query(
        `INSERT INTO law_firm_clients (law_firm_id, client_id, registered_date)
        VALUES ($1, $2, NOW())`,
        [lawFirm.id, userId]
      );

      await createConsentRecords(userId, 'lawfirm', lawFirm.id, req.ip);

      // Send email notification to law firm about new client connection (non-blocking)
      if (lawFirm.email) {
        try {
          const clientResult = await db.query(
            'SELECT first_name, last_name FROM users WHERE id = $1',
            [userId]
          );
          const clientName = clientResult.rows[0] 
            ? `${clientResult.rows[0].first_name} ${clientResult.rows[0].last_name}` 
            : 'New Client';
          
          sendConnectionRequestEmail(
            lawFirm.email,
            lawFirm.firm_name || 'Law Firm',
            clientName,
            'client',
            'accepted'
          ).catch(err => console.error('Error sending connection notification email:', err));
        } catch (emailError) {
          console.error('Error preparing connection email:', emailError);
        }
      }
    }

    res.json({
      success: true,
      message: `Ahoy! Successfully charted course with ${lawFirm.firm_name || lawFirm.email}!`,
      lawFirm: {
        id: lawFirm.id,
        email: lawFirm.email,
        firm_name: lawFirm.firm_name
      }
    });
  } catch (error) {
    console.error('Error updating law firm connection:', error);
    res.status(500).json({ error: 'Failed to update law firm connection' });
  }
};

const addMedicalProvider = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.userType;
    const { medicalProviderCode } = req.body;

    if (!medicalProviderCode || typeof medicalProviderCode !== 'string') {
      return res.status(400).json({ error: 'Valid medical provider code is required' });
    }

    if (userType !== 'individual' && userType !== 'client') {
      return res.status(403).json({ 
        error: 'Ahoy! Only individual users can connect with medical providers. This feature is for patients to connect with their healthcare providers.' 
      });
    }

    const trimmedCode = medicalProviderCode.trim().toUpperCase();

    const providerResult = await db.query(
      `SELECT id, email, provider_name, subscription_tier, provider_code
      FROM medical_providers
      WHERE provider_code = $1`,
      [trimmedCode]
    );

    if (providerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Medical provider not found with this code' });
    }

    const provider = providerResult.rows[0];

    const existingConnectionResult = await db.query(
      `SELECT id FROM medical_provider_patients
      WHERE medical_provider_id = $1 AND patient_id = $2`,
      [provider.id, userId]
    );

    if (existingConnectionResult.rows.length > 0) {
      return res.json({
        success: true,
        message: 'Already connected to this medical provider',
        medicalProvider: {
          id: provider.id,
          email: provider.email,
          provider_name: provider.provider_name,
          provider_code: provider.provider_code
        }
      });
    }
    
    if (provider.subscription_tier === 'free') {
      const patientCountResult = await db.query(
        'SELECT COUNT(*) as count FROM medical_provider_patients WHERE medical_provider_id = $1',
        [provider.id]
      );
      
      const patientCount = parseInt(patientCountResult.rows[0].count);
      if (patientCount >= 10) {
        return res.status(403).json({ 
          error: 'Avast! This medical provider\'s roster be at full capacity! They\'ve reached the maximum of 10 patients on their free trial voyage. Time to upgrade the ship to welcome more souls aboard!' 
        });
      }
    }

    await db.query(
      `INSERT INTO medical_provider_patients (medical_provider_id, patient_id, registered_date)
      VALUES ($1, $2, NOW())`,
      [provider.id, userId]
    );

    await createConsentRecords(userId, 'medical_provider', provider.id, req.ip);

    // Send email notification to medical provider about new patient connection (non-blocking)
    if (provider.email) {
      try {
        const patientResult = await db.query(
          'SELECT first_name, last_name FROM users WHERE id = $1',
          [userId]
        );
        const patientName = patientResult.rows[0] 
          ? `${patientResult.rows[0].first_name} ${patientResult.rows[0].last_name}` 
          : 'New Patient';
        
        sendConnectionRequestEmail(
          provider.email,
          provider.provider_name || 'Medical Provider',
          patientName,
          'patient',
          'accepted'
        ).catch(err => console.error('Error sending provider connection email:', err));
      } catch (emailError) {
        console.error('Error preparing provider connection email:', emailError);
      }
    }

    res.json({
      success: true,
      message: `Ahoy! Successfully added ${provider.provider_name || provider.email} to your medical team!`,
      medicalProvider: {
        id: provider.id,
        email: provider.email,
        provider_name: provider.provider_name,
        provider_code: provider.provider_code
      }
    });
  } catch (error) {
    console.error('Error adding medical provider connection:', error);
    res.status(500).json({ error: 'Failed to add medical provider connection' });
  }
};

const disconnectLawFirm = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.userType;

    if (userType !== 'individual' && userType !== 'client') {
      return res.status(403).json({ 
        error: 'Avast! Only individual users can manage law firm connections.' 
      });
    }

    const userResult = await db.query(
      'SELECT law_firm_code FROM users WHERE id = $1',
      [userId]
    );

    const currentLawFirmCode = userResult.rows[0]?.law_firm_code;

    if (!currentLawFirmCode) {
      return res.status(400).json({ 
        error: 'No law firm connection to disconnect from.' 
      });
    }

    const lawFirmResult = await db.query(
      'SELECT id, firm_name, email FROM law_firms WHERE firm_code = $1',
      [currentLawFirmCode]
    );

    if (lawFirmResult.rows.length > 0) {
      const lawFirmId = lawFirmResult.rows[0].id;
      await db.query(
        'DELETE FROM law_firm_clients WHERE law_firm_id = $1 AND client_id = $2',
        [lawFirmId, userId]
      );

      await revokeConsentRecords(userId, 'lawfirm', lawFirmId);
    }

    await db.query(
      `UPDATE users
      SET law_firm_code = NULL,
          updated_at = NOW()
      WHERE id = $1`,
      [userId]
    );

    res.json({
      success: true,
      message: 'Successfully disconnected from law firm. You can now connect with a different law firm if you have their code.'
    });
  } catch (error) {
    console.error('Error disconnecting from law firm:', error);
    res.status(500).json({ error: 'Failed to disconnect from law firm' });
  }
};

const removeMedicalProvider = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.userType;
    const { providerId } = req.body;

    if (userType !== 'individual' && userType !== 'client') {
      return res.status(403).json({ 
        error: 'Ahoy! Only individual users can manage medical provider connections.' 
      });
    }

    if (!providerId) {
      return res.status(400).json({ 
        error: 'Medical provider ID is required.' 
      });
    }

    const existingConnectionResult = await db.query(
      'SELECT id FROM medical_provider_patients WHERE medical_provider_id = $1 AND patient_id = $2',
      [providerId, userId]
    );

    if (existingConnectionResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'No connection found with this medical provider.' 
      });
    }

    await db.query(
      'DELETE FROM medical_provider_patients WHERE medical_provider_id = $1 AND patient_id = $2',
      [providerId, userId]
    );

    await revokeConsentRecords(userId, 'medical_provider', providerId);

    res.json({
      success: true,
      message: 'Successfully removed medical provider from your connections.'
    });
  } catch (error) {
    console.error('Error removing medical provider:', error);
    res.status(500).json({ error: 'Failed to remove medical provider' });
  }
};

// Medical Provider - Get Connected Law Firms
const getMedicalProviderLawFirms = async (req, res) => {
  try {
    const providerId = req.user.id;
    const userType = req.user.userType;

    if (userType !== 'medical_provider') {
      return res.status(403).json({ 
        error: 'Only medical providers can access law firm connections.' 
      });
    }

    const result = await db.query(
      `SELECT 
        mplf.id as connection_id,
        mplf.connected_date,
        mplf.connection_status,
        lf.id,
        lf.email,
        lf.firm_name,
        lf.firm_code,
        lf.subscription_tier,
        (SELECT COUNT(*) FROM law_firm_clients WHERE law_firm_id = lf.id) as client_count
      FROM medical_provider_law_firms mplf
      INNER JOIN law_firms lf ON mplf.law_firm_id = lf.id
      WHERE mplf.medical_provider_id = $1 
        AND mplf.connection_status = 'active'
      ORDER BY mplf.connected_date DESC`,
      [providerId]
    );

    res.json({
      success: true,
      lawFirms: result.rows
    });
  } catch (error) {
    console.error('Error fetching law firm connections:', error);
    res.status(500).json({ error: 'Failed to fetch law firm connections' });
  }
};

// Medical Provider - Add Law Firm Connection
const addLawFirmConnection = async (req, res) => {
  try {
    const providerId = req.user.id;
    const userType = req.user.userType;
    const { firmCode } = req.body;

    if (userType !== 'medical_provider') {
      return res.status(403).json({ 
        error: 'Only medical providers can add law firm connections.' 
      });
    }

    if (!firmCode || typeof firmCode !== 'string') {
      return res.status(400).json({ error: 'Valid law firm code is required' });
    }

    const trimmedCode = firmCode.trim().toUpperCase();

    const lawFirmResult = await db.query(
      `SELECT id, email, firm_name, firm_code
      FROM law_firms
      WHERE firm_code = $1`,
      [trimmedCode]
    );

    if (lawFirmResult.rows.length === 0) {
      return res.status(404).json({ error: 'Law firm not found with this code' });
    }

    const lawFirm = lawFirmResult.rows[0];

    // Check if already connected
    const existingConnection = await db.query(
      `SELECT id FROM medical_provider_law_firms
      WHERE medical_provider_id = $1 AND law_firm_id = $2 AND connection_status = 'active'`,
      [providerId, lawFirm.id]
    );

    if (existingConnection.rows.length > 0) {
      return res.json({
        success: true,
        message: 'Already connected to this law firm',
        lawFirm: lawFirm
      });
    }

    // Create new connection
    await db.query(
      `INSERT INTO medical_provider_law_firms (medical_provider_id, law_firm_id, connection_status, connected_date, created_at, updated_at)
      VALUES ($1, $2, 'active', NOW(), NOW(), NOW())`,
      [providerId, lawFirm.id]
    );

    res.json({
      success: true,
      message: `Successfully connected with ${lawFirm.firm_name || lawFirm.email}!`,
      lawFirm: lawFirm
    });
  } catch (error) {
    console.error('Error adding law firm connection:', error);
    res.status(500).json({ error: 'Failed to add law firm connection' });
  }
};

// Medical Provider - Remove Law Firm Connection
const removeLawFirmConnection = async (req, res) => {
  try {
    const providerId = req.user.id;
    const userType = req.user.userType;
    const { lawFirmId } = req.body;

    if (userType !== 'medical_provider') {
      return res.status(403).json({ 
        error: 'Only medical providers can remove law firm connections.' 
      });
    }

    if (!lawFirmId) {
      return res.status(400).json({ 
        error: 'Law firm ID is required.' 
      });
    }

    const existingConnection = await db.query(
      `SELECT id FROM medical_provider_law_firms
      WHERE medical_provider_id = $1 AND law_firm_id = $2 AND connection_status = 'active'`,
      [providerId, lawFirmId]
    );

    if (existingConnection.rows.length === 0) {
      return res.status(404).json({ 
        error: 'No active connection found with this law firm.' 
      });
    }

    // Mark as disconnected instead of deleting (preserve history)
    await db.query(
      `UPDATE medical_provider_law_firms
      SET connection_status = 'disconnected',
          disconnected_date = NOW(),
          updated_at = NOW()
      WHERE medical_provider_id = $1 AND law_firm_id = $2 AND connection_status = 'active'`,
      [providerId, lawFirmId]
    );

    res.json({
      success: true,
      message: 'Successfully removed law firm connection.'
    });
  } catch (error) {
    console.error('Error removing law firm connection:', error);
    res.status(500).json({ error: 'Failed to remove law firm connection' });
  }
};

// Law Firm - Get Connected Medical Providers
const getLawFirmMedicalProviders = async (req, res) => {
  try {
    const lawFirmId = req.user.id;
    const userType = req.user.userType;

    if (userType !== 'lawfirm') {
      return res.status(403).json({ 
        error: 'Only law firms can access medical provider connections.' 
      });
    }

    const result = await db.query(
      `SELECT 
        mplf.id as connection_id,
        mplf.connected_date,
        mplf.connection_status,
        mp.id,
        mp.email,
        mp.provider_name,
        mp.provider_code,
        mp.subscription_tier,
        (SELECT COUNT(*) FROM medical_provider_patients WHERE medical_provider_id = mp.id) as patient_count
      FROM medical_provider_law_firms mplf
      INNER JOIN medical_providers mp ON mplf.medical_provider_id = mp.id
      WHERE mplf.law_firm_id = $1 
        AND mplf.connection_status = 'active'
      ORDER BY mplf.connected_date DESC`,
      [lawFirmId]
    );

    res.json({
      success: true,
      medicalProviders: result.rows
    });
  } catch (error) {
    console.error('Error fetching medical provider connections:', error);
    res.status(500).json({ error: 'Failed to fetch medical provider connections' });
  }
};

// Law Firm - Add Medical Provider Connection
const addMedicalProviderConnection = async (req, res) => {
  try {
    const lawFirmId = req.user.id;
    const userType = req.user.userType;
    const { medicalProviderCode } = req.body;

    if (userType !== 'lawfirm') {
      return res.status(403).json({ 
        error: 'Only law firms can add medical provider connections.' 
      });
    }

    if (!medicalProviderCode || typeof medicalProviderCode !== 'string') {
      return res.status(400).json({ error: 'Valid medical provider code is required' });
    }

    const trimmedCode = medicalProviderCode.trim().toUpperCase();

    const providerResult = await db.query(
      `SELECT id, email, provider_name, provider_code
      FROM medical_providers
      WHERE provider_code = $1`,
      [trimmedCode]
    );

    if (providerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Medical provider not found with this code' });
    }

    const provider = providerResult.rows[0];

    // Check if already connected
    const existingConnection = await db.query(
      `SELECT id FROM medical_provider_law_firms
      WHERE law_firm_id = $1 AND medical_provider_id = $2 AND connection_status = 'active'`,
      [lawFirmId, provider.id]
    );

    if (existingConnection.rows.length > 0) {
      return res.json({
        success: true,
        message: 'Already connected to this medical provider',
        medicalProvider: provider
      });
    }

    // Create new connection
    await db.query(
      `INSERT INTO medical_provider_law_firms (law_firm_id, medical_provider_id, connection_status, connected_date, created_at, updated_at)
      VALUES ($1, $2, 'active', NOW(), NOW(), NOW())`,
      [lawFirmId, provider.id]
    );

    res.json({
      success: true,
      message: `Successfully connected with ${provider.provider_name || provider.email}!`,
      medicalProvider: provider
    });
  } catch (error) {
    console.error('Error adding medical provider connection:', error);
    res.status(500).json({ error: 'Failed to add medical provider connection' });
  }
};

// Law Firm - Remove Medical Provider Connection
const removeMedicalProviderConnection = async (req, res) => {
  try {
    const lawFirmId = req.user.id;
    const userType = req.user.userType;
    const { providerId } = req.body;

    if (userType !== 'lawfirm') {
      return res.status(403).json({ 
        error: 'Only law firms can remove medical provider connections.' 
      });
    }

    if (!providerId) {
      return res.status(400).json({ 
        error: 'Medical provider ID is required.' 
      });
    }

    const existingConnection = await db.query(
      `SELECT id FROM medical_provider_law_firms
      WHERE law_firm_id = $1 AND medical_provider_id = $2 AND connection_status = 'active'`,
      [lawFirmId, providerId]
    );

    if (existingConnection.rows.length === 0) {
      return res.status(404).json({ 
        error: 'No active connection found with this medical provider.' 
      });
    }

    // Mark as disconnected instead of deleting (preserve history)
    await db.query(
      `UPDATE medical_provider_law_firms
      SET connection_status = 'disconnected',
          disconnected_date = NOW(),
          updated_at = NOW()
      WHERE law_firm_id = $1 AND medical_provider_id = $2 AND connection_status = 'active'`,
      [lawFirmId, providerId]
    );

    res.json({
      success: true,
      message: 'Successfully removed medical provider connection.'
    });
  } catch (error) {
    console.error('Error removing medical provider connection:', error);
    res.status(500).json({ error: 'Failed to remove medical provider connection' });
  }
};

module.exports = {
  getMyConnections,
  updateLawFirm,
  addMedicalProvider,
  disconnectLawFirm,
  removeMedicalProvider,
  getMedicalProviderLawFirms,
  addLawFirmConnection,
  removeLawFirmConnection,
  getLawFirmMedicalProviders,
  addMedicalProviderConnection,
  removeMedicalProviderConnection
};
