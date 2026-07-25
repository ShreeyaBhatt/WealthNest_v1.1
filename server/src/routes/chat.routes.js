/**
 * src/routes/chat.routes.js — /api/chat
 */

const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const chatController = require('../controllers/chat.controller');

const router = express.Router();

router.get('/', protect, chatController.getChatHistory);

router.post(
  '/',
  protect,
  [body('message').trim().notEmpty().withMessage('Message cannot be empty')],
  validate,
  chatController.sendMessage
);

module.exports = router;
