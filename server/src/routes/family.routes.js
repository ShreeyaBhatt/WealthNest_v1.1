/**
 * src/routes/family.routes.js — /api/families
 */

const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const familyController = require('../controllers/family.controller');

const router = express.Router();

router.get('/', protect, familyController.getMyFamily);

router.post(
  '/',
  protect,
  [
    body('name').trim().notEmpty().withMessage('Family name is required'),
    body('description').optional().isLength({ max: 500 }),
    body('currency').optional().isIn(['INR', 'USD', 'EUR', 'GBP']),
  ],
  validate,
  familyController.createFamily
);

router.post(
  '/members',
  protect,
  authorize('admin', 'family_head'),
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').optional({ checkFalsy: true }).isEmail().withMessage('Must be a valid email').normalizeEmail(),
    body('age').optional({ checkFalsy: true }).isInt({ min: 0, max: 120 }).withMessage('Age must be between 0 and 120'),
    body('phone').optional({ checkFalsy: true }).isLength({ max: 20 }),
    body('monthlyIncome').optional({ checkFalsy: true }).isFloat({ min: 0 }).withMessage('Monthly income cannot be negative'),
  ],
  validate,
  familyController.addMember
);

router.put(
  '/members/:memberId',
  protect,
  authorize('admin', 'family_head'),
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('email').optional({ checkFalsy: true }).isEmail().withMessage('Must be a valid email').normalizeEmail(),
    body('age').optional({ checkFalsy: true }).isInt({ min: 0, max: 120 }).withMessage('Age must be between 0 and 120'),
    body('phone').optional({ checkFalsy: true }).isLength({ max: 20 }),
    body('monthlyIncome').optional({ checkFalsy: true }).isFloat({ min: 0 }).withMessage('Monthly income cannot be negative'),
  ],
  validate,
  familyController.updateMember
);

router.put(
  '/',
  protect,
  authorize('admin', 'family_head'),
  [
    body('name').optional().trim().notEmpty().withMessage('Family name cannot be empty'),
    body('description').optional().isLength({ max: 500 }),
    body('currency').optional().isIn(['INR', 'USD', 'EUR', 'GBP']),
  ],
  validate,
  familyController.updateFamily
);

router.delete(
  '/members/:memberId',
  protect,
  authorize('admin', 'family_head'),
  familyController.removeMember
);

module.exports = router;
