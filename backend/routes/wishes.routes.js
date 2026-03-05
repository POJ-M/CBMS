// backend/routes/wishes.routes.js
// Complete file with selective sending endpoint

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

/**
 * @route   GET /api/wishes/birthdays/preview
 * @desc    Preview today's birthday wishes
 */
router.get('/birthdays/preview', catchAsync(async (req, res) => {
  const today = new Date();
  const believers = await getBirthdaysForDate(today);
  
  res.json({
    success: true,
    data: believers,
    count: believers.length,
  });
}));

/**
 * @route   POST /api/wishes/birthdays/send
 * @desc    Send birthday wishes to selected believers
 * @body    { believerIds: [id1, id2, ...] }
 */
router.post('/birthdays/send', catchAsync(async (req, res) => {
  const { believerIds } = req.body;
  
  if (!believerIds || !Array.isArray(believerIds) || believerIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'believerIds array is required',
    });
  }
  
  const results = await sendWishesToSelected(believerIds, 'birthday');
  
  res.json({
    success: true,
    message: 'Birthday wishes sent',
    data: results,
  });
}));

/**
 * @route   GET /api/wishes/anniversaries/preview
 * @desc    Preview today's anniversary wishes
 */
router.get('/anniversaries/preview', catchAsync(async (req, res) => {
  const today = new Date();
  const believers = await getAnniversariesForDate(today);
  
  res.json({
    success: true,
    data: believers,
    count: believers.length,
  });
}));

/**
 * @route   POST /api/wishes/anniversaries/send
 * @desc    Send anniversary wishes to selected believers
 * @body    { believerIds: [id1, id2, ...] }
 */
router.post('/anniversaries/send', catchAsync(async (req, res) => {
  const { believerIds } = req.body;
  
  if (!believerIds || !Array.isArray(believerIds) || believerIds.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'believerIds array is required',
    });
  }
  
  const results = await sendWishesToSelected(believerIds, 'anniversary');
  
  res.json({
    success: true,
    message: 'Anniversary wishes sent',
    data: results,
  });
}));

module.exports = router;