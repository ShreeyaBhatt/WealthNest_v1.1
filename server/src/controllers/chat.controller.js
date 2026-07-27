/**
 * src/controllers/chat.controller.js — AI Assistant Chat
 *
 * Gathers a quick summary of the caller's portfolio, sends it to
 * Django's Gemini-powered /api/chat/ endpoint along with the user's
 * question, and saves the exchange to ChatHistory so it shows up next
 * time they open the AI Assistant page.
 */

const crypto = require('crypto');
const Investment = require('../models/Investment.model');
const ChatHistory = require('../models/ChatHistory.model');
const { AppError } = require('../middleware/errorHandler');
const { sendSuccess, sendPaginated } = require('../utils/response');
const { callDjango } = require('../utils/callDjango');

// Messages saved before `sessionId` existed have no sessionId at all.
// Rather than run a migration, we treat all of those as one shared
// "legacy" conversation — sessionFilter() below is what makes that work
// for both reading them and continuing to chat inside that bucket.
const LEGACY_SESSION_ID = 'legacy';

/**
 * sessionFilter — builds the extra query clause for scoping to one
 * conversation.
 * - no sessionId given -> {} (today's "everything" behavior)
 * - 'legacy' -> matches old docs with no sessionId AND any newer docs
 *   explicitly saved with sessionId: 'legacy' (continuing that bucket)
 * - anything else -> exact match on that sessionId
 */
const sessionFilter = (sessionId) => {
  if (!sessionId) return {};
  if (sessionId === LEGACY_SESSION_ID) {
    return { $or: [{ sessionId: { $exists: false } }, { sessionId: LEGACY_SESSION_ID }] };
  }
  return { sessionId };
};

/**
 * GET /api/chat
 * Optional ?sessionId= scopes this to one conversation; omitted keeps
 * the old "every message this user has ever sent" behavior.
 */
const getChatHistory = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;

  const filter = { user: req.user._id, ...sessionFilter(req.query.sessionId) };

  const history = await ChatHistory.find(filter)
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(limit);

  const total = await ChatHistory.countDocuments(filter);

  sendPaginated(res, history, { total, page, limit });
};

/**
 * GET /api/chat/sessions
 * The "Continue Chat" picker list — one row per conversation this user
 * has ever had, newest-active first.
 */
const getChatSessions = async (req, res) => {
  const groups = await ChatHistory.aggregate([
    { $match: { user: req.user._id } },
    { $addFields: { sid: { $ifNull: ['$sessionId', LEGACY_SESSION_ID] } } },
    { $sort: { createdAt: 1 } }, // oldest first per group, so $first below = earliest message
    {
      $group: {
        _id: '$sid',
        title: { $first: '$message' },
        lastMessageAt: { $last: '$createdAt' },
        messageCount: { $sum: 1 },
      },
    },
    { $sort: { lastMessageAt: -1 } },
  ]);

  const sessions = groups.map((g) => ({
    sessionId: g._id,
    title: g.title.length > 60 ? `${g.title.slice(0, 60)}…` : g.title,
    lastMessageAt: g.lastMessageAt,
    messageCount: g.messageCount,
  }));

  sendSuccess(res, sessions, 'Sessions fetched');
};

/**
 * POST /api/chat
 * Optional `sessionId` in the body continues that conversation; if
 * omitted, this is a "new chat" and we mint a fresh id for it.
 */
const sendMessage = async (req, res) => {
  const { message, sessionId } = req.body;
  if (!message || !message.trim()) {
    throw new AppError('Message cannot be empty', 400);
  }

  // A rough portfolio summary — good enough context for the AI to
  // reason about, doesn't need to be as precise as the real dashboard.
  let context = { note: 'User has not joined a family or added investments yet' };
  if (req.user.family) {
    const investments = await Investment.find({ family: req.user.family, isActive: true });
    const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
    const totalValue = investments.reduce((sum, inv) => sum + inv.currentValue, 0);
    context = {
      investmentCount: investments.length,
      totalInvested,
      totalValue,
      categories: [...new Set(investments.map((inv) => inv.category))],
      // Without this, the AI only sees totals and bare category names —
      // it can't answer "which one has the best return" or "how much
      // gold do I have" without a number attached to each investment.
      breakdown: investments.map((inv) => ({
        name: inv.name,
        category: inv.category,
        invested: inv.amount,
        currentValue: inv.currentValue,
      })),
    };
  }

  const djangoResponse = await callDjango('/api/chat/', { message, context });
  const { reply } = djangoResponse.data.data;

  const entry = await ChatHistory.create({
    user: req.user._id,
    family: req.user.family,
    message,
    reply,
    sessionId: sessionId || crypto.randomUUID(),
  });

  sendSuccess(res, entry, 'Reply received'); // entry.sessionId is included automatically
};

module.exports = { getChatHistory, getChatSessions, sendMessage };
