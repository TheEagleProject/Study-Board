const logger = require('../config/logger');
const env = require('../config/env');
const { AppError } = require('../utils/errors');

/**
 * Wrap async route handlers so thrown errors/rejected promises reach
 * the error middleware instead of crashing the process or hanging the request.
 */
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const isOperational = err instanceof AppError;
  const statusCode = isOperational ? err.statusCode : 500;

  // Log full detail server-side regardless of what we send the client.
  logger.error(err.message, {
    statusCode,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    stack: env.NODE_ENV !== 'production' ? err.stack : undefined,
    isOperational,
  });

  // Never leak internal error details (stack traces, DB errors, etc.) to
  // the client for unexpected (non-operational) errors.
  const message = isOperational ? err.message : 'Something went wrong. Please try again.';

  res.status(statusCode).json({
    success: false,
    error: message,
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({ success: false, error: `Route ${req.originalUrl} not found` });
}

module.exports = { asyncHandler, errorHandler, notFoundHandler };
