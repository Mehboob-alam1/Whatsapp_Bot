// controllers/userController.js
const User = require("../models/User.js");
const { validationResult } = require("express-validator");
const logger = require("../utils/logger.js");

const getUsers = async (req, res) => {
  try {
    const { role, search, page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const filter = { isActive: true };
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { name: new RegExp(search, "i") },
        { email: new RegExp(search, "i") },
      ];
    }

    const users = await User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Get users error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const updateUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updates = req.body;

    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check permission
    if (req.user.role !== "admin" && req.user.userId !== id) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Update user
    Object.assign(user, updates);
    await user.save();

    logger.info(`User updated: ${user.email} by ${req.user.userId}`);

    res.json({ message: "User updated successfully", user });
  } catch (error) {
    logger.error("Update user error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  getUsers,
  updateUser,
};
