/**
 * src/routes/goal.routes.js — /api/goals
 *
 * Every route here just needs `protect` (must be logged in) — same as
 * investment.routes.js, and for the same reason: the real permission
 * rule ("own goals only" for members, "any family goal" for
 * heads/admins) depends on WHICH goal is being touched, so that check
 * happens inside the controller, right where it's already loaded.
 */

const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const goalController = require('../controllers/goal.controller');

const router = express.Router();

const CATEGORIES = ['wealth_creation', 'retirement', 'education', 'home_purchase', 'emergency_fund', 'other'];

router.get('/', protect, goalController.getGoals);
router.get('/:id', protect, goalController.getGoalById);

router.post(
  '/',
  protect,
  [
    body('name').trim().notEmpty().withMessage('Goal name is required'),
    body('category').optional().isIn(CATEGORIES).withMessage('Invalid goal category'),
    body('targetAmount').isFloat({ min: 1 }).withMessage('Target amount must be greater than 0'),
    body('currentAmount').optional().isFloat({ min: 0 }).withMessage('Current amount cannot be negative'),
    body('targetDate').notEmpty().withMessage('Target date is required'),
    body('ownerType').optional().isIn(['User', 'FamilyMember']).withMessage('Invalid ownerType'),
    body('owner').optional().isMongoId().withMessage('Invalid owner id'),
  ],
  validate,
  goalController.createGoal
);

router.put(
  '/:id',
  protect,
  [
    body('category').optional().isIn(CATEGORIES).withMessage('Invalid goal category'),
    body('targetAmount').optional().isFloat({ min: 1 }).withMessage('Target amount must be greater than 0'),
    body('currentAmount').optional().isFloat({ min: 0 }).withMessage('Current amount cannot be negative'),
    body('ownerType').optional().isIn(['User', 'FamilyMember']).withMessage('Invalid ownerType'),
    body('owner').optional().isMongoId().withMessage('Invalid owner id'),
  ],
  validate,
  goalController.updateGoal
);

router.delete('/:id', protect, goalController.deleteGoal);

module.exports = router;
