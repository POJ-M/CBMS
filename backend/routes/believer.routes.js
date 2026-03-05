// ═══════════════════════════════════════════════════════════════════════
// FILE: routes/believer.routes.js
// ═══════════════════════════════════════════════════════════════════════
const express = require('express');
const router  = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
  getAllBelievers,
  getBelieverById,
  updateBeliever,
  deleteBeliever,
  getTrashedBelievers,
  restoreBeliever,
  permanentDeleteBeliever,
  emptyBelieverTrash,
} = require('../controllers/believer.controller');

router.use(protect, adminOnly);

// ── Trash routes (must come BEFORE /:id routes so Express doesn't confuse
//    "trash" and "empty" as ObjectId values) ────────────────────────────────
router.get('/trash',           getTrashedBelievers);   // GET    /api/believers/trash
router.delete('/trash/empty',  emptyBelieverTrash);    // DELETE /api/believers/trash/empty

// ── Active believers ──────────────────────────────────────────────────────────
router.get('/', getAllBelievers);

// ── Individual believer ───────────────────────────────────────────────────────
router.route('/:id')
  .get(getBelieverById)
  .put(updateBeliever)
  .delete(deleteBeliever);                             // soft-delete → trash

router.patch('/:id/restore',    restoreBeliever);      // PATCH  /api/believers/:id/restore
router.delete('/:id/permanent', permanentDeleteBeliever); // DELETE /api/believers/:id/permanent

module.exports = router;


