// backend/controllers/user.controller.js
// Complete file - Ready to copy-paste

const User = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

/**
 * Get all users (Admin only)
 * GET /api/users
 */
exports.getAllUsers = catchAsync(async (req, res, next) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 });
  
  res.json({
    success: true,
    data: users,
    count: users.length,
  });
});

/**
 * Create new user (Admin only)
 * POST /api/users
 */
exports.createUser = catchAsync(async (req, res, next) => {
  const { username, password, role } = req.body;

  // Validation
  if (!username?.trim()) {
    return next(new AppError('Username is required', 400));
  }
  if (!password?.trim()) {
    return next(new AppError('Password is required', 400));
  }
  if (username.length < 3) {
    return next(new AppError('Username must be at least 3 characters', 400));
  }
  if (password.length < 6) {
    return next(new AppError('Password must be at least 6 characters', 400));
  }
  if (role && !['Admin', 'Viewer'].includes(role)) {
    return next(new AppError('Invalid role. Must be Admin or Viewer', 400));
  }

  // Check if username already exists
  const existingUser = await User.findOne({ username: username.toLowerCase().trim() });
  if (existingUser) {
    return next(new AppError('Username already exists', 409));
  }

  // Create user
  const user = await User.create({
    username: username.toLowerCase().trim(),
    password: password.trim(),
    role: role || 'Viewer',
  });

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: user,
  });
});

/**
 * Update user (Admin only)
 * PUT /api/users/:id
 */
exports.updateUser = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { username, password, role } = req.body;

  // Find user
  const user = await User.findById(id);
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Prevent admin from changing their own role
  if (user._id.toString() === req.user._id.toString() && role && role !== user.role) {
    return next(new AppError('You cannot change your own role', 403));
  }

  // Update username
  if (username && username.trim() !== user.username) {
    const trimmedUsername = username.toLowerCase().trim();
    
    if (trimmedUsername.length < 3) {
      return next(new AppError('Username must be at least 3 characters', 400));
    }

    // Check if new username already exists
    const existingUser = await User.findOne({ username: trimmedUsername });
    if (existingUser && existingUser._id.toString() !== id) {
      return next(new AppError('Username already exists', 409));
    }

    user.username = trimmedUsername;
  }

  // Update password
  if (password && password.trim()) {
    if (password.length < 6) {
      return next(new AppError('Password must be at least 6 characters', 400));
    }
    user.password = password.trim();
  }

  // Update role
  if (role && ['Admin', 'Viewer'].includes(role)) {
    user.role = role;
  }

  await user.save();

  res.json({
    success: true,
    message: 'User updated successfully',
    data: user,
  });
});

/**
 * Delete user (Admin only)
 * DELETE /api/users/:id
 */
exports.deleteUser = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  // Find user
  const user = await User.findById(id);
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Prevent admin from deleting themselves
  if (user._id.toString() === req.user._id.toString()) {
    return next(new AppError('You cannot delete your own account', 403));
  }

  await User.findByIdAndDelete(id);

  res.json({
    success: true,
    message: 'User deleted successfully',
  });
});

/**
 * Get current user info
 * GET /api/users/me
 */
exports.getCurrentUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id).select('-password');
  
  res.json({
    success: true,
    data: user,
  });
});