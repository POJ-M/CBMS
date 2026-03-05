const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const { getDashboardStats } = require('../controllers/dashboard.controller');

router.use(protect, adminOnly);
router.get('/', getDashboardStats);

module.exports = router;