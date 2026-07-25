/**
 * src/utils/response.js — Standardized API Response Helpers
 *
 * WHY standardize responses?
 * Every API should return data in the SAME format so the frontend
 * can reliably parse it. This is called a "response envelope."
 *
 * All responses follow this format:
 * {
 *   "success": true/false,
 *   "message": "Human-readable message",
 *   "data": { ... }         // on success
 *   "error": "..."          // on failure (dev only)
 * }
 */

/**
 * sendSuccess — Send a successful response
 * @param {Object} res - Express response object
 * @param {*} data - The data to send
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default: 200)
 */
const sendSuccess = (res, data = null, message = 'Success', statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

/**
 * sendError — Send an error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 400)
 */
const sendError = (res, message = 'An error occurred', statusCode = 400) => {
  res.status(statusCode).json({
    success: false,
    message,
  });
};

/**
 * sendPaginated — Send a paginated list response
 * Used when returning large lists (investments, transactions, etc.)
 */
const sendPaginated = (res, data, pagination, message = 'Success') => {
  res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      total: pagination.total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(pagination.total / pagination.limit),
    },
  });
};

module.exports = { sendSuccess, sendError, sendPaginated };
