/**
 * src/controllers/investment.controller.js — Investment CRUD
 *
 * WHO CAN DO WHAT (from docs/API_REFERENCE.md's permission table):
 * - Everyone in a family can VIEW all of that family's investments.
 * - A family_member can only UPDATE/DELETE investments they personally own.
 * - A family_head or admin can UPDATE/DELETE any investment in the family.
 */

const Investment = require('../models/Investment.model');
const Family = require('../models/Family.model');
const FamilyMember = require('../models/FamilyMember.model');
const { AppError } = require('../middleware/errorHandler');
const { sendSuccess, sendPaginated } = require('../utils/response');
const { createNotification } = require('../utils/notify');

// Characters that mean something special inside a regular expression
// (e.g. ".", "*", "+") need to be "escaped" before we drop user-typed
// search text into a MongoDB regex — otherwise someone searching for
// "S.I.P" would accidentally match anything with 3 characters there,
// and a deliberately crafted search string could make the regex engine
// do a lot of unnecessary work.
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Figures out who an investment should be attributed to. Defaults to
 * "the logged-in head themself" when the request doesn't specify an
 * owner (this keeps the old behavior working for callers that don't
 * send owner/ownerType at all). When it IS specified, we double-check
 * it actually points at someone in the caller's own family — otherwise
 * a request could tag an investment onto a stranger's account or a
 * different family's member by guessing an ID.
 */
