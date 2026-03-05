// ═══════════════════════════════════════════════════════════════════════
// FILE: controllers/auth.controller.js
// ═══════════════════════════════════════════════════════════════════════
const jwt        = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User       = require('../models/User');
const AppError   = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });

/**
 * @desc  Login admin
 * @route POST /api/auth/login
 */
const login = catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new AppError(errors.array()[0].msg, 400));

  const { username, password } = req.body;
  const user = await User.findOne({ username: username.trim().toLowerCase() });

  if (!user || !(await user.comparePassword(password))) {
    return next(new AppError('Invalid username or password.', 401));
  }
  if (!user.isActive) {
    return next(new AppError('Your account has been deactivated.', 403));
  }

  res.status(200).json({
    success: true,
    message: 'Login successful.',
    token: generateToken(user._id),
    user: { id: user._id, username: user.username, role: user.role },
  });
});

/**
 * @desc  Get current user
 * @route GET /api/auth/me
 */
const getMe = catchAsync(async (req, res) => {
  res.status(200).json({ success: true, user: req.user });
});

/**
 * @desc  Change admin password
 * @route PUT /api/auth/change-password
 * @body  { currentPassword, newPassword, confirmPassword }
 */
const changePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  // Validate presence
  if (!currentPassword || !newPassword || !confirmPassword) {
    return next(new AppError('All three password fields are required.', 400));
  }
  // Length check
  if (newPassword.length < 6) {
    return next(new AppError('New password must be at least 6 characters long.', 400));
  }
  // Match check
  if (newPassword !== confirmPassword) {
    return next(new AppError('New password and confirm password do not match.', 400));
  }
  // Same-as-current check
  if (currentPassword === newPassword) {
    return next(new AppError('New password must be different from your current password.', 400));
  }

  // Re-fetch user with password field (protect middleware selects -password)
  const user = await User.findById(req.user._id);
  if (!user) return next(new AppError('User not found.', 404));

  // Verify current password
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return next(new AppError('Current password is incorrect.', 401));
  }

  // Save new password (pre-save hook hashes it)
  user.password = newPassword;
  await user.save();

  // Issue fresh token so the session remains valid
  res.status(200).json({
    success: true,
    message: 'Password changed successfully.',
    token: generateToken(user._id),
  });
});

module.exports = { login, getMe, changePassword };

