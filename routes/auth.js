// routes/auth.js
const express = require("express");
const {
  register,
  login,
  getProfile,
} = require("../controllers/authController.js");
const { auth } = require("../middlewares/auth.js");
const {
  validateRegister,
  validateLogin,
} = require("../middlewares/validation.js");

const router = express.Router();

router.post("/register", validateRegister, register);
router.post("/login", validateLogin, login);
router.get("/profile", auth, getProfile);

module.exports = router;
