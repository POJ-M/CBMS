const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

/**
 * protect — Verifies JWT token from Authorization header.
 * Attaches the authenticated user to req.user.
 */
const protect = catchAsync(async (req, res, next) => {
  // 1) Extract token
  let token;
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('Not authorized. No token provided.', 401));
  }

  // 2) Verify token
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  // 3) Check user still exists and is active
  const user = await User.findById(decoded.id).select('-password');
  if (!user) return next(new AppError('User belonging to this token no longer exists.', 401));
  if (!user.isActive) return next(new AppError('Your account has been deactivated.', 403));

  req.user = user;
  next();
});

/**
 * adminOnly — Allows access only to users with 'admin' role.
 * Must be used after protect middleware.
 */
const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return next(new AppError('Access denied. Admin privileges required.', 403));
  }
  next();
};

module.exports = { protect, adminOnly };