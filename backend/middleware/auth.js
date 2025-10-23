const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'verdict-path-secret-key-change-in-production';

exports.authenticateToken = (req, res, next) => {
  const authHeader = req.header('Authorization');
  const token = authHeader?.replace('Bearer ', '') || req.cookies.token;
  
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

exports.isClient = (req, res, next) => {
  if (req.user.userType === 'lawfirm') {
    return res.status(403).json({ message: 'Access denied. Client account required.' });
  }
  next();
};

exports.JWT_SECRET = JWT_SECRET;
