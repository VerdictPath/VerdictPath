const winston = require('winston');
const fs = require('fs');
const path = require('path');

// HIPAA-safe fields that should be redacted (comprehensive list)
const SENSITIVE_FIELDS = [
  // Authentication/security
  'password', 'token', 'accessToken', 'refreshToken', 'apiKey', 'secret', 
  'encryptionKey', 'jwt', 'sessionId', 'authToken',
  // Personal identifiers
  'ssn', 'socialSecurityNumber', 'dateOfBirth', 'dob', 'birthDate',
  'firstName', 'lastName', 'fullName', 'name', 'patientName',
  // Contact info
  'phoneNumber', 'phone', 'mobile', 'cell', 'telephone',
  'email', 'emailAddress', 'address', 'streetAddress', 'zipCode', 'zip',
  // Financial
  'creditCard', 'cardNumber', 'cvv', 'bankAccount', 'routingNumber',
  'accountNumber', 'iban', 'swiftCode',
  // Medical/HIPAA PHI
  'medicalRecord', 'mrn', 'medicalRecordNumber', 'patientId', 'patientIdentifier',
  'diagnosis', 'treatment', 'prescription', 'healthInfo', 'condition',
  'medication', 'procedure', 'labResult', 'insuranceId', 'memberId',
  // Other identifiers
  'driversLicense', 'passport', 'nationalId', 'employeeId'
];

// Fields that should not be redacted (Winston internal fields)
const SKIP_FIELDS = ['level', 'message', 'timestamp', 'service', 'stack'];

// Redact sensitive data from objects
const redactSensitive = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const redacted = Array.isArray(obj) ? [...obj] : { ...obj };
  
  for (const key in redacted) {
    if (SKIP_FIELDS.includes(key)) continue;
    
    if (SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof redacted[key] === 'object' && redacted[key] !== null) {
      redacted[key] = redactSensitive(redacted[key]);
    }
  }
  
  return redacted;
};

// Redact PHI patterns in message strings
const redactMessagePHI = (str) => {
  if (typeof str !== 'string') return str;
  
  let result = str;
  
  // Phone numbers (US format) - show last 4 digits
  result = result.replace(/\b(\d{3})[-.]?(\d{3})[-.]?(\d{4})\b/g, (match) => {
    return '****' + match.slice(-4);
  });
  
  // Email addresses - show partial domain
  result = result.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL_REDACTED]');
  
  // SSN formats (XXX-XX-XXXX or XXXXXXXXX)
  result = result.replace(/\b\d{3}[-]?\d{2}[-]?\d{4}\b/g, '[SSN_REDACTED]');
  
  // Credit card numbers (13-19 digits with optional spaces/dashes)
  result = result.replace(/\b(?:\d{4}[-\s]?){3,4}\d{1,4}\b/g, '[CC_REDACTED]');
  
  // Medical Record Numbers (common formats: alphanumeric, 6-12 chars)
  result = result.replace(/\bMRN[:\s]*[A-Z0-9]{6,12}\b/gi, 'MRN: [REDACTED]');
  
  return result;
};

// Custom format for HIPAA-safe logging
const hipaaFormat = winston.format((info) => {
  // Redact PHI patterns in message strings
  if (typeof info.message === 'string') {
    info.message = redactMessagePHI(info.message);
  }
  
  // Redact sensitive fields from metadata
  if (info.metadata) {
    info.metadata = redactSensitive(info.metadata);
  }
  
  // Also redact any top-level sensitive fields passed directly
  for (const key in info) {
    if (SKIP_FIELDS.includes(key) || key === 'metadata') continue;
    
    if (SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
      info[key] = '[REDACTED]';
    } else if (typeof info[key] === 'object' && info[key] !== null) {
      info[key] = redactSensitive(info[key]);
    }
  }
  
  return info;
});

// Determine log level based on environment
const getLogLevel = () => {
  const env = process.env.NODE_ENV || 'development';
  switch (env) {
    case 'production':
      return 'info'; // Hide debug logs in production
    case 'test':
      return 'error'; // Only errors in test
    default:
      return 'debug'; // Show all in development
  }
};

// Create the logger
const logger = winston.createLogger({
  level: getLogLevel(),
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    hipaaFormat(),
    winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] })
  ),
  defaultMeta: { service: 'verdict-path' },
  transports: [
    // Console transport with colors for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.printf(({ level, message, timestamp, metadata }) => {
          let log = `${timestamp} [${level}]: ${message}`;
          if (metadata && Object.keys(metadata).length > 0 && metadata.service !== 'verdict-path') {
            // Only show metadata if there's more than just the service name
            const metaWithoutService = { ...metadata };
            delete metaWithoutService.service;
            if (Object.keys(metaWithoutService).length > 0) {
              log += ` ${JSON.stringify(metaWithoutService)}`;
            }
          }
          return log;
        })
      )
    })
  ]
});

// Add file transport for production
if (process.env.NODE_ENV === 'production') {
  const logsDir = path.join(process.cwd(), 'logs');
  
  // Create logs directory if it doesn't exist
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  logger.add(new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }));
  
  logger.add(new winston.transports.File({
    filename: path.join(logsDir, 'combined.log'),
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }));
}

// Convenience methods for structured logging
logger.business = (action, data = {}) => {
  logger.info(`[BUSINESS] ${action}`, redactSensitive(data));
};

logger.audit = (action, data = {}) => {
  logger.info(`[AUDIT] ${action}`, redactSensitive(data));
};

logger.security = (action, data = {}) => {
  logger.warn(`[SECURITY] ${action}`, redactSensitive(data));
};

logger.payment = (action, data = {}) => {
  logger.info(`[PAYMENT] ${action}`, redactSensitive(data));
};

logger.hipaa = (action, data = {}) => {
  logger.info(`[HIPAA] ${action}`, redactSensitive(data));
};

module.exports = logger;
