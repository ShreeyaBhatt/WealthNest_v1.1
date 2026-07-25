/**
 * src/controllers/user.controller.js — Your Own Profile + Admin's User List
 */

const User = require('../models/User.model');
const { AppError } = require('../middleware/errorHandler');
const { sendSuccess, sendPaginated } = require('../utils/response');

/**
 * GET /api/users/me
 * protect already looked up the user and attached it as req.user,
 * so there's nothing left to do here except send it back.
 */
const getMe = async (req, res) => {
  sendSuccess(res, req.user);
};

/**
 * PUT /api/users/me
 * Only lets the user change their own profile info — NOT their email,
 * password, or role. Those need their own dedicated flows (changing
 * email/password should re-verify identity; role is admin-controlled).
 */
const updateMe = async (req, res) => {
  if (req.body.name !== undefined) req.user.name = req.body.name;
  if (req.body.phone !== undefined) req.user.phone = req.body.phone;
  if (req.body.avatar !== undefined) req.user.avatar = req.body.avatar;
  if (req.body.age !== undefined) req.user.age = req.body.age;
  if (req.body.income !== undefined) req.user.income = req.body.income;
  if (req.body.riskProfile !== undefined) req.user.riskProfile = req.body.riskProfile;
  if (req.body.investmentGoal !== undefined) req.user.investmentGoal = req.body.investmentGoal;

  await req.user.save();
  sendSuccess(res, req.user, 'Profile updated');
};

/**
 * PUT /api/users/me/avatar
 * `upload.single('avatar')` (see middleware/upload.js) already saved
 * the file to disk and attached its info as req.file by the time this
 * runs — all that's left is pointing the user's avatar field at it.
 */
const uploadAvatar = async (req, res) => {
  if (!req.file) {
    throw new AppError('No image file was uploaded', 400);
  }

  req.user.avatar = `/uploads/avatars/${req.file.filename}`;
  await req.user.save();

  sendSuccess(res, req.user, 'Avatar updated');
};

/**
 * GET /api/users
 * Admin-only (see user.routes.js — authorize('admin') runs before this).
 */
const getAllUsers = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;

  const users = await User.find()
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(limit);

  const total = await User.countDocuments();

  sendPaginated(res, users, { total, page, limit });
};

module.exports = { getMe, updateMe, uploadAvatar, getAllUsers };
