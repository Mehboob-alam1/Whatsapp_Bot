// routes/users.js
const express = require("express");
const { getUsers, updateUser } = require("../controllers/userController.js");
const { auth, adminAuth } = require("../middlewares/auth.js");
const { validateObjectId } = require("../middlewares/validation.js");

const router = express.Router();

router.get("/", auth, getUsers);
router.put("/:id", auth, validateObjectId, updateUser);

module.exports = router;
