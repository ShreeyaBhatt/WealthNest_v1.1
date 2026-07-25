/**
 * src/routes/analytics.routes.js — /api/analytics
 */

const express = require('express');
const { protect } = require('../middleware/auth');
const analyticsController = require('../controllers/analytics.controller');

const router = express.Router();

router.get('/', protect, analyticsController.getAnalytics);

module.exports = router;
