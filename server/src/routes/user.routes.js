/**
 * src/routes/user.routes.js — /api/users
 */

const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const userController = require('../controllers/user.controller');

const router = express.Router();

router.get('/me', protect, userController.getMe);

router.put(
  '/me',
  protect,
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('phone').optional().matches(/^[0-9]{10}$/).withMessage('Phone must be a valid 10-digit number'),
    body('age').optional().isInt({ min: 18, max: 100 }).withMessage('Age must be between 18 and 100'),
    body('income').optional().isFloat({ min: 0 }).withMessage('Income cannot be negative'),
    body('riskProfile').optional().isIn(['conservative', 'moderate', 'aggressive']),
    body('investmentGoal').optional().isIn([
      'wealth_creation',
      'retirement',
      'education',
      'home_purchase',
      'emergency_fund',
    ]),
  ],
  validate,
  userController.updateMe
);

// protect runs BEFORE upload.single() on purpose — the upload middleware
// names the file using req.user._id, so req.user has to already exist.
router.put('/me/avatar', protect, upload.single('avatar'), userController.uploadAvatar);

router.get('/', protect, authorize('admin'), userController.getAllUsers);

module.exports = router;
