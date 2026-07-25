/**
 * src/utils/notify.js — Creating an In-App Notification
 *
 * WHY a separate helper instead of just calling Notification.create()
 * directly in each controller?
 * Because a notification is a "nice to have" side effect — for example,
 * if adding an investment succeeds but the notification write fails for
 * some reason, the investment should still be saved. Wrapping the
 * creation in a try/catch here means callers don't have to remember to
 * do that themselves every time.
 */

const Notification = require('../models/Notification.model');

const createNotification = async ({ user, family = null, type, title, message, link = '' }) => {
  try {
    await Notification.create({ user, family, type, title, message, link });
  } catch (err) {
    // A failed notification should never break the action that triggered it.
    console.error('[notify] Could not create notification:', err.message);
  }
};

module.exports = { createNotification };
