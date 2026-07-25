/**
 * src/routes/prediction.routes.js — /api/predictions
 */

const express = require('express');
const { protect } = require('../middleware/auth');
const predictionController = require('../controllers/prediction.controller');

const router = express.Router();

router.get('/risk', protect, predictionController.getRiskPrediction);
router.get('/future', protect, predictionController.getFuturePrediction);

module.exports = router;
