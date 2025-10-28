const CLIENT_LIMITS = {
  free: 10,
  paid: {
    small: 99,
    medium: 499,
    large: 999,
    enterprise: Infinity
  }
};

const PATIENT_LIMITS = {
  free: 10,
  paid: {
    basic: Infinity,
    premium: Infinity
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

const getMedicalProviderPatientLimit = (subscriptionTier) => {
  if (subscriptionTier === 'free' || !subscriptionTier) {
    return PATIENT_LIMITS.free;
  }
  
  return PATIENT_LIMITS.paid[subscriptionTier] || PATIENT_LIMITS.free;
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

const checkMedicalProviderLimit = (patientCount, subscriptionTier) => {
  const limit = getMedicalProviderPatientLimit(subscriptionTier);
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
