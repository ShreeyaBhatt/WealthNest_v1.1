/**
 * src/models/User.model.js — User Schema
 *
 * WHY Mongoose Schemas?
 * MongoDB is "schema-less" — you can store any shape of document.
 * Mongoose adds a schema layer that enforces structure and validation.
 * Think of it like a "blueprint" for every user document in the DB.
 *
 * KEY CONCEPTS:
 * - required: field must be present
 * - unique: no two documents can have the same value for this field
 * - enum: value must be one of the listed options
 * - ref: creates a relationship to another collection (like a foreign key)
 * - select: false means this field is never returned in queries by default
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema(
  {
    // ─── Basic Info ─────────────────────────────────────────
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,                          // Remove leading/trailing spaces
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,                        // Creates a unique index in MongoDB
      lowercase: true,                     // Stored as lowercase always
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // NEVER returned in queries — security best practice
    },

    phone: {
      type: String,
      trim: true,
      match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number'],
    },

    avatar: {
      type: String,
      default: '',  // URL to profile picture
    },

    // ─── Role-Based Access Control ──────────────────────────
    // WHY enum? Restricts role to ONLY these three values.
    // This is enforced at the database level.
    role: {
      type: String,
      enum: {
        values: ['admin', 'family_head', 'family_member'],
        message: 'Role must be admin, family_head, or family_member',
      },
      default: 'family_member',
    },

    // ─── Financial Profile ──────────────────────────────────
    // Used by ML models for personalized recommendations
    age: {
      type: Number,
      min: [18, 'Age must be at least 18'],
      max: [100, 'Age cannot exceed 100'],
    },

    income: {
      type: Number,
      min: [0, 'Income cannot be negative'],
      default: 0,
    },

    riskProfile: {
      type: String,
      enum: ['conservative', 'moderate', 'aggressive'],
      default: 'moderate',
    },

    investmentGoal: {
      type: String,
      enum: ['wealth_creation', 'retirement', 'education', 'home_purchase', 'emergency_fund'],
      default: 'wealth_creation',
    },

    // ─── Family Relationship ─────────────────────────────────
    // ref: 'Family' creates a relationship — like a foreign key in SQL
    // When populated: family = { _id, name, members, ... }
    // When not populated: family = ObjectId (just the ID)
    family: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Family',
      default: null,
    },

    // ─── Account Status ──────────────────────────────────────
    isActive: {
      type: Boolean,
      default: true,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    // ─── Auth Tokens ─────────────────────────────────────────
    // refresh token stored in DB so we can invalidate it on logout
    refreshToken: {
      type: String,
      select: false,
    },

    // Password reset fields
    resetPasswordToken: {
      type: String,
      select: false,
    },

    resetPasswordExpire: {
      type: Date,
      select: false,
    },

    lastLogin: {
      type: Date,
    },
  },
  {
    // ─── Schema Options ──────────────────────────────────────
    // timestamps: true automatically adds createdAt and updatedAt fields
    timestamps: true,

    // toJSON: when converting to JSON (API response), run this transform
    toJSON: {
      transform: function (doc, ret) {
        delete ret.password;        // Never expose password
        delete ret.refreshToken;    // Never expose refresh token
        delete ret.__v;             // Remove Mongoose version key
        return ret;
      },
    },
  }
);

// ─── Indexes ─────────────────────────────────────────────────
// Indexes speed up database queries dramatically
// MongoDB creates one automatically for 'email' (unique: true)
// We add a compound index for family + role queries
userSchema.index({ family: 1, role: 1 });

// ─── Pre-Save Middleware ──────────────────────────────────────
// This runs BEFORE every .save() call
// We use it to hash the password before storing it
userSchema.pre('save', async function (next) {
  // Only hash if password field was modified (not on every save)
  if (!this.isModified('password')) return next();

  // bcrypt.hash(password, saltRounds)
  // saltRounds: 10 = strong enough, not too slow
  // bcrypt is a one-way hash — you can't "decrypt" it
  // To verify: bcrypt.compare(plaintext, hash)
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// ─── Instance Methods ─────────────────────────────────────────
// Methods available on each individual user document

/**
 * comparePassword — Verify a password against the stored hash
 * Usage: const isMatch = await user.comparePassword('mypassword123');
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

/**
 * generateAccessToken — Create a short-lived JWT
 * WHY JWT? Stateless auth — server doesn't need to store session
 * The token contains the user's ID and role, signed with JWT_SECRET
 */
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      id: this._id,
      role: this.role,
      family: this.family,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

/**
 * generateRefreshToken — Create a long-lived refresh token
 * Used to get a new access token without logging in again
 */
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    { id: this._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' }
  );
};

module.exports = mongoose.model('User', userSchema);
