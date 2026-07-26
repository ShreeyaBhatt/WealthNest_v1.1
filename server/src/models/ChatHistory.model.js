/**
 * src/models/ChatHistory.model.js — AI Assistant Q&A Log
 *
 * Each document is one question-and-answer pair with the AI assistant
 * (see chat.controller.js). Messages are grouped into conversations via
 * `sessionId` — one id per "chat" the user starts, so the AI Assistant
 * page can offer "Start New Chat" vs "Continue Chat". Documents created
 * before this field existed have no `sessionId` at all; the controller
 * treats all of those as one shared "legacy" conversation instead of
 * running a migration (see LEGACY_SESSION_ID in chat.controller.js).
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

    // Groups messages into one conversation. No `default` here on
    // purpose — a schema default would run per-document and give every
    // message its own id, defeating grouping entirely. The controller
    // sets this explicitly per request instead (new id for a new chat,
    // the same id for every message in a continued chat).
    sessionId: {
      type: String,
      trim: true,
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

// Most common query: "my chat history, newest first" (also used for
// the legacy/no-sessionId path and the sessions aggregation)
chatHistorySchema.index({ user: 1, createdAt: -1 });

// "messages in one conversation, newest first"
chatHistorySchema.index({ user: 1, sessionId: 1, createdAt: -1 });

module.exports = mongoose.model('ChatHistory', chatHistorySchema);
