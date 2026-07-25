/**
 * src/controllers/chat.controller.js — AI Assistant Chat
 *
 * Gathers a quick summary of the caller's portfolio, sends it to
 * Django's Gemini-powered /api/chat/ endpoint along with the user's
 * question, and saves the exchange to ChatHistory so it shows up next
 * time they open the AI Assistant page.
 */

const axios = require('axios');
const Investment = require('../models/Investment.model');
const ChatHistory = require('../models/ChatHistory.model');
const { AppError } = require('../middleware/errorHandler');
const { sendSuccess, sendPaginated } = require('../utils/response');

/**
 * GET /api/chat
 */
const getChatHistory = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;

  const filter = { user: req.user._id };

  const history = await ChatHistory.find(filter)
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(limit);

  const total = await ChatHistory.countDocuments(filter);

  sendPaginated(res, history, { total, page, limit });
};

/**
 * POST /api/chat
 */
const sendMessage = async (req, res) => {
  const { message } = req.body;
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
    };
  }

  const djangoResponse = await axios.post(`${process.env.DJANGO_URL}/api/chat/`, { message, context });
  const { reply } = djangoResponse.data.data;

  const entry = await ChatHistory.create({
    user: req.user._id,
    family: req.user.family,
    message,
    reply,
  });

  sendSuccess(res, entry, 'Reply received');
};

module.exports = { getChatHistory, sendMessage };
