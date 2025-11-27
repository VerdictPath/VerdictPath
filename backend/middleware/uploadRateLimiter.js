const rateLimit = require('express-rate-limit');

const isExemptRole = (req) => {
  const userType = req.user?.userType;
  return userType === 'lawfirm' || userType === 'law_firm' || userType === 'medical_provider';
};

const uploadRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: {
    error: 'Too many upload requests',
    message: 'You have exceeded the upload limit. Please wait 15 minutes before trying again.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    if (req.user?.id) {
      return `user_${req.user.id}`;
    }
    return req.ip;
  },
  skip: isExemptRole,
  validate: { xForwardedForHeader: false, trustProxy: false, default: false }
});

const downloadRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 100,
  message: {
    error: 'Too many download requests',
    message: 'You have exceeded the download limit. Please wait 5 minutes before trying again.',
    retryAfter: '5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    if (req.user?.id) {
      return `user_${req.user.id}`;
    }
    return req.ip;
  },
  validate: { xForwardedForHeader: false, trustProxy: false, default: false }
});

const strictUploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  message: {
    error: 'Hourly upload limit exceeded',
    message: 'You have exceeded the hourly upload limit. Please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    if (req.user?.id) {
      return `user_${req.user.id}`;
    }
    return req.ip;
  },
  skip: isExemptRole,
  validate: { xForwardedForHeader: false, trustProxy: false, default: false }
});

const burstProtectionLimiter = rateLimit({
  windowMs: 1000,
  max: 3,
  message: {
    error: 'Request rate too high',
    message: 'Please slow down your requests.',
    retryAfter: '1 second'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    if (req.user?.id) {
      return `user_${req.user.id}`;
    }
    return req.ip;
  },
  skip: isExemptRole,
  validate: { xForwardedForHeader: false, trustProxy: false, default: false }
});

module.exports = {
  uploadRateLimiter,
  downloadRateLimiter,
  strictUploadRateLimiter,
  burstProtectionLimiter
};
