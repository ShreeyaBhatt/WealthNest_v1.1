/**
 * src/controllers/auth.controller.js — Register, Login, Tokens, Password Reset
 *
 * This file handles everything related to proving who a user is:
 * - register / login          → create an account / check credentials
 * - refresh                   → trade a refresh token for a new access token
 * - logout                    → invalidate the stored refresh token
 * - forgotPassword / resetPassword → the "I forgot my password" flow
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const { AppError } = require('../middleware/errorHandler');
const { sendSuccess } = require('../utils/response');
const { sendResetEmail } = require('../utils/email');
const activityLogger = require('../utils/activityLogger');

/**
 * POST /api/auth/register
 */
const register = async (req, res) => {
  const { name, email, password, phone, age, income, riskProfile, investmentGoal } = req.body;

  // Make sure nobody else already registered with this email.
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('Email already registered', 400);
  }

  // The password gets hashed automatically by the pre-save hook
  // in User.model.js — we don't need to hash it ourselves here.
  const user = await User.create({
    name,
    email,
    password,
    phone,
    age,
    income,
    riskProfile,
    investmentGoal,
  });

  // Log the brand-new user in right away by giving them tokens.
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();
  user.refreshToken = refreshToken;
  await user.save();

  activityLogger.emit('activity', `New user registered: ${user.email}`);

  sendSuccess(res, { user, accessToken, refreshToken }, 'Registered successfully', 201);
};

/**
 * POST /api/auth/login
 */
const login = async (req, res) => {
  const { email, password } = req.body;

  // Password has `select: false` in the schema, so we have to explicitly
  // ask for it here in order to check it against what the user typed.
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    // Same error message for "no such user" and "wrong password" —
    // this stops attackers from figuring out which emails are registered.
    throw new AppError('Invalid email or password', 401);
  }

  if (!user.isActive) {
    throw new AppError('Account has been deactivated', 401);
  }

  user.lastLogin = new Date();

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();
  user.refreshToken = refreshToken;
  await user.save();

  sendSuccess(res, { user, accessToken, refreshToken }, 'Login successful');
};

/**
 * POST /api/auth/refresh
 *
 * The access token is short-lived (see JWT_EXPIRE). When it expires, the
 * frontend calls this route with the longer-lived refresh token to get a
 * new access token, instead of forcing the user to log in again.
 * (See client/src/api/axios.js — its response interceptor already calls
 * this exact route with { refreshToken } in the body.)
 */
const refresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    throw new AppError('Refresh token required', 400);
  }

  // Throws if the token is invalid/expired — caught by errorHandler.js.
  const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

  // refreshToken also has select:false, so ask for it explicitly.
  const user = await User.findById(decoded.id).select('+refreshToken');

  // Comparing against the token stored in the database (not just checking
  // the signature) is what lets us "revoke" a refresh token on logout —
  // once we clear it from the database, this check fails even if the
  // token itself hasn't technically expired yet.
  if (!user || user.refreshToken !== refreshToken) {
    throw new AppError('Invalid refresh token', 401);
  }

  const accessToken = user.generateAccessToken();
  sendSuccess(res, { accessToken }, 'Token refreshed');
};

/**
 * POST /api/auth/logout
 * Protected route — clears the stored refresh token so it can no longer
 * be used to mint new access tokens.
 */
const logout = async (req, res) => {
  req.user.refreshToken = undefined;
  await req.user.save();
  sendSuccess(res, null, 'Logged out');
};

/**
 * POST /api/auth/forgot-password
 */
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  // Always show the same message whether or not the email is registered —
  // otherwise this endpoint could be used to check which emails exist.
  const genericMessage = 'If that email is registered, a reset link has been sent';

  const user = await User.findOne({ email });
  if (!user) {
    return sendSuccess(res, null, genericMessage);
  }

  // Generate a random token, then store only its HASH in the database.
  // If our database ever leaked, an attacker still couldn't use the
  // hashed value to reset anyone's password — only the raw token (which
  // only the user receives by email) works.
  const rawToken = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  user.resetPasswordExpire = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  await user.save();

  await sendResetEmail(user.email, rawToken);

  sendSuccess(res, null, genericMessage);
};

/**
 * POST /api/auth/reset-password
 */
const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  // Hash the token the same way we did when we created it, then look
  // for a user with a matching, still-valid reset token.
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: new Date() },
  });

  if (!user) {
    throw new AppError('Invalid or expired reset token', 400);
  }

  // Setting user.password triggers the pre-save hook, which re-hashes it.
  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  sendSuccess(res, null, 'Password reset successful');
};

module.exports = { register, login, refresh, logout, forgotPassword, resetPassword };
