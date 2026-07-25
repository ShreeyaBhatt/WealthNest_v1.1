/**
 * src/routes/dashboard.routes.js — /api/dashboard
 */

const express = require('express');
const { protect } = require('../middleware/auth');
const dashboardController = require('../controllers/dashboard.controller');

const router = express.Router();

router.get('/', protect, dashboardController.getDashboard);

module.exports = router;
