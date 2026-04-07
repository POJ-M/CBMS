const momentTz   = require('moment-timezone');
const Believer   = require('../models/Believer');
const Family     = require('../models/Family');
const AppError   = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { calcAge } = require('../utils/helpers');

const TIMEZONE = 'Asia/Kolkata';

// ─── EDITABLE FIELDS WHITELIST ────────────────────────────────────────────────
const EDITABLE_FIELDS = [
  'fullName','tamilName', 'dob', 'gender', 'phone', 'email',
  'memberType', 'membershipStatus', 'joinDate',
  'baptized', 'baptizedDate',
  'maritalStatus', 'weddingDate', 'spouseId', 'spouseName',
  'occupationCategory', 'educationLevel',
];
const LOCKED_FIELDS = ['familyId', 'isHead', 'relationshipToHead'];

const sanitizeUpdateData = (raw) => {
  const data = {};
  EDITABLE_FIELDS.forEach((key) => {
    if (raw[key] === undefined) return;
    if (key === 'spouseId') {
      data[key] = raw[key] === '' || raw[key] === 'null' ? null : raw[key];
    } else if (key === 'educationLevel') {
      if (raw[key] !== '') data[key] = raw[key];
    } else if (key === 'weddingDate') {
      if (raw[key] !== '') data[key] = raw[key];
    } else {
      data[key] = raw[key];
    }
  });
  return data;
};

const calcAgeIST = (dob) =>
  momentTz().tz(TIMEZONE).diff(momentTz(dob).tz(TIMEZONE), 'years');

// ─── CONTROLLERS ──────────────────────────────────────────────────────────────

/**
 * @desc  Get all active believers (filtered + paginated)
 * @route GET /api/believers
 *
 * KEY CHANGE: familyId is now populated with headId.fullName so the
 * frontend can render "Son of Samuel Raj" in the Relation column
 * without any extra API calls.
 */
const getAllBelievers = catchAsync(async (req, res) => {
  const {
    page = 1, limit = 20,
    membershipStatus, memberType, gender, maritalStatus,
    baptized, occupationCategory, village, isHead, search,
    sortBy = 'name', sortDir = 'asc',
  } = req.query;

  const pageNum  = Math.max(1, Number(page));
  const limitNum = Math.min(100, Math.max(1, Number(limit)));
  const dir      = sortDir === 'desc' ? -1 : 1;

  let sortObj;
  if (sortBy === 'age') {
    sortObj = { dob: dir };
  } else {
    sortObj = { fullName: dir };
  }

  const query = { isDeleted: false };
  if (membershipStatus)  query.membershipStatus  = membershipStatus;
  if (memberType)        query.memberType        = memberType;
  if (gender)            query.gender            = gender;
  if (maritalStatus)     query.maritalStatus     = maritalStatus;
  if (baptized)          query.baptized          = baptized;
  if (occupationCategory) query.occupationCategory = occupationCategory;
  if (isHead !== undefined) query.isHead         = isHead === 'true';
  if (search?.trim())    query.fullName          = { $regex: search.trim(), $options: 'i' };

  if (village?.trim()) {
    const matchingFamilies = await Family.find({
      village: { $regex: village.trim(), $options: 'i' },
      isDeleted: false,
    }).select('_id');
    query.familyId = { $in: matchingFamilies.map((f) => f._id) };
  }

  const [total, believers] = await Promise.all([
    Believer.countDocuments(query),
    Believer.find(query)
      // ── CHANGED: also populate headId so front-end gets head's fullName ──
      .populate({
        path: 'familyId',
        select: 'familyCode village address headId',
        populate: { path: 'headId', select: 'fullName' },
      })
      .populate('spouseId', 'fullName')
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .sort(sortObj),
  ]);

  res.status(200).json({
    success: true,
    data: believers,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
      sortBy,
      sortDir,
    },
  });
});

/**
 * @desc  Get single believer by ID
 * @route GET /api/believers/:id
 */
const getBelieverById = catchAsync(async (req, res, next) => {
  const believer = await Believer.findOne({ _id: req.params.id, isDeleted: false })
    .populate({
      path: 'familyId',
      select: 'familyCode village address headId',
      populate: { path: 'headId', select: 'fullName' },
    })
    .populate('spouseId', 'fullName tamilName dob gender');

  if (!believer) return next(new AppError('Believer not found.', 404));
  res.status(200).json({ success: true, data: believer });
});

/**
 * @desc  Update believer
 * @route PUT /api/believers/:id
 */
