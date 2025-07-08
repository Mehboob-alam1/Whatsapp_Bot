// routes/files.js
const express = require("express");
const { getFiles, deleteFile } = require("../controllers/fileController.js");
const { auth } = require("../middlewares/auth.js");
const { validateObjectId } = require("../middlewares/validation.js");

const router = express.Router();

router.get("/", auth, getFiles);
router.delete("/:id", auth, validateObjectId, deleteFile);

module.exports = router;
