// controllers/dependencyController.js
const Dependency = require("../models/Dependency.js");
const Task = require("../models/Task.js");
const { validationResult } = require("express-validator");
const logger = require("../utils/logger.js");

const createDependency = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { taskId, blockedByTaskId, type } = req.body;

    // Check if both tasks exist
    const [task, blockedByTask] = await Promise.all([
      Task.findById(taskId),
      Task.findById(blockedByTaskId),
    ]);

    if (!task || !blockedByTask) {
      return res.status(404).json({ error: "One or both tasks not found" });
    }

    // Check for circular dependencies
    const existingDependency = await Dependency.findOne({
      taskId: blockedByTaskId,
      blockedByTaskId: taskId,
    });

    if (existingDependency) {
      return res.status(400).json({ error: "Circular dependency detected" });
    }

    const dependency = new Dependency({
      taskId,
      blockedByTaskId,
      type,
      createdBy: req.user.userId,
    });

    await dependency.save();

    const populatedDependency = await Dependency.findById(dependency._id)
      .populate("taskId", "title")
      .populate("blockedByTaskId", "title status")
      .populate("createdBy", "name email");

    logger.info(`Dependency created: ${taskId} blocked by ${blockedByTaskId}`);

    res.status(201).json({
      message: "Dependency created successfully",
      dependency: populatedDependency,
    });
  } catch (error) {
    logger.error("Create dependency error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getDependencies = async (req, res) => {
  try {
    const { taskId } = req.query;

    const filter = {};
    if (taskId) filter.taskId = taskId;

    const dependencies = await Dependency.find(filter)
      .populate("taskId", "title status")
      .populate("blockedByTaskId", "title status")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    res.json({ dependencies });
  } catch (error) {
    logger.error("Get dependencies error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const deleteDependency = async (req, res) => {
  try {
    const { id } = req.params;

    const dependency = await Dependency.findById(id);
    if (!dependency) {
      return res.status(404).json({ error: "Dependency not found" });
    }

    await Dependency.findByIdAndDelete(id);

    logger.info(`Dependency deleted: ${id} by ${req.user.userId}`);

    res.json({ message: "Dependency deleted successfully" });
  } catch (error) {
    logger.error("Delete dependency error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  createDependency,
  getDependencies,
  deleteDependency,
};
