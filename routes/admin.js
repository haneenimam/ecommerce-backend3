const express = require('express');
const router = express.Router();
const { auth, roleCheck } = require('../middleware/auth');
const User = require('../models/User');

// Get all users (Admin only)
router.get('/users', auth, roleCheck(['Admin']), async (req, res) => {
  try {
    const users = await User.find({}, '-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
/* router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}, '-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}); */


// Update user role (Admin only)
 router.patch('/users/:id', auth, roleCheck(['Admin']), async (req, res) => {
  try {
    const { firstName, lastName, email, role } = req.body;

    const updatedFields = {};
    if (firstName !== undefined) updatedFields.firstName = firstName;
    if (lastName !== undefined) updatedFields.lastName = lastName;
    if (email !== undefined) updatedFields.email = email;
    if (role !== undefined) updatedFields.role = role;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updatedFields,
      { new: true }
    ).select('-password');

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/* router.patch('/users/:id', async (req, res) => {
  try {
    const { firstName, lastName, email, role } = req.body;
    
    const updatedFields = {};
    if (firstName !== undefined) updatedFields.firstName = firstName;
    if (lastName !== undefined) updatedFields.lastName = lastName;
    if (email !== undefined) updatedFields.email = email;
    if (role !== undefined) updatedFields.role = role;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updatedFields,
      { new: true }
    ).select('-password');

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}); */


module.exports = router;