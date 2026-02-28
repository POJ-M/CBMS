/**
 * family.controller.js — Presence of Jesus Church BMS
 *
 * NEW IN THIS VERSION:
 *  ✅ addMember: Wife/Husband → maritalStatus auto = Married, spouseId auto-linked to head
 *  ✅ addMember: Prevents adding second spouse when head already has one
 *  ✅ addMember: Age < 18 → blocks Wife/Husband, forces maritalStatus = Single
 *  ✅ deleteFamily: soft-delete → trash (with deletedAt)
 *  ✅ restoreFamily: restore from trash (also restores members)
 *  ✅ permanentDeleteFamily: hard delete (only from trash)
 *  ✅ getTrashedFamilies: list trashed families
 */

const mongoose   = require('mongoose');
const momentTz   = require('moment-timezone');
const Family     = require('../models/Family');
const Believer   = require('../models/Believer');
const AppError   = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { TN_DISTRICTS } = require('../models/Family');

const TIMEZONE = 'Asia/Kolkata';

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const calcAgeIST = (dob) =>
  momentTz().tz(TIMEZONE).diff(momentTz(dob).tz(TIMEZONE), 'years');

const resolveOccupation = (age, provided) => (age <= 5 ? 'Child' : provided || 'Non-Worker');

/** Shared validation for believer fields (phone, baptism). Returns error string or null. */
const validateBelieverFields = (data) => {
  if (data.phone && !/^\d{10}$/.test(data.phone)) {
    return 'Phone must be exactly 10 digits.';
  }

  return null;
};

// ─── CONTROLLERS ──────────────────────────────────────────────────────────────

/**
 * @desc  Get Tamil Nadu districts list
 * @route GET /api/families/districts
 */
const getDistricts = catchAsync(async (req, res) => {
  res.status(200).json({
    success: true,
    data: TN_DISTRICTS
  });
});

/**
 * @desc  Get all families (paginated + searchable)
 * @route GET /api/families
 */
const getAllFamilies = catchAsync(async (req, res) => {
  const { page = 1, limit = 20, search = '', status, district } = req.query;
  const pageNum  = Math.max(1, Number(page));
  const limitNum = Math.min(100, Number(limit));

  const query = { isDeleted: false };
  if (status) query.familyStatus = status;
  if (district) query.district = district; // NEW: Add district filter

  let families = await Family.find(query)
    .populate('headId', 'fullName phone')
    .sort({ createdAt: -1 })
    .lean();

  if (search.trim()) {
    const term = search.trim().toLowerCase();
    families = families.filter(
  (f) =>
    f.familyCode?.toLowerCase().includes(term) ||
    f.headId?.fullName?.toLowerCase().includes(term) ||
    f.village?.toLowerCase().includes(term) ||
    f.district?.toLowerCase().includes(term), // NEW: Add district to search
);
  }

  const familiesWithCounts = await Promise.all(
    families.map(async (fam) => {
      const [totalMembers, activeCount] = await Promise.all([
        Believer.countDocuments({ familyId: fam._id, isDeleted: false }),
        Believer.countDocuments({ familyId: fam._id, isDeleted: false, membershipStatus: 'Active' }),
      ]);
      return { ...fam, totalMembers, activeCount };
    }),
  );

  const total     = familiesWithCounts.length;
  const paginated = familiesWithCounts.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  res.status(200).json({
    success: true,
    data: paginated,
    pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
  });
});

/**
 * @desc  Get single family with members
 * @route GET /api/families/:id
 */
const getFamilyById = catchAsync(async (req, res, next) => {
  const family = await Family.findOne({ _id: req.params.id, isDeleted: false })
    .populate('headId');
  if (!family) return next(new AppError('Family not found.', 404));

  const members = await Believer.find({ familyId: family._id, isDeleted: false })
    .populate('spouseId', 'fullName');

  res.status(200).json({ success: true, data: { ...family.toJSON(), members } });
});

/**
 * @desc  Create family + head believer (atomic)
 * @route POST /api/families
 */
