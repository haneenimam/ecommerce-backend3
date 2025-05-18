const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth, roleCheck } = require('../middleware/auth');

// Token blacklist for logout functionality
const tokenBlacklist = new Set();

// Register
router.post('/register', 
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').isIn(['buyer', 'seller', 'admin']).withMessage('Invalid role')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, email, password, role } = req.body;
      
      // Check if user exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already in use' });
      }

      const user = new User({ name, email, password, role });
      await user.save();
      
      const token = jwt.sign(
        { id: user._id, role: user.role }, 
        process.env.JWT_SECRET, 
        { expiresIn: '1h' }
      );

      res.status(201).json({ 
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    } catch (err) {
      console.error('Registration error:', err);
      res.status(500).json({ error: 'Server error during registration' });
    }
  }
);

// Login
router.post('/login', 
  [
    body('email').isEmail().normalizeEmail(),
    body('password').exists()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;
      const user = await User.findOne({ email }).select('+password');
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      res.json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Server error during login' });
    }
  }
);

// Logout
router.post('/logout', auth, (req, res) => {
  const token = req.header('x-auth-token');
  tokenBlacklist.add(token);
  res.json({ message: 'Logged out successfully' });
});

// Protected Test Route
router.get('/test', auth, (req, res) => {
  if (tokenBlacklist.has(req.header('x-auth-token'))) {
    return res.status(401).json({ error: 'Token invalidated' });
  }
  
  res.json({ 
    message: 'Protected route accessed',
    user: req.user
  });
});

// Admin Test Route
router.get('/admin-test', auth, roleCheck(['admin']), (req, res) => {
  res.json({ 
    message: 'Admin route accessed',
    user: req.user
  });
});

module.exports = router;