/**
 * src/models/Transaction.model.js — Transaction Schema
 *
 * WHY track transactions separately from investments?
 * An investment is the CURRENT STATE (what you own right now).
 * A transaction is the HISTORY (what you bought/sold and when).
 *
 * Example for a Mutual Fund:
 * - Investment: HDFC Nifty 50 Fund, current value ₹50,000
 * - Transactions:
 *   → BUY: ₹10,000 on Jan 1
 *   → BUY (SIP): ₹2,000 on Feb 1
 *   → BUY (SIP): ₹2,000 on Mar 1
 *   → SELL: ₹5,000 on Apr 1
 *
 * This gives a complete audit trail of every money movement.
 *
 * TRANSACTION TYPES:
 * - buy: Initial purchase of an investment
 * - sell: Selling part or all of an investment
 * - sip: Systematic Investment Plan (monthly auto-investment)
 * - dividend: Dividend received from stocks/mutual funds
 * - interest: Interest from FD/Bond/PPF
 * - withdrawal: Partial withdrawal
 */

const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    // ─── Transaction Type ────────────────────────────────────
    type: {
      type: String,
      required: [true, 'Transaction type is required'],
      enum: {
        values: ['buy', 'sell', 'sip', 'dividend', 'interest', 'withdrawal', 'deposit'],
        message: 'Invalid transaction type',
      },
    },

    // ─── Amount ───────────────────────────────────────────────
    amount: {
      type: Number,
      required: [true, 'Transaction amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },

    // Unit price at the time of transaction (for stocks/MF)
    unitPrice: {
      type: Number,
      default: 0,
    },

    // Number of units (shares/NAV units) bought or sold
    units: {
      type: Number,
      default: 0,
    },

    // ─── Date ─────────────────────────────────────────────────
    transactionDate: {
      type: Date,
      required: [true, 'Transaction date is required'],
      default: Date.now,
    },

    // ─── References ───────────────────────────────────────────
    // Which investment does this transaction belong to?
    investment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Investment',
      required: [true, 'Transaction must reference an investment'],
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Transaction must have a user'],
    },

    family: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Family',
      required: [true, 'Transaction must belong to a family'],
    },

    // ─── Notes ───────────────────────────────────────────────
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ─── Indexes ──────────────────────────────────────────────────
transactionSchema.index({ family: 1, transactionDate: -1 });  // -1 = descending (newest first)
transactionSchema.index({ investment: 1, transactionDate: -1 });
transactionSchema.index({ user: 1, transactionDate: -1 });
transactionSchema.index({ family: 1, type: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
