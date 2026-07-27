/**
 * src/models/Notification.model.js — In-App Notification Schema
 *
 * WHY a dedicated collection instead of pushing into User?
 * Notifications are append-only and queried independently of the user
 * profile ("give me my unread notifications, newest first"), so they get
 * their own collection rather than an embedded array that would grow
 * unbounded inside every User document.
 *
 * WHO creates these?
 * Never directly from a route — always via utils/notify.js (e.g. the
 * maturity-reminder check). A notification failure should never block
 * the action that triggered it.
 */

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    // ─── Recipient ────────────────────────────────────────────
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Notification must have a recipient'],
    },

    // Optional — set for family-related events, null for account-only ones
    family: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Family',
      default: null,
    },

    // ─── Notification Type ────────────────────────────────────
    type: {
      type: String,
      required: true,
      enum: {
        values: ['system', 'maturity_reminder'],
        message: 'Invalid notification type',
      },
    },

    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },

    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
      maxlength: [500, 'Message cannot exceed 500 characters'],
    },

    isRead: {
      type: Boolean,
      default: false,
    },

    // Optional frontend route this notification should deep-link to
    link: {
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

// ─── Indexes ──────────────────────────────────────────────────
// Primary query: "my unread notifications, newest first"
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ family: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
