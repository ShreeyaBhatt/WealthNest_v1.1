/**
 * src/controllers/notification.controller.js — Reading Your Notifications
 *
 * Notifications themselves are created elsewhere (see utils/notify.js)
 * as a side effect of other actions, like being invited to a family or
 * a family member adding an investment. This file just lets a user read
 * their own notifications and mark them as read.
 */

const Notification = require('../models/Notification.model');
const { AppError } = require('../middleware/errorHandler');
const { sendSuccess, sendPaginated } = require('../utils/response');
const { checkMaturityReminders } = require('../utils/notify');

/**
 * GET /api/notifications
 * Also runs the maturity-reminder check for the caller's family first,
 * so any investment that's newly within its reminder window shows up
 * without needing a background job (see utils/notify.js).
 */
const getNotifications = async (req, res) => {
  if (req.user.family) {
    await checkMaturityReminders(req.user.family);
  }

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;

  const filter = { user: req.user._id };

  const notifications = await Notification.find(filter)
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(limit);

  const total = await Notification.countDocuments(filter);

  sendPaginated(res, notifications, { total, page, limit });
};

/**
 * PATCH /api/notifications/:id/read
 */
const markAsRead = async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    throw new AppError('Notification not found', 404);
  }

  // Make sure someone can't mark ANOTHER user's notification as read.
  if (String(notification.user) !== String(req.user._id)) {
    throw new AppError('You do not have access to this notification', 403);
  }

  notification.isRead = true;
  await notification.save();

  sendSuccess(res, notification, 'Marked as read');
};

module.exports = { getNotifications, markAsRead };
