const Believer = require('../models/Believer');
const Family = require('../models/Family');
const catchAsync = require('../utils/catchAsync');
const { calcAge } = require('../utils/helpers');

/**
 * @desc    Get all church analytics (age, gender, baptism, village)
 * @route   GET /api/analytics
 * @access  Private (Admin)
 */
const getAnalytics = catchAsync(async (req, res) => {
  // Fetch lean data for performance
  const [believers, families] = await Promise.all([
    Believer.find({ isDeleted: false })
      .populate('familyId', 'village')
      .lean(),
    Family.find({ isDeleted: false }).lean(),
  ]);

  // ── Age Distribution ──────────────────────────────────────────
  const ageDistribution = { children: 0, youth: 0, adults: 0, seniors: 0 };
  believers.forEach((b) => {
    const age = calcAge(b.dob);
    if (age === null) return;
    if (age <= 12) ageDistribution.children++;
    else if (age <= 29) ageDistribution.youth++;
    else if (age <= 59) ageDistribution.adults++;
    else ageDistribution.seniors++;
  });

  // ── Gender Distribution ───────────────────────────────────────
  const genderDistribution = { male: 0, female: 0, other: 0 };
  believers.forEach((b) => {
    if (b.gender === 'Male') genderDistribution.male++;
    else if (b.gender === 'Female') genderDistribution.female++;
    else genderDistribution.other++;
  });

  // ── Baptism Analytics ─────────────────────────────────────────
  const totalBaptized = believers.filter((b) => b.baptized === 'Yes').length;
  const notBaptized = believers.length - totalBaptized;
  // Eligible: age > 15 and not yet baptized
  const eligibleNotBaptized = believers.filter(
    (b) => calcAge(b.dob) > 15 && b.baptized === 'No'
  ).length;

  const baptismAnalytics = {
    totalBaptized,
    notBaptized,
    baptismRate:
      believers.length > 0
        ? Number(((totalBaptized / believers.length) * 100).toFixed(1))
        : 0,
    eligibleNotBaptized,
  };

  // ── Village Analytics ─────────────────────────────────────────
  // Members per village
  const membersByVillage = {};
  believers.forEach((b) => {
    const vil = b.familyId?.village || 'Unknown';
    membersByVillage[vil] = (membersByVillage[vil] || 0) + 1;
  });

  // Families per village
  const familiesByVillage = {};
  families.forEach((f) => {
    familiesByVillage[f.village] = (familiesByVillage[f.village] || 0) + 1;
  });

  // Combine into sorted array
  const allVillages = Object.entries(membersByVillage)
    .map(([village, members]) => ({
      village,
      members,
      families: familiesByVillage[village] || 0,
    }))
    .sort((a, b) => b.members - a.members);

  const villageAnalytics = {
    allVillages,
    top5: allVillages.slice(0, 5),
  };

  res.status(200).json({
    success: true,
    data: {
      ageDistribution,
      genderDistribution,
      baptismAnalytics,
      villageAnalytics,
    },
  });
});

module.exports = { getAnalytics };