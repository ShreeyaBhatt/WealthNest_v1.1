/**
 * src/models/FamilyMember.model.js — A Family Member's Profile
 *
 * CONCEPT: This is NOT a User. It has no password and can't log in —
 * it's just a profile record (name, email, age, phone, income) that
 * the family head creates, edits, and deletes directly, the same way
 * they'd manage investments. Only the head (and admin) ever needs a
 * real WealthNest account; everyone else in the family is just data
 * the head is keeping track of.
 *
 * Family.head is a User (they log in). Family.members are FamilyMember
 * profiles (they don't).
 */

const mongoose = require('mongoose');

const familyMemberSchema = new mongoose.Schema(
  {
    family: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Family',
      required: true,
    },

    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },

    // Just contact info here — not a login, so it doesn't need to be
    // unique across the system the way User.email does.
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },

    age: {
      type: Number,
      min: [0, 'Age cannot be negative'],
      max: [120, 'Age cannot exceed 120'],
    },

    phone: {
      type: String,
      trim: true,
      default: '',
    },

    monthlyIncome: {
      type: Number,
      min: [0, 'Monthly income cannot be negative'],
      default: 0,
    },

    avatar: {
      type: String,
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

familyMemberSchema.index({ family: 1 });

module.exports = mongoose.model('FamilyMember', familyMemberSchema);
