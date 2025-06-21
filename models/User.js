const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['User', 'Seller', 'Admin'], default: 'User' },
  resetCode: { type: String },
  resetCodeExpires: { type: Date }

}, { timestamps: true });


module.exports = mongoose.model('User', UserSchema);