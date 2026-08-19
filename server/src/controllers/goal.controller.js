/**
 * src/controllers/goal.controller.js — Financial Goal CRUD
 *
 * Same permission shape as investment.controller.js:
 * - Everyone in a family can VIEW all of that family's goals.
 * - A family_member can only UPDATE/DELETE goals they personally own.
 * - A family_head or admin can UPDATE/DELETE any goal in the family.
 *
 * (This file deliberately repeats resolveOwner/permission-check logic
 * that already exists in investment.controller.js instead of importing
 * a shared helper — see feedback_code_style: this project prefers
 * each controller to read top-to-bottom on its own, even if that
 * means a few repeated lines.)
 */

const Goal = require('../models/Goal.model');
const FamilyMember = require('../models/FamilyMember.model');
const { AppError } = require('../middleware/errorHandler');
const { sendSuccess } = require('../utils/response');

/**
 * Figures out who a goal should be attributed to. Defaults to "the
 * logged-in head themself" when the request doesn't specify an owner.
 * When it IS specified, double-checks it actually points at someone
 * in the caller's own family.
 */
const resolveOwner = async (req) => {
  const { owner, ownerType } = req.body;

  if (!owner || !ownerType) {
    return { owner: req.user._id, ownerType: 'User' };
  }

  if (ownerType === 'User') {
    if (String(owner) !== String(req.user._id)) {
      throw new AppError('Goals can only be tagged to yourself or a family member', 400);
    }
    return { owner, ownerType };
  }

  if (ownerType === 'FamilyMember') {
    const member = await FamilyMember.findOne({ _id: owner, family: req.user.family });
    if (!member) {
      throw new AppError('This member is not part of your family', 400);
    }
    return { owner, ownerType };
  }

  throw new AppError('ownerType must be User or FamilyMember', 400);
};

/**
 * GET /api/goals
 * Lists every goal belonging to the caller's family, soonest deadline
 * first — the family's most urgent goal is the one worth seeing first.
 */
const getGoals = async (req, res) => {
  if (!req.user.family) {
    throw new AppError('Join a family first', 400);
  }

  const goals = await Goal.find({ family: req.user.family })
    .populate('owner', 'name avatar')
    .sort('targetDate');

  sendSuccess(res, goals);
};

/**
 * GET /api/goals/:id
 */
const getGoalById = async (req, res) => {
  const goal = await Goal.findById(req.params.id).populate('owner', 'name avatar');
  if (!goal) {
    throw new AppError('Goal not found', 404);
  }

  if (req.user.role !== 'admin' && String(goal.family) !== String(req.user.family)) {
    throw new AppError('You do not have access to this goal', 403);
  }

  sendSuccess(res, goal);
};

/**
 * POST /api/goals
 * family always comes from the logged-in user's own token, never from
 * the request body — same reasoning as createInvestment.
 */
const createGoal = async (req, res) => {
  if (!req.user.family) {
    throw new AppError('Join a family first', 400);
  }

  const { name, category, targetAmount, currentAmount, targetDate, notes } = req.body;

  const { owner, ownerType } = await resolveOwner(req);

  const goal = await Goal.create({
    name,
    category,
    targetAmount,
    currentAmount,
    targetDate,
    notes,
    owner,
    ownerType,
    family: req.user.family,
  });

  sendSuccess(res, goal, 'Goal created', 201);
};

/**
 * PUT /api/goals/:id
 * This is also how progress gets logged day-to-day — sending just
 * { currentAmount: 45000 } after a family deposits more savings is
 * the normal way this route gets used, not just editing the target.
 */
const updateGoal = async (req, res) => {
  const goal = await Goal.findById(req.params.id);
  if (!goal) {
    throw new AppError('Goal not found', 404);
  }

  if (req.user.role !== 'admin' && String(goal.family) !== String(req.user.family)) {
    throw new AppError('You do not have access to this goal', 403);
  }

  const isOwner = String(goal.owner) === String(req.user._id);
  if (req.user.role === 'family_member' && !isOwner) {
    throw new AppError('You can only modify your own goals', 403);
  }

  if (req.body.name !== undefined) goal.name = req.body.name;
  if (req.body.category !== undefined) goal.category = req.body.category;
  if (req.body.targetAmount !== undefined) goal.targetAmount = req.body.targetAmount;
  if (req.body.currentAmount !== undefined) goal.currentAmount = req.body.currentAmount;
  if (req.body.targetDate !== undefined) goal.targetDate = req.body.targetDate;
  if (req.body.notes !== undefined) goal.notes = req.body.notes;

  // Same "only touch ownership if both fields were actually sent" rule
  // as updateInvestment — see the comment there for why.
  if (req.body.owner !== undefined && req.body.ownerType !== undefined) {
    const resolved = await resolveOwner(req);
    goal.owner = resolved.owner;
    goal.ownerType = resolved.ownerType;
  }

  await goal.save();
  sendSuccess(res, goal, 'Goal updated');
};

/**
 * DELETE /api/goals/:id
 *
 * A real delete, not a soft one — unlike Investment, nothing else in
 * the app points at a Goal by id, so there's no dangling reference to
 * worry about (see the class comment in Goal.model.js).
 */
const deleteGoal = async (req, res) => {
  const goal = await Goal.findById(req.params.id);
  if (!goal) {
    throw new AppError('Goal not found', 404);
  }

  if (req.user.role !== 'admin' && String(goal.family) !== String(req.user.family)) {
    throw new AppError('You do not have access to this goal', 403);
  }

  const isOwner = String(goal.owner) === String(req.user._id);
  if (req.user.role === 'family_member' && !isOwner) {
    throw new AppError('You can only delete your own goals', 403);
  }

  await goal.deleteOne();
  sendSuccess(res, null, 'Goal deleted');
};

module.exports = { getGoals, getGoalById, createGoal, updateGoal, deleteGoal };
