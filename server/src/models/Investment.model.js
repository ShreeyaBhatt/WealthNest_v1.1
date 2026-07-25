/**
 * src/models/Investment.model.js — Investment Schema
 *
 * This is the CORE model of WealthNest — it stores every investment
 * a user or family has made (Mutual Funds, Stocks, Gold, FDs, etc.)
 *
 * KEY DESIGN DECISIONS:
 * 1. Both 'owner' (individual) and 'family' (group) are stored.
 *    This lets us query: "all investments by this user" OR
 *    "all investments by this family" efficiently.
 *
 * 2. 'currentValue' is stored separately from 'amount' (purchase price).
 *    Return = ((currentValue - amount) / amount) * 100
 *
 * 3. 'category' uses an enum so only valid investment types are stored.
 *
 * INVESTMENT TYPES EXPLAINED (for viva):
 * - mutual_fund: Pool of money managed by a fund manager
 * - stock: Ownership share in a company
 * - gold: Physical/digital gold investment
 * - fd: Fixed Deposit — guaranteed return from bank
 * - bond: Loan to government/company, fixed interest
 * - ppf: Public Provident Fund — govt-backed 15 yr scheme
 * - nps: National Pension System — retirement savings
 * - real_estate: Property investment
 */

const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema(
  {
    // ─── Investment Details ──────────────────────────────────
    name: {
      type: String,
      required: [true, 'Investment name is required'],
      trim: true,
      maxlength: [200, 'Investment name cannot exceed 200 characters'],
    },

    // Investment category (type)
    category: {
      type: String,
      required: [true, 'Investment category is required'],
      enum: {
        values: [
          'mutual_fund',
          'stock',
          'gold',
          'fd',           // Fixed Deposit
          'bond',
          'ppf',          // Public Provident Fund
          'nps',          // National Pension System
          'real_estate',
          'crypto',       // Optional
          'other',
        ],
        message: 'Invalid investment category',
      },
    },

    // ─── Financial Data ───────────────────────────────────────
    // Amount invested (purchase price / principal)
    amount: {
      type: Number,
      required: [true, 'Investment amount is required'],
      min: [1, 'Amount must be greater than 0'],
    },

    // Current market value (updated periodically)
    currentValue: {
      type: Number,
      required: [true, 'Current value is required'],
      min: [0, 'Current value cannot be negative'],
    },

    // For FDs, PPF, Bonds — annual interest rate %
    expectedReturn: {
      type: Number,
      min: [0, 'Expected return cannot be negative'],
      max: [100, 'Expected return cannot exceed 100%'],
      default: 0,
    },

    // ─── Dates ───────────────────────────────────────────────
    purchaseDate: {
      type: Date,
      required: [true, 'Purchase date is required'],
      default: Date.now,
    },

    // For FDs, Bonds, PPF — when the investment matures
    maturityDate: {
      type: Date,
    },

    // ─── Risk Profile ─────────────────────────────────────────
    // Risk level of this specific investment
    riskLevel: {
      type: String,
      enum: {
        values: ['low', 'medium', 'high'],
        message: 'Risk level must be low, medium, or high',
      },
      default: 'medium',
    },

    // ─── Ownership ────────────────────────────────────────────
    // Which family member this investment belongs to. This can be
    // EITHER the head (a User) OR a family member profile (a
    // FamilyMember) — `ownerType` tells Mongoose which collection to
    // look in when populating `owner` (this is called a "dynamic
    // reference", via `refPath` instead of a fixed `ref`).
    ownerType: {
      type: String,
      enum: {
        values: ['User', 'FamilyMember'],
        message: 'ownerType must be User or FamilyMember',
      },
      required: true,
      default: 'User',
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'ownerType',
      required: [true, 'Investment must have an owner'],
    },

    // Which family this investment belongs to
    family: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Family',
      required: [true, 'Investment must belong to a family'],
    },

    // ─── Additional Details ───────────────────────────────────
    notes: {
      type: String,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
      default: '',
    },

    // For stocks/mutual funds: folio number, ISIN, symbol, etc.
    identifier: {
      type: String,
      trim: true,
      default: '',
    },

    // For SIP investments — monthly contribution amount
    sipAmount: {
      type: Number,
      default: 0,
    },

    // Sector for stocks (e.g., 'Technology', 'Healthcare', 'Banking')
    sector: {
      type: String,
      default: '',
    },

    // ─── Status ───────────────────────────────────────────────
    isActive: {
      type: Boolean,
      default: true,   // false = sold/redeemed investment
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,    // Include virtual fields in JSON output
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ─── Virtual Fields ───────────────────────────────────────────
// These are computed fields — NOT stored in DB, calculated on access

/**
 * returnAmount — Profit or loss in absolute value (₹)
 * Positive = profit, Negative = loss
 */
investmentSchema.virtual('returnAmount').get(function () {
  return this.currentValue - this.amount;
});

/**
 * returnPercentage — Profit/loss as a percentage
 * Formula: ((currentValue - amount) / amount) * 100
 */
investmentSchema.virtual('returnPercentage').get(function () {
  if (this.amount === 0) return 0;
  return (((this.currentValue - this.amount) / this.amount) * 100).toFixed(2);
});

/**
 * isProfit — Is this investment currently in profit?
 */
investmentSchema.virtual('isProfit').get(function () {
  return this.currentValue >= this.amount;
});

// ─── Indexes ──────────────────────────────────────────────────
// These dramatically speed up common queries

// Most common query: "get all investments for a family"
investmentSchema.index({ family: 1, isActive: 1 });

// "get all investments by this user"
investmentSchema.index({ owner: 1, isActive: 1 });

// "get all investments of a specific type"
investmentSchema.index({ category: 1 });

// Compound: family + category (for analytics by type)
investmentSchema.index({ family: 1, category: 1 });

module.exports = mongoose.model('Investment', investmentSchema);
