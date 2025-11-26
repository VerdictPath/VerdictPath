const jwt = require('jsonwebtoken');

if (!process.env.JWT_SECRET) {
  console.warn('⚠️  SECURITY WARNING: JWT_SECRET environment variable is not set!');
  console.warn('⚠️  Using fallback secret for DEVELOPMENT ONLY.');
  console.warn('⚠️  This is a CRITICAL SECURITY RISK in production - tokens can be forged!');
  console.warn('⚠️  Please set JWT_SECRET in your environment variables immediately.');
}

const JWT_SECRET = process.env.JWT_SECRET || 'verdict-path-secret-key-change-in-production';

exports.authenticateToken = (req, res, next) => {
  // Priority: Signed httpOnly cookie > Bearer token header > Legacy unsigned cookie
  // This ensures httpOnly cookie authentication is preferred (XSS protection)
  // while maintaining backward compatibility with Bearer tokens during migration
  let token = req.signedCookies?.authToken;  // New httpOnly cookie (signed)
  
  if (!token) {
    const authHeader = req.header('Authorization');
    token = authHeader?.replace('Bearer ', '');  // Fallback to Bearer token
  }
  
  if (!token) {
    token = req.cookies?.token;  // Legacy portal cookie (unsigned)
  }
  
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ message: 'Invalid token.' });
  }
};

exports.isLawFirm = (req, res, next) => {
  if (req.user.userType !== 'lawfirm') {
    return res.status(403).json({ message: 'Access denied. Law firm account required.' });
  }
  next();
};

exports.isMedicalProvider = (req, res, next) => {
  if (req.user.userType !== 'medical_provider') {
    return res.status(403).json({ message: 'Access denied. Medical provider account required.' });
  }
  next();
};

exports.isClient = (req, res, next) => {
  if (req.user.userType === 'lawfirm') {
    return res.status(403).json({ message: 'Access denied. Client account required.' });
  }
  next();
};

exports.JWT_SECRET = JWT_SECRET;
