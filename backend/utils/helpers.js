const momentTz = require('moment-timezone');

const TIMEZONE = 'Asia/Kolkata';

/**
 * Calculate age in years from a date of birth string/Date.
 * Uses IST timezone for accuracy.
 */
const calcAge = (dob) => {
  if (!dob) return null;
  return momentTz().tz(TIMEZONE).diff(momentTz(dob).tz(TIMEZONE), 'years');
};

/**
 * Suggest member type based on age and marital status.
 * Rules: 0-12 → Child, 13-30 + Single → Youth, else → Member
 */
const suggestMemberType = (age, maritalStatus) => {
  if (age <= 12) return 'Child';
  if (age <= 30 && maritalStatus === 'Single') return 'Youth';
  return 'Member';
};

/**
 * Returns the moment object in IST timezone.
 */
const nowIST = () => momentTz().tz(TIMEZONE);

/**
 * Check if a yearly recurring date (birthday/anniversary) falls within next N days.
 * Handles year-wrap (e.g., Dec 28 to Jan 3).
 */
const isWithinNextDays = (date, days) => {
  const now = nowIST();
  const end = now.clone().add(days, 'days');
  const recurring = momentTz(date).tz(TIMEZONE).year(now.year());
  if (recurring.isBefore(now, 'day')) recurring.add(1, 'year');
  return recurring.isBetween(now, end, 'day', '[]');
};

/**
 * Check if a yearly recurring date falls in the current calendar month.
 */
const isInCurrentMonth = (date) => {
  const now = nowIST();
  return momentTz(date).tz(TIMEZONE).month() === now.month();
};

module.exports = { calcAge, suggestMemberType, nowIST, isWithinNextDays, isInCurrentMonth, TIMEZONE };