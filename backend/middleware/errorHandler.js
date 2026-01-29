const { AppError, errorCodes, sendErrorResponse } = require('../utils/errorResponse');

const globalErrorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  err.statusCode = err.statusCode || 500;
  
  if (err.isOperational) {
    return sendErrorResponse(res, err.statusCode, err.message, {
      code: err.code,
      details: process.env.NODE_ENV !== 'production' ? err.stack : undefined
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return sendErrorResponse(res, 401, 'Invalid token', {
      code: errorCodes.AUTHENTICATION_ERROR
    });
  }

  if (err.name === 'TokenExpiredError') {
    return sendErrorResponse(res, 401, 'Token has expired', {
      code: errorCodes.AUTHENTICATION_ERROR
    });
  }

  if (err.type === 'entity.parse.failed') {
    return sendErrorResponse(res, 400, 'Invalid JSON in request body', {
      code: errorCodes.VALIDATION_ERROR
    });
  }

  if (err.code?.startsWith('23')) {
    const { handleDatabaseError } = require('../utils/errorResponse');
    return handleDatabaseError(err, res);
  }

  console.error('[Unhandled Error]', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  return sendErrorResponse(res, 500, 'An unexpected error occurred', {
    code: errorCodes.INTERNAL_ERROR,
    details: process.env.NODE_ENV !== 'production' ? err.message : undefined
  });
};

const notFoundHandler = (req, res) => {
  return sendErrorResponse(res, 404, `Route ${req.originalUrl} not found`, {
    code: errorCodes.NOT_FOUND
  });
};

module.exports = {
  globalErrorHandler,
  notFoundHandler
};
