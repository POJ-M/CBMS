const express = require('express');
const router  = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
  getDistricts,        // NEW: Add this
  getAllFamilies,
  getFamilyById,
  createFamily,
  updateFamily,
  deleteFamily,
  getTrashedFamilies,
  restoreFamily,
  permanentDeleteFamily,
  addMember,
  assignNewHead,
} = require('../controllers/family.controller');

router.use(protect, adminOnly);

// NEW: Get Tamil Nadu districts list (public endpoint for dropdown)
router.get('/districts', getDistricts);

// Trash routes MUST come before /:id
router.get('/trash', getTrashedFamilies);

// CRUD
router.route('/')
  .get(getAllFamilies)
  .post(createFamily);

router.route('/:id')
  .get(getFamilyById)
  .put(updateFamily)
  .delete(deleteFamily);

router.patch('/:id/restore',    restoreFamily);
router.delete('/:id/permanent', permanentDeleteFamily);

router.post('/:id/members',          addMember);
router.put('/:familyId/assign-head', assignNewHead);

module.exports = router;