// controllers/blockerController.js
const Blocker = require("../models/Blocker.js");
const Task = require("../models/Task.js");
const { validationResult } = require("express-validator");
const logger = require("../utils/logger.js");

const createBlocker = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { taskId, description, type, severity } = req.body;

    // Check if task exists
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    const blocker = new Blocker({
      taskId,
      reportedBy: req.user.userId,
      description,
      type,
      severity,
    });

    await blocker.save();

    // Update task status to blocked
    task.status = "blocked";
    await task.save();

    const populatedBlocker = await Blocker.findById(blocker._id)
      .populate("reportedBy", "name email")
      .populate("taskId", "title");

    logger.info(`Blocker created for task ${taskId} by ${req.user.userId}`);

    res.status(201).json({
      message: "Blocker created successfully",
      blocker: populatedBlocker,
    });
  } catch (error) {
    logger.error("Create blocker error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getBlockers = async (req, res) => {
  try {
    const { taskId, status, severity } = req.query;

    const filter = {};
    if (taskId) filter.taskId = taskId;
    if (status) filter.status = status;
    if (severity) filter.severity = severity;

    const blockers = await Blocker.find(filter)
      .populate("reportedBy", "name email")
      .populate("resolvedBy", "name email")
      .populate("taskId", "title project")
      .sort({ createdAt: -1 });

    res.json({ blockers });
  } catch (error) {
    logger.error("Get blockers error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const updateBlocker = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolution } = req.body;

    const blocker = await Blocker.findById(id);
    if (!blocker) {
      return res.status(404).json({ error: "Blocker not found" });
    }

    blocker.status = status;
    if (resolution) blocker.resolution = resolution;

    if (status === "resolved") {
      blocker.resolvedBy = req.user.userId;
      blocker.resolvedAt = new Date();
    }

    await blocker.save();

    // If blocker is resolved, check if task should be unblocked
    if (status === "resolved") {
      const remainingBlockers = await Blocker.countDocuments({
        taskId: blocker.taskId,
        status: { $in: ["open", "in_progress"] },
      });

      if (remainingBlockers === 0) {
        await Task.findByIdAndUpdate(blocker.taskId, { status: "pending" });
      }
    }

    const populatedBlocker = await Blocker.findById(blocker._id)
      .populate("reportedBy", "name email")
      .populate("resolvedBy", "name email")
      .populate("taskId", "title");

    logger.info(`Blocker updated: ${id} by ${req.user.userId}`);

    res.json({
      message: "Blocker updated successfully",
      blocker: populatedBlocker,
    });
  } catch (error) {
    logger.error("Update blocker error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const deleteBlocker = async (req, res) => {
  try {
    const { id } = req.params;

    const blocker = await Blocker.findById(id);
    if (!blocker) {
      return res.status(404).json({ error: "Blocker not found" });
    }

    await Blocker.findByIdAndDelete(id);

    logger.info(`Blocker deleted: ${id} by ${req.user.userId}`);

    res.json({ message: "Blocker deleted successfully" });
  } catch (error) {
    logger.error("Delete blocker error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  createBlocker,
  getBlockers,
  updateBlocker,
  deleteBlocker,
};
