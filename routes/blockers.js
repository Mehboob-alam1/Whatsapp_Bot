// routes/blockers.js
const express = require("express");
const {
  createBlocker,
  getBlockers,
  updateBlocker,
  deleteBlocker,
} = require("../controllers/blockerController.js");
const { auth } = require("../middlewares/auth.js");
const {
  validateBlocker,
  validateObjectId,
} = require("../middlewares/validation.js");

const router = express.Router();

router.post("/", auth, validateBlocker, createBlocker);
router.get("/", auth, getBlockers);
router.put("/:id", auth, validateObjectId, updateBlocker);
router.delete("/:id", auth, validateObjectId, deleteBlocker);

module.exports = router;
