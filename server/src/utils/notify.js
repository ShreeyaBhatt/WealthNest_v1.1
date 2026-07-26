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
const Investment = require('../models/Investment.model');
const Family = require('../models/Family.model');

const createNotification = async ({ user, family = null, type, title, message, link = '' }) => {
  try {
    await Notification.create({ user, family, type, title, message, link });
  } catch (err) {
    // A failed notification should never break the action that triggered it.
    console.error('[notify] Could not create notification:', err.message);
  }
};

const MATURITY_WINDOW_DAYS = 30;

/**
 * checkMaturityReminders — looks for this family's investments that
 * mature within the next 30 days and notifies the family head about
 * any of them we haven't already notified about.
 *
 * WHY check here instead of a scheduled job?
 * There's no background job runner set up in this project, so running
 * this quick check whenever someone opens their notifications is a
 * simple stand-in that needs no extra infrastructure (no cron package,
 * no separate process).
 *
 * WHY reuse `link` to detect "already notified"?
 * It avoids adding a new schema field — every maturity reminder points
 * at `/investments/<id>`, so that's already a unique-enough key per
 * investment for this one notification type.
 */
const checkMaturityReminders = async (familyId) => {
  const family = await Family.findById(familyId);
  if (!family) return;

  const now = new Date();
  const soon = new Date(now.getTime() + MATURITY_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const maturingInvestments = await Investment.find({
    family: familyId,
    isActive: true,
    maturityDate: { $gte: now, $lte: soon },
  });

  for (const investment of maturingInvestments) {
    const link = `/investments/${investment._id}`;

    const alreadyNotified = await Notification.findOne({
      user: family.head,
      type: 'maturity_reminder',
      link,
    });
    if (alreadyNotified) continue;

    await createNotification({
      user: family.head,
      family: familyId,
      type: 'maturity_reminder',
      title: 'Investment maturing soon',
      message: `${investment.name} matures on ${investment.maturityDate.toLocaleDateString('en-IN')}.`,
      link,
    });
  }
};

module.exports = { createNotification, checkMaturityReminders };
