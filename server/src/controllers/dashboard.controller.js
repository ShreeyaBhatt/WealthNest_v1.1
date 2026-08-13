/**
 * src/controllers/dashboard.controller.js — Family Portfolio Summary
 *
 * WHY calculate everything live instead of reading from
 * PortfolioSnapshot.model.js? Because a snapshot is only ever a point
 * in TIME — it can't answer "what does the portfolio look like right
 * now" on its own. So getDashboard still computes everything fresh from
 * Investment/Transaction, and then — as a side effect, same pattern
 * utils/notify.js already uses for maturity reminders (checked inline
 * inside getNotifications, no scheduled job needed) — upserts TODAY's
 * snapshot from that same result. No job scheduler exists in this
 * project, so "whenever someone loads the dashboard" is the snapshot
 * schedule. getPortfolioHistory below reads back whatever snapshots
 * have accumulated, for the "portfolio growth over time" chart.
 *
 * WHY a MongoDB aggregation pipeline instead of just looping over
 * Investment.find() results in JavaScript (which is what this file
 * used to do)?
 * $match/$group/$sort/$project let MongoDB itself do the totalling —
 * the database only ever sends back the small, already-summarized
 * result, instead of every single investment document being pulled
 * into Node just to add them up by hand. $facet runs three separate
 * "mini pipelines" (totals, by category, by member) in a single round
 * trip to the database.
 */

const mongoose = require('mongoose');
const Investment = require('../models/Investment.model');
const Transaction = require('../models/Transaction.model');
const PortfolioSnapshot = require('../models/PortfolioSnapshot.model');
const { AppError } = require('../middleware/errorHandler');
const { sendSuccess } = require('../utils/response');

const SNAPSHOT_CATEGORIES = [
  'mutual_fund', 'stock', 'gold', 'fd', 'bond',
  'ppf', 'nps', 'real_estate', 'crypto', 'other',
];

/**
 * Upserts today's PortfolioSnapshot from an already-computed dashboard
 * result. Never lets a snapshot problem break the dashboard response
 * itself — same "side effect, not core to the request" reasoning
 * utils/notify.js already applies to notifications.
 */
const saveTodaysSnapshot = async (familyId, { totals, totalReturn, returnPercentage, byCategory, byMember }) => {
  try {
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);

    const categoryBreakdown = Object.fromEntries(SNAPSHOT_CATEGORIES.map((c) => [c, 0]));
    byCategory.forEach((row) => {
      categoryBreakdown[row.category] = row.value;
    });

    const memberBreakdown = byMember.map((row) => ({ value: row.value, name: row.name }));

    await PortfolioSnapshot.findOneAndUpdate(
      { family: familyId, snapshotDate: todayMidnight },
      {
        totalValue: totals.totalValue,
        totalInvested: totals.totalInvested,
        totalReturn,
        returnPercentage,
        categoryBreakdown,
        memberBreakdown,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch (err) {
    console.error('[dashboard] Could not save portfolio snapshot:', err.message);
  }
};

// Turns an array of { key, value } rows into a plain { key: value } object
// — keeps the response shape the same as before this pipeline rewrite.
const arrayToObject = (rows, keyField) => {
  const result = {};
  rows.forEach((row) => {
    result[row[keyField]] = row.value;
  });
  return result;
};

/**
 * GET /api/dashboard
 */
const getDashboard = async (req, res) => {
  if (!req.user.family) {
    throw new AppError('Join a family first', 400);
  }

  const familyId = new mongoose.Types.ObjectId(req.user.family);

  const [facetResult] = await Investment.aggregate([
    // $match — only this family's active investments, same as
    // Investment.find({ family, isActive: true }) would filter for.
    { $match: { family: familyId, isActive: true } },

    // $facet — run 3 independent "mini pipelines" over that same
    // filtered set of investments, all in one query.
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              totalInvested: { $sum: '$amount' },
              totalValue: { $sum: '$currentValue' },
              investmentCount: { $sum: 1 },
            },
          },
        ],

        byCategory: [
          { $group: { _id: '$category', value: { $sum: '$currentValue' } } },
          { $sort: { value: -1 } },
          { $project: { _id: 0, category: '$_id', value: 1 } },
        ],

        byMember: [
          { $group: { _id: '$owner', value: { $sum: '$currentValue' } } },
          { $sort: { value: -1 } },
          // An investment's owner can be EITHER a User (the head) OR a
          // FamilyMember profile — see Investment.model.js's `ownerType`
          // dynamic ref. $lookup can't follow that automatically the
          // way .populate() can, so we join both collections and take
          // whichever one actually matched.
          { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'userInfo' } },
          { $lookup: { from: 'familymembers', localField: '_id', foreignField: '_id', as: 'memberInfo' } },
          {
            $project: {
              _id: 0,
              value: 1,
              name: {
                $ifNull: [
                  { $arrayElemAt: ['$userInfo.name', 0] },
                  { $arrayElemAt: ['$memberInfo.name', 0] },
                ],
              },
            },
          },
        ],
      },
    },
  ]);

  const totals = facetResult.totals[0] || { totalInvested: 0, totalValue: 0, investmentCount: 0 };
  const totalReturn = totals.totalValue - totals.totalInvested;
  const returnPercentage = totals.totalInvested === 0 ? 0 : (totalReturn / totals.totalInvested) * 100;

  const recentTransactions = await Transaction.find({ family: req.user.family })
    .populate('investment', 'name')
    .sort('-transactionDate')
    .limit(5);

  const roundedReturnPercentage = Number(returnPercentage.toFixed(2));

  // Side effect — doesn't affect what gets sent back below, and never
  // throws (see saveTodaysSnapshot's own try/catch).
  await saveTodaysSnapshot(familyId, {
    totals,
    totalReturn,
    returnPercentage: roundedReturnPercentage,
    byCategory: facetResult.byCategory,
    byMember: facetResult.byMember,
  });

  sendSuccess(res, {
    investmentCount: totals.investmentCount,
    totalInvested: totals.totalInvested,
    totalValue: totals.totalValue,
    totalReturn,
    returnPercentage: roundedReturnPercentage,
    categoryBreakdown: arrayToObject(facetResult.byCategory, 'category'),
    memberBreakdown: arrayToObject(facetResult.byMember, 'name'),
    recentTransactions,
  });
};

/**
 * GET /api/dashboard/history
 * Feeds the "portfolio growth over time" chart — the last 30 days'
 * worth of snapshots saved by getDashboard above.
 */
const getPortfolioHistory = async (req, res) => {
  if (!req.user.family) {
    throw new AppError('Join a family first', 400);
  }

  // Newest-first + limit(30) gets the most recent 30 snapshots — sorting
  // ascending here instead would grab the OLDEST 30 (bug: once a family
  // has more than 30 days of history, the chart would get stuck showing
  // its earliest days forever and never include anything newer). We sort
  // descending to get the right 30, then reverse back to chronological
  // order in JS since the chart expects oldest-to-newest, left to right.
  const snapshots = await PortfolioSnapshot.find({ family: req.user.family })
    .sort('-snapshotDate')
    .limit(30)
    .select('snapshotDate totalValue totalInvested');

  sendSuccess(res, snapshots.reverse());
};

module.exports = { getDashboard, getPortfolioHistory };