const createFamily = catchAsync(async (req, res, next) => {
  const { address, village, familyStatus, head } = req.body;

  if (!address?.trim())           return next(new AppError('Address is required.', 400));
  if (!village?.trim())           return next(new AppError('Village is required.', 400));
  if (!district?.trim())          return next(new AppError('District is required.', 400));
  if (!TN_DISTRICTS.includes(district)) return next(new AppError('Invalid district selected.', 400));
  if (!head?.fullName?.trim())    return next(new AppError('Head full name is required.', 400));
  if (!head?.dob)                 return next(new AppError('Head date of birth is required.', 400));
  if (!head?.gender)              return next(new AppError('Head gender is required.', 400));
  if (!head?.maritalStatus)       return next(new AppError('Head marital status is required.', 400));
  if (!head?.baptized)            return next(new AppError('Head baptized status is required.', 400));
  if (!head?.memberType)          return next(new AppError('Head member type is required.', 400));
  if (!head?.occupationCategory)  return next(new AppError('Head occupation is required.', 400));

  const err = validateBelieverFields(head);
  if (err) return next(new AppError(err, 400));

  const age = calcAgeIST(head.dob);

  // Age < 18: force Single
  let maritalStatus = age < 18 ? 'Single' : head.maritalStatus;
  const weddingDate = maritalStatus === 'Married' ? head.weddingDate : undefined;
  const spouseName  = maritalStatus === 'Married' ? head.spouseName  : undefined;

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const [family] = await Family.create(
      [{ address: address.trim(), village: village.trim(), district: district.trim(),familyStatus: familyStatus || 'Active' }],
      { session },
    );

    const headData = {
      familyId:           family._id,
      isHead:             true,
      relationshipToHead: 'Self',
      fullName:           head.fullName.trim(),
      dob:                head.dob,
      gender:             head.gender,
      phone:              head.phone   || undefined,
      email:              head.email?.trim() || undefined,
      maritalStatus,
      memberType:         head.memberType,
      membershipStatus:   head.membershipStatus || 'Active',
      joinDate:           head.joinDate || undefined,
      baptized:           head.baptized,
      baptizedDate:       head.baptized === 'Yes' ? head.baptizedDate : null,
      weddingDate,
      spouseName,
      occupationCategory: resolveOccupation(age, head.occupationCategory),
    };

    if (head.occupationCategory === 'Student' && head.educationLevel) {
      headData.educationLevel = head.educationLevel;
    }

    const [headBeliever] = await Believer.create([headData], { session });

    family.headId = headBeliever._id;
    await family.save({ session });
    await session.commitTransaction();

    res.status(201).json({ success: true, message: 'Family created.', data: { family, head: headBeliever } });
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
});

/**
 * @desc  Update family details
 * @route PUT /api/families/:id
 */
const updateFamily = catchAsync(async (req, res, next) => {
  const { address, village, familyStatus } = req.body;
  const upd = {};
  if (address      !== undefined) upd.address      = address.trim();
  if (village      !== undefined) upd.village      = village.trim();
  if (district !== undefined) {
    if (!district.trim()) return next(new AppError('District cannot be empty.', 400));
    if (!TN_DISTRICTS.includes(district)) return next(new AppError('Invalid district selected.', 400));
    upd.district = district.trim();
  }
  if (familyStatus !== undefined) upd.familyStatus = familyStatus;

  const family = await Family.findOneAndUpdate(
    { _id: req.params.id, isDeleted: false },
    upd,
    { new: true, runValidators: true },
  );
  if (!family) return next(new AppError('Family not found.', 404));

  res.status(200).json({ success: true, message: 'Family updated.', data: family });
});

/**
 * @desc  Soft-delete family → Trash
 * @route DELETE /api/families/:id
 */
const deleteFamily = catchAsync(async (req, res, next) => {
  const family = await Family.findOne({ _id: req.params.id, isDeleted: false });
  if (!family) return next(new AppError('Family not found.', 404));

  const now = new Date();
  family.isDeleted = true;
  family.deletedAt = now;
  // FIX #3: familyCode will be cleared automatically by the pre-save hook
  await family.save();

  // Soft-delete all members too
  await Believer.updateMany(
    { familyId: family._id, isDeleted: false },
    { $set: { isDeleted: true, deletedAt: now } },
  );

  res.status(200).json({ success: true, message: 'Family moved to trash.' });
});

/**
 * @desc  Get trashed families
 * @route GET /api/families/trash
 */
