/**
 * src/models/Prediction.model.js — ML Prediction Results Schema
 *
 * WHY store ML predictions in MongoDB?
 * ML predictions are compute-intensive (model inference takes time).
 * Instead of running the model on every page load, we:
 * 1. Run the model once when user requests it
 * 2. Store the result in MongoDB
 * 3. Return the cached result until portfolio changes significantly
 *
 * This is called "result caching" — a standard performance pattern.
 *
 * PREDICTION TYPES:
 * - risk: Portfolio risk classification (Conservative/Moderate/Aggressive)
 * - future_value: Predicted portfolio value in 1/3/5 years
 */

const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema(
  {
    // ─── Who requested this prediction? ──────────────────────
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    family: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Family',
      required: true,
    },

    // ─── Prediction Type ──────────────────────────────────────
    predictionType: {
      type: String,
      required: true,
      enum: ['risk', 'future_value'],
    },

    // ─── Input Features ───────────────────────────────────────
    // What data was fed to the ML model?
    // Stored so we can explain predictions to the user.
    inputFeatures: {
      age:              { type: Number },
      income:           { type: Number },
      totalInvested:    { type: Number },
      equityPercent:    { type: Number },  // % in stocks/mutual funds
      debtPercent:      { type: Number },  // % in FD/bonds
      goldPercent:      { type: Number },
      investmentCount:  { type: Number },
      riskProfile:      { type: String },
    },

    // ─── Prediction Results ───────────────────────────────────
    // For risk prediction:
    riskCategory: {
      type: String,
      enum: ['conservative', 'moderate', 'aggressive'],
    },
    riskConfidence: {
      type: Number,     // 0-100: how confident the model is
    },

    // For future value prediction:
    predictedValues: {
      oneYear:   { type: Number },
      threeYears: { type: Number },
      fiveYears:  { type: Number },
    },

    // ─── Cache Validity ───────────────────────────────────────
    // Predictions expire after 24 hours (stale data not useful)
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // +24 hours
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => { delete ret.__v; return ret; },
    },
  }
);

// ─── Indexes ──────────────────────────────────────────────────
predictionSchema.index({ family: 1, predictionType: 1, createdAt: -1 });

// TTL Index: MongoDB automatically deletes documents after expiresAt
// This keeps the collection from growing indefinitely
predictionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Prediction', predictionSchema);
