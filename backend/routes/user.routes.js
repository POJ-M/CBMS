// backend/routes/user.routes.js
// Complete file - Ready to copy-paste

const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  getCurrentUser,
} = require('../controllers/user.controller');

// All routes require authentication
router.use(protect);

// Current user info (any authenticated user)
router.get('/me', getCurrentUser);

// User management (Admin only)
router.get('/', adminOnly, getAllUsers);
router.post('/', adminOnly, createUser);
router.put('/:id', adminOnly, updateUser);
router.delete('/:id', adminOnly, deleteUser);

module.exports = router;