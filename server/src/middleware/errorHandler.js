/**
 * src/middleware/errorHandler.js — Centralized Error Handler
 *
 * WHY centralized error handling?
 * Instead of writing try-catch in every single route and sending
 * different error formats, we throw errors from anywhere and this
 * middleware catches them ALL and sends a consistent JSON response.
 *
 * Pattern: throw new Error('message') → this handler catches it
 */

/**
 * AppError — Custom Error Class
 *
 * WHY extend Error?
 * JavaScript's built-in Error class doesn't have a statusCode property.
 * By extending it, we can attach an HTTP status code to our errors.
 *
 * Usage in a route:
 *   throw new AppError('User not found', 404);
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);           // Call parent Error constructor
    this.statusCode = statusCode;
    this.isOperational = true; // Mark as expected error (vs programming bug)
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * errorHandler — Express Error Handling Middleware
 *
 * Express identifies error handlers by having 4 parameters: (err, req, res, next)
 * Normal middleware has 3: (req, res, next)
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // ─── Handle Specific MongoDB/Mongoose Errors ──────────────

  // Duplicate key error (e.g., registering with existing email)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    message = `${field} already exists. Please use a different ${field}.`;
    statusCode = 400;
  }

  // Mongoose validation error (required field missing, etc.)
  if (err.name === 'ValidationError') {
    message = Object.values(err.errors).map(e => e.message).join(', ');
    statusCode = 400;
  }

  // Invalid MongoDB ObjectId (e.g., /api/users/invalid-id)
  if (err.name === 'CastError') {
    message = `Invalid ${err.path}: ${err.value}`;
    statusCode = 400;
  }

  // Invalid JWT token
  if (err.name === 'JsonWebTokenError') {
    message = 'Invalid authentication token. Please log in again.';
    statusCode = 401;
  }

  // Expired JWT token
  if (err.name === 'TokenExpiredError') {
    message = 'Authentication token has expired. Please log in again.';
    statusCode = 401;
  }

  // ─── Send Error Response ──────────────────────────────────
  res.status(statusCode).json({
    success: false,
    message,
    // Only show stack trace in development (not in production)
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = { errorHandler, AppError };
