class AppError extends Error {
  constructor(message, statusCode, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
};

const sendErrorResponse = (res, statusCode, message, options = {}) => {
  const { code = null, details = null, field = null } = options;
  
  const response = {
    success: false,
    message
  };
  
  if (code) response.code = code;
  if (details && process.env.NODE_ENV !== 'production') response.details = details;
  if (field) response.field = field;
  
  return res.status(statusCode).json(response);
};

const sendSuccessResponse = (res, data, statusCode = 200, message = null) => {
  const response = {
    success: true,
    ...data
  };
  
  if (message) response.message = message;
  
  return res.status(statusCode).json(response);
};

const handleDatabaseError = (error, res) => {
  if (error.code === '23505') {
    const field = error.constraint?.includes('email') ? 'email' : 
                  error.constraint?.includes('phone') ? 'phone' : 'field';
    return sendErrorResponse(res, 409, `This ${field} already exists`, {
      code: errorCodes.DUPLICATE_ENTRY,
      field
    });
  }
  
  if (error.code === '23503') {
    return sendErrorResponse(res, 400, 'Referenced record does not exist', {
      code: errorCodes.VALIDATION_ERROR
    });
  }
  
  if (error.code === '22P02') {
    return sendErrorResponse(res, 400, 'Invalid input format', {
      code: errorCodes.VALIDATION_ERROR
    });
  }
  
  console.error('[Database Error]', error.message);
  return sendErrorResponse(res, 500, 'Database operation failed', {
    code: errorCodes.DATABASE_ERROR,
    details: error.message
  });
};

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  AppError,
  errorCodes,
  sendErrorResponse,
  sendSuccessResponse,
  handleDatabaseError,
  asyncHandler
};
