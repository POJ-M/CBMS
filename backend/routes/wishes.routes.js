// backend/routes/wishes.routes.js
const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const catchAsync = require('../utils/catchAsync');
const {
  getBirthdaysForDate,
  getAnniversariesForDate,
  sendWishesToSelected,
} = require('../services/wishes.service');

router.use(protect, adminOnly);

// Preview endpoints (unchanged)
router.get('/birthdays/preview', catchAsync(async (req, res) => {
  const today = new Date();
  const believers = await getBirthdaysForDate(today);
  res.json({ success: true, data: believers, count: believers.length });
}));

router.get('/anniversaries/preview', catchAsync(async (req, res) => {
  const today = new Date();
  const believers = await getAnniversariesForDate(today);
  res.json({ success: true, data: believers, count: believers.length });
}));

// ✅ UPDATED: Send birthday wishes (respond immediately, send in background)
router.post('/birthdays/send', catchAsync(async (req, res) => {
  const { believerIds } = req.body;
  
  if (!believerIds || !Array.isArray(believerIds) || believerIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'believerIds array is required',
    });
  }
  
  // ✅ Respond immediately
  res.json({
    success: true,
    message: 'Wishes are being sent in the background. Check back in a few minutes.',
    data: {
      total: believerIds.length,
      status: 'processing'
    }
  });
  
  // ✅ Send wishes in background (don't wait)
  sendWishesToSelected(believerIds, 'birthday')
    .then((results) => {
      console.log('✅ Birthday wishes completed:', results);
    })
    .catch((error) => {
      console.error('❌ Birthday wishes failed:', error);
    });
}));

// ✅ UPDATED: Send anniversary wishes (respond immediately, send in background)
router.post('/anniversaries/send', catchAsync(async (req, res) => {
  const { believerIds } = req.body;
  
  if (!believerIds || !Array.isArray(believerIds) || believerIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'believerIds array is required',
    });
  }
  
  // ✅ Respond immediately
  res.json({
    success: true,
    message: 'Wishes are being sent in the background. Check back in a few minutes.',
    data: {
      total: believerIds.length,
      status: 'processing'
    }
  });
  
  // ✅ Send wishes in background (don't wait)
  sendWishesToSelected(believerIds, 'anniversary')
    .then((results) => {
      console.log('✅ Anniversary wishes completed:', results);
    })
    .catch((error) => {
      console.error('❌ Anniversary wishes failed:', error);
    });
}));

module.exports = router;
