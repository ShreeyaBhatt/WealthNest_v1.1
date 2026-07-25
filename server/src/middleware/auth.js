/**
 * src/middleware/auth.js — Checking Who's Logged In (JWT Authentication)
 *
 * WHY do we need this?
 * Most of our routes (like "add an investment" or "view my family")
 * should only work if the person making the request is logged in.
 * This file gives us two tools for that:
 *
 * 1. protect       — checks that a valid JWT was sent with the request,
 *                     and if so, loads that user from the database and
 *                     attaches it to req.user so later code can use it.
 *
 * 2. authorize(...) — checks that req.user's role is allowed to use this
 *                      route. Must run AFTER protect (it needs req.user).
 *
 * Usage in a route file:
 *   router.get('/me', protect, userController.getMe);
 *   router.get('/', protect, authorize('admin'), userController.getAllUsers);
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const { AppError } = require('./errorHandler');

/**
 * protect — makes sure the request has a valid JWT access token.
 *
 * The frontend sends the token in a header like this:
 *   Authorization: Bearer <token>
 */
const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // No header at all, or it doesn't start with "Bearer " — reject it.
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('Not authorized, no token provided', 401);
  }

  // "Bearer abc123..." → split on the space → we want the second part.
  const token = authHeader.split(' ')[1];

  // jwt.verify checks the token's signature and expiry using our secret key.
  // If the token is invalid or expired, this throws an error automatically.
  // Because express-async-errors is set up in app.js, that error is sent
  // straight to errorHandler.js, which already knows how to turn
  // JsonWebTokenError / TokenExpiredError into a nice 401 response.
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  // The token only stores the user's ID — go fetch the real user document.
  const user = await User.findById(decoded.id);

  if (!user) {
    throw new AppError('User no longer exists', 401);
  }

  if (!user.isActive) {
    throw new AppError('Account has been deactivated', 401);
  }

  // Attach the logged-in user to the request so every controller
  // after this middleware can simply read req.user.
  req.user = user;
  next();
};

/**
 * authorize — restricts a route to specific roles.
 *
 * Example: authorize('admin') only lets admins through.
 *          authorize('admin', 'family_head') lets either role through.
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError('You do not have permission to perform this action', 403);
    }
    next();
  };
};

module.exports = { protect, authorize };
