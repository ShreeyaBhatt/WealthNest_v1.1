/**
 * src/routes/auth.routes.js — /api/auth
 *
 * These routes are mostly public (no login required) since their whole
 * point is to log a user IN. /logout is the one exception — you can only
 * log out of an account you're already logged into.
 */

const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const authController = require('../controllers/auth.controller');

const router = express.Router();

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  validate,
  authController.register
);

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  authController.login
);

router.post(
  '/refresh',
  [body('refreshToken').notEmpty().withMessage('Refresh token is required')],
  validate,
  authController.refresh
);

router.post('/logout', protect, authController.logout);

router.post(
  '/forgot-password',
  [body('email').isEmail().withMessage('Valid email is required').normalizeEmail()],
  validate,
  authController.forgotPassword
);

router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
  ],
  validate,
  authController.resetPassword
);

module.exports = router;
