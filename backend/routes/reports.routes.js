const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
  getReportData,
  getReminderReport,
  getFamilyWiseReport,
  exportReport,
  exportReportPDF,
  exportReminderReportPDF,
  exportFamilyReportPDF,
} = require('../controllers/reports.controller');

router.use(protect, adminOnly);

// Data endpoints
router.get('/data', getReportData);
router.get('/reminder', getReminderReport);
router.get('/family-wise', getFamilyWiseReport);  // NEW

// Export endpoints
router.post('/export', exportReport);                        // Excel (handles both believer and family reports)
router.post('/export-pdf', exportReportPDF);                 // PDF - filtered believer report
router.post('/export-reminder-pdf', exportReminderReportPDF); // PDF - reminder report
router.post('/export-family-pdf', exportFamilyReportPDF);    // PDF - family-wise report (NEW)

module.exports = router;