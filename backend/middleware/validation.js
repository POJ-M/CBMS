// backend/middleware/validation.js
const { body, validationResult } = require('express-validator');

const sanitizeRegex = (input) => {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const validateBeliever = [
  body('fullName')
    .trim()
    .escape()
    .isLength({ min: 2, max: 100 }),
  body('email')
    .optional()
    .normalizeEmail()
    .isEmail(),
  body('phone')
    .optional()
    .matches(/^[0-9]{10}$/),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }
    next();
  }
];

module.exports = { validateBeliever, sanitizeRegex };