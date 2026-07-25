/**
 * src/routes/notification.routes.js — /api/notifications
 */

const express = require('express');
const { protect } = require('../middleware/auth');
const notificationController = require('../controllers/notification.controller');

const router = express.Router();

router.get('/', protect, notificationController.getNotifications);
router.patch('/:id/read', protect, notificationController.markAsRead);

module.exports = router;
