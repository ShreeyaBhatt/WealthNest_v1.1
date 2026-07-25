/**
 * src/controllers/family.controller.js — Creating a Family & Managing Members
 *
 * A quick refresher on how families work (see Family.model.js):
 * - Only the family head (and admins) have a real WealthNest account.
 * - Every user can head AT MOST one family (User.family points at the
 *   family they created).
 * - Everyone else in the family is a FamilyMember: a profile record
 *   (name, email, age, phone, income) the head creates/edits/deletes
 *   directly — no login, no invite email, no account of their own.
 */

const Family = require('../models/Family.model');
const FamilyMember = require('../models/FamilyMember.model');
const { AppError } = require('../middleware/errorHandler');
const { sendSuccess } = require('../utils/response');
const activityLogger = require('../utils/activityLogger');

/**
 * Shared by every member-management action: loads the caller's family
 * and makes sure they're actually allowed to manage it (its head, or
 * an admin). Throws instead of returning so callers can just await it.
 */
const getManagedFamily = async (req) => {
  const family = await Family.findById(req.user.family);
  if (!family) {
    throw new AppError('You are not part of a family yet', 404);
  }

  if (req.user.role !== 'admin' && String(family.head) !== String(req.user._id)) {
    throw new AppError('Only the family head can manage members', 403);
  }

  return family;
};

/**
 * GET /api/families
 * Returns the logged-in user's own family.
 */
const getMyFamily = async (req, res) => {
  if (!req.user.family) {
    throw new AppError('You are not part of a family yet', 404);
  }

  const family = await Family.findById(req.user.family)
    .populate('members')
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
    members: [],
  });

  req.user.family = family._id;
  req.user.role = 'family_head';
  await req.user.save();

  activityLogger.emit('activity', `Family created: ${family.name} (head: ${req.user.email})`);

  sendSuccess(res, family, 'Family created', 201);
};

/**
 * POST /api/families/members
 * Creates a new FamilyMember profile and adds it to the family. Only
 * the head (or an admin) can do this.
 */
const addMember = async (req, res) => {
  const family = await getManagedFamily(req);

  const { name, email, age, phone, monthlyIncome } = req.body;

  const member = await FamilyMember.create({
    family: family._id,
    name,
    email,
    age,
    phone,
    monthlyIncome,
  });

  family.members.push(member._id);
  await family.save();

  activityLogger.emit('activity', `Family member added: ${member.name} (family: ${family.name})`);

  sendSuccess(res, member, 'Member added', 201);
};

/**
 * PUT /api/families/members/:memberId
 * Edits an existing member's profile — for when someone's name changes
 * after marriage, their age needs updating, etc.
 */
const updateMember = async (req, res) => {
  const family = await getManagedFamily(req);

  const member = await FamilyMember.findOne({ _id: req.params.memberId, family: family._id });
  if (!member) {
    throw new AppError('This member is not part of your family', 404);
  }

  if (req.body.name !== undefined) member.name = req.body.name;
  if (req.body.email !== undefined) member.email = req.body.email;
  if (req.body.age !== undefined) member.age = req.body.age;
  if (req.body.phone !== undefined) member.phone = req.body.phone;
  if (req.body.monthlyIncome !== undefined) member.monthlyIncome = req.body.monthlyIncome;

  await member.save();

  sendSuccess(res, member, 'Member updated');
};

/**
 * PUT /api/families
 * Edits the family's own details (name/description/currency).
 * Same ownership rule as the member routes: only the head of THIS
 * family (or an admin) can do it.
 */
const updateFamily = async (req, res) => {
  const family = await getManagedFamily(req);

  if (req.body.name !== undefined) family.name = req.body.name;
  if (req.body.description !== undefined) family.description = req.body.description;
  if (req.body.currency !== undefined) family.currency = req.body.currency;

  await family.save();

  sendSuccess(res, family, 'Family updated');
};

/**
 * DELETE /api/families/members/:memberId
 * Deletes a member's profile entirely — for when someone was added by
 * mistake, or (per the household's real-world circumstances) no longer
 * needs to be tracked. This is a hard delete: since investments aren't
 * wired to individual members yet, there's nothing else pointing at
 * this record that would be left dangling.
 */
const removeMember = async (req, res) => {
  const family = await getManagedFamily(req);

  const { memberId } = req.params;

  if (!family.members.some((id) => String(id) === String(memberId))) {
    throw new AppError('This member is not part of your family', 404);
  }

  const member = await FamilyMember.findByIdAndDelete(memberId);

  family.members = family.members.filter((id) => String(id) !== String(memberId));
  await family.save();

  activityLogger.emit('activity', `Family member removed: ${member?.name || 'unknown'} (family: ${family.name})`);

  sendSuccess(res, family, 'Member removed');
};

module.exports = {
  getMyFamily,
  createFamily,
  addMember,
  updateMember,
  updateFamily,
  removeMember,
};
