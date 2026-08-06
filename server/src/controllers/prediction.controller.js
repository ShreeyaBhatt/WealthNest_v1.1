/**
 * src/controllers/prediction.controller.js — Risk & Future-Value Predictions
 *
 * WHY does this live in Node instead of just calling Django straight
 * from the browser?
 * The real investment data lives in MongoDB, which only Node can read.
 * So the flow is: Node gathers the numbers Django's ML models need
 * from MongoDB, sends them to Django over HTTP, and saves whatever
 * Django predicts into the Prediction collection (Prediction.model.js)
 * so we don't have to ask Django again for a whole day (see that
 * model's `expiresAt` field).
 *
 * WHY bucket investment categories into equity/debt/gold?
 * The ML model was trained on exactly three portfolio-split numbers
 * that add up to 100 (see django_ai's train_models.py). WealthNest has
 * more investment categories than that, so we group them:
 *   equity → mutual_fund, stock, crypto        (growth-focused, higher risk)
 *   gold   → gold
 *   debt   → fd, bond, ppf, nps, real_estate, other  (everything steadier)
 * This is a simplification, not a precise financial classification —
 * good enough for a student project's risk model.
 */

const Investment = require('../models/Investment.model');
const Prediction = require('../models/Prediction.model');
const { AppError } = require('../middleware/errorHandler');
const { sendSuccess } = require('../utils/response');
const { callDjango } = require('../utils/callDjango');

const EQUITY_CATEGORIES = ['mutual_fund', 'stock', 'crypto'];
const GOLD_CATEGORIES = ['gold'];
// Everything else (fd, bond, ppf, nps, real_estate, other) counts as "debt".

/**
 * Loads the caller's active investments and turns them into the
 * feature payload Django's models expect.
 */
const buildFeaturesForUser = async (user) => {
  if (!user.family) {
    throw new AppError('Join a family first', 400);
  }
  if (!user.age || !user.income) {
    throw new AppError('Please set your age and income in your profile before requesting a prediction', 400);
  }

  const investments = await Investment.find({ family: user.family, owner: user._id, isActive: true });

  if (investments.length === 0) {
    throw new AppError('Add at least one investment first', 400);
  }

  let totalInvested = 0;
  let equityValue = 0;
  let goldValue = 0;
  let debtValue = 0;

  for (const investment of investments) {
    totalInvested += investment.currentValue;

    if (EQUITY_CATEGORIES.includes(investment.category)) {
      equityValue += investment.currentValue;
    } else if (GOLD_CATEGORIES.includes(investment.category)) {
      goldValue += investment.currentValue;
    } else {
      debtValue += investment.currentValue;
    }
  }

  return {
    age: user.age,
    income: user.income,
    totalInvested,
    equityPercent: totalInvested === 0 ? 0 : (equityValue / totalInvested) * 100,
    debtPercent: totalInvested === 0 ? 0 : (debtValue / totalInvested) * 100,
    goldPercent: totalInvested === 0 ? 0 : (goldValue / totalInvested) * 100,
    investmentCount: investments.length,
    riskProfile: user.riskProfile,
  };
};

// A cached prediction is only worth reusing if the portfolio still
// looks roughly like it did when we asked Django — otherwise "cached
// for 24h" would keep showing a stale category after a big change.
const PORTFOLIO_DRIFT_THRESHOLD = 5; // percentage points
const portfolioDrifted = (fresh, cached) => {
  const splitDrifted = ['equityPercent', 'debtPercent', 'goldPercent'].some(
    (key) => Math.abs(fresh[key] - cached[key]) > PORTFOLIO_DRIFT_THRESHOLD
  );
  const investedDrifted =
    cached.totalInvested > 0 && Math.abs(fresh.totalInvested - cached.totalInvested) / cached.totalInvested > 0.1;
  return splitDrifted || investedDrifted;
};

/**
 * GET /api/predictions/risk
 */
