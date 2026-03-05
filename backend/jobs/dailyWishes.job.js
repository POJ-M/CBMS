const cron = require('node-cron');
const { sendTodayBirthdayWishes, sendTodayAnniversaryWishes } = require('../services/wishes.service');

/**
 * Run daily at 8:00 AM IST
 * Cron pattern: minute hour day month weekday
 * '0 8 * * *' = At 8:00 AM every day
 */
const scheduleDailyWishes = () => {
  cron.schedule('0 5 * * *', async () => {
    console.log('🎂 Running daily birthday wishes job...');
    
    try {
      const birthdayResults = await sendTodayBirthdayWishes();
      console.log('Birthday wishes sent:', birthdayResults);
    } catch (err) {
      console.error('Birthday wishes failed:', err);
    }

    console.log('💝 Running daily anniversary wishes job...');
    
    try {
      const anniversaryResults = await sendTodayAnniversaryWishes();
      console.log('Anniversary wishes sent:', anniversaryResults);
    } catch (err) {
      console.error('Anniversary wishes failed:', err);
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata',
  });

  console.log('✅ Daily wishes cron job scheduled for 8:00 AM IST');
};

module.exports = { scheduleDailyWishes };