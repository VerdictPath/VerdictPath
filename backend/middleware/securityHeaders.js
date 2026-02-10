const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://*.firebaseio.com https://*.googleapis.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://www.verdictpath.io https://verdictpath.io https://*.railway.app https://*.replit.dev https://*.repl.co https://api.stripe.com https://*.firebaseio.com https://*.googleapis.com wss://*.firebaseio.com",
    "frame-src 'self' https://js.stripe.com https://*.firebaseapp.com",
    "media-src 'self' blob: data:",
    "object-src 'none'",
    "base-uri 'self'"
  ].join('; '));

  next();
};

module.exports = securityHeaders;
