// controllers/fileController.js
const File = require("../models/File.js");
const { validationResult } = require("express-validator");
const logger = require("../utils/logger.js");

const getFiles = async (req, res) => {
  try {
    const { taskId, blockerId } = req.query;

    const filter = {};
    if (taskId) filter.taskId = taskId;
    if (blockerId) filter.blockerId = blockerId;

    const files = await File.find(filter)
      .populate("uploadedBy", "name email")
      .populate("taskId", "title")
      .sort({ createdAt: -1 });

    res.json({ files });
  } catch (error) {
    logger.error("Get files error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const deleteFile = async (req, res) => {
  try {
    const { id } = req.params;

    const file = await File.findById(id);
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    // Check if user has permission to delete
    if (
      req.user.role !== "admin" &&
      file.uploadedBy.toString() !== req.user.userId
    ) {
      return res
        .status(403)
        .json({ error: "Not authorized to delete this file" });
    }

    await File.findByIdAndDelete(id);

    logger.info(`File deleted: ${id} by ${req.user.userId}`);

    res.json({ message: "File deleted successfully" });
  } catch (error) {
    logger.error("Delete file error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  getFiles,
  deleteFile,
};
