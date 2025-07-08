// controllers/uploadController.js
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const File = require("../models/File.js");
const TaskService = require("../services/taskService.js");
const logger = require("../utils/logger.js");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads");
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes =
      /jpeg|jpg|png|gif|pdf|doc|docx|txt|csv|xlsx|mp3|mp4|wav/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  },
});

const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { taskId, blockerId, description } = req.body;

    const file = new File({
      taskId: taskId || null,
      blockerId: blockerId || null,
      uploadedBy: req.user.userId,
      filename: req.file.filename,
      originalName: req.file.originalname,
      fileUrl: `/uploads/${req.file.filename}`,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      description,
    });

    await file.save();

    const populatedFile = await File.findById(file._id).populate(
      "uploadedBy",
      "name email"
    );

    logger.info(`File uploaded: ${file.originalName} by ${req.user.userId}`);

    res.status(201).json({
      message: "File uploaded successfully",
      file: populatedFile,
    });
  } catch (error) {
    logger.error("Upload file error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const uploadText = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Text content is required" });
    }

    const results = await TaskService.processUploadedText(
      text,
      req.user.userId
    );

    logger.info(`Text processed: ${results.length} actions taken`);

    res.json({
      message: "Text processed successfully",
      results,
    });
  } catch (error) {
    logger.error("Upload text error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  upload,
  uploadFile,
  uploadText,
};
