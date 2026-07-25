/**
 * src/controllers/dashboard.controller.js — Family Portfolio Summary
 *
 * WHY calculate everything live instead of reading from
 * PortfolioSnapshot.model.js (which was built for exactly this kind of
 * summary)? Because nothing writes to that collection yet — there's no
 * scheduled job populating daily snapshots. Reading from an empty
 * collection would just show zeros forever, which is worse than doing
 * the math ourselves from the Investment/Transaction documents that DO
 * have real data. A future phase can add the scheduled snapshot job and
 * a "portfolio growth over time" chart that reads from it.
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
const { AppError } = require('../middleware/errorHandler');
const { sendSuccess } = require('../utils/response');

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

  sendSuccess(res, {
    investmentCount: totals.investmentCount,
    totalInvested: totals.totalInvested,
    totalValue: totals.totalValue,
    totalReturn,
    returnPercentage: Number(returnPercentage.toFixed(2)),
    categoryBreakdown: arrayToObject(facetResult.byCategory, 'category'),
    memberBreakdown: arrayToObject(facetResult.byMember, 'name'),
    recentTransactions,
  });
};

module.exports = { getDashboard };
