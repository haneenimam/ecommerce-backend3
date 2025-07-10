const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const User = require("../models/User");
const { auth, roleCheck } = require("../middleware/auth"); 

// ===== REGISTER =====
/* router.post("/register", async (req, res) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role,
    });

    await newUser.save();

    res.status(201).json({
      message: "User registered successfully",
      user: {
        firstName,
        lastName,
        email,
        role,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
}); */

// ===== REGISTER (Public - Default to User Role) =====
router.post("/register", async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: "User", // Force "User" role
    });

    await newUser.save();

    res.status(201).json({
      message: "User registered successfully",
      user: {
        firstName,
        lastName,
        email,
        role: "User",
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});




// ===== ADMIN: Create Seller or Admin =====
router.post("/admin/register", auth, roleCheck(["Admin"]), async (req, res) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;

    if (!["Admin", "Seller"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role,
    });

    await newUser.save();

    res.status(201).json({
      message: `New ${role} registered successfully`,
      user: {
        firstName,
        lastName,
        email,
        role,
      },
    });
  } catch (error) {
    console.error("Admin user creation error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});


// ===== LOGIN =====
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !user.password) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "JWT_SECRET not defined" });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// ===== TOKEN VERIFY =====
router.get("/verify", (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ user: decoded });
  } catch (err) {
    res.status(403).json({ message: "Invalid token" });
  }
});

// ===== FORGOT PASSWORD =====
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user)
    return res.status(404).json({ success: false, message: "User not found" });

  const code = Math.floor(1000 + Math.random() * 9000).toString();
  const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

  user.resetCode = code;
  user.resetCodeExpires = expires;
  await user.save();

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: "Reset your password",
    text: `Your reset code is: ${code}`,
  });

  res.json({ success: true, userId: user._id });
});

// ===== RESET PASSWORD =====
router.post("/reset-password", async (req, res) => {
  const { userId, email, code, newPassword } = req.body;

  const user = await User.findOne({ _id: userId, email });
  if (!user)
    return res.status(404).json({ success: false, message: "User not found" });

  if (
    !user.resetCode ||
    user.resetCode !== code ||
    user.resetCodeExpires < new Date()
  ) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid or expired code" });
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  user.password = hashed;
  user.resetCode = null;
  user.resetCodeExpires = null;
  await user.save();

  res.json({ success: true, message: "Password reset successful" });
});

module.exports = router;