const getTrashedFamilies = catchAsync(async (req, res) => {
  const families = await Family.find({ isDeleted: true })
    .populate('headId', 'fullName')
    .sort({ deletedAt: -1 });

  res.status(200).json({ success: true, data: families, total: families.length });
});

/**
 * @desc  Restore family from trash
 * @route PATCH /api/families/:id/restore
 */
const restoreFamily = catchAsync(async (req, res, next) => {
  const family = await Family.findOne({ _id: req.params.id, isDeleted: true });
  if (!family) return next(new AppError('Trashed family not found.', 404));

  // FIX #3: Generate new family code for restored family
  const count = await Family.countDocuments({ isDeleted: false });
  const newFamilyCode = `FAM-${String(count + 1).padStart(4, '0')}`;

  family.isDeleted = false;
  family.deletedAt = undefined;
  family.familyCode = newFamilyCode; // Assign new code
  await family.save();

  // Restore all members that were trashed with this family
  await Believer.updateMany(
    { familyId: family._id, isDeleted: true },
    { $set: { isDeleted: false }, $unset: { deletedAt: '' } },
  );

  res.status(200).json({ 
    success: true, 
    message: `Family restored with new code: ${newFamilyCode}` 
  });
});

/**
 * @desc  Permanently delete family (only from trash)
 * @route DELETE /api/families/:id/permanent
 */
const permanentDeleteFamily = catchAsync(async (req, res, next) => {
  const family = await Family.findOne({ _id: req.params.id, isDeleted: true });
  if (!family) return next(new AppError('Family not found in trash.', 404));

  await Believer.deleteMany({ familyId: family._id });
  await Family.findByIdAndDelete(family._id);

  res.status(200).json({ success: true, message: `Family ${family.familyCode} permanently deleted.` });
});

/**
 * @desc  Add member to family
 * @route POST /api/families/:id/members
 *
 * KEY RULES:
 *  - Wife/Husband → maritalStatus auto = Married, spouseId ↔ head auto-linked
 *  - Prevents second spouse to same head (409 conflict)
 *  - Age < 18 → blocks Wife/Husband, forces Single, no wedding fields
 */
