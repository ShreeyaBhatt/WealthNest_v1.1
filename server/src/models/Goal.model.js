/**
 * src/models/Goal.model.js — Financial Goal Schema
 *
 * A "goal" is something a family is saving TOWARD — e.g. "Buy a Car",
 * "Emergency Fund", "Priya's Education" — as opposed to an Investment,
 * which is a specific holding (a mutual fund, a stock, gold, etc.).
 * A goal doesn't hold money itself; `currentAmount` is just a running
 * total the family updates by hand as they save, the same way
 * Investment.currentValue is a manually-entered number rather than a
 * live market price (see Investment.model.js) — this project doesn't
 * fetch real-time prices, so staying consistent with that same "you
 * tell us the number" pattern keeps things simple.
 *
 * KEY DESIGN DECISIONS:
 * 1. Same owner/family split as Investment.model.js — a goal can
 *    belong to the head (a User) or a family member profile (a
 *    FamilyMember), and always belongs to exactly one family.
 * 2. No soft-delete flag like Investment has. Investments need
 *    isActive because Transaction documents point back at an
 *    investment by id — nothing else in the app points at a Goal, so
 *    deleting one for real is safe.
 * 3. Progress (percent complete, amount remaining, days remaining) is
 *    computed as virtuals instead of stored — it would go stale the
 *    moment time passes or currentAmount changes, so it's cheaper and
 *    safer to just calculate it fresh every time the goal is read.
 */

const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema(
  {
    // ─── Goal Details ─────────────────────────────────────────
    name: {
      type: String,
      required: [true, 'Goal name is required'],
      trim: true,
      maxlength: [200, 'Goal name cannot exceed 200 characters'],
    },

    // What kind of goal this is — reuses the same categories
    // User.model.js already offers for "investmentGoal" on the
    // profile, plus a catch-all 'other' for anything that doesn't fit.
    category: {
      type: String,
      enum: {
        values: ['wealth_creation', 'retirement', 'education', 'home_purchase', 'emergency_fund', 'other'],
        message: 'Invalid goal category',
      },
      default: 'other',
    },

    // ─── Financial Data ───────────────────────────────────────
    // How much the family is trying to save in total.
    targetAmount: {
      type: Number,
      required: [true, 'Target amount is required'],
      min: [1, 'Target amount must be greater than 0'],
    },

    // How much has been saved toward it so far. Updated by hand as
    // the family makes progress — see the comment at the top of this
    // file for why this isn't computed from linked investments.
    currentAmount: {
      type: Number,
      default: 0,
      min: [0, 'Current amount cannot be negative'],
    },

    // When the family wants to reach targetAmount by.
    targetDate: {
      type: Date,
      required: [true, 'Target date is required'],
    },

    // ─── Ownership ────────────────────────────────────────────
    // Same dynamic-reference pattern as Investment.model.js — see the
    // comment there for the full explanation of ownerType/refPath.
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
      required: [true, 'Goal must have an owner'],
    },

    family: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Family',
      required: [true, 'Goal must belong to a family'],
    },

    // ─── Additional Details ───────────────────────────────────
    notes: {
      type: String,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ─── Virtual Fields ───────────────────────────────────────────
// Computed on the fly, never stored — see the class comment above.

/**
 * progressPercent — how far toward targetAmount currentAmount is,
 * capped at 100 (saving past the goal shouldn't show as "150% done").
 */
goalSchema.virtual('progressPercent').get(function () {
  const raw = (this.currentAmount / this.targetAmount) * 100;
  return Math.round(Math.min(100, raw));
});

/**
 * amountRemaining — how much more needs to be saved. Floored at 0 so
 * an already-achieved goal doesn't show a negative "amount left".
 */
goalSchema.virtual('amountRemaining').get(function () {
  return Math.max(0, this.targetAmount - this.currentAmount);
});

/**
 * isAchieved — has the family already hit (or passed) the target?
 */
goalSchema.virtual('isAchieved').get(function () {
  return this.currentAmount >= this.targetAmount;
});

/**
 * daysRemaining — days left until targetDate. Can be negative, which
 * means the target date has already passed without the goal being
 * met — the client decides how to display that ("overdue" etc.).
 */
goalSchema.virtual('daysRemaining').get(function () {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.ceil((this.targetDate - Date.now()) / msPerDay);
});

// ─── Indexes ──────────────────────────────────────────────────

// Most common query: "get all goals for a family", soonest deadline first.
goalSchema.index({ family: 1, targetDate: 1 });

// "get all goals owned by this particular person"
goalSchema.index({ owner: 1 });

module.exports = mongoose.model('Goal', goalSchema);
