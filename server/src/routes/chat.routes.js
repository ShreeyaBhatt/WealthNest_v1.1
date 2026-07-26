/**
 * src/routes/chat.routes.js — /api/chat
 */

const express = require('express');
const { body, query } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const chatController = require('../controllers/chat.controller');

const router = express.Router();

// The "Continue Chat" picker list. This is a literal path (not a
// :param route), so mounting it before '/' isn't required, but it
// keeps the conversation-level routes grouped together.
router.get('/sessions', protect, chatController.getChatSessions);

router.get(
  '/',
  protect,
  [query('sessionId').optional().isString().trim()],
  validate,
  chatController.getChatHistory
);

router.post(
  '/',
  protect,
  [
    body('message').trim().notEmpty().withMessage('Message cannot be empty'),
    body('sessionId').optional({ checkFalsy: true }).isString().trim().isLength({ max: 100 }),
  ],
  validate,
  chatController.sendMessage
);

module.exports = router;
