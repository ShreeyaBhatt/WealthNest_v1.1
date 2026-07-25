/**
 * src/routes/report.routes.js — /api/reports
 */

const express = require('express');
const { protect } = require('../middleware/auth');
const reportController = require('../controllers/report.controller');

const router = express.Router();

router.get('/portfolio', protect, reportController.getPortfolioReport);

module.exports = router;