const getRiskPrediction = async (req, res) => {
  const features = await buildFeaturesForUser(req.user);

  const cached = await Prediction.findOne({
    user: req.user._id,
    predictionType: 'risk',
    expiresAt: { $gt: new Date() },
  }).sort('-createdAt');

  if (cached && !portfolioDrifted(features, cached.inputFeatures)) {
    return sendSuccess(res, {
      riskCategory: cached.riskCategory,
      riskConfidence: cached.riskConfidence,
      cached: true,
    });
  }

  const djangoResponse = await callDjango('/api/predict-risk/', features);
  const { riskCategory, riskConfidence } = djangoResponse.data.data;

  await Prediction.create({
    user: req.user._id,
    family: req.user.family,
    predictionType: 'risk',
    inputFeatures: features,
    riskCategory,
    riskConfidence,
  });

  sendSuccess(res, { riskCategory, riskConfidence, cached: false });
};

/**
 * GET /api/predictions/future
 */
const getFuturePrediction = async (req, res) => {
  const features = await buildFeaturesForUser(req.user);

  const cached = await Prediction.findOne({
    user: req.user._id,
    predictionType: 'future_value',
    expiresAt: { $gt: new Date() },
  }).sort('-createdAt');

  if (cached && !portfolioDrifted(features, cached.inputFeatures)) {
    return sendSuccess(res, {
      oneYear: cached.predictedValues.oneYear,
      threeYears: cached.predictedValues.threeYears,
      fiveYears: cached.predictedValues.fiveYears,
      cached: true,
    });
  }

  const djangoResponse = await callDjango('/api/predict-future/', features);
  const predictedValues = djangoResponse.data.data;

  await Prediction.create({
    user: req.user._id,
    family: req.user.family,
    predictionType: 'future_value',
    inputFeatures: features,
    predictedValues,
  });

  sendSuccess(res, { ...predictedValues, cached: false });
};

/**
 * GET /api/predictions/recommend
 */
const getRecommendations = async (req, res) => {
  const features = await buildFeaturesForUser(req.user);

  const cached = await Prediction.findOne({
    user: req.user._id,
    predictionType: 'recommendation',
    expiresAt: { $gt: new Date() },
  }).sort('-createdAt');

  if (cached && !portfolioDrifted(features, cached.inputFeatures)) {
    return sendSuccess(res, { recommendations: cached.recommendations, cached: true });
  }

  const djangoResponse = await callDjango('/api/recommend/', features);
  const { recommendations } = djangoResponse.data.data;

  await Prediction.create({
    user: req.user._id,
    family: req.user.family,
    predictionType: 'recommendation',
    inputFeatures: features,
    recommendations,
  });

  sendSuccess(res, { recommendations, cached: false });
};

/**
 * GET /api/predictions/health-score
 */
const getHealthScore = async (req, res) => {
  const features = await buildFeaturesForUser(req.user);

  const cached = await Prediction.findOne({
    user: req.user._id,
    predictionType: 'health_score',
    expiresAt: { $gt: new Date() },
  }).sort('-createdAt');

  if (cached && !portfolioDrifted(features, cached.inputFeatures)) {
    return sendSuccess(res, {
      healthScore: cached.healthScore,
      breakdown: cached.healthBreakdown,
      summary: cached.healthSummary,
      cached: true,
    });
  }

  const djangoResponse = await callDjango('/api/health-score/', features);
  const { healthScore, breakdown, summary } = djangoResponse.data.data;

  await Prediction.create({
    user: req.user._id,
    family: req.user.family,
    predictionType: 'health_score',
    inputFeatures: features,
    healthScore,
    healthBreakdown: breakdown,
    healthSummary: summary,
  });

  sendSuccess(res, { healthScore, breakdown, summary, cached: false });
};

module.exports = { getRiskPrediction, getFuturePrediction, getRecommendations, getHealthScore };
