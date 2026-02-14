const jwt = require('jsonwebtoken');

if (!process.env.JWT_SECRET) {
  console.warn('⚠️  SECURITY WARNING: JWT_SECRET environment variable is not set!');
  console.warn('⚠️  Using fallback secret for DEVELOPMENT ONLY.');
  console.warn('⚠️  This is a CRITICAL SECURITY RISK in production - tokens can be forged!');
  console.warn('⚠️  Please set JWT_SECRET in your environment variables immediately.');
}

const JWT_SECRET = process.env.JWT_SECRET || 'verdict-path-secret-key-change-in-production';

exports.authenticateToken = (req, res, next) => {
  const authHeader = req.header('Authorization');
  let token = authHeader?.replace('Bearer ', '') || null;
  
  if (!token) {
    token = req.signedCookies?.authToken;
  }
  
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired.', code: 'TOKEN_EXPIRED' });
    }
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
