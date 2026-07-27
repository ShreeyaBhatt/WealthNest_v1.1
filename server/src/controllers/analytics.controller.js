/**
 * src/controllers/analytics.controller.js — GET /api/analytics
 *
 * Gathers the caller's family portfolio, sends it to Django's
 * /api/analytics/ endpoint (Seaborn + Plotly + NetworkX — see
 * django_ai/api/views/analytics.py), and passes back whatever Django
 * generated. Node never draws any charts itself — Python's data-viz
 * libraries do that; Node's job here is just gathering the data.
 */

const Investment = require('../models/Investment.model');
const { AppError } = require('../middleware/errorHandler');
const { sendSuccess } = require('../utils/response');
const { callDjango } = require('../utils/callDjango');

const getAnalytics = async (req, res) => {
  if (!req.user.family) {
    throw new AppError('Join a family first', 400);
  }

  const investments = await Investment.find({ family: req.user.family, isActive: true }).populate('owner', 'name');

  const categoryBreakdown = {};
  const investmentPayload = investments.map((inv) => {
    categoryBreakdown[inv.category] = (categoryBreakdown[inv.category] || 0) + inv.currentValue;
    return {
      name: inv.name,
      category: inv.category,
      currentValue: inv.currentValue,
      owner: inv.owner?.name,
    };
  });

  const djangoResponse = await callDjango('/api/analytics/', {
    categoryBreakdown,
    investments: investmentPayload,
  });

  sendSuccess(res, djangoResponse.data.data);
};

module.exports = { getAnalytics };
