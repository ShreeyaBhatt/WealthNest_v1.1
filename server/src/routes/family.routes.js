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
  '/invite',
  protect,
  authorize('admin', 'family_head'),
  [body('email').isEmail().withMessage('Valid email is required').normalizeEmail()],
  validate,
  familyController.inviteMember
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
  '/members/:userId',
  protect,
  authorize('admin', 'family_head'),
  familyController.removeMember
);

router.delete(
  '/invites/:email',
  protect,
  authorize('admin', 'family_head'),
  familyController.cancelInvite
);

module.exports = router;
