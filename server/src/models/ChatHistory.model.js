/**
 * src/models/ChatHistory.model.js — AI Assistant Q&A Log
 *
 * Each document is one question-and-answer pair with the AI assistant
 * (see chat.controller.js). We keep this append-only and simple —
 * no threading/conversation grouping — so "chat history" is just
 * "every question I've asked, newest first".
 */

const mongoose = require('mongoose');

const chatHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Chat message must have a user'],
    },

    family: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Family',
      default: null,
    },

    message: {
      type: String,
      required: [true, 'Message cannot be empty'],
      trim: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },

    reply: {
      type: String,
      required: true,
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

// Most common query: "my chat history, newest first"
chatHistorySchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('ChatHistory', chatHistorySchema);
