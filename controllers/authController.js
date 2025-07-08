// controllers/authController.js
const User = require("../models/User.js");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const logger = require("../utils/logger.js");

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || "fallback-secret", {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, phone, password, role } = req.body;

    const existingUser = await User.findOne({
      $or: [{ email }, { phone: phone || null }],
    });

    if (existingUser) {
      return res
        .status(409)
        .json({ error: "User already exists with this email or phone" });
    }

    const user = new User({ name, email, phone, password, role });
    await user.save();

    const token = generateToken(user._id);

    logger.info(`User registered: ${user.email}`);

    res.status(201).json({
      message: "User created successfully",
      user,
      token,
    });
  } catch (error) {
    logger.error("Registration error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email, isActive: true });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = generateToken(user._id);

    logger.info(`User logged in: ${user.email}`);

    res.json({
      message: "Login successful",
      user,
      token,
    });
  } catch (error) {
    logger.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user });
  } catch (error) {
    logger.error("Get profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { register, login, getProfile };
