/**
 * src/models/PortfolioSnapshot.model.js — Portfolio Snapshot Schema
 *
 * WHY snapshots?
 * The "portfolio growth" chart needs historical data to show:
 * "Your portfolio was ₹1L in Jan, ₹1.2L in Feb, ₹1.5L in Mar..."
 *
 * We can't recalculate this from scratch every time (too slow).
 * Instead, we take a "snapshot" of the portfolio value daily/monthly
 * and store it. This is called "time-series data."
 *
 * This pattern is used by:
 * - Stock market apps (daily closing price history)
 * - Bank apps (monthly balance history)
 * - Fitness apps (daily weight tracking)
 *
 * HOW it works:
 * A background job (or API call) runs daily and saves:
 * { family: X, totalValue: Y, date: today, breakdown: {...} }
 */

const mongoose = require('mongoose');

const portfolioSnapshotSchema = new mongoose.Schema(
  {
    // ─── Snapshot Owner ───────────────────────────────────────
    family: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Family',
      required: true,
    },

    // ─── Snapshot Date ────────────────────────────────────────
    // We store date as Date type but compare by month/year for charts
    snapshotDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    // ─── Financial Values ─────────────────────────────────────
    totalValue: {
      type: Number,
      required: true,
      default: 0,
    },

    totalInvested: {
      type: Number,
      required: true,
      default: 0,
    },

    totalReturn: {
      type: Number,
      default: 0,      // totalValue - totalInvested
    },

    returnPercentage: {
      type: Number,
      default: 0,      // (totalReturn / totalInvested) * 100
    },

    // ─── Breakdown by Category ────────────────────────────────
    // How much is in each investment type?
    // Example: { mutual_fund: 50000, stock: 30000, gold: 20000 }
    categoryBreakdown: {
      mutual_fund:  { type: Number, default: 0 },
      stock:        { type: Number, default: 0 },
      gold:         { type: Number, default: 0 },
      fd:           { type: Number, default: 0 },
      bond:         { type: Number, default: 0 },
      ppf:          { type: Number, default: 0 },
      nps:          { type: Number, default: 0 },
      real_estate:  { type: Number, default: 0 },
      crypto:       { type: Number, default: 0 },
      other:        { type: Number, default: 0 },
    },

    // ─── Member Breakdown ─────────────────────────────────────
    // How much each member contributed to the portfolio
    // [{ member: ObjectId, value: Number }]
    memberBreakdown: [
      {
        member: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        value:  { type: Number, default: 0 },
        name:   { type: String },  // Cached for quick display
      },
    ],
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => { delete ret.__v; return ret; },
    },
  }
);

// ─── Indexes ──────────────────────────────────────────────────
// Most common query: "get snapshots for family X, ordered by date"
portfolioSnapshotSchema.index({ family: 1, snapshotDate: -1 });

// Prevent duplicate snapshots for same family on same day
portfolioSnapshotSchema.index(
  { family: 1, snapshotDate: 1 },
  { unique: true }
);

module.exports = mongoose.model('PortfolioSnapshot', portfolioSnapshotSchema);