const resolveOwner = async (req) => {
  const { owner, ownerType } = req.body;

  if (!owner || !ownerType) {
    return { owner: req.user._id, ownerType: 'User' };
  }

  if (ownerType === 'User') {
    if (String(owner) !== String(req.user._id)) {
      throw new AppError('Investments can only be tagged to yourself or a family member', 400);
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
 * GET /api/investments
 * Lists every active investment that belongs to the caller's family.
 * Supports optional ?category=..., ?owner=..., and ?search=... filters,
 * plus paging. ?search does a case-insensitive partial match on the
 * investment name using a MongoDB regex query.
 */
const getInvestments = async (req, res) => {
  if (!req.user.family) {
    throw new AppError('Join a family first', 400);
  }

  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;

  const filter = { family: req.user.family, isActive: true };
  if (req.query.category) filter.category = req.query.category;
  if (req.query.owner) filter.owner = req.query.owner;
  if (req.query.search) {
    filter.name = { $regex: escapeRegex(req.query.search), $options: 'i' }; // 'i' = case-insensitive
  }

  const investments = await Investment.find(filter)
    .populate('owner', 'name avatar')
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(limit);

  const total = await Investment.countDocuments(filter);

  sendPaginated(res, investments, { total, page, limit });
};

/**
 * GET /api/investments/:id
 * A single investment's full detail — used by the Investment Detail page.
 */
const getInvestmentById = async (req, res) => {
  const investment = await Investment.findById(req.params.id).populate('owner', 'name avatar');
  if (!investment) {
    throw new AppError('Investment not found', 404);
  }

  if (req.user.role !== 'admin' && String(investment.family) !== String(req.user.family)) {
    throw new AppError('You do not have access to this investment', 403);
  }

  sendSuccess(res, investment);
};

/**
 * POST /api/investments
 * owner/family always come from the logged-in user's own token, never
 * from the request body — otherwise a member could add an investment
 * "owned" by someone else, or slip it into a different family.
 */
const createInvestment = async (req, res) => {
  if (!req.user.family) {
    throw new AppError('Join a family first', 400);
  }

  const {
    name,
    category,
    amount,
    currentValue,
    expectedReturn,
    purchaseDate,
    maturityDate,
    riskLevel,
    notes,
    identifier,
    sipAmount,
    sector,
  } = req.body;

  const { owner, ownerType } = await resolveOwner(req);

  const investment = await Investment.create({
    name,
    category,
    amount,
    currentValue,
    expectedReturn,
    purchaseDate,
    maturityDate,
    riskLevel,
    notes,
    identifier,
    sipAmount,
    sector,
    owner,
    ownerType,
    family: req.user.family,
  });

  // Let the family head know a regular member added something new —
  // this is a "nice to have" side effect, so if it fails we don't want
  // that to fail the whole request (createNotification handles that).
  if (req.user.role === 'family_member') {
    const family = await Family.findById(req.user.family);
    if (family) {
      await createNotification({
        user: family.head,
        family: family._id,
        type: 'investment_added',
        title: 'New investment added',
        message: `${req.user.name} added a new investment: ${investment.name}`,
        link: `/investments/${investment._id}`,
      });
    }
  }

  sendSuccess(res, investment, 'Investment added', 201);
};

/**
 * PUT /api/investments/:id
 */
const updateInvestment = async (req, res) => {
  const investment = await Investment.findById(req.params.id);
  if (!investment) {
    throw new AppError('Investment not found', 404);
  }

  // Can't touch an investment that belongs to a different family
  // (admins are the one exception — they can manage every family).
  if (req.user.role !== 'admin' && String(investment.family) !== String(req.user.family)) {
    throw new AppError('You do not have access to this investment', 403);
  }

  // A plain family_member may only edit investments they personally own.
  const isOwner = String(investment.owner) === String(req.user._id);
  if (req.user.role === 'family_member' && !isOwner) {
    throw new AppError('You can only modify your own investments', 403);
  }

  if (req.body.name !== undefined) investment.name = req.body.name;
  if (req.body.category !== undefined) investment.category = req.body.category;
  if (req.body.amount !== undefined) investment.amount = req.body.amount;
  if (req.body.currentValue !== undefined) investment.currentValue = req.body.currentValue;
  if (req.body.expectedReturn !== undefined) investment.expectedReturn = req.body.expectedReturn;
  if (req.body.purchaseDate !== undefined) investment.purchaseDate = req.body.purchaseDate;
  if (req.body.maturityDate !== undefined) investment.maturityDate = req.body.maturityDate;
  if (req.body.riskLevel !== undefined) investment.riskLevel = req.body.riskLevel;
  if (req.body.notes !== undefined) investment.notes = req.body.notes;
  if (req.body.identifier !== undefined) investment.identifier = req.body.identifier;
  if (req.body.sipAmount !== undefined) investment.sipAmount = req.body.sipAmount;
  if (req.body.sector !== undefined) investment.sector = req.body.sector;

  // Only touch ownership if the request actually sent both fields —
  // unlike createInvestment, there's no sensible "default" here, since
  // silently resetting the owner back to the head on every edit that
  // doesn't mention it would overwrite whoever it was actually set to.
  if (req.body.owner !== undefined && req.body.ownerType !== undefined) {
    const resolved = await resolveOwner(req);
    investment.owner = resolved.owner;
    investment.ownerType = resolved.ownerType;
  }

  await investment.save();
  sendSuccess(res, investment, 'Investment updated');
};

/**
 * DELETE /api/investments/:id
 *
 * This is a SOFT delete (isActive = false, document stays in the
 * database) instead of actually removing the document. We do this
 * because Transaction documents point at an investment by its id —
 * really deleting the investment would leave those transactions
 * pointing at nothing.
 */
const deleteInvestment = async (req, res) => {
  const investment = await Investment.findById(req.params.id);
  if (!investment) {
    throw new AppError('Investment not found', 404);
  }

  if (req.user.role !== 'admin' && String(investment.family) !== String(req.user.family)) {
    throw new AppError('You do not have access to this investment', 403);
  }

  const isOwner = String(investment.owner) === String(req.user._id);
  if (req.user.role === 'family_member' && !isOwner) {
    throw new AppError('You can only delete your own investments', 403);
  }

  investment.isActive = false;
  await investment.save();

  sendSuccess(res, null, 'Investment deleted');
};

module.exports = { getInvestments, getInvestmentById, createInvestment, updateInvestment, deleteInvestment };