const addMember = catchAsync(async (req, res, next) => {
  const family = await Family.findOne({ _id: req.params.id, isDeleted: false });
  if (!family) return next(new AppError('Family not found.', 404));

  const data = req.body;

  // Required fields
  if (!data.fullName?.trim())         return next(new AppError('Full name is required.', 400));
  if (!data.dob)                       return next(new AppError('Date of birth is required.', 400));
  if (!data.gender)                    return next(new AppError('Gender is required.', 400));
  if (!data.relationshipToHead || data.relationshipToHead === 'Self') {
    return next(new AppError('A valid relationship to head is required.', 400));
  }
  if (data.relationshipToHead === 'Other' && !data.relationCustom?.trim()) {
    return next(new AppError('Custom relation is required when "Other" is selected.', 400));
  }
  if (!data.memberType)                return next(new AppError('Member type is required.', 400));
  if (!data.occupationCategory)        return next(new AppError('Occupation is required.', 400));

  const validErr = validateBelieverFields(data);
  if (validErr) return next(new AppError(validErr, 400));

  const age = calcAgeIST(data.dob);
  const isSpouseRelation = ['Wife', 'Husband'].includes(data.relationshipToHead);

  // ── AGE < 18 ─────────────────────────────────────────────────────────────
  if (age < 18) {
    if (isSpouseRelation) {
      return next(new AppError('A person under 18 cannot be added as Wife or Husband.', 400));
    }
    // Force Single
    data.maritalStatus = 'Single';
    data.spouseId      = null;
    data.spouseName    = undefined;
    data.weddingDate   = undefined;
  }

  // ── WIFE / HUSBAND LOGIC ─────────────────────────────────────────────────
  let autoLinkedSpouse = false;

  if (isSpouseRelation && age >= 18) {
    // Auto-set maritalStatus to Married
    data.maritalStatus = 'Married';

    // Load head to check for existing spouse
    const head = await Believer.findById(family.headId);
    if (!head) return next(new AppError('Family head not found.', 404));

    if (head.spouseId) {
      const existingSpouse = await Believer.findById(head.spouseId).select('fullName');
      return next(
        new AppError(
          `The family head already has a linked spouse ("${existingSpouse?.fullName || 'unknown'}"). Cannot add another.`,
          409,
        ),
      );
    }

    autoLinkedSpouse = true;
    // weddingDate optional — keep whatever was sent (or null)
  } else if (!isSpouseRelation && age >= 18) {
    // Normal member — require maritalStatus
    if (!data.maritalStatus) {
      return next(new AppError('Marital status is required.', 400));
    }
    if (data.maritalStatus === 'Married' && !data.spouseId && !data.spouseName) {
      return next(new AppError('Spouse ID or spouse name is required for Married status.', 400));
    }
  }

  // Sanitize spouseId
  let spouseId = null;
  if (!autoLinkedSpouse && data.spouseId && data.spouseId !== '') {
    spouseId = data.spouseId;
  }

  // ── CREATE MEMBER ─────────────────────────────────────────────────────────
  const memberData = {
    familyId:           family._id,
    isHead:             false,
    fullName:           data.fullName.trim(),
    dob:                data.dob,
    gender:             data.gender,
    phone:              data.phone || undefined,
    email:              data.email?.trim() || undefined,
    memberType:         data.memberType,
    membershipStatus:   data.membershipStatus || 'Active',
    joinDate:           data.joinDate || undefined,
    baptized:           data.baptized,
    baptizedDate:       data.baptized === 'Yes' ? data.baptizedDate : null,
    relationshipToHead: data.relationshipToHead,
    relationCustom:     data.relationshipToHead === 'Other' ? data.relationCustom?.trim() : undefined,
    maritalStatus:      data.maritalStatus || 'Single',
    spouseId,
    spouseName:         data.spouseName || undefined,
    weddingDate:        data.maritalStatus === 'Married' && data.weddingDate ? data.weddingDate : undefined,
    occupationCategory: resolveOccupation(age, data.occupationCategory),
  };

  if (data.occupationCategory === 'Student' && data.educationLevel) {
    memberData.educationLevel = data.educationLevel;
  }

  const member = await Believer.create(memberData);

  // ── AUTO-LINK SPOUSE ──────────────────────────────────────────────────────
  if (autoLinkedSpouse) {
    const head = await Believer.findById(family.headId);

    // Update new member: spouseId = head
    await Believer.findByIdAndUpdate(member._id, {
      spouseId:  family.headId,
      spouseName: head?.fullName,
    });

    // Update head: spouseId = new member
    await Believer.findByIdAndUpdate(family.headId, {
      spouseId:     member._id,
      spouseName:   member.fullName,
      maritalStatus: 'Married',
    });
  } else if (spouseId) {
    // Regular cross-reference for non-head spouse
    await Believer.findByIdAndUpdate(spouseId, { spouseId: member._id });
  }

  res.status(201).json({ success: true, message: 'Member added successfully.', data: member });
});

/**
 * @desc  Assign new head to family
 * @route PUT /api/families/:familyId/assign-head
 */
const assignNewHead = catchAsync(async (req, res, next) => {
  const { newHeadId } = req.body;
  if (!newHeadId) return next(new AppError('New head believer ID is required.', 400));

  const family = await Family.findOne({ _id: req.params.familyId, isDeleted: false });
  if (!family) return next(new AppError('Family not found.', 404));

  const newHead = await Believer.findOne({
    _id: newHeadId, familyId: family._id, isDeleted: false,
  });
  if (!newHead) return next(new AppError('Believer not found in this family.', 404));

  if (family.headId) {
    await Believer.findByIdAndUpdate(family.headId, { isHead: false });
  }

  newHead.isHead             = true;
  newHead.relationshipToHead = 'Self';
  await newHead.save();

  family.headId = newHead._id;
  await family.save();

  res.status(200).json({
    success: true,
    message: `${newHead.fullName} is now the family head.`,
    data: { family, newHead },
  });
});

module.exports = {
  getDistricts,
  getAllFamilies,
  getFamilyById,
  createFamily,
  updateFamily,
  deleteFamily,
  getTrashedFamilies,
  restoreFamily,
  permanentDeleteFamily,
  addMember,
  assignNewHead,
};