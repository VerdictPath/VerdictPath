const winston = require('winston');

// HIPAA-safe fields that should be redacted
const SENSITIVE_FIELDS = [
  'password', 'ssn', 'socialSecurityNumber', 'dateOfBirth', 'dob',
  'creditCard', 'cardNumber', 'cvv', 'bankAccount', 'routingNumber',
  'phoneNumber', 'email', 'address', 'medicalRecord', 'diagnosis',
  'treatment', 'prescription', 'healthInfo', 'token', 'accessToken',
  'refreshToken', 'apiKey', 'secret', 'encryptionKey'
];

// Redact sensitive data from objects
const redactSensitive = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const redacted = Array.isArray(obj) ? [...obj] : { ...obj };
  
  for (const key in redacted) {
    if (SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof redacted[key] === 'object' && redacted[key] !== null) {
      redacted[key] = redactSensitive(redacted[key]);
    }
  }
  
  return redacted;
};

// Custom format for HIPAA-safe logging
const hipaaFormat = winston.format((info) => {
  // Redact sensitive fields from message metadata
  if (info.metadata) {
    info.metadata = redactSensitive(info.metadata);
  }
  
  // Redact phone numbers to last 4 digits in messages
  if (typeof info.message === 'string') {
    info.message = info.message.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '****$&'.slice(-4));
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
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }));
  
  logger.add(new winston.transports.File({
    filename: 'logs/combined.log',
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
