const db = require('../config/db');
const { checkLawFirmLimit, checkMedicalProviderLimit } = require('../utils/subscriptionLimits');

const getMyConnections = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await db.query(
      `SELECT 
        law_firm_code,
        medical_provider_code
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
      medicalProviderCode: user.medical_provider_code,
      lawFirm: null,
      medicalProvider: null
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

    if (user.medical_provider_code) {
      const providerResult = await db.query(
        `SELECT id, email, provider_name
        FROM medical_providers
        WHERE provider_code = $1`,
        [user.medical_provider_code]
      );
      if (providerResult.rows.length > 0) {
        connections.medicalProvider = providerResult.rows[0];
      }
    }

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
        await db.query(
          'DELETE FROM law_firm_clients WHERE law_firm_id = $1 AND client_id = $2',
          [oldLawFirmResult.rows[0].id, userId]
        );
      }
    }

    await db.query(
      `UPDATE users
      SET law_firm_code = $1,
          updated_at = NOW()
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
        `INSERT INTO law_firm_clients (law_firm_id, client_id, created_at)
        VALUES ($1, $2, NOW())`,
        [lawFirm.id, userId]
      );
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

const updateMedicalProvider = async (req, res) => {
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
      `SELECT id, email, provider_name, subscription_tier
      FROM medical_providers
      WHERE provider_code = $1`,
      [trimmedCode]
    );

    if (providerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Medical provider not found with this code' });
    }

    const provider = providerResult.rows[0];

    const userResult = await db.query(
      'SELECT medical_provider_code FROM users WHERE id = $1',
      [userId]
    );
    const currentProviderCode = userResult.rows[0]?.medical_provider_code;

    if (currentProviderCode && currentProviderCode === trimmedCode) {
      return res.json({
        success: true,
        message: 'Already connected to this medical provider',
        medicalProvider: {
          id: provider.id,
          email: provider.email,
          provider_name: provider.provider_name
        }
      });
    }
    
    if (provider.subscription_tier === 'free') {
      const patientCountResult = await db.query(
        'SELECT COUNT(*) as count FROM medical_provider_patients WHERE provider_id = $1',
        [provider.id]
      );
      
      const patientCount = parseInt(patientCountResult.rows[0].count);
      if (patientCount >= 10) {
        return res.status(403).json({ 
          error: 'Avast! This medical provider\'s roster be at full capacity! They\'ve reached the maximum of 10 patients on their free trial voyage. Time to upgrade the ship to welcome more souls aboard!' 
        });
      }
    }

    if (currentProviderCode) {
      const oldProviderResult = await db.query(
        'SELECT id FROM medical_providers WHERE provider_code = $1',
        [currentProviderCode]
      );
      
      if (oldProviderResult.rows.length > 0) {
        await db.query(
          'DELETE FROM medical_provider_patients WHERE provider_id = $1 AND patient_id = $2',
          [oldProviderResult.rows[0].id, userId]
        );
      }
    }

    await db.query(
      `UPDATE users
      SET medical_provider_code = $1,
          updated_at = NOW()
      WHERE id = $2`,
      [trimmedCode, userId]
    );

    const patientResult = await db.query(
      `SELECT id FROM medical_provider_patients
      WHERE provider_id = $1 AND patient_id = $2`,
      [provider.id, userId]
    );

    if (patientResult.rows.length === 0) {
      await db.query(
        `INSERT INTO medical_provider_patients (provider_id, patient_id, created_at)
        VALUES ($1, $2, NOW())`,
        [provider.id, userId]
      );
    }

    res.json({
      success: true,
      message: `Ahoy! Successfully charted course with ${provider.provider_name || provider.email}!`,
      medicalProvider: {
        id: provider.id,
        email: provider.email,
        provider_name: provider.provider_name
      }
    });
  } catch (error) {
    console.error('Error updating medical provider connection:', error);
    res.status(500).json({ error: 'Failed to update medical provider connection' });
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
      await db.query(
        'DELETE FROM law_firm_clients WHERE law_firm_id = $1 AND client_id = $2',
        [lawFirmResult.rows[0].id, userId]
      );
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

const disconnectMedicalProvider = async (req, res) => {
  try {
    const userId = req.user.id;
    const userType = req.user.userType;

    if (userType !== 'individual' && userType !== 'client') {
      return res.status(403).json({ 
        error: 'Ahoy! Only individual users can manage medical provider connections.' 
      });
    }

    const userResult = await db.query(
      'SELECT medical_provider_code FROM users WHERE id = $1',
      [userId]
    );

    const currentProviderCode = userResult.rows[0]?.medical_provider_code;

    if (!currentProviderCode) {
      return res.status(400).json({ 
        error: 'No medical provider connection to disconnect from.' 
      });
    }

    const providerResult = await db.query(
      'SELECT id, provider_name, email FROM medical_providers WHERE provider_code = $1',
      [currentProviderCode]
    );

    if (providerResult.rows.length > 0) {
      await db.query(
        'DELETE FROM medical_provider_patients WHERE provider_id = $1 AND patient_id = $2',
        [providerResult.rows[0].id, userId]
      );
    }

    await db.query(
      `UPDATE users
      SET medical_provider_code = NULL,
          updated_at = NOW()
      WHERE id = $1`,
      [userId]
    );

    res.json({
      success: true,
      message: 'Successfully disconnected from medical provider. You can now connect with a different medical provider if you have their code.'
    });
  } catch (error) {
    console.error('Error disconnecting from medical provider:', error);
    res.status(500).json({ error: 'Failed to disconnect from medical provider' });
  }
};

module.exports = {
  getMyConnections,
  updateLawFirm,
  updateMedicalProvider,
  disconnectLawFirm,
  disconnectMedicalProvider
};
