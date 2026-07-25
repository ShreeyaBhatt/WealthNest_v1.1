/**
 * src/middleware/validate.js — Checking Form Input Before It Reaches a Controller
 *
 * WHY?
 * In each route file, we describe rules for the incoming data using
 * express-validator, e.g. body('email').isEmail(). But those rules don't
 * do anything by themselves — something has to actually check if the
 * request broke any of them. That's what this file does.
 *
 * Usage in a route file:
 *   router.post('/register', [body('email').isEmail()], validate, authController.register);
 *
 * The array of rules runs first, then this `validate` middleware checks
 * the results, and only if everything passed does the controller run.
 */

const { validationResult } = require('express-validator');
const { AppError } = require('./errorHandler');

const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // Turn the list of validation errors into one readable message,
    // e.g. "Valid email is required, Password must be at least 6 characters"
    const message = errors.array().map((err) => err.msg).join(', ');
    throw new AppError(message, 400);
  }

  next();
};

module.exports = validate;
