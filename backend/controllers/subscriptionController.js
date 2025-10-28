const db = require('../config/db');
const { getLawFirmClientLimit, getMedicalProviderPatientLimit } = require('../utils/subscriptionLimits');

const updateLawFirmSubscription = async (req, res) => {
  try {
    const lawFirmId = req.user.id;
    const { subscriptionTier, firmSize } = req.body;

    if (!subscriptionTier) {
      return res.status(400).json({ error: 'Subscription tier is required' });
    }

    const lawFirmResult = await db.query(
      'SELECT id, subscription_tier, firm_size FROM law_firms WHERE id = $1',
      [lawFirmId]
    );

    if (lawFirmResult.rows.length === 0) {
      return res.status(404).json({ error: 'Law firm not found' });
    }

    const lawFirm = lawFirmResult.rows[0];
    const newTier = subscriptionTier;
    const newSize = (newTier !== 'free' && firmSize) ? firmSize : null;

    const clientCountResult = await db.query(
      'SELECT COUNT(*) as count FROM law_firm_clients WHERE law_firm_id = $1',
      [lawFirmId]
    );

    const currentClientCount = parseInt(clientCountResult.rows[0].count);
    const newLimit = getLawFirmClientLimit(newTier, newSize);

    if (currentClientCount > newLimit) {
      return res.status(400).json({ 
        error: `Avast! Ye cannot downgrade to this tier, matey! You currently have ${currentClientCount} clients, but this tier only allows ${newLimit}. Ye must reduce yer crew before changing course!`,
        currentCount: currentClientCount,
        newLimit: newLimit
      });
    }

    await db.query(
      'UPDATE law_firms SET subscription_tier = $1, firm_size = $2 WHERE id = $3',
      [newTier, newSize, lawFirmId]
    );

    res.json({
      success: true,
      message: 'Ahoy! Your subscription has been updated successfully!',
      subscription: {
        tier: newTier,
        firmSize: newSize,
        clientLimit: newLimit,
        currentClientCount: currentClientCount
      }
    });
  } catch (error) {
    console.error('Error updating law firm subscription:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
};

const updateMedicalProviderSubscription = async (req, res) => {
  try {
    const providerId = req.user.id;
    const { subscriptionTier, providerSize } = req.body;

    if (!subscriptionTier) {
      return res.status(400).json({ error: 'Subscription tier is required' });
    }

    const providerResult = await db.query(
      'SELECT id, subscription_tier, provider_size FROM medical_providers WHERE id = $1',
      [providerId]
    );

    if (providerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Medical provider not found' });
    }

    const provider = providerResult.rows[0];
    const newTier = subscriptionTier;
    const newSize = (newTier !== 'free' && providerSize) ? providerSize : null;

    const patientCountResult = await db.query(
      'SELECT COUNT(*) as count FROM medical_provider_patients WHERE medical_provider_id = $1',
      [providerId]
    );

    const currentPatientCount = parseInt(patientCountResult.rows[0].count);
    const newLimit = getMedicalProviderPatientLimit(newTier, newSize);

    if (currentPatientCount > newLimit) {
      return res.status(400).json({ 
        error: `Avast! Ye cannot downgrade to this tier! You currently have ${currentPatientCount} patients, but this tier only allows ${newLimit}. Reduce your patient roster before changing course!`,
        currentCount: currentPatientCount,
        newLimit: newLimit
      });
    }

    await db.query(
      'UPDATE medical_providers SET subscription_tier = $1, provider_size = $2 WHERE id = $3',
      [newTier, newSize, providerId]
    );

    res.json({
      success: true,
      message: 'Your subscription has been updated successfully!',
      subscription: {
        tier: newTier,
        providerSize: newSize,
        patientLimit: newLimit,
        currentPatientCount: currentPatientCount
      }
    });
  } catch (error) {
    console.error('Error updating medical provider subscription:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
};

const getLawFirmSubscription = async (req, res) => {
  try {
    const lawFirmId = req.user.id;

    const lawFirmResult = await db.query(
      'SELECT id, firm_name, email, subscription_tier, firm_size FROM law_firms WHERE id = $1',
      [lawFirmId]
    );

    if (lawFirmResult.rows.length === 0) {
      return res.status(404).json({ error: 'Law firm not found' });
    }

    const lawFirm = lawFirmResult.rows[0];

    const clientCountResult = await db.query(
      'SELECT COUNT(*) as count FROM law_firm_clients WHERE law_firm_id = $1',
      [lawFirmId]
    );

    const currentClientCount = parseInt(clientCountResult.rows[0].count);
    const currentLimit = getLawFirmClientLimit(lawFirm.subscription_tier, lawFirm.firm_size);

    res.json({
      subscription: {
        tier: lawFirm.subscription_tier,
        firmSize: lawFirm.firm_size,
        clientLimit: currentLimit,
        currentClientCount: currentClientCount,
        firmName: lawFirm.firm_name,
        email: lawFirm.email
      }
    });
  } catch (error) {
    console.error('Error fetching law firm subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription details' });
  }
};

const getMedicalProviderSubscription = async (req, res) => {
  try {
    const providerId = req.user.id;

    const providerResult = await db.query(
      'SELECT id, provider_name, email, subscription_tier, provider_size FROM medical_providers WHERE id = $1',
      [providerId]
    );

    if (providerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Medical provider not found' });
    }

    const provider = providerResult.rows[0];

    const patientCountResult = await db.query(
      'SELECT COUNT(*) as count FROM medical_provider_patients WHERE medical_provider_id = $1',
      [providerId]
    );

    const currentPatientCount = parseInt(patientCountResult.rows[0].count);
    const currentLimit = getMedicalProviderPatientLimit(provider.subscription_tier, provider.provider_size);

    res.json({
      subscription: {
        tier: provider.subscription_tier,
        providerSize: provider.provider_size,
        patientLimit: currentLimit,
        currentPatientCount: currentPatientCount,
        providerName: provider.provider_name,
        email: provider.email
      }
    });
  } catch (error) {
    console.error('Error fetching medical provider subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription details' });
  }
};

module.exports = {
  updateLawFirmSubscription,
  updateMedicalProviderSubscription,
  getLawFirmSubscription,
  getMedicalProviderSubscription
};
