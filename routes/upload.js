// routes/upload.js
const express = require("express");
const {
  upload,
  uploadFile,
  uploadText,
} = require("../controllers/uploadController.js");
const { auth } = require("../middlewares/auth.js");

const router = express.Router();

router.post("/file", auth, upload.single("file"), uploadFile);
router.post("/text", auth, uploadText);

module.exports = router;
