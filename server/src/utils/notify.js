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
const { callDjango } = require('./callDjango');

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

// Same equity/gold/debt bucketing as prediction.controller.js's
// buildFeaturesForUser — kept as its own copy here rather than a shared
// import, matching this project's "repeat a few lines per file instead
// of a shared helper" style (see feedback_code_style memory).
const EQUITY_CATEGORIES = ['mutual_fund', 'stock', 'crypto'];
const GOLD_CATEGORIES = ['gold'];

// Once we've told a family their portfolio has drifted, don't say it
// again for a week even if they keep opening their notifications —
// otherwise this would re-notify on every single page load.
const REBALANCE_COOLDOWN_DAYS = 7;

/**
 * checkRebalanceAlert — looks at a family's WHOLE portfolio (every
 * member's investments combined, not just the head's), asks Django's
 * existing rule-based recommendation engine whether it's drifted from
 * the target split for the head's risk profile, and notifies the head
 * if so.
 *
 * WHY the family's combined investments instead of just the head's own
 * (like prediction.controller.js's getRecommendations does)?
 * A rebalancing alert is about the FAMILY's overall financial health,
 * not one person's — a family whose head holds mostly debt but whose
 * other members hold aggressive stocks is still worth flagging.
 *
 * WHY check here instead of a scheduled job?
 * Same reasoning as checkMaturityReminders above — there's no
 * background job runner in this project, so running this on every
 * notifications-page load is the simple option that needs no extra
 * infrastructure (no cron package, no separate process).
 */
const checkRebalanceAlert = async (familyId) => {
  const family = await Family.findById(familyId).populate('head');
  if (!family || !family.head) return;

  const headUser = family.head;
  // Django's PredictionRequestSerializer requires age/income — a head
  // who hasn't filled those into their profile yet just skips this
  // check silently, same as buildFeaturesForUser does for a live request.
  if (!headUser.age || !headUser.income) return;

  const investments = await Investment.find({ family: familyId, isActive: true });
  if (investments.length === 0) return;

  let totalInvested = 0;
  let equityValue = 0;
  let goldValue = 0;
  let debtValue = 0;

  for (const investment of investments) {
    totalInvested += investment.currentValue;
    if (EQUITY_CATEGORIES.includes(investment.category)) {
      equityValue += investment.currentValue;
    } else if (GOLD_CATEGORIES.includes(investment.category)) {
      goldValue += investment.currentValue;
    } else {
      debtValue += investment.currentValue;
    }
  }
  if (totalInvested === 0) return;

  // Don't even bother calling Django if we already sent an alert recently.
  const recentAlert = await Notification.findOne({
    family: familyId,
    type: 'rebalance_alert',
    createdAt: { $gte: new Date(Date.now() - REBALANCE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000) },
  });
  if (recentAlert) return;

  const features = {
    age: headUser.age,
    income: headUser.income,
    totalInvested,
    equityPercent: (equityValue / totalInvested) * 100,
    debtPercent: (debtValue / totalInvested) * 100,
    goldPercent: (goldValue / totalInvested) * 100,
    investmentCount: investments.length,
    riskProfile: headUser.riskProfile,
  };

  let recommendations;
  try {
    const djangoResponse = await callDjango('/api/recommend/', features);
    recommendations = djangoResponse.data.data.recommendations;
  } catch (err) {
    // Same "never break the caller" rule as createNotification above —
    // Django being briefly unreachable shouldn't stop notifications
    // from loading, it just means we skip the check this one time.
    console.error('[notify] Could not check rebalance alert:', err.message);
    return;
  }

  if (recommendations.length === 0) return; // well-balanced — nothing to say

  let reasons = recommendations.map((r) => r.reason).join(' ');
  if (reasons.length > 490) reasons = `${reasons.slice(0, 487)}...`; // message maxlength is 500

  await createNotification({
    user: headUser._id,
    family: familyId,
    type: 'rebalance_alert',
    title: 'Your portfolio could use rebalancing',
    message: reasons,
    link: '/dashboard',
  });
};

module.exports = { createNotification, checkMaturityReminders, checkRebalanceAlert };
