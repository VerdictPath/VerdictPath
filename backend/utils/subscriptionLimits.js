const CLIENT_LIMITS = {
  free: 10,
  paid: {
    shingle: 24,
    boutique: 49,
    small: 99,
    medium: 499,
    large: 999,
    enterprise: Infinity
  }
};

const PATIENT_LIMITS = {
  free: 10,
  paid: {
    shingleprovider: 49,
    boutiqueprovider: 99,
    mediumprovider: 199,
    largeprovider: Infinity,
    small: 100,
    medium: 500,
    large: 1000,
    enterprise: Infinity
  }
};

const getLawFirmClientLimit = (subscriptionTier, firmSize) => {
  if (subscriptionTier === 'free' || !subscriptionTier) {
    return CLIENT_LIMITS.free;
  }
  
  if (!firmSize) {
    return CLIENT_LIMITS.free;
  }
  
  return CLIENT_LIMITS.paid[firmSize] || CLIENT_LIMITS.free;
};

const getMedicalProviderPatientLimit = (subscriptionTier, providerSize) => {
  if (subscriptionTier === 'free' || !subscriptionTier) {
    return PATIENT_LIMITS.free;
  }
  
  if (!providerSize) {
    return PATIENT_LIMITS.free;
  }
  
  return PATIENT_LIMITS.paid[providerSize] || PATIENT_LIMITS.free;
};

const checkLawFirmLimit = (clientCount, subscriptionTier, firmSize) => {
  const limit = getLawFirmClientLimit(subscriptionTier, firmSize);
  return {
    withinLimit: clientCount < limit,
    currentCount: clientCount,
    limit: limit,
    isUnlimited: limit === Infinity
  };
};

const checkMedicalProviderLimit = (patientCount, subscriptionTier, providerSize) => {
  const limit = getMedicalProviderPatientLimit(subscriptionTier, providerSize);
  return {
    withinLimit: patientCount < limit,
    currentCount: patientCount,
    limit: limit,
    isUnlimited: limit === Infinity
  };
};

module.exports = {
  CLIENT_LIMITS,
  PATIENT_LIMITS,
  getLawFirmClientLimit,
  getMedicalProviderPatientLimit,
  checkLawFirmLimit,
  checkMedicalProviderLimit
};
