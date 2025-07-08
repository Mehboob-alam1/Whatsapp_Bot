// middlewares/auth.js
const jwt = require("jsonwebtoken");
const User = require("../models/User.js");
const logger = require("../utils/logger.js");

const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res
        .status(401)
        .json({ error: "Access denied. No token provided." });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "fallback-secret"
    );
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({ error: "Invalid token" });
    }

    req.user = { userId: user._id.toString(), role: user.role };
    next();
  } catch (error) {
    logger.error("Auth middleware error:", error);
    res.status(401).json({ error: "Invalid token" });
  }
};

const adminAuth = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res
      .status(403)
      .json({ error: "Access denied. Admin role required." });
  }
  next();
};

module.exports = { auth, adminAuth };
