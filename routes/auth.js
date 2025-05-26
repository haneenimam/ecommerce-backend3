const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

// Register
router.post("/register", async (req, res) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const newUser = new User({
      firstName,
      lastName,
      email,
      password, // Let the schema hash it
      role
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
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("Login attempt:", { email, password });

    const user = await User.findOne({ email });
    if (!user) {
      console.log("User not found with email:", email);
      return res.status(400).json({ message: "Invalid email or password" });
    }

    console.log("User found:", user);

    if (!user.password) {
      console.log("User password is missing from database.");
      return res.status(400).json({ message: "User has no password set" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    console.log("Password match result:", isMatch);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Ensure JWT secret is defined
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not defined in environment variables");
      return res.status(500).json({ message: "Server config error" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

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

module.exports = router;
