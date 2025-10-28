const pool = require('../config/database');

const getMyConnections = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
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
      const lawFirmResult = await pool.query(
        `SELECT id, email, firm_name
        FROM users
        WHERE user_type = 'law_firm' AND firm_code = $1`,
        [user.law_firm_code]
      );
      if (lawFirmResult.rows.length > 0) {
        connections.lawFirm = lawFirmResult.rows[0];
      }
    }

    if (user.medical_provider_code) {
      const providerResult = await pool.query(
        `SELECT id, email, facility_name
        FROM users
        WHERE user_type = 'medical_provider' AND provider_code = $1`,
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
    const { lawFirmCode } = req.body;

    if (!lawFirmCode || typeof lawFirmCode !== 'string') {
      return res.status(400).json({ error: 'Valid law firm code is required' });
    }

    const trimmedCode = lawFirmCode.trim().toUpperCase();

    const lawFirmResult = await pool.query(
      `SELECT id, email, firm_name
      FROM users
      WHERE user_type = 'law_firm' AND firm_code = $1`,
      [trimmedCode]
    );

    if (lawFirmResult.rows.length === 0) {
      return res.status(404).json({ error: 'Law firm not found with this code' });
    }

    const lawFirm = lawFirmResult.rows[0];

    await pool.query(
      `UPDATE users
      SET law_firm_code = $1,
          updated_at = NOW()
      WHERE id = $2`,
      [trimmedCode, userId]
    );

    const clientResult = await pool.query(
      `SELECT id FROM law_firm_clients
      WHERE law_firm_id = $1 AND client_id = $2`,
      [lawFirm.id, userId]
    );

    if (clientResult.rows.length === 0) {
      await pool.query(
        `INSERT INTO law_firm_clients (law_firm_id, client_id, created_at)
        VALUES ($1, $2, NOW())`,
        [lawFirm.id, userId]
      );
    }

    res.json({
      success: true,
      message: `Successfully connected to ${lawFirm.firm_name || lawFirm.email}`,
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
    const { medicalProviderCode } = req.body;

    if (!medicalProviderCode || typeof medicalProviderCode !== 'string') {
      return res.status(400).json({ error: 'Valid medical provider code is required' });
    }

    const trimmedCode = medicalProviderCode.trim().toUpperCase();

    const providerResult = await pool.query(
      `SELECT id, email, facility_name
      FROM users
      WHERE user_type = 'medical_provider' AND provider_code = $1`,
      [trimmedCode]
    );

    if (providerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Medical provider not found with this code' });
    }

    const provider = providerResult.rows[0];

    await pool.query(
      `UPDATE users
      SET medical_provider_code = $1,
          updated_at = NOW()
      WHERE id = $2`,
      [trimmedCode, userId]
    );

    const patientResult = await pool.query(
      `SELECT id FROM medical_provider_patients
      WHERE provider_id = $1 AND patient_id = $2`,
      [provider.id, userId]
    );

    if (patientResult.rows.length === 0) {
      await pool.query(
        `INSERT INTO medical_provider_patients (provider_id, patient_id, created_at)
        VALUES ($1, $2, NOW())`,
        [provider.id, userId]
      );
    }

    res.json({
      success: true,
      message: `Successfully connected to ${provider.facility_name || provider.email}`,
      medicalProvider: {
        id: provider.id,
        email: provider.email,
        facility_name: provider.facility_name
      }
    });
  } catch (error) {
    console.error('Error updating medical provider connection:', error);
    res.status(500).json({ error: 'Failed to update medical provider connection' });
  }
};

module.exports = {
  getMyConnections,
  updateLawFirm,
  updateMedicalProvider
};
