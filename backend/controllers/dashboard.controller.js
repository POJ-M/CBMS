const Believer = require('../models/Believer');
const Family = require('../models/Family');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { nowIST, isWithinNextDays } = require('../utils/helpers');

/**
 * @desc    Get all dashboard statistics and upcoming reminders
 * @route   GET /api/dashboard
 * @access  Private (Admin)
 */
const getDashboardStats = catchAsync(async (req, res) => {
  // --- Parallel DB queries for performance ---
  const [
    totalFamilies,
    totalBelievers,
    activeMembers,
    youthCount,
    childrenCount,
    studentsCount,
    baptizedCount,
    marriedCount,
    allBelieversForReminders,
  ] = await Promise.all([
    Family.countDocuments({ isDeleted: false }),
    Believer.countDocuments({ isDeleted: false }),
    Believer.countDocuments({ isDeleted: false, membershipStatus: 'Active' }),
    Believer.countDocuments({ isDeleted: false, memberType: 'Youth' }),
    Believer.countDocuments({ isDeleted: false, memberType: 'Child' }),
    Believer.countDocuments({ isDeleted: false, occupationCategory: 'Student' }),
    Believer.countDocuments({ isDeleted: false, baptized: 'Yes' }),
    Believer.countDocuments({ isDeleted: false, maritalStatus: 'Married' }),
    // Fetch with spouse populated for anniversary display
    Believer.find({ isDeleted: false }, 'fullName dob weddingDate maritalStatus spouseId spouseName')
      .populate('spouseId', 'fullName')
      .lean(),
  ]);

  const employedCount = await Believer.countDocuments({
    isDeleted: false,
    occupationCategory: { $in: ['Employed', 'Self-Employed', 'Business', 'Agriculture ', 'Daily wages'] },
  });

  // --- Reminder: Upcoming birthdays in next 7 days (IST-aware) ---
  const upcomingBirthdays = allBelieversForReminders
    .filter((b) => b.dob && isWithinNextDays(b.dob, 7))
    .map((b) => ({ name: b.fullName, dob: b.dob }));

  // --- Reminder: Upcoming wedding anniversaries in next 7 days ---
  // Show couple names (Husband — Wife format)
  const anniversariesRaw = allBelieversForReminders
    .filter((b) => b.weddingDate && b.maritalStatus === 'Married' && isWithinNextDays(b.weddingDate, 7));

  // De-duplicate couples (if both husband and wife are in the list, show only once)
  const seen = new Set();
  const upcomingAnniversaries = [];

  for (const b of anniversariesRaw) {
    const myId = b._id?.toString();
    const partnerId = 
      (b.spouseId && typeof b.spouseId === 'object' 
        ? b.spouseId._id?.toString() 
        : b.spouseId?.toString()) || null;

    let pairKey;
    if (partnerId) {
      pairKey = [myId, partnerId].sort().join('|');
    } else {
      pairKey = myId;
    }

    if (seen.has(pairKey)) continue;
    seen.add(pairKey);

    // Format couple name
    const spouseName = 
      (b.spouseId && typeof b.spouseId === 'object' ? b.spouseId.fullName : null) ||
      b.spouseName || 
      null;

    const coupleName = spouseName 
      ? `${b.fullName} — ${spouseName}`
      : b.fullName;

    upcomingAnniversaries.push({
      name: b.fullName,          // Keep for backward compatibility
      coupleName,                 // New field with couple format
      weddingDate: b.weddingDate
    });
  }

  res.status(200).json({
    success: true,
    data: {
      totalFamilies,
      totalBelievers,
      activeMembers,
      youthCount,
      childrenCount,
      marriedCouples: Math.floor(marriedCount / 2),
      studentsCount,
      employedCount,
      baptizedPercentage:
        totalBelievers > 0
          ? Number(((baptizedCount / totalBelievers) * 100).toFixed(1))
          : 0,
      upcomingBirthdays,
      upcomingAnniversaries,
    },
  });
});

module.exports = { getDashboardStats };