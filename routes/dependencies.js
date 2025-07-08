// routes/dependencies.js
const express = require("express");
const {
  createDependency,
  getDependencies,
  deleteDependency,
} = require("../controllers/dependencyController.js");
const { auth } = require("../middlewares/auth.js");
const {
  validateDependency,
  validateObjectId,
} = require("../middlewares/validation.js");

const router = express.Router();

router.post("/", auth, validateDependency, createDependency);
router.get("/", auth, getDependencies);
router.delete("/:id", auth, validateObjectId, deleteDependency);

module.exports = router;
