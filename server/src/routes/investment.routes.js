/**
 * src/routes/investment.routes.js — /api/investments
 *
 * Every route here just needs `protect` (must be logged in). We don't
 * use authorize() for role-gating on update/delete because the real
 * rule ("own investments only" for members, "any family investment"
 * for heads/admins) depends on WHICH investment is being touched — that
 * check happens inside the controller, right where we already fetch it.
 */

const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const investmentController = require('../controllers/investment.controller');

const router = express.Router();

const CATEGORIES = [
  'mutual_fund',
  'stock',
  'gold',
  'fd',
  'bond',
  'ppf',
  'nps',
  'real_estate',
  'crypto',
  'other',
];

router.get('/', protect, investmentController.getInvestments);
router.get('/:id', protect, investmentController.getInvestmentById);

router.post(
  '/',
  protect,
  [
    body('name').trim().notEmpty().withMessage('Investment name is required'),
    body('category').isIn(CATEGORIES).withMessage('Invalid investment category'),
    body('amount').isFloat({ min: 1 }).withMessage('Amount must be greater than 0'),
    body('currentValue').isFloat({ min: 0 }).withMessage('Current value cannot be negative'),
    body('purchaseDate').notEmpty().withMessage('Purchase date is required'),
  ],
  validate,
  investmentController.createInvestment
);

router.put(
  '/:id',
  protect,
  [
    body('category').optional().isIn(CATEGORIES).withMessage('Invalid investment category'),
    body('amount').optional().isFloat({ min: 1 }).withMessage('Amount must be greater than 0'),
    body('currentValue').optional().isFloat({ min: 0 }).withMessage('Current value cannot be negative'),
  ],
  validate,
  investmentController.updateInvestment
);

router.delete('/:id', protect, investmentController.deleteInvestment);

module.exports = router;
