const express = require('express');
const router = express.Router();
const { auth, roleCheck } = require('../middleware/auth');
const User = require('../models/User');

// Get all users (Admin only)
router.get('/users', auth, roleCheck(['admin']), async (req, res) => {
  try {
    const users = await User.find({}, '-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user role (Admin only)
router.patch('/users/:id/role', auth, roleCheck(['admin']), async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;