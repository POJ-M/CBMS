// backend/services/wishes.service.js
// Complete file with selective sending

const momentTz = require('moment-timezone');
const Believer = require('../models/Believer');
const { sendBirthdayEmail, sendAnniversaryEmail } = require('./email.service');
const { sendBirthdaySMS, sendAnniversarySMS } = require('./sms.service');

const TIMEZONE = 'Asia/Kolkata';

/**
 * Get birthdays for a specific date
 * Populated with family head info for phone fallback
 */
const getBirthdaysForDate = async (date) => {
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const believers = await Believer.find({
    isDeleted: false,
    membershipStatus: { $in: ['Active', 'Inactive'] },
    dob: { $exists: true, $ne: null },
    $expr: {
      $and: [
        { $eq: [{ $month: '$dob' }, month] },
        { $eq: [{ $dayOfMonth: '$dob' }, day] },
      ],
    },
  })
    .populate('familyId', 'village headId')
    .populate({
      path: 'familyId',
      populate: {
        path: 'headId',
        select: 'fullName phone'  // ✅ Get head's phone for fallback
      }
    });

  return believers;
};

/**
 * Get anniversaries for a specific date
 */
const getAnniversariesForDate = async (date) => {
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const believers = await Believer.find({
    isDeleted: false,
    membershipStatus: { $in: ['Active', 'Inactive'] },
    maritalStatus: 'Married',
    weddingDate: { $exists: true, $ne: null },
    $expr: {
      $and: [
        { $eq: [{ $month: '$weddingDate' }, month] },
        { $eq: [{ $dayOfMonth: '$weddingDate' }, day] },
      ],
    },
  })
    .populate('spouseId', 'fullName tamilName')
    .populate('familyId', 'village headId')
    .populate({
      path: 'familyId',
      populate: {
        path: 'headId',
        select: 'fullName phone'
      }
    });

  return believers;
};

/**
 * Send wishes to selected believers
 * believerIds: Array of believer IDs to send wishes to
 * type: 'birthday' or 'anniversary'
 */
const sendWishesToSelected = async (believerIds, type) => {
  const results = {
    total: believerIds.length,
    emailSuccess: 0,
    emailFailed: 0,
    emailSkipped: 0,
    smsSuccess: 0,
    smsFailed: 0,
    smsSkipped: 0,
    smsViaHead: 0,
    errors: [],
    logs: [],
  };

  // Fetch believers with family head info
  const believers = await Believer.find({
    _id: { $in: believerIds },
    isDeleted: false,
  })
    .populate('spouseId', 'fullName tamilName')
    .populate('familyId', 'village headId')
    .populate({
      path: 'familyId',
      populate: {
        path: 'headId',
        select: 'fullName phone'
      }
    });

  for (const believer of believers) {
    // Send Email
    if (believer.email && believer.email.trim()) {
      try {
        if (type === 'birthday') {
          await sendBirthdayEmail(believer);
        } else {
          await sendAnniversaryEmail(believer);
        }
        results.emailSuccess++;
        results.logs.push({
          name: believer.fullName,
          type: 'email',
          status: 'success',
          message: `Email sent to ${believer.email}`
        });
      } catch (err) {
        results.emailFailed++;
        results.errors.push({
          name: believer.fullName,
          type: 'email',
          error: err.message,
        });
      }
    } else {
      results.emailSkipped++;
      results.logs.push({
        name: believer.fullName,
        type: 'email',
        status: 'skipped',
        message: 'No email address'
      });
    }

    // Send SMS with smart phone logic
    try {
      let smsResult;
      if (type === 'birthday') {
        smsResult = await sendBirthdaySMS(believer);
      } else {
        smsResult = await sendAnniversarySMS(believer);
      }

      if (smsResult.success) {
        results.smsSuccess++;
        if (smsResult.source === 'head') {
          results.smsViaHead++;
        }
        results.logs.push({
          name: believer.fullName,
          type: 'sms',
          status: 'success',
          message: smsResult.source === 'believer' 
            ? `SMS sent to own phone (${smsResult.phone})`
            : `SMS sent via family head ${smsResult.sentTo} (${smsResult.phone})`
        });
      } else {
        if (smsResult.source === 'none') {
          results.smsSkipped++;
          results.logs.push({
            name: believer.fullName,
            type: 'sms',
            status: 'skipped',
            message: smsResult.error
          });
        } else {
          results.smsFailed++;
          results.errors.push({
            name: believer.fullName,
            type: 'sms',
            error: smsResult.error,
          });
        }
      }
    } catch (err) {
      results.smsFailed++;
      results.errors.push({
        name: believer.fullName,
        type: 'sms',
        error: err.message,
      });
    }
  }

  return results;
};

/**
 * Send birthday wishes for today (automated)
 */
const sendTodayBirthdayWishes = async () => {
  const today = momentTz().tz(TIMEZONE).toDate();
  const believers = await getBirthdaysForDate(today);
  const believerIds = believers.map(b => b._id);
  
  return await sendWishesToSelected(believerIds, 'birthday');
};

/**
 * Send anniversary wishes for today (automated)
 */
const sendTodayAnniversaryWishes = async () => {
  const today = momentTz().tz(TIMEZONE).toDate();
  const believers = await getAnniversariesForDate(today);
  const believerIds = believers.map(b => b._id);
  
  return await sendWishesToSelected(believerIds, 'anniversary');
};

module.exports = {
  getBirthdaysForDate,
  getAnniversariesForDate,
  sendWishesToSelected,  // ✅ NEW: For selective sending
  sendTodayBirthdayWishes,
  sendTodayAnniversaryWishes,
};