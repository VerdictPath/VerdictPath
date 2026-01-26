const rateLimit = require('express-rate-limit');

/**
 * Rate Limiting Configuration
 * 
 * SECURITY: Prevents brute force attacks, credential stuffing, and API abuse
 * 
 * NOTE: We use a custom key generator to safely handle proxy environments.
 * This prevents the ERR_ERL_PERMISSIVE_TRUST_PROXY warning when trust proxy is enabled.
 */

// Custom key generator that safely handles proxy headers
const getClientIdentifier = (req) => {
  // In production (Railway/Replit), use X-Forwarded-For if available
  // Otherwise fall back to connection.remoteAddress
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         'unknown';
};

// Strict rate limit for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  keyGenerator: getClientIdentifier,
  handler: (req, res) => {
    res.status(429).json({
      message: 'Too many authentication attempts. Please try again in 15 minutes.',
      retryAfter: '15 minutes'
    });
  }
});

// Rate limit for coin rewards (daily bonus, achievements, etc.)
const rewardLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 reward claims per hour (generous for gamification)
  message: {
    message: 'Too many reward claims. Please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIdentifier,
  skipSuccessfulRequests: false // Count all requests
});

// Rate limit for coin purchases
const purchaseLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 purchase attempts per hour
  message: {
    message: 'Too many purchase attempts. Please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIdentifier
});

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: {
    message: 'Too many requests. Please slow down.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIdentifier,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  }
});

// Strict rate limit for password reset endpoints
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 password reset attempts per hour
  message: {
    message: 'Too many password reset attempts. Please try again in 1 hour.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIdentifier
});

module.exports = {
  authLimiter,
  rewardLimiter,
  purchaseLimiter,
  apiLimiter,
  passwordResetLimiter
};
