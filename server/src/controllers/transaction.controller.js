/**
 * src/controllers/transaction.controller.js — Buy/Sell/SIP History
 *
 * WHY does creating a transaction also change the investment's value?
 * An Investment document stores the CURRENT state (currentValue right
 * now). A Transaction is a HISTORY entry (what happened, and when).
 * Without updating currentValue here, adding money would never actually
 * show up anywhere on the investment itself. This is a simplified
 * version of real brokerage accounting — good enough for this project,
 * not meant to model taxes, fees, unit prices changing over time, etc.
 */

const Transaction = require('../models/Transaction.model');
const Investment = require('../models/Investment.model');
const { AppError } = require('../middleware/errorHandler');
const { sendSuccess, sendPaginated } = require('../utils/response');

/**
 * GET /api/transactions
 * Any family member can see the whole family's transaction history —
 * same visibility rule as investments.
 */
const getTransactions = async (req, res) => {
  if (!req.user.family) {
    throw new AppError('Join a family first', 400);
  }

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;

  const filter = { family: req.user.family };
  if (req.query.investment) filter.investment = req.query.investment;
  if (req.query.type) filter.type = req.query.type;

  const transactions = await Transaction.find(filter)
    .populate('investment', 'name category')
    .populate('user', 'name')
    .sort('-transactionDate')
    .skip((page - 1) * limit)
    .limit(limit);

  const total = await Transaction.countDocuments(filter);

  sendPaginated(res, transactions, { total, page, limit });
};

/**
 * POST /api/transactions
 */
const createTransaction = async (req, res) => {
  if (!req.user.family) {
    throw new AppError('Join a family first', 400);
  }

  const { type, amount, unitPrice, units, transactionDate, investment, notes } = req.body;

  const targetInvestment = await Investment.findById(investment);
  if (!targetInvestment) {
    throw new AppError('Investment not found', 404);
  }
  if (String(targetInvestment.family) !== String(req.user.family)) {
    throw new AppError('You do not have access to this investment', 403);
  }
  // Soft-deleted investments are filtered out of the main lists/totals —
  // don't let a new transaction silently grow one behind the scenes.
  if (!targetInvestment.isActive) {
    throw new AppError('This investment has been deleted — cannot record new transactions against it', 400);
  }

  const isOwner = String(targetInvestment.owner) === String(req.user._id);
  if (req.user.role === 'family_member' && !isOwner) {
    throw new AppError('You can only record transactions for your own investments', 403);
  }

  const transaction = await Transaction.create({
    type,
    amount,
    unitPrice,
    units,
    transactionDate,
    investment: targetInvestment._id,
    notes,
    user: req.user._id,
    family: req.user.family,
  });

  // Money coming IN (buy/sip/deposit/dividend/interest) raises the
  // investment's current value; money going OUT (sell/withdrawal) lowers it.
  const movesValueUp = ['buy', 'sip', 'deposit', 'dividend', 'interest'];
  const movesValueDown = ['sell', 'withdrawal'];
  const delta = movesValueDown.includes(type) ? -amount : movesValueUp.includes(type) ? amount : 0;

  // Atomic $inc, not read-modify-save — avoids two close-together
  // transactions silently overwriting each other's currentValue update.
  const updatedInvestment = await Investment.findByIdAndUpdate(
    targetInvestment._id,
    { $inc: { currentValue: delta } },
    { new: true }
  );
  if (updatedInvestment.currentValue < 0) {
    await Investment.findByIdAndUpdate(targetInvestment._id, { $set: { currentValue: 0 } });
  }

  sendSuccess(res, transaction, 'Transaction recorded', 201);
};

module.exports = { getTransactions, createTransaction };