const updateBeliever = catchAsync(async (req, res, next) => {
  const attemptedLocked = LOCKED_FIELDS.filter((f) => req.body[f] !== undefined);
  if (attemptedLocked.length > 0) {
    return next(new AppError(`Cannot edit: ${attemptedLocked.join(', ')}.`, 400));
  }

  const updateData = sanitizeUpdateData(req.body);

  if (updateData.phone && !/^\d{10}$/.test(updateData.phone)) {
    return next(new AppError('Phone number must be exactly 10 digits.', 400));
  }

  if (updateData.dob) {
    const age = calcAge(updateData.dob);
    if (age < 18) {
      updateData.maritalStatus = 'Single';
      updateData.spouseId      = null;
      delete updateData.weddingDate;
    }
  } else {
    const current = await Believer.findById(req.params.id).select('dob familyId isHead');
    if (!current) return next(new AppError('Believer not found.', 404));
    const age = calcAge(current.dob);
    if (age < 18) {
      updateData.maritalStatus = 'Single';
      updateData.spouseId      = null;
      delete updateData.weddingDate;
    }
  }

  if (updateData.baptized === 'No') {
    updateData.baptizedDate = null;
  }

  const believer = await Believer.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    updateData,
    { new: true, runValidators: true }
  )
    .populate({
      path: 'familyId',
      select: 'familyCode village address headId',
      populate: { path: 'headId', select: 'fullName' },
    })
    .populate('spouseId', 'fullName');

  if (!believer) return next(new AppError('Believer not found.', 404));

  if (updateData.spouseId) {
    await Believer.findByIdAndUpdate(updateData.spouseId, { spouseId: believer._id });
  } else if (updateData.spouseId === null) {
    const old = await Believer.findById(req.params.id);
    if (old?.spouseId) {
      await Believer.findByIdAndUpdate(old.spouseId, { spouseId: null });
    }
  }

  res.status(200).json({ success: true, message: 'Believer updated successfully.', data: believer });
});

/**
 * @desc  Soft-delete → move to Trash
 * @route DELETE /api/believers/:id
 */
const deleteBeliever = catchAsync(async (req, res, next) => {
  const believer = await Believer.findOne({ _id: req.params.id, isDeleted: false });
  if (!believer) return next(new AppError('Believer not found.', 404));

  if (believer.isHead) {
    return res.status(409).json({
      success: false,
      code: 'IS_HEAD',
      message: 'This member is the family head. Assign a new head before deleting.',
    });
  }

  believer.isDeleted = true;
  believer.deletedAt = new Date();
  await believer.save();

  if (believer.spouseId) {
    await Believer.findByIdAndUpdate(believer.spouseId, {
      spouseId: null, spouseName: believer.fullName,
    });
  }

  res.status(200).json({ success: true, message: 'Believer moved to trash.' });
});

/**
 * @desc  Get all trashed believers
 * @route GET /api/believers/trash
 */
const getTrashedBelievers = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  const pageNum  = Math.max(1, Number(page));
  const limitNum = Math.min(100, Number(limit));

  const query = { isDeleted: true };
  if (search?.trim()) query.fullName = { $regex: search.trim(), $options: 'i' };

  const [total, believers] = await Promise.all([
    Believer.countDocuments(query),
    Believer.find(query)
      .populate('familyId', 'familyCode village')
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .sort({ deletedAt: -1 }),
  ]);

  res.status(200).json({
    success: true,
    data: believers,
    pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
  });
});

/**
 * @desc  Restore believer from trash
 * @route PATCH /api/believers/:id/restore
 */
const restoreBeliever = catchAsync(async (req, res, next) => {
  const believer = await Believer.findOne({ _id: req.params.id, isDeleted: true });
  if (!believer) return next(new AppError('Trashed believer not found.', 404));

  const family = await Family.findOne({ _id: believer.familyId, isDeleted: false });
  if (!family) {
    return next(new AppError(
      'Cannot restore: this believer\'s family is also in trash. Restore the family first.',
      409,
    ));
  }

  believer.isDeleted = false;
  believer.deletedAt = undefined;
  await believer.save();

  res.status(200).json({ success: true, message: `${believer.fullName} restored successfully.` });
});

/**
 * @desc  Permanently delete (only from trash)
 * @route DELETE /api/believers/:id/permanent
 */
const permanentDeleteBeliever = catchAsync(async (req, res, next) => {
  const believer = await Believer.findOne({ _id: req.params.id, isDeleted: true });
  if (!believer) {
    return next(new AppError('Believer not found in trash. Only trashed records can be permanently deleted.', 404));
  }
  await Believer.findByIdAndDelete(req.params.id);
  res.status(200).json({ success: true, message: `${believer.fullName} permanently deleted.` });
});

/**
 * @desc  Empty all believer trash
 * @route DELETE /api/believers/trash/empty
 */
const emptyBelieverTrash = catchAsync(async (req, res) => {
  const result = await Believer.deleteMany({ isDeleted: true });
  res.status(200).json({
    success: true,
    message: `${result.deletedCount} believer(s) permanently deleted from trash.`,
    count: result.deletedCount,
  });
});

module.exports = {
  getAllBelievers,
  getBelieverById,
  updateBeliever,
  deleteBeliever,
  getTrashedBelievers,
  restoreBeliever,
  permanentDeleteBeliever,
  emptyBelieverTrash,
};
