/**
 * src/routes/transaction.routes.js — /api/transactions
 */

const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const transactionController = require('../controllers/transaction.controller');

const router = express.Router();

const TYPES = ['buy', 'sell', 'sip', 'dividend', 'interest', 'withdrawal', 'deposit'];

router.get('/', protect, transactionController.getTransactions);

router.post(
  '/',
  protect,
  [
    body('type').isIn(TYPES).withMessage('Invalid transaction type'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
    body('investment').notEmpty().withMessage('investment id is required').isMongoId().withMessage('Invalid investment id'),
    body('units').optional({ checkFalsy: true }).isFloat({ min: 0 }).withMessage('Units cannot be negative'),
    body('unitPrice').optional({ checkFalsy: true }).isFloat({ min: 0 }).withMessage('Price per unit cannot be negative'),
  ],
  validate,
  transactionController.createTransaction
);

module.exports = router;
