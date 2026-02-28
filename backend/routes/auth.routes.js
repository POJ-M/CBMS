// FILE: routes/auth.routes.js
const express = require('express');
const router  = express.Router();
const { body } = require('express-validator');
const { login, getMe, changePassword } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');

const loginValidation = [
  body('username').notEmpty().trim().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

router.post('/login',           loginValidation, login);
router.get('/me',               protect,         getMe);
router.put('/change-password',  protect,         changePassword);  // ← NEW

module.exports = router;