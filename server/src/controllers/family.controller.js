/**
 * src/controllers/family.controller.js — Creating a Family & Inviting Members
 *
 * A quick refresher on how families work (see Family.model.js):
 * - Every user can belong to AT MOST one family (User.family is a single
 *   reference, not a list).
 * - The person who creates a family becomes its "head" and their role
 *   changes from family_member to family_head.
 * - Inviting someone who already has an account adds them straight to
 *   the family. Inviting someone who doesn't have an account yet stores
 *   their email in pendingInvites — when they eventually register with
 *   that email, auth.controller.js#register joins them automatically.
 */

const { v4: uuidv4 } = require('uuid');
const Family = require('../models/Family.model');
const User = require('../models/User.model');
const { AppError } = require('../middleware/errorHandler');
const { sendSuccess } = require('../utils/response');
const { createNotification } = require('../utils/notify');
const { sendInviteEmail } = require('../utils/email');
const activityLogger = require('../utils/activityLogger');

/**
 * GET /api/families
 * Returns the logged-in user's own family.
 */
const getMyFamily = async (req, res) => {
  if (!req.user.family) {
    throw new AppError('You are not part of a family yet', 404);
  }

  const family = await Family.findById(req.user.family)
    .populate('members', 'name email avatar role')
    .populate('head', 'name email');

  sendSuccess(res, family);
};

/**
 * POST /api/families
 *
 * Note: this route is NOT gated with authorize('admin', 'family_head')
 * in family.routes.js, even though the permission table says only
 * admins/heads can "create a family". That's on purpose — every user
 * starts out as a plain family_member with no family, so somebody has
 * to be allowed to create the very first family and become its head.
 * We enforce the real rule here instead: you can only create a family
 * if you don't already belong to one.
 */
const createFamily = async (req, res) => {
  if (req.user.family) {
    throw new AppError('You already belong to a family', 400);
  }

  const { name, description, currency } = req.body;

  const family = await Family.create({
    name,
    description,
    currency,
    head: req.user._id,
    members: [req.user._id],
  });

  req.user.family = family._id;
  req.user.role = 'family_head';
  await req.user.save();

  activityLogger.emit('activity', `Family created: ${family.name} (head: ${req.user.email})`);

  sendSuccess(res, family, 'Family created', 201);
};

/**
 * POST /api/families/invite
 * Only the head of the family (or an admin) can invite people —
 * see the authorize('admin', 'family_head') check in family.routes.js.
 */
const inviteMember = async (req, res) => {
  const { email } = req.body;

  const family = await Family.findById(req.user.family);
  if (!family) {
    throw new AppError('You are not part of a family yet', 404);
  }

  // A family_head can only invite people into THEIR OWN family — this
  // stops someone from guessing another family's id and inviting into it.
  if (req.user.role !== 'admin' && String(family.head) !== String(req.user._id)) {
    throw new AppError('Only the family head can invite members', 403);
  }

  const existingUser = await User.findOne({ email });

  // ── Case 1: this email already has an account ──
  if (existingUser) {
    if (existingUser.family && String(existingUser.family) === String(family._id)) {
      throw new AppError('This user is already a member of the family', 400);
    }
    if (existingUser.family) {
      throw new AppError('This user already belongs to another family', 400);
    }

    family.members.push(existingUser._id);
    await family.save();

    existingUser.family = family._id;
    await existingUser.save();

    await createNotification({
      user: existingUser._id,
      family: family._id,
      type: 'invite',
      title: 'Added to family',
      message: `You've been added to ${family.name}`,
    });

    await createNotification({
      user: family.head,
      family: family._id,
      type: 'family_joined',
      title: 'New family member',
      message: `${existingUser.name} joined ${family.name}`,
    });

    return sendSuccess(res, family, 'Member added to family');
  }

  // ── Case 2: nobody has registered with this email yet ──
  const alreadyInvited = family.pendingInvites.some((invite) => invite.email === email);
  if (alreadyInvited) {
    throw new AppError('An invite has already been sent to this email', 400);
  }

  family.pendingInvites.push({ email, token: uuidv4() });
  await family.save();

  await sendInviteEmail(email, family.name);

  sendSuccess(res, family, 'Invitation sent');
};

/**
 * PUT /api/families
 * Edits the family's own details (name/description/currency).
 * Same ownership rule as inviteMember: only the head of THIS family
 * (or an admin) can do it.
 */
const updateFamily = async (req, res) => {
  const family = await Family.findById(req.user.family);
  if (!family) {
    throw new AppError('You are not part of a family yet', 404);
  }

  if (req.user.role !== 'admin' && String(family.head) !== String(req.user._id)) {
    throw new AppError('Only the family head can edit family details', 403);
  }

  if (req.body.name !== undefined) family.name = req.body.name;
  if (req.body.description !== undefined) family.description = req.body.description;
  if (req.body.currency !== undefined) family.currency = req.body.currency;

  await family.save();

  sendSuccess(res, family, 'Family updated');
};

/**
 * DELETE /api/families/members/:userId
 * Removes a member from the family. The head can't be removed this
 * way — transferring or dissolving a family is a separate concern we
 * don't support yet, so we just block it outright.
 */
const removeMember = async (req, res) => {
  const family = await Family.findById(req.user.family);
  if (!family) {
    throw new AppError('You are not part of a family yet', 404);
  }

  if (req.user.role !== 'admin' && String(family.head) !== String(req.user._id)) {
    throw new AppError('Only the family head can remove members', 403);
  }

  const { userId } = req.params;

  if (String(family.head) === String(userId)) {
    throw new AppError('The family head cannot be removed', 400);
  }

  if (!family.members.some((memberId) => String(memberId) === String(userId))) {
    throw new AppError('This user is not a member of the family', 404);
  }

  family.members = family.members.filter((memberId) => String(memberId) !== String(userId));
  await family.save();

  const removedUser = await User.findById(userId);
  if (removedUser) {
    removedUser.family = null;
    await removedUser.save();

    await createNotification({
      user: removedUser._id,
      type: 'family_removed',
      title: 'Removed from family',
      message: `You've been removed from ${family.name}`,
    });
  }

  activityLogger.emit('activity', `${removedUser?.name || 'A member'} removed from family: ${family.name}`);

  sendSuccess(res, family, 'Member removed');
};

/**
 * DELETE /api/families/invites/:email
 * Cancels a pending invite that hasn't been accepted yet — for when
 * you invited the wrong address or someone changed their mind.
 */
const cancelInvite = async (req, res) => {
  const family = await Family.findById(req.user.family);
  if (!family) {
    throw new AppError('You are not part of a family yet', 404);
  }

  if (req.user.role !== 'admin' && String(family.head) !== String(req.user._id)) {
    throw new AppError('Only the family head can cancel invites', 403);
  }

  const email = decodeURIComponent(req.params.email);
  const before = family.pendingInvites.length;
  family.pendingInvites = family.pendingInvites.filter((invite) => invite.email !== email);

  if (family.pendingInvites.length === before) {
    throw new AppError('No pending invite found for this email', 404);
  }

  await family.save();

  sendSuccess(res, family, 'Invite cancelled');
};

module.exports = {
  getMyFamily,
  createFamily,
  inviteMember,
  updateFamily,
  removeMember,
  cancelInvite,
};
