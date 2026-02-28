const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const { getAnalytics } = require('../controllers/analytics.controller');

router.use(protect, adminOnly);
router.get('/', getAnalytics);

module.exports = router;