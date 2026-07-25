/**
 * src/models/Family.model.js — Family Schema
 *
 * CONCEPT: A "Family" has exactly one head — a real User who logs in
 * and manages everything. Everyone else is a FamilyMember: a profile
 * record (name, email, age, phone, income) the head adds/edits/deletes
 * directly. Members don't have accounts and can't log in themselves —
 * see FamilyMember.model.js.
 *
 * RELATIONSHIP DIAGRAM:
 * Family ──1 Head (User)
 * Family ──< Members (FamilyMember profiles)
 * Family ──< Investments
 *
 * WHY store members as an array of ObjectIds?
 * MongoDB supports this pattern natively. You can populate them later:
 *   Family.findById(id).populate('members')
 * This gives you the full FamilyMember documents, not just IDs.
 */

const mongoose = require('mongoose');

const familySchema = new mongoose.Schema(
  {
    // ─── Family Identity ─────────────────────────────────────
    name: {
      type: String,
      required: [true, 'Family name is required'],
      trim: true,
      minlength: [2, 'Family name must be at least 2 characters'],
      maxlength: [100, 'Family name cannot exceed 100 characters'],
    },

    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },

    // ─── Head of Family ──────────────────────────────────────
    // The family head has elevated permissions (invite, delete members)
    head: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Family must have a head'],
    },

    // ─── Members List ─────────────────────────────────────────
    // Array of FamilyMember references — profile records the head
    // manages directly. The head themself is NOT in this array; they're
    // tracked separately above via `head` (a User).
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FamilyMember',
      },
    ],

    // ─── Family Settings ──────────────────────────────────────
    isActive: {
      type: Boolean,
      default: true,
    },

    currency: {
      type: String,
      default: 'INR',   // Indian Rupee — change to USD for international
      enum: ['INR', 'USD', 'EUR', 'GBP'],
    },

    // ─── Portfolio Snapshot (Cached Values) ──────────────────
    // These are updated periodically to avoid recalculating on every request
    totalPortfolioValue: {
      type: Number,
      default: 0,
    },

    lastCalculatedAt: {
      type: Date,
      default: Date.now,
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

// ─── Virtual Field: memberCount ───────────────────────────────
// A "virtual" is a computed field that's NOT stored in the DB
// It's calculated on the fly when accessed
familySchema.virtual('memberCount').get(function () {
  return this.members.length;
});

// ─── Indexes ──────────────────────────────────────────────────
familySchema.index({ head: 1 });
familySchema.index({ members: 1 });

module.exports = mongoose.model('Family', familySchema);
